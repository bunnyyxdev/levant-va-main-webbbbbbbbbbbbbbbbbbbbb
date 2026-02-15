import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Tour from '@/models/Tour';
import TourProgress from '@/models/TourProgress';

export async function GET() {
    try {
        const session = await verifyAuth(); // Optional: If public, remove this. But we need it for progress check.
        await connectDB();

        const tours = await Tour.find({ is_active: true }).lean();
        
        // Fetch user progress for all tours if logged in
        let progressMap: Record<string, any> = {};
        if (session) {
            const progressList = await TourProgress.find({ pilot_id: session.id }).lean();
            progressList.forEach((p: any) => {
                progressMap[p.tour_id] = p;
            });
        }

        const enrichedTours = tours.map((t: any) => ({
            ...t,
            user_status: progressMap[t._id.toString()]?.status || 'Not Started',
            legs_completed: progressMap[t._id.toString()]?.current_leg_index || 0
        }));

        return NextResponse.json({ tours: enrichedTours });

    } catch (error) {
        console.error('Tours API Error:', error);
        return NextResponse.json({ tours: [] }, { status: 500 });
    }
}
