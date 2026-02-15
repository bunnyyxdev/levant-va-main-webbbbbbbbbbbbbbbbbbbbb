import { NextResponse } from 'next/server';

const AIRPORTS = ['OJAI', 'OSDI', 'ORBI'];

export async function GET() {
    try {
        const clientId = process.env.NEXT_PUBLIC_IVAO_CLIENT_ID;
        const clientSecret = process.env.NEXT_PUBLIC_IVAO_CLIENT_SECRET;
        
        const metarPromises = AIRPORTS.map(async (icao) => {
            try {
                // Try IVAO API first
                const ivaoHeaders: HeadersInit = {
                    'Accept': 'application/json',
                };
                
                if (clientId && clientSecret) {
                    ivaoHeaders['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
                }
                
                const ivaoResponse = await fetch(`https://api.ivao.aero/v2/airports/${icao}`, {
                    headers: ivaoHeaders,
                    cache: 'no-store'
                });
                
                if (ivaoResponse.ok) {
                    const ivaoData = await ivaoResponse.json();
                    if (ivaoData?.metar) {
                        return {
                            icao,
                            metar: ivaoData.metar,
                            error: false
                        };
                    }
                }
                
                // Fallback to CheckWX API (public, no auth needed)
                const checkwxResponse = await fetch(`https://api.checkwx.com/metar/${icao}/decoded`, {
                    headers: {
                        'X-API-Key': 'YOUR_CHECKWX_KEY' // Optional - works without key for limited requests
                    },
                    cache: 'no-store'
                });
                
                if (checkwxResponse.ok) {
                    const checkwxData = await checkwxResponse.json();
                    if (checkwxData?.data?.[0]) {
                        return {
                            icao,
                            metar: checkwxData.data[0],
                            error: false
                        };
                    }
                }
                
                // Final fallback to AVWX (public API)
                const avwxResponse = await fetch(`https://avwx.rest/api/metar/${icao}`, {
                    cache: 'no-store'
                });
                
                if (avwxResponse.ok) {
                    const avwxData = await avwxResponse.json();
                    if (avwxData?.raw) {
                        return {
                            icao,
                            metar: avwxData.raw,
                            error: false
                        };
                    }
                }
                
                return { icao, metar: 'METAR not available', error: true };
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
