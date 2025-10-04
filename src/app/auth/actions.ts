
'use server';

import type { User, Client, Role } from "@/lib/types";
import { getDb } from "@/lib/firebase-admin";
import { cookies } from 'next/headers'
import { PERMISSIONS } from "@/lib/permissions";
import { createAuditLog } from "@/app/system/activity-log/actions";
import bcrypt from 'bcrypt';


export async function getCurrentUserFromSession(): Promise<(User & { uid: string, permissions: string[] }) | (Client & { uid: string }) | null> {
    
    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) return null;
    
    try {
        const decodedToken = JSON.parse(sessionCookie);
        const db = await getDb();
        
        const userDoc = await db.collection(decodedToken.type === 'employee' ? 'users' : 'clients').doc(decodedToken.uid).get();

        if (!userDoc.exists) return null;
        
        const userData = userDoc.data() as User | Client;

        if (userData.status !== 'active') {
            return null; // Don't allow login for non-active users
        }

        if (decodedToken.type === 'employee') {
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

export async function loginUser(identifier: string, password: string, type: 'employee' | 'client'): Promise<{ success: boolean; error?: string; otp_required?: boolean, phone?: string }> {
    const db = await getDb();
    
    const collectionName = type === 'employee' ? 'users' : 'clients';
    
    try {
        // Try finding by email first, then username/loginIdentifier
        let userQuery = await db.collection(collectionName).where('email', '==', identifier).limit(1).get();
        if (userQuery.empty) {
            const identifierField = type === 'employee' ? 'username' : 'loginIdentifier';
            userQuery = await db.collection(collectionName).where(identifierField, '==', identifier).limit(1).get();
        }
         if (userQuery.empty && type === 'client') {
            userQuery = await db.collection(collectionName).where('code', '==', identifier).limit(1).get();
        }

        if (userQuery.empty) {
            return { success: false, error: 'المستخدم غير موجود.' };
        }

        const userDoc = userQuery.docs[0];
        const userData = userDoc.data() as User | Client;

        if (!userData.password) {
            return { success: false, error: 'هذا الحساب لا يمتلك كلمة مرور. الرجاء التواصل مع الدعم.' };
        }

        const passwordMatch = await bcrypt.compare(password, userData.password);

        if (!passwordMatch) {
            return { success: false, error: 'كلمة المرور غير صحيحة.' };
        }
        
        if (userData.status !== 'active') {
             return { success: false, error: `حالة الحساب "${userData.status}". لا يمكن تسجيل الدخول.` };
        }
        
        // OTP check
        if (userData.otpLoginEnabled) {
            // Here you would trigger the OTP flow
            // For now, we'll just indicate it's required
            return { success: true, otp_required: true, phone: userData.phone };
        }

        // Create session
        const sessionPayload = { uid: userDoc.id, type };
        const cookieStore = await cookies();
        cookieStore.set('session', JSON.stringify(sessionPayload), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
            sameSite: 'lax',
        });
        
         await createAuditLog({
            userId: userDoc.id,
            userName: userData.name,
            action: 'LOGIN',
            targetType: type === 'employee' ? 'USER' : 'CLIENT',
            description: `تم تسجيل الدخول بنجاح.`,
        });

        return { success: true };
    } catch (error: any) {
        console.error("Login error:", error);
        return { success: false, error: error.message };
    }
}

export async function verifyOtpAndLogin(phone: string, otp: string, type: 'employee' | 'client'): Promise<{ success: boolean; error?: string }> {
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
         
         const sessionPayload = { uid: userDoc.id, type };
         const cookieStore = await cookies();
         cookieStore.set('session', JSON.stringify(sessionPayload), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
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
