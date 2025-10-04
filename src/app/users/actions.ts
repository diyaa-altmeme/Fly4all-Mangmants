

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { User, Role, AttendanceDoc } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { PERMISSIONS } from '@/lib/permissions';
import { getSettings } from '@/app/settings/actions';
import { createNotification } from '../notifications/actions';
import { getCurrentUserFromSession } from '../auth/actions';
import { createAuditLog } from '../system/activity-log/actions';
import { cache } from 'react';
import bcrypt from 'bcrypt';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface HrData extends User {
    calculatedTotalProfit?: number;
    calculatedNetSalary?: number;
}


const aggregateAttendance = (attendanceDocs: any[]) => {
    return attendanceDocs.reduce((acc, doc) => {
        const data = doc.data() as AttendanceDoc;
        acc.workHours += data.workHours || 0;
        acc.overtimeHours += data.overtimeHours || 0;
        acc.lateMinutes += data.lateMinutes || 0;
        if (!data.checkIn && !data.checkOut) { 
            acc.absences += 1;
        }
        return acc;
    }, { workHours: 0, overtimeHours: 0, lateMinutes: 0, absences: 0 });
};

export const getUsers = cache(async (options: { includeHrData?: boolean, all?: boolean } = {}): Promise<User[]> => {
    const { includeHrData = false, all = false } = options;
    const db = await getDb();
    if (!db) return [];

    try {
        let query: FirebaseFirestore.Query = db.collection('users');
        if (!all) {
            // This was filtering out pending users. We want all users in the user management page.
            // Let's fetch all users by default in this function and let the caller filter if needed.
            // query = query.where('status', '==', 'active');
        }
        const usersSnapshot = await query.orderBy('name').get();
        const users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
        
        if (!includeHrData) {
            return users;
        }

        const interval = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };

        const attendanceSnap = await db.collection('attendance')
          .where('date','>=', interval.start.toISOString().slice(0,10))
          .where('date','<=', interval.end.toISOString().slice(0,10))
          .get();

        const attendanceByEmployee: { [key: string]: any[] } = {};
        attendanceSnap.forEach(doc => {
            const data = doc.data() as AttendanceDoc;
            if (!attendanceByEmployee[data.employeeId]) {
                attendanceByEmployee[data.employeeId] = [];
            }
            attendanceByEmployee[data.employeeId].push(doc);
        });

        return users.map(user => {
            const userAttendanceDocs = attendanceByEmployee[user.uid] || [];
            const metrics = aggregateAttendance(userAttendanceDocs);
            
            const baseSalary = user.baseSalary || 0;
            const monthlyHours = 176;
            const overtimeRate = 1.5;
            
            const overtimeAmount = metrics.overtimeHours * (baseSalary / monthlyHours) * overtimeRate;
            const lateDeduction = Math.floor(metrics.lateMinutes / 30) * 5000;
            const absenceDeduction = metrics.absences * (baseSalary / 22);
            const totalDeductions = (user.deductions || 0) + lateDeduction + absenceDeduction;
            const totalProfit = (user.ticketProfit || 0) + (user.visaProfit || 0) + (user.groupProfit || 0) + (user.changeProfit || 0) + (user.segmentProfit || 0);
            const netSalary = baseSalary + (user.bonuses || 0) + overtimeAmount + totalProfit - totalDeductions;
            
            return {
                ...user,
                calculatedTotalProfit: totalProfit,
                calculatedNetSalary: netSalary,
            };
        });

    } catch (error) {
        console.error("Error getting users from Firestore: ", String(error));
        return [];
    }
});


export async function addUser(userData: Omit<User, 'uid' | 'requestedAt'>): Promise<{ success: boolean; error?: string; newUser?: User }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const admin = await getCurrentUserFromSession();
    if (!admin) return { success: false, error: "Unauthorized" };

    try {
        const docRef = db.collection('users').doc();
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(userData.password!, saltRounds);

        const newUser: Omit<User, 'uid'> = {
            ...userData,
            password: hashedPassword,
            requestedAt: new Date().toISOString(),
            baseSalary: 0,
            bonuses: 0,
            deductions: 0,
            attendance: [],
            ticketProfit: 0,
            visaProfit: 0,
            groupProfit: 0,
            changeProfit: 0,
            segmentProfit: 0,
        };
        await docRef.set(newUser);
        
        await createAuditLog({
            userId: admin.uid,
            userName: admin.name,
            action: 'CREATE',
            targetType: 'USER',
            description: `أنشأ مستخدمًا جديدًا: ${userData.name}`,
        });

        await createNotification({
            userId: docRef.id,
            title: 'مرحباً بك في النظام',
            body: `تم إنشاء حسابك بنجاح بواسطة ${admin.name}.`,
            type: 'user'
        });

        revalidatePath('/users');
        return { success: true, newUser: { ...newUser, uid: docRef.id } };
    } catch (error) {
        console.error("Error adding user: ", String(error));
        return { success: false, error: "Failed to add user." };
    }
}

export async function updateUser(uid: string, userData: Partial<Omit<User, 'uid'>>): Promise<{ success: boolean; error?: string; updatedUser?: User }> {
     const db = await getDb();
     if (!db) return { success: false, error: "Database not available." };
     const admin = await getCurrentUserFromSession();
     if (!admin) return { success: false, error: "Unauthorized" };
     
     try {
        const userRef = db.collection('users').doc(uid);
        const existingDoc = await userRef.get();
        if(!existingDoc.exists) {
            return { success: false, error: "User not found." };
        }
        
        const dataToUpdate = { ...userData };

        if (dataToUpdate.password && dataToUpdate.password.length >= 6) {
            const saltRounds = 10;
            dataToUpdate.password = await bcrypt.hash(dataToUpdate.password, saltRounds);
        } else {
            delete dataToUpdate.password;
        }

        await userRef.update(dataToUpdate);

        await createAuditLog({
            userId: admin.uid,
            userName: admin.name,
            action: 'UPDATE',
            targetType: 'USER',
            description: `عدل بيانات المستخدم: ${userData.name || `(ID: ${uid})`}`,
        });

        revalidatePath('/users');
        revalidatePath('/', 'layout');
        
        const updatedDoc = await userRef.get();
        return { success: true, updatedUser: { uid, ...updatedDoc.data() } as User };
    } catch (error) {
        console.error("Error updating user: ", String(error));
        return { success: false, error: "Failed to update user." };
    }
}

export async function deleteUser(uid: string): Promise<{ success: boolean; error?: string }> {
     const db = await getDb();
     if (!db) return { success: false, error: "Database not available." };
     const admin = await getCurrentUserFromSession();
     if (!admin) return { success: false, error: "Unauthorized" };

     try {
        const userDoc = await db.collection('users').doc(uid).get();
        const userName = userDoc.data()?.name || 'unknown';
        await db.collection('users').doc(uid).delete();

        await createAuditLog({
            userId: admin.uid,
            userName: admin.name,
            action: 'DELETE',
            targetType: 'USER',
            description: `حذف المستخدم: ${userName} (ID: ${uid})`,
        });


        revalidatePath('/users');
        return { success: true };
    } catch (error) {
        console.error("Error deleting user: ", String(error));
        return { success: false, error: "Failed to delete user." };
    }
}

export const getRoles = cache(async (): Promise<Role[]> => {
    const db = await getDb();
    if (!db) return [];

    try {
        const snapshot = await db.collection('roles').get();
        const defaultRoles: Role[] = [
             { id: 'admin', name: 'مدير', description: 'وصول كامل لكل شيء في النظام.', permissions: Object.keys(PERMISSIONS) },
             { id: 'manager', name: 'مسؤول', description: 'صلاحيات متقدمة لإدارة الأقسام التشغيلية.', permissions: ['dashboard:read', 'bookings:read', 'bookings:create', 'bookings:update', 'bookings:delete', 'visas:read', 'visas:create', 'visas:update', 'visas:delete', 'vouchers:read', 'vouchers:create', 'relations:read', 'relations:create', 'relations:update', 'reports:read:all'] },
             { id: 'editor', name: 'محرر', description: 'يمكنه إضافة وتعديل البيانات، ولكن لا يمكنه الحذف أو الوصول للإعدادات.', permissions: ['dashboard:read', 'bookings:read', 'bookings:create', 'bookings:update', 'visas:read', 'visas:create', 'visas:update', 'vouchers:read', 'vouchers:create', 'relations:read', 'relations:create', 'relations:update'] },
             { id: 'viewer', name: 'مشاهد', description: 'يمكنه فقط عرض البيانات بدون تعديل.', permissions: ['dashboard:read', 'bookings:read', 'visas:read', 'vouchers:read', 'relations:read', 'reports:read:all'] },
        ];
        if (snapshot.empty) {
            const batch = db.batch();
            defaultRoles.forEach(role => {
                const docRef = db.collection('roles').doc(role.id);
                batch.set(docRef, role);
            });
            await batch.commit();
            return defaultRoles;
        }
        
        let roles = snapshot.docs.map(doc => doc.data() as Role);
        let needsUpdate = false;
        defaultRoles.forEach(defaultRole => {
            const existingRole = roles.find(r => r.id === defaultRole.id);
            if (!existingRole) {
                db.collection('roles').doc(defaultRole.id).set(defaultRole);
                roles.push(defaultRole);
                needsUpdate = true;
            } else if (defaultRole.id === 'admin' && existingRole.permissions.length !== Object.keys(PERMISSIONS).length) {
                db.collection('roles').doc('admin').update({ permissions: Object.keys(PERMISSIONS) });
                needsUpdate = true;
            }
        });
        
        if (needsUpdate) {
            const updatedSnapshot = await db.collection('roles').get();
            roles = updatedSnapshot.docs.map(doc => doc.data() as Role);
        }

        return roles;
    } catch (error) {
         console.error("Error getting roles from Firestore: ", String(error));
        return [];
    }
});

export async function addRole(roleData: Omit<Role, 'id'>): Promise<{ success: boolean; error?: string; newRole?: Role }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const admin = await getCurrentUserFromSession();
    if (!admin) return { success: false, error: "Unauthorized" };
    try {
        const id = roleData.name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]/g, '');
        const existingRole = await db.collection('roles').doc(id).get();
        if (existingRole.exists) {
            return { success: false, error: "الدور بهذا الاسم موجود بالفعل." };
        }
        const newRole: Role = { ...roleData, id };
        await db.collection('roles').doc(id).set(newRole);

        await createAuditLog({
            userId: admin.uid,
            userName: admin.name,
            action: 'CREATE',
            targetType: 'USER',
            description: `أنشأ دورًا جديدًا: ${newRole.name}`,
        });

        revalidatePath('/users');
        return { success: true, newRole };
    } catch (error) {
        return { success: false, error: "Failed to add role." };
    }
}

export async function updateUserRole(id: string, roleData: Partial<Role>): Promise<{ success: boolean; error?: string; updatedRole?: Role }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const admin = await getCurrentUserFromSession();
    if (!admin) return { success: false, error: "Unauthorized" };
    
    try {
        if (id === 'admin' && roleData.permissions) {
            roleData.permissions = Object.keys(PERMISSIONS);
        }

        await db.collection('roles').doc(id).update(roleData);

        await createAuditLog({
            userId: admin.uid,
            userName: admin.name,
            action: 'UPDATE',
            targetType: 'USER',
            description: `عدل صلاحيات الدور: ${roleData.name || id}`,
        });


        revalidatePath('/users');
        const updatedDoc = await db.collection('roles').doc(id).get();
        return { success: true, updatedRole: { id, ...updatedDoc.data() } as Role };
    } catch (error) {
        return { success: false, error: "Failed to update role." };
    }
}

export async function deleteRole(id: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const admin = await getCurrentUserFromSession();
    if (!admin) return { success: false, error: "Unauthorized" };
     
     try {
        if (['admin', 'editor', 'viewer', 'manager'].includes(id)) {
            return { success: false, error: "لا يمكن حذف الأدوار الأساسية." };
        }
        
        const roleDoc = await db.collection('roles').doc(id).get();
        const roleName = roleDoc.data()?.name || 'unknown';
        await db.collection('roles').doc(id).delete();

         await createAuditLog({
            userId: admin.uid,
            userName: admin.name,
            action: 'DELETE',
            targetType: 'USER',
            description: `حذف الدور: ${roleName} (ID: ${id})`,
        });


        revalidatePath('/users');
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete role." };
    }
}
