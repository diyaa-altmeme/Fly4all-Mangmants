
'use server';

import { getAuth } from 'firebase-admin/auth';
import { initializeAdmin } from '@/lib/firebase-admin';
import type { User, HrData, Role } from '@/lib/types';
import { getDb } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { getBoxes } from '../boxes/actions';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';


export async function getUsers({ includeHrData = false, all = false, from, to }: { includeHrData?: boolean, all?: boolean, from?: Date, to?: Date } = {}): Promise<HrData[]> {
  await initializeAdmin();
  const db = await getDb();
  const auth = await getAuth();
  
  const userRecords = await auth.listUsers();
  const firestoreUsersSnap = await db.collection('users').get();
  const firestoreUsers = new Map(firestoreUsersSnap.docs.map(doc => [doc.id, doc.data()]));

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
      calculatedTotalProfit: 0, // Will be calculated below
      calculatedNetSalary: 0, // Will be calculated below
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
}


export async function addUser(data: Omit<User, 'uid' | 'id'>) {
    await initializeAdmin();
    const auth = getAuth();
    const db = getDb();

    const { email, password, name, phone, ...firestoreData } = data;

    if (!password) {
        throw new Error("Password is required for new users.");
    }
    
    const userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
        phoneNumber: phone,
        disabled: data.status === 'blocked',
    });

    await db.collection('users').doc(userRecord.uid).set({
        ...firestoreData,
        name,
        email,
        phone,
    });

    revalidatePath('/users');
    return { success: true, newUser: { uid: userRecord.uid, ...data } };
}

export async function updateUser(uid: string, data: Partial<User>) {
    await initializeAdmin();
    const auth = getAuth();
    const db = getDb();
    
    const { email, name, phone, password, status, ...firestoreData } = data;
    
    const authUpdatePayload: any = {};
    if (email) authUpdatePayload.email = email;
    if (name) authUpdatePayload.displayName = name;
    if (phone) authUpdatePayload.phoneNumber = phone;
    if (password) authUpdatePayload.password = password;
    if (status) authUpdatePayload.disabled = status === 'blocked';

    if (Object.keys(authUpdatePayload).length > 0) {
        await auth.updateUser(uid, authUpdatePayload);
    }

    if (Object.keys(firestoreData).length > 0) {
        await db.collection('users').doc(uid).set(firestoreData, { merge: true });
    }
     
    revalidatePath('/users');
    const updatedUserDoc = await db.collection('users').doc(uid).get();
    const updatedUserData = updatedUserDoc.data() as User;
    return { success: true, updatedUser: { ...updatedUserData, uid } };
}

export async function deleteUser(uid: string) {
    await initializeAdmin();
    const auth = getAuth();
    const db = getDb();

    await auth.deleteUser(uid);
    await db.collection('users').doc(uid).delete();

    revalidatePath('/users');
    return { success: true };
}


// ROLES
export async function getRoles(): Promise<Role[]> {
    await initializeAdmin();
    const db = getDb();
    const snapshot = await db.collection('roles').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role));
}

export async function addRole(data: Omit<Role, 'id'>) {
    await initializeAdmin();
    const db = getDb();
    const roleId = data.name.toLowerCase().replace(/\s+/g, '_');
    await db.collection('roles').doc(roleId).set(data);
    revalidatePath('/users');
    return { success: true, newRole: { id: roleId, ...data }};
}

export async function updateUserRole(id: string, data: Partial<Role>) {
     await initializeAdmin();
    const db = getDb();
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
    await initializeAdmin();
    const auth = getAuth();
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
