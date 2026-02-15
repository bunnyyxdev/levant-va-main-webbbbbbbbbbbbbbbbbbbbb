import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import { PilotModel } from '@/models';

export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        const { simbriefId } = await request.json();

        await PilotModel.findByIdAndUpdate(session.id, { 
            simbrief_id: simbriefId 
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Save SimBrief ID error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
