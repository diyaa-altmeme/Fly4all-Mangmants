
import { NextResponse } from "next/server";
import { getAuthAdmin, getDb } from "@/lib/firebase/firebase-admin-sdk";

export async function POST(req: Request) {
  try {
    const adminAuth = await getAuthAdmin();
    const adminDb = await getDb();

    const body = await req.json();
    const { email, username, role = "employee" } = body;

    // TODO: Secure this endpoint by verifying the caller's identity (e.g., an admin or HR user)
    // For now, it's open for demonstration purposes.
    // const authHeader = req.headers.get("authorization") || "";
    // if (!authHeader.startsWith("Bearer ")) {
    //   return NextResponse.json({ ok: false, msg: "No token" }, { status: 401 });
    // }
    // const idToken = authHeader.split(" ")[1];
    // const decoded = await adminAuth.verifyIdToken(idToken);
    // if (!decoded || !["hr", "admin"].includes(decoded.role || '')) {
    //   return NextResponse.json({ ok: false, msg: "Forbidden" }, { status: 403 });
    // }

    // Create a temporary random password
    const tempPassword = Math.random().toString(36).slice(-10) + "A1!";

    // Create the user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password: tempPassword,
      displayName: username,
      emailVerified: false, // User will verify by resetting password
    });

    // Set custom claims for role-based access control
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });

    // Save additional user data in Firestore
    await adminDb.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      username,
      role,
      status: 'active', // Or 'pending' if you want an approval step
      createdAt: adminDb.FieldValue.serverTimestamp(),
    });

    // Generate a password reset link to act as an "invite"
    const resetLink = await adminAuth.generatePasswordResetLink(email);

    // In a real app, you would email this link to the user.
    // For now, we return it in the response.
    return NextResponse.json({
      ok: true,
      uid: userRecord.uid,
      resetLink,
    });
  } catch (err: any) {
    console.error("Error creating user:", err);
    // Provide a more specific error message if possible
    let errorMessage = err.message || "An unexpected error occurred.";
    if (err.code === 'auth/email-already-exists') {
      errorMessage = 'هذا البريد الإلكتروني مسجل بالفعل.';
    } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'صيغة البريد الإلكتروني غير صحيحة.';
    }
    return NextResponse.json({ ok: false, msg: errorMessage }, { status: 500 });
  }
}

