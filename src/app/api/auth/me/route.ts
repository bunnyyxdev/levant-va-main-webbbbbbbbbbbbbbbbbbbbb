import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('lva_session')?.value;

        if (!token) {
            return NextResponse.json({ user: null });
        }

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await jwtVerify(token, secret);

        // Fetch additional user data from database
        await connectDB();
        const pilot = await Pilot.findById(payload.id).select('simbrief_id pilot_id desired_callsign balance inventory total_hours transfer_hours hoppie_code sim_mode weight_unit vatsim_cid ivao_vid');

        return NextResponse.json({
            user: {
                id: payload.id,
                pilotId: pilot?.pilot_id || payload.pilotId, // Always use DB value as source of truth
                email: payload.email,
                isAdmin: payload.isAdmin,
                role: payload.role,
                status: payload.status,
                simbriefId: pilot?.simbrief_id || '',
                hoppieCode: pilot?.hoppie_code || '',
                simMode: pilot?.sim_mode || '',
                weightUnit: pilot?.weight_unit || 'lbs',
                vatsim_cid: pilot?.vatsim_cid || '',
                ivao_vid: pilot?.ivao_vid || '',
                customCallsign: pilot?.desired_callsign || '',
                totalHours: (pilot?.total_hours || 0) + (pilot?.transfer_hours || 0),
                balance: pilot?.balance || 0,
                inventory: pilot?.inventory || [],
            }
        });
    } catch (error) {
        console.error('Auth check error:', error);
        return NextResponse.json({ user: null });
    }
}
