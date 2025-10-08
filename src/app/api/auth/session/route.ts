
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
        
        // This is now the single point of entry for session creation
        await createSession(idToken);
        
        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error: any) {
        console.error('Session API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
