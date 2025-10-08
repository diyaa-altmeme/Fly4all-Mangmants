
import { createSession } from '@/app/auth/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { idToken } = await request.json();
        if (!idToken) {
            return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
        }
        await createSession(idToken);
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error('Session API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
