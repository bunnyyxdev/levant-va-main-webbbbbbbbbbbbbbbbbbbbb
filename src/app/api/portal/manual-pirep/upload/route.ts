import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { verifyAuth } from '@/lib/auth';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// POST /api/portal/manual-pirep/upload — Upload a proof screenshot (max 5MB)
export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum size is 5 MB.' }, { status: 400 });
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image files are allowed.' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

        const result = await cloudinary.uploader.upload(base64, {
            folder: 'manual_pirep_proofs',
            public_id: `proof_${session.id}_${Date.now()}`,
            resource_type: 'image',
            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        });

        return NextResponse.json({
            success: true,
            url: result.secure_url,
        });
    } catch (error: any) {
        console.error('Proof upload error:', error);
        return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
    }
}
