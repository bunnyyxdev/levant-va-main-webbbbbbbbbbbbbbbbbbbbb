import { NextResponse } from 'next/server';

const AIRPORTS = ['OJAI', 'OSDI', 'ORBI'];

export async function GET() {
    try {
        const clientId = process.env.NEXT_PUBLIC_IVAO_CLIENT_ID;
        const clientSecret = process.env.NEXT_PUBLIC_IVAO_CLIENT_SECRET;
        
        const metarPromises = AIRPORTS.map(async (icao) => {
            try {
                const headers: HeadersInit = {
                    'Accept': 'application/json',
                };
                
                // Add authentication if credentials are available
                if (clientId && clientSecret) {
                    headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
                }
                
                const response = await fetch(`https://api.ivao.aero/v2/airports/${icao}/metar`, {
                    headers,
                    next: { revalidate: 300 } // Cache for 5 minutes
                });
                
                if (!response.ok) {
                    return { icao, metar: 'METAR not available', error: true };
                }
                
                const data = await response.json();
                return {
                    icao,
                    metar: data.metar || 'METAR not available',
                    error: false
                };
            } catch (error) {
                console.error(`Error fetching METAR for ${icao}:`, error);
                return { icao, metar: 'METAR not available', error: true };
            }
        });

        const metars = await Promise.all(metarPromises);
        
        return NextResponse.json({ metars });
    } catch (error) {
        console.error('METAR API Error:', error);
        return NextResponse.json({ 
            metars: AIRPORTS.map(icao => ({ icao, metar: 'Service unavailable', error: true }))
        });
    }
}
