"use server";

import type { User, Client, Role } from "@/lib/types";
import { getDb, getAuthAdmin } from "@/lib/firebase-admin";
import { cookies } from "next/headers";
import { PERMISSIONS } from "@/lib/permissions";
import { createAuditLog } from "@/app/system/activity-log/actions";
import { DecodedIdToken } from "firebase-admin/auth";
import { cleanUser } from "@/lib/cleanUser";

export async function createSession(idToken: string) {
  try {
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const decodedToken = await getAuthAdmin().verifyIdToken(idToken);

    if (decodedToken) {
      const sessionCookie = await getAuthAdmin().createSessionCookie(idToken, {
        expiresIn,
      });

      cookies().set("session", sessionCookie, {
        maxAge: expiresIn,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
      });
      return { success: true };
    }
    return { success: false, error: "Invalid ID token." };
  } catch (error: any) {
    console.error("Session Cookie Error:", error);
    return { success: false, error: "Failed to create session cookie." };
  }
}

export async function getCurrentUserFromSession(): Promise<any | null> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return null;

    try {
        const decodedToken = await getAuthAdmin().verifySessionCookie(sessionCookie, true);
        const db = await getDb();
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();

        if (userDoc.exists) {
            const userData = { id: userDoc.id, ...userDoc.data() };
            // Ensure it's a plain object
            return JSON.parse(JSON.stringify(userData));
        }
        return null;
    } catch (error) {
        console.error("Failed to verify session cookie:", error);
        return null;
    }
}


export async function verifyOtpAndLogin(
  phone: string,
  otp: string,
  type: "employee" | "client"
): Promise<{ success: boolean; error?: string; customToken?: string }> {
  const db = await getDb();
  const auth = await getAuthAdmin();
  const otpRef = db.collection("otp_requests").doc(phone);

  try {
    const otpDoc = await otpRef.get();
    if (!otpDoc.exists) {
      return { success: false, error: "لم يتم طلب OTP لهذا الرقم." };
    }

    const otpData = otpDoc.data();
    if (otpData?.otp !== otp || new Date() > otpData?.expiresAt.toDate()) {
      return { success: false, error: "كود التحقق غير صالح أو منتهي الصلاحية." };
    }

    await otpRef.update({ verified: true });

    const userQuery = await db
      .collection(type === "employee" ? "users" : "clients")
      .where("phone", "==", phone)
      .limit(1)
      .get();
    if (userQuery.empty) {
      return { success: false, error: "لم يتم العثور على مستخدم بهذا الرقم." };
    }

    const userDoc = userQuery.docs[0];
    const customToken = await auth.createCustomToken(userDoc.id);

    await createAuditLog({
      userId: userDoc.id,
      userName: userDoc.data().name,
      action: "LOGIN",
      targetType: type === "employee" ? "USER" : "CLIENT",
      description: `تم تسجيل الدخول بنجاح عبر OTP.`,
    });

    // The client will use this custom token to sign in with the client SDK
    // which will then trigger onAuthStateChanged.
    return { success: true, customToken };
  } catch (e: any) {
    console.error("OTP verification error:", e);
    return { success: false, error: e.message };
  }
}

export async function logoutUser() {
  cookies().delete("session");
}

export async function requestPublicAccount(
  data: Pick<User, "name" | "email" | "phone">
) {
  const db = await getDb();

  // Check if user already exists
  const emailQuery = await db
    .collection("users")
    .where("email", "==", data.email)
    .get();
  if (!emailQuery.empty) {
    return { success: false, error: "هذا البريد الإلكتروني مسجل بالفعل." };
  }
  const phoneQuery = await db
    .collection("users")
    .where("phone", "==", data.phone)
    .get();
  if (!phoneQuery.empty) {
    return { success: false, error: "رقم الهاتف هذا مسجل بالفعل." };
  }

  try {
    const docRef = db.collection("users").doc();
    await docRef.set({
      ...data,
      username: `user_${docRef.id.slice(0, 6)}`,
      status: "pending",
      role: "viewer", // Default role
      requestedAt: new Date().toISOString(),
    });

    // Notify admins (simplified version)
    await createAuditLog({
      userId: "system",
      userName: "النظام",
      action: "CREATE",
      targetType: "USER",
      targetId: docRef.id,
      description: `طلب حساب جديد من ${data.name} (${data.email}). الرجاء مراجعته وتفعيله.`,
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
