
"use server";

import type { User, Client, Role } from "@/lib/types";
import { getDb, getAuthAdmin } from "@/lib/firebase-admin";
import { cookies } from "next/headers";
import { createAuditLog } from "@/app/system/activity-log/actions";
import { DecodedIdToken } from "firebase-admin/auth";

export async function createSession(idToken: string | null) {
  try {
    if (!idToken) {
        cookies().delete("session");
        return { success: true, message: "Session cleared." };
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
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
        
        let userDoc = await db.collection('users').doc(decodedToken.uid).get();

        if (userDoc.exists) {
            const firestoreData = userDoc.data();
            const combinedUser = {
                ...firestoreData,
                uid: decodedToken.uid,
                email: decodedToken.email,
                name: decodedToken.name || firestoreData.name, 
            };
            return JSON.parse(JSON.stringify(combinedUser));
        } else {
            // Check if it's a client
            const clientDoc = await db.collection('clients').doc(decodedToken.uid).get();
            if (clientDoc.exists) {
                const firestoreData = clientDoc.data();
                 const combinedUser = {
                    ...firestoreData,
                    uid: decodedToken.uid,
                    email: decodedToken.email,
                    name: decodedToken.name || firestoreData.name, 
                };
                 return JSON.parse(JSON.stringify(combinedUser));
            }
        }
        
        // If no record found in 'users' or 'clients', return a basic object
        // This is crucial for new users created only in Auth
        const basicUser = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name || decodedToken.email,
            role: 'viewer', // Assign a default, least-privileged role for employees
            permissions: [],
        };
        return JSON.parse(JSON.stringify(basicUser));

    } catch (error) {
        console.error("Failed to verify session cookie or fetch user data:", error);
        // On any error, treat as not logged in.
        return null;
    }
}


export async function logoutUser() {
    cookies().delete("session");
}

export async function requestPublicAccount(
  data: Pick<User, "name" | "email" | "phone">
) {
  const db = await getDb();

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
