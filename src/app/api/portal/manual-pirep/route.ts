import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import Flight from '@/models/Flight';
import Pilot from '@/models/Pilot';
import { verifyAuth } from '@/lib/auth';

// Allowed tracker URL patterns — IVAO tracker only
const TRACKER_REGEX = /^https?:\/\/(tracker\.ivao\.aero)\/.+/i;

// A380 fuzzy match — catches A380, A388, A-380, Airbus 380, etc.
function isA380(aircraft: string): boolean {
    const normalized = aircraft.replace(/[\s\-_]/g, '').toUpperCase();
    return normalized.includes('A380') || normalized.includes('A388') || normalized.includes('380');
}

// POST /api/portal/manual-pirep — Submit a manual PIREP
export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();

        const body = await request.json();
        const {
            flight_number,
            callsign,
            departure_icao,
            arrival_icao,
            aircraft_type,
            flight_time,
            landing_rate,
            tracker_link,
            proof_image,
            comments,
        } = body;

        // ── Validation ────────────────────────────────────────────────
        if (!departure_icao || !arrival_icao || !aircraft_type || !flight_time) {
            return NextResponse.json(
                { error: 'Departure, Arrival, Aircraft Type, and Flight Time are required.' },
                { status: 400 }
            );
        }

        // Proof requirement: must have at least one
        if (!tracker_link && !proof_image) {
            return NextResponse.json(
                { error: 'You must provide either a tracker link or a screenshot for manual submission.' },
                { status: 400 }
            );
        }

        // Tracker link regex validation
        if (tracker_link && !TRACKER_REGEX.test(tracker_link)) {
            return NextResponse.json(
                { error: 'Tracker link must be a valid IVAO tracker URL (e.g. https://tracker.ivao.aero/...).' },
                { status: 400 }
            );
        }

        // A380 fleet restriction
        if (isA380(aircraft_type)) {
            return NextResponse.json(
                { error: 'Fleet Violation: A380/A388 aircraft is not permitted for Levant VA operations.' },
                { status: 400 }
            );
        }

        // ── Duplicate detection ───────────────────────────────────────
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const duplicate = await Flight.findOne({
            pilot_id: session.id,
            departure_icao: departure_icao.toUpperCase(),
            arrival_icao: arrival_icao.toUpperCase(),
            submitted_at: { $gte: today, $lt: tomorrow },
        }).lean();

        // Get pilot info
        const pilot = await Pilot.findById(session.id).lean() as any;
        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        // ── Create manual flight record ───────────────────────────────
        const flight = await Flight.create({
            pilot_id: session.id,
            pilot_name: `${pilot.firstName || ''} ${pilot.lastName || ''}`.trim() || pilot.pilotId || 'Unknown',
            flight_number: flight_number || `MAN-${Date.now().toString(36).toUpperCase()}`,
            callsign: callsign || pilot.customCallsign || pilot.pilotId || 'LVT001',
            departure_icao: departure_icao.toUpperCase(),
            arrival_icao: arrival_icao.toUpperCase(),
            aircraft_type,
            flight_time: parseInt(flight_time) || 0,
            landing_rate: parseInt(landing_rate) || 0,
            landing_grade: 'Acceptable',
            score: 0,
            fuel_used: 0,
            distance: 0,
            pax: 0,
            cargo: 0,
            revenue_passenger: 0,
            revenue_cargo: 0,
            expense_fuel: 0,
            expense_airport: 0,
            expense_pilot: 0,
            expense_maintenance: 0,
            real_profit: 0,
            passenger_rating: 0,
            comfort_score: 0,
            approved_status: 0, // Pending — requires manual admin review
            is_manual: true,
            tracker_link: tracker_link || undefined,
            proof_image: proof_image || undefined,
            comments: comments || undefined,
            acars_version: 'MANUAL',
        });

        return NextResponse.json({
            success: true,
            flightId: flight._id,
            isDuplicate: !!duplicate,
            message: duplicate
                ? 'Manual PIREP submitted. WARNING: A flight on this route was already logged today — staff will review for duplicates.'
                : 'Manual PIREP submitted successfully. Staff will review your submission.',
        });
    } catch (error: any) {
        console.error('Manual PIREP error:', error);
        return NextResponse.json({ error: 'Failed to submit manual PIREP.' }, { status: 500 });
    }
}
