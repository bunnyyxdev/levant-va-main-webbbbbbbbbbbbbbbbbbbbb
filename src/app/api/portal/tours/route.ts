import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Tour from '@/models/Tour';
import TourProgress from '@/models/TourProgress';

export async function GET() {
    try {
        const session = await verifyAuth(); // Optional: If public, remove this. But we need it for progress check.
        await connectDB();

        const now = new Date();
        const tours = await Tour.find({
            active: true,
            $and: [
                { $or: [{ start_date: { $exists: false } }, { start_date: null }, { start_date: { $lte: now } }] },
                { $or: [{ end_date: { $exists: false } }, { end_date: null }, { end_date: { $gte: now } }] },
            ],
        }).lean();
        
        // Fetch user progress for all tours if logged in
        let progressMap: Record<string, any> = {};
        if (session) {
            const progressList = await TourProgress.find({ pilot_id: session.id }).lean();
            progressList.forEach((p: any) => {
                progressMap[p.tour_id?.toString?.() || String(p.tour_id)] = p;
            });
        }

        const enrichedTours = tours.map((t: any) => {
            const p = progressMap[t._id.toString()];

            const completedLegs = Array.isArray(p?.completed_legs)
                ? p.completed_legs.length
                : typeof p?.current_leg === 'number'
                    ? p.current_leg
                    : 0;

            const totalLegs = Array.isArray(t?.legs) ? t.legs.length : 0;
            const completed = totalLegs > 0 && completedLegs >= totalLegs;

            return {
                ...t,
                userProgress: {
                    completed,
                    completedLegs,
                    totalLegs,
                },

                // Legacy fields (kept for any older UI pieces)
                user_status: completed ? 'Completed' : p ? 'In Progress' : 'Not Started',
                legs_completed: completedLegs,
            };
        });

        return NextResponse.json({ tours: enrichedTours });

    } catch (error) {
        console.error('Tours API Error:', error);
        return NextResponse.json({ tours: [] }, { status: 500 });
    }
}
