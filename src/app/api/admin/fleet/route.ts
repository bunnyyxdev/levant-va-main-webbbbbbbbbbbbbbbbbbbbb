import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Fleet from '@/models/Fleet';
import { verifyAuth } from '@/lib/auth';

export async function GET() {
    const auth = await verifyAuth();
    if (!auth || !auth.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const fleet = await Fleet.find({})
            .sort({ registration: 1 })
            .lean();

        return NextResponse.json({ success: true, fleet });
    } catch (error) {
        console.error('Admin fleet GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await verifyAuth();
    if (!auth || !auth.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const body = await request.json();

        const { registration, aircraft_type, name, livery, current_location } = body;

        if (!registration || !aircraft_type) {
            return NextResponse.json({ error: 'Registration and aircraft type are required' }, { status: 400 });
        }

        const existing = await Fleet.findOne({ registration: registration.toUpperCase() });
        if (existing) {
            return NextResponse.json({ error: 'Aircraft with this registration already exists' }, { status: 409 });
        }

        const aircraft = await Fleet.create({
            registration: registration.toUpperCase(),
            aircraft_type: aircraft_type.toUpperCase(),
            name: name || undefined,
            livery: livery || undefined,
            current_location: current_location || 'OJAI',
            status: 'Available',
            condition: 100,
            is_active: true,
        });

        return NextResponse.json({ success: true, aircraft });
    } catch (error) {
        console.error('Admin fleet POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const auth = await verifyAuth();
    if (!auth || !auth.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Aircraft ID is required' }, { status: 400 });
        }

        if (updates.registration) updates.registration = updates.registration.toUpperCase();
        if (updates.aircraft_type) updates.aircraft_type = updates.aircraft_type.toUpperCase();

        const aircraft = await Fleet.findByIdAndUpdate(id, updates, { new: true });
        if (!aircraft) {
            return NextResponse.json({ error: 'Aircraft not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, aircraft });
    } catch (error) {
        console.error('Admin fleet PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const auth = await verifyAuth();
    if (!auth || !auth.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Aircraft ID is required' }, { status: 400 });
        }

        await Fleet.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin fleet DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
