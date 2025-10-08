
import { createSession } from '@/app/auth/actions';
import { NextRequest, NextResponse } from 'next/server';

// This is the server-side endpoint that creates the session cookie.
// It receives the ID token from the client.
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const idToken = body.idToken;

        if (!idToken) {
            return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
        }
        
        const result = await createSession(idToken);
        
        if (result.success) {
            return NextResponse.json({ success: true }, { status: 200 });
        } else {
             return NextResponse.json({ error: result.error || 'Failed to create session' }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Session API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
