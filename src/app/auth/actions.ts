


'use server';

import type { User, Client, Role } from "@/lib/types";
import { getDb, getAuthAdmin } from "@/lib/firebase-admin";
import { cookies } from 'next/headers'
import { PERMISSIONS } from "@/lib/permissions";
import { createAuditLog } from "@/app/system/activity-log/actions";
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';


export async function getCurrentUserFromSession(): Promise<(User & { uid: string, permissions: string[] }) | (Client & { uid: string }) | null> {
    
    // Hardcoded user for development purposes as requested.
    // This bypasses the need for login.
    const devUser: (User & { uid: string, permissions: string[] }) = {
        uid: "5V2a9sFmEjZosRARbpA8deWhdVJ3",
        name: "ضياء التميمي",
        username: "diyaa",
        email: "acc.alrwdaten@gmail.com",
        phone: "07718601525",
        role: "admin",
        status: 'active',
        department: 'قسم الحسابات',
        position: 'محاسب',
        boxId: '38xLfnrcAu9WpDUaIzti',
        baseSalary: 0,
        bonuses: 0,
        deductions: 0,
        ticketProfit: 0,
        visaProfit: 0,
        groupProfit: 0,
        changeProfit: 0,
        segmentProfit: 0,
        permissions: ['*'], // Admin has all permissions
        attendance: [],
        avatarUrl: "",
        notes: "",
        otpLoginEnabled: false,
        hrDataLastUpdated: "",
        requestedAt: "2025-09-30T10:03:54.107Z",
    };
    return devUser;

    
    // Original Login Logic
    // const sessionCookie = (await cookies()).get('session')?.value;
    // if (!sessionCookie) return null;
    
    // try {
    //     const decodedToken = await getAuthAdmin().verifySessionCookie(sessionCookie, true);
    //     const db = await getDb();
        
    //     const isEmployee = decodedToken.role; // Assuming only employees have roles
    //     const collection = isEmployee ? 'users' : 'clients';
        
    //     const userDoc = await db.collection(collection).doc(decodedToken.uid).get();

    //     if (!userDoc.exists) return null;
        
    //     const userData = userDoc.data() as User | Client;

    //     if (userData.status !== 'active') {
    //         return null; // Don't allow login for non-active users
    //     }

    //     if (isEmployee) {
    //         const userRole = (userData as User).role;
    //         const roleDoc = await db.collection('roles').doc(userRole).get();
    //         const permissions = roleDoc.exists ? roleDoc.data()?.permissions : [];
    //         return { ...userData, uid: userDoc.id, permissions } as (User & { uid: string, permissions: string[] });
    //     } else {
    //          return { ...userData, uid: userDoc.id } as (Client & { uid: string });
    //     }
    // } catch (error) {
    //     console.error("Error verifying session cookie:", error);
    //     // Important: Re-throw or return null to indicate failure
    //     return null;
    // }
    
}


export async function verifyOtpAndLogin(phone: string, otp: string, type: 'employee' | 'client'): Promise<{ success: boolean; error?: string }> {
     const db = await getDb();
     const auth = await getAuthAdmin();
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
         const sessionCookie = await auth.createSessionCookie(userDoc.id, { expiresIn });
         
         const cookieStore = await cookies();
         cookieStore.set('session', sessionCookie, {
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
    const cookieStore = await cookies();
    cookieStore.delete('session');
}

export async function requestPublicAccount(data: Pick<User, 'name' | 'email' | 'phone'>) {
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
