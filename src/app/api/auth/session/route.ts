
import { createSession, clearSession } from '@/lib/auth/actions';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (idToken) {
      await createSession(idToken);
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      // If no idToken is provided, it's a sign-out request
      await clearSession();
      return NextResponse.json({ success: true }, { status: 200 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
