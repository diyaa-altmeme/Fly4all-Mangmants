

'use server';

import { getAuth } from 'firebase-admin/auth';
import type { User, HrData, Role } from '@/lib/types';
import { getDb } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { getBoxes } from '../boxes/actions';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { randomBytes } from 'crypto';

const processDoc = (docData: any): any => {
    if (!docData) return null;

    const safeData = JSON.parse(JSON.stringify(docData));

    for (const key in safeData) {
        if (safeData[key] && (safeData[key].hasOwnProperty('_seconds') || typeof safeData[key].toDate === 'function')) {
            safeData[key] = new Date(safeData[key]._seconds * 1000 || safeData[key].toDate()).toISOString();
        }
    }
    return safeData;
};

export async function getUserByEmail(email: string): Promise<User | null> {
    const db = await getDb();
    if (!db) return null;

    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).limit(1).get();

        if (snapshot.empty) {
            return null;
        }

        const userDoc = snapshot.docs[0];
        const userData = processDoc(userDoc.data()) as User;
        
        return { ...userData, uid: userDoc.id };

    } catch (error) {
        console.error("Error getting user by email:", error);
        return null;
    }
}


export async function getUsers({ includeHrData = false, all = false, from, to }: { includeHrData?: boolean, all?: boolean, from?: Date, to?: Date } = {}): Promise<(User | HrData)[]> {
    try {
        const db = await getDb();
        const auth = getAuth();
        
        const [userRecords, firestoreUsersSnap] = await Promise.all([
            auth.listUsers(),
            db.collection('users').get()
        ]);

        const firestoreUsers = new Map(firestoreUsersSnap.docs.map(doc => [doc.id, processDoc(doc.data())]));

        const users: HrData[] = userRecords.users.map(user => {
            const firestoreData = firestoreUsers.get(user.uid) || {};
            return {
                uid: user.uid,
                name: user.displayName || firestoreData.name || 'No Name',
                username: firestoreData.username || '',
                email: user.email || firestoreData.email || '',
                phone: user.phoneNumber || firestoreData.phone || '',
                avatarUrl: user.photoURL || firestoreData.avatarUrl,
                status: firestoreData.status || (user.disabled ? 'blocked' : 'pending'),
                role: firestoreData.role || 'viewer',
                department: firestoreData.department,
                position: firestoreData.position,
                boxId: firestoreData.boxId,
                baseSalary: firestoreData.baseSalary || 0,
                bonuses: firestoreData.bonuses || 0,
                deductions: firestoreData.deductions || 0,
                notes: firestoreData.notes,
                attendance: firestoreData.attendance || [],
                ticketProfit: firestoreData.ticketProfit,
                visaProfit: firestoreData.visaProfit,
                groupProfit: firestoreData.groupProfit,
                changeProfit: firestoreData.changeProfit,
                segmentProfit: firestoreData.segmentProfit,
                calculatedTotalProfit: 0,
                calculatedNetSalary: 0,
            };
        });

        if (includeHrData) {
            const fromDate = from ? startOfDay(from) : undefined;
            const toDate = to ? endOfDay(to) : undefined;

            const journalSnap = await db.collection('journal-vouchers').get();
            const userProfits: Record<string, number> = {};

            journalSnap.forEach(doc => {
                const voucher = doc.data();
                const officerName = voucher.officer;
                const entryDate = parseISO(voucher.date);

                if (officerName && (!fromDate || !toDate || (entryDate >= fromDate && entryDate <= toDate))) {
                    if (!userProfits[officerName]) {
                        userProfits[officerName] = 0;
                    }
                    const sale = voucher.originalData?.salePrice || (voucher.originalData?.passengers || []).reduce((acc: number, p: any) => acc + (p.salePrice || 0), 0);
                    const cost = voucher.originalData?.purchasePrice || (voucher.originalData?.passengers || []).reduce((acc: number, p: any) => acc + (p.purchasePrice || 0), 0);
                    userProfits[officerName] += (sale - cost);
                }
            });

            users.forEach(user => {
                user.calculatedTotalProfit = userProfits[user.name] || 0;
                user.calculatedNetSalary = (user.baseSalary || 0) + (user.bonuses || 0) - (user.deductions || 0) + user.calculatedTotalProfit;
            });
        }
        return users;
    } catch (error) {
        console.error("Error fetching users:", error);
        return []; // Return empty array on error
    }
}


export async function addUser(data: Omit<User, 'uid' | 'id'>) {
    const auth = await getAuth();
    const db = await getDb();

    const { email, password, name, phone, ...firestoreData } = data;

    const finalPassword = password && password.length >= 6 ? password : randomBytes(16).toString('hex');
    
    // Ensure phone number is in E.164 format
    let formattedPhone = phone;
    if (formattedPhone && !formattedPhone.startsWith('+')) {
        // Assuming Iraqi numbers if no country code is provided
        if (formattedPhone.startsWith('0')) {
            formattedPhone = `+964${phone.substring(1)}`;
        } else {
            formattedPhone = `+964${phone}`;
        }
    }

    const userRecord = await auth.createUser({
        email,
        password: finalPassword,
        displayName: name,
        phoneNumber: formattedPhone,
        disabled: data.status === 'blocked',
    });

    await db.collection('users').doc(userRecord.uid).set({
        ...firestoreData,
        name,
        email,
        phone: formattedPhone,
    });

    revalidatePath('/users');
    return { success: true, newUser: { uid: userRecord.uid, ...data } };
}

export async function updateUser(uid: string, data: Partial<User>) {
    const auth = await getAuth();
    const db = await getDb();
    
    // Separate data for Auth and Firestore
    const { 
        email, name, phone, password, status, avatarUrl, 
        ...firestoreData 
    } = data;
    
    const authUpdatePayload: any = {};
    if (email) authUpdatePayload.email = email;
    if (name) authUpdatePayload.displayName = name;
    if (phone) authUpdatePayload.phoneNumber = phone;
    if (avatarUrl) authUpdatePayload.photoURL = avatarUrl;
    if (password && password.length >= 6) authUpdatePayload.password = password;
    if (status) authUpdatePayload.disabled = status === 'blocked';

    // Update Firebase Auth if there are relevant changes
    if (Object.keys(authUpdatePayload).length > 0) {
        await auth.updateUser(uid, authUpdatePayload);
    }

    // Always update Firestore with all fields (auth and custom)
    // to ensure they are in sync.
    const firestoreUpdatePayload = { ...firestoreData, email, name, phone, status, avatarUrl };
    // Remove undefined values so Firestore doesn't overwrite fields with undefined
    Object.keys(firestoreUpdatePayload).forEach(key => (firestoreUpdatePayload as any)[key] === undefined && delete (firestoreUpdatePayload as any)[key]);


    if (Object.keys(firestoreUpdatePayload).length > 0) {
        await db.collection('users').doc(uid).set(firestoreUpdatePayload, { merge: true });
    }
     
    revalidatePath('/users');
    const updatedUserDoc = await db.collection('users').doc(uid).get();
    const updatedUserData = processDoc(updatedUserDoc.data()) as User;
    return { success: true, updatedUser: { ...updatedUserData, uid } };
}

export async function deleteUser(uid: string) {
    const auth = await getAuth();
    const db = await getDb();

    await auth.deleteUser(uid);
    await db.collection('users').doc(uid).delete();

    revalidatePath('/users');
    return { success: true };
}


// ROLES
export async function getRoles(): Promise<Role[]> {
    const db = await getDb();
    const snapshot = await db.collection('roles').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role));
}

export async function addRole(data: Omit<Role, 'id'>) {
    const db = await getDb();
    const roleId = data.name.toLowerCase().replace(/\s+/g, '_');
    await db.collection('roles').doc(roleId).set(data);
    revalidatePath('/users');
    return { success: true, newRole: { id: roleId, ...data }};
}

export async function updateUserRole(id: string, data: Partial<Role>) {
    const db = await getDb();
    await db.collection('roles').doc(id).update(data);
     revalidatePath('/users');
    return { success: true };
}


export async function listAllAuthUsers(): Promise<{ 
  success: boolean; 
  users?: any[]; 
  error?: string; 
}> {
  try {
    const auth = await getAuth();
    const userRecords = await auth.listUsers();
    const users = userRecords.users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      creationTime: new Date(user.metadata.creationTime).toLocaleDateString(),
    }));
    return { success: true, users };
  } catch (error: any) {
    console.error("Error listing all auth users:", error);
    return { success: false, error: error.message };
  }
}
