import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import { PilotModel } from '@/models';

export async function POST(request: NextRequest) {
    try {
        const { pilotId } = await request.json();
        
        if (!pilotId) {
            return NextResponse.json({ error: 'Pilot ID required' }, { status: 400 });
        }

        await connectDB();
        const pilot = await PilotModel.findOne({ pilot_id: pilotId }).lean();

        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        const simbriefId = pilot.simbrief_id;
        if (!simbriefId) {
            return NextResponse.json({ 
                error: 'SimBrief ID not configured. Please add your SimBrief ID in Settings.' 
            }, { status: 400 });
        }

        // Fetch latest SimBrief OFP
        const sbRes = await fetch(
            `https://www.simbrief.com/api/xml.fetcher.php?userid=${simbriefId}&json=v2`,
            { cache: 'no-store' }
        );

        if (!sbRes.ok) {
            return NextResponse.json({ 
                error: 'Failed to fetch SimBrief flight plan' 
            }, { status: 500 });
        }

        const sbData = await sbRes.json();

        if (sbData?.fetch?.status !== 'Success') {
            return NextResponse.json({ 
                error: 'No SimBrief flight plan found. Please create a flight plan on SimBrief first.' 
            }, { status: 404 });
        }

        // Extract flight plan data
        const flightPlan = {
            callsign: sbData.atc?.callsign || `${pilot.pilot_id}`,
            flightNumber: sbData.general?.flight_number || sbData.atc?.callsign || '',
            departureIcao: sbData.origin?.icao_code || '',
            arrivalIcao: sbData.destination?.icao_code || '',
            departureName: sbData.origin?.name || '',
            arrivalName: sbData.destination?.name || '',
            alternateIcao: sbData.alternate?.icao_code || '',
            alternateName: sbData.alternate?.name || '',
            aircraftType: sbData.aircraft?.icaocode || '',
            aircraftRegistration: sbData.aircraft?.reg || '',
            route: sbData.general?.route || '',
            pax: parseInt(sbData.weights?.pax_count || '0'),
            cargo: parseInt(sbData.weights?.cargo || '0'),
            cruiseAltitude: parseInt(sbData.general?.initial_altitude || '0'),
            flightTime: sbData.times?.est_time_enroute || '',
            distance: parseInt(sbData.general?.air_distance || '0'),
            fuel: parseInt(sbData.fuel?.plan_ramp || '0'),
            // Weather
            originMetar: sbData.weather?.orig_metar || '',
            destMetar: sbData.weather?.dest_metar || '',
            altnMetar: sbData.weather?.altn_metar || '',
            // Timestamps
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        };

        return NextResponse.json({ flightPlan });
    } catch (error: any) {
        console.error('SimBrief fetch error:', error);
        return NextResponse.json({ 
            error: 'Failed to fetch SimBrief flight plan',
            details: error.message 
        }, { status: 500 });
    }
}
