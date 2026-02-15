import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { PilotModel } from '@/models';

export async function POST(request: NextRequest) {
    try {
        const { pilotId } = await request.json();
        
        if (!pilotId) {
            return NextResponse.json({ error: 'Pilot ID required' }, { status: 400 });
        }

        await connectDB();
        const pilot = await PilotModel.findOne({ pilot_id: pilotId })
            .select('simbrief_id hoppie_code sim_mode')
            .lean();

        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        return NextResponse.json({ 
            simbriefId: pilot.simbrief_id || null,
            hoppieCode: pilot.hoppie_code || null,
            simMode: pilot.sim_mode || 'fsuipc'
        });
    } catch (error: any) {
        console.error('Pilot info fetch error:', error);
        return NextResponse.json({ 
            error: 'Failed to fetch pilot info',
            details: error.message 
        }, { status: 500 });
    }
}
