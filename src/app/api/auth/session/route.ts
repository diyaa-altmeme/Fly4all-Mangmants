
import { cookies } from "next/headers";
import { getAuthAdmin } from "@/lib/firebase/firebase-admin-sdk";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authAdmin = await getAuthAdmin();
    const cookie = cookies().get("session")?.value;
    if (!cookie) return NextResponse.json({ authenticated: false });

    await authAdmin.verifySessionCookie(cookie, true); // Check if revoked
    return NextResponse.json({ authenticated: true });
  } catch {
    // Clear the invalid cookie
    const response = NextResponse.json({ authenticated: false });
    response.cookies.set('session', '', { expires: new Date(0) });
    return response;
  }
}
