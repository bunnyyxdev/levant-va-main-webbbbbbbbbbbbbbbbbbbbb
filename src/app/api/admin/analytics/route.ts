import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';
import Flight from '@/models/Flight';

export async function GET() {
    const session = await verifyAuth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();

        const pilot = await Pilot.findById(session.id).select('role').lean() as any;
        if (!pilot || pilot.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [
            totalPilots,
            activePilots30d,
            totalFlights,
            flightsThisWeek,
            pendingPireps,
            topRoutes,
            flightsPerDay,
        ] = await Promise.all([
            Pilot.countDocuments(),
            Pilot.countDocuments({ last_activity: { $gte: monthAgo } }),
            Flight.countDocuments({ approved_status: 1 }),
            Flight.countDocuments({ submitted_at: { $gte: weekAgo }, approved_status: 1 }),
            Flight.countDocuments({ approved_status: 0 }),
            Flight.aggregate([
                { $match: { approved_status: 1 } },
                { $group: { _id: { dep: '$departure_icao', arr: '$arrival_icao' }, count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
                { $project: { _id: 0, route: { $concat: ['$_id.dep', ' → ', '$_id.arr'] }, count: 1 } },
            ]),
            Flight.aggregate([
                { $match: { submitted_at: { $gte: weekAgo }, approved_status: 1 } },
                { $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$submitted_at' } },
                    count: { $sum: 1 },
                }},
                { $sort: { _id: 1 } },
            ]),
        ]);

        return NextResponse.json({
            totalPilots,
            activePilots30d,
            totalFlights,
            flightsThisWeek,
            pendingPireps,
            topRoutes,
            flightsPerDay: flightsPerDay.map((d: any) => ({ date: d._id, flights: d.count })),
        });
    } catch (error: any) {
        console.error('Admin analytics error:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
