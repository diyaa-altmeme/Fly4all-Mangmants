

'use server';

import type { User, Client, Role } from "@/lib/types";
import { getDb, initializeAdmin } from "@/lib/firebase-admin";
import { cookies } from 'next/headers'
import { PERMISSIONS } from "@/lib/permissions";
import { createAuditLog } from "@/app/system/activity-log/actions";
import { getAuth } from 'firebase-admin/auth';


export async function getCurrentUserFromSession(): Promise<(User & { uid: string, permissions: string[] }) | (Client & { uid: string }) | null> {
    
    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) return null;
    
    try {
        await initializeAdmin();
        const decodedToken = await getAuth().verifySessionCookie(sessionCookie, true);
        const db = await getDb();
        
        const isEmployee = decodedToken.role; // Assuming only employees have roles
        const collection = isEmployee ? 'users' : 'clients';
        
        const userDoc = await db.collection(collection).doc(decodedToken.uid).get();

        if (!userDoc.exists) return null;
        
        const userData = userDoc.data() as User | Client;

        if (userData.status !== 'active') {
            return null; // Don't allow login for non-active users
        }

        if (isEmployee) {
            const userRole = (userData as User).role;
            const roleDoc = await db.collection('roles').doc(userRole).get();
            const permissions = roleDoc.exists ? roleDoc.data()?.permissions : [];
            return { ...userData, uid: userDoc.id, permissions } as (User & { uid: string, permissions: string[] });
        } else {
             return { ...userData, uid: userDoc.id } as (Client & { uid: string });
        }
    } catch (error) {
        console.error("Error verifying session cookie:", error);
        return null;
    }
}


export async function verifyOtpAndLogin(phone: string, otp: string, type: 'employee' | 'client'): Promise<{ success: boolean; error?: string }> {
     await initializeAdmin();
     const db = await getDb();
     const otpRef = db.collection('otp_requests').doc(phone);
     
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
         
         const userQuery = await db.collection(type === 'employee' ? 'users' : 'clients').where('phone', '==', phone).limit(1).get();
         if (userQuery.empty) {
             return { success: false, error: "لم يتم العثور على مستخدم بهذا الرقم." };
         }
         
         const userDoc = userQuery.docs[0];
         const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
         const sessionCookie = await getAuth().createSessionCookie(userDoc.id, { expiresIn });
         
         cookies().set('session', sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'lax',
        });

        await createAuditLog({
            userId: userDoc.id,
            userName: userDoc.data().name,
            action: 'LOGIN',
            targetType: type === 'employee' ? 'USER' : 'CLIENT',
            description: `تم تسجيل الدخول بنجاح عبر OTP.`,
        });

        return { success: true };

     } catch(e: any) {
         console.error("OTP verification error:", e);
         return { success: false, error: e.message };
     }
}


export async function logoutUser() {
    cookies().delete('session');
}

export async function requestPublicAccount(data: Pick<User, 'name' | 'email' | 'phone'>) {
    await initializeAdmin();
    const db = await getDb();
    
    // Check if user already exists
    const emailQuery = await db.collection('users').where('email', '==', data.email).get();
    if (!emailQuery.empty) {
        return { success: false, error: 'هذا البريد الإلكتروني مسجل بالفعل.' };
    }
    const phoneQuery = await db.collection('users').where('phone', '==', data.phone).get();
    if (!phoneQuery.empty) {
        return { success: false, error: 'رقم الهاتف هذا مسجل بالفعل.' };
    }

    try {
        const docRef = db.collection('users').doc();
        await docRef.set({
            ...data,
            username: `user_${docRef.id.slice(0, 6)}`,
            status: 'pending',
            role: 'viewer', // Default role
            requestedAt: new Date().toISOString(),
        });

        // Notify admins (simplified version)
        // In a real app, you might query for all users with an 'admin' role
        await createAuditLog({
            userId: 'system',
            userName: 'النظام',
            action: 'CREATE',
            targetType: 'USER',
            targetId: docRef.id,
            description: `طلب حساب جديد من ${data.name} (${data.email}). الرجاء مراجعته وتفعيله.`,
        });
        
        return { success: true };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
