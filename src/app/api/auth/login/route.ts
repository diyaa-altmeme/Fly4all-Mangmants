import { NextResponse } from "next/server";
import { getAuthAdmin } from "@/lib/firebase/firebase-admin-sdk";

export async function POST(req: Request) {
  try {
    const authAdmin = await getAuthAdmin();
    const { idToken } = await req.json();
    if (!idToken) {
        return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }
  
    const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 أيام
    const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });
  
    return NextResponse.json(
      { success: true },
      {
        headers: {
          "Set-Cookie": `session=${sessionCookie}; HttpOnly; Path=/; Max-Age=${expiresIn / 1000}; Secure; SameSite=Lax`,
        },
      }
    );
  } catch (error: any) {
    console.error("Error creating session cookie:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
