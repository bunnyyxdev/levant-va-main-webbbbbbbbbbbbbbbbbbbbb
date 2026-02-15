import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import { PilotModel, Bid } from '@/models';

export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    try {
        await connectDB();
        const pilot = await PilotModel.findById(session.id);
        
        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        const simbriefId = pilot.simbrief_id;
        if (!simbriefId) {
            return NextResponse.json({ 
                error: 'SimBrief ID not configured. Please add your SimBrief ID in Settings.' 
            }, { status: 400 });
        }

        console.log(`[SimBrief-to-Bid] Fetching SimBrief for pilot ${pilot.pilot_id}, SimBrief ID: ${simbriefId}`);

        // Fetch from SimBrief
        const sbRes = await fetch(
            `https://www.simbrief.com/api/xml.fetcher.php?userid=${simbriefId}&json=v2`,
            { cache: 'no-store' }
        );

        if (!sbRes.ok) {
            return NextResponse.json({ 
                error: `Failed to fetch from SimBrief (HTTP ${sbRes.status})` 
            }, { status: 500 });
        }

        const sbData = await sbRes.json();

        if (sbData?.fetch?.status !== 'Success') {
            return NextResponse.json({ 
                error: 'No SimBrief flight plan found. Create a flight plan on SimBrief.com first.' 
            }, { status: 404 });
        }

        // Delete any existing bids for this pilot
        await Bid.deleteMany({ pilot_id: pilot._id });

        // Create bid from SimBrief data
        const bid = await Bid.create({
            pilot_id: pilot._id,
            flight_number: sbData.general?.flight_number || sbData.atc?.callsign || '',
            callsign: sbData.atc?.callsign || pilot.pilot_id,
            departure_icao: sbData.origin?.icao_code || '',
            arrival_icao: sbData.destination?.icao_code || '',
            departure_name: sbData.origin?.name || '',
            arrival_name: sbData.destination?.name || '',
            aircraft_type: sbData.aircraft?.icaocode || '',
            aircraft_registration: sbData.aircraft?.reg || '',
            route: sbData.general?.route || '',
            pax: parseInt(sbData.weights?.pax_count || '0'),
            cargo: parseInt(sbData.weights?.cargo || '0'),
            simbrief_ofp_id: sbData.params?.ofp_id || '',
            planned_fuel: parseInt(sbData.fuel?.plan_ramp || '0'),
            created_at: new Date(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });

        console.log(`[SimBrief-to-Bid] Created bid for ${pilot.pilot_id}: ${bid.departure_icao} → ${bid.arrival_icao}`);

        return NextResponse.json({ 
            success: true,
            bid: {
                flightNumber: bid.flight_number,
                callsign: bid.callsign,
                departureIcao: bid.departure_icao,
                arrivalIcao: bid.arrival_icao,
                aircraftType: bid.aircraft_type
            }
        });
    } catch (error: any) {
        console.error('[SimBrief-to-Bid] Error:', error);
        return NextResponse.json({ 
            error: 'Failed to create bid from SimBrief',
            details: error.message 
        }, { status: 500 });
    }
}
