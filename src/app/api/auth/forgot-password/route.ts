import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Check if user exists
        const user = await Pilot.findOne({ email: email.toLowerCase() });

        // Always return success to prevent email enumeration
        if (!user) {
            return NextResponse.json({ 
                success: true,
                message: 'If an account exists with this email, your password has been reset to: pleasechangeyourpassword' 
            });
        }

        // Set temporary default password (same as admin reset)
        const defaultPassword = 'pleasechangeyourpassword';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        // Update user password
        user.password = hashedPassword;
        await user.save();

        return NextResponse.json({ 
            success: true,
            message: 'Password has been reset to: pleasechangeyourpassword',
            defaultPassword
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
