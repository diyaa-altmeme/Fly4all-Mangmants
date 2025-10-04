
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { Client, RelationType, CompanyPaymentType } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getCurrentUserFromSession } from '../auth/actions';
import { createAuditLog } from '../system/activity-log/actions';
import bcrypt from 'bcrypt';
import { getSettings } from '@/app/settings/actions';
import { parseISO } from 'date-fns';


const getUsername = async () => {
    const user = await getCurrentUserFromSession();
    return user?.name || 'النظام';
}

export async function searchClients(options: { searchTerm?: string, includeInactive?: boolean, relationType?: 'client' | 'supplier' | 'all' }): Promise<{value: string, label: string, relationType?: RelationType, paymentType?: CompanyPaymentType}[]> {
    const { clients } = await getClients({ ...options, all: true });
    return clients.map(c => ({ 
        value: c.id, 
        label: `${c.name} ${c.code ? `(${c.code})` : ''}`,
        relationType: c.relationType,
        paymentType: c.paymentType,
    }));
}

export async function getClients(options: { 
    all?: boolean, 
    limit?: number, 
    page?: number, 
    searchTerm?: string,
    relationType?: string,
    paymentType?: CompanyPaymentType,
    status?: 'active' | 'inactive' | 'all',
    country?: string,
    province?: string,
    sortBy?: string,
    includeInactive?: boolean,
} = {}): Promise<{ clients: Client[], total: number }> {
    const { all = false, limit = 15, page = 1, searchTerm, relationType, paymentType, status, country, province, sortBy = 'useCount_desc' } = options;
    
    const db = await getDb();
    if (!db) return { clients: [], total: 0 };

    try {
        let query: FirebaseFirestore.Query = db.collection('clients');
        
        // Apply filters
        if (relationType && relationType !== 'all') {
             // If searching for 'client', also include 'both'
            const typesToInclude = relationType === 'client' ? ['client', 'both'] 
                                 : relationType === 'supplier' ? ['supplier', 'both']
                                 : [relationType];

            if (typesToInclude.length > 0) {
                 query = query.where('relationType', 'in', typesToInclude);
            }
        }
        if (paymentType && paymentType !== 'all') {
            query = query.where('paymentType', '==', paymentType);
        }
        if (status && status !== 'all') {
            query = query.where('status', '==', status);
        }
         if (options.includeInactive !== true && !status) {
            query = query.where('status', '==', 'active');
        }

        if (country && country !== 'all') {
            query = query.where('country', '==', country);
        }
        if (province && province !== 'all') {
            query = query.where('province', '==', province);
        }

        const countSnapshot = await query.get();
        let allFilteredDocs = countSnapshot.docs;

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            allFilteredDocs = allFilteredDocs.filter(doc => {
                const data = doc.data();
                return (data.name && data.name.toLowerCase().includes(lowercasedTerm)) ||
                       (data.phone && String(data.phone).includes(lowercasedTerm)) ||
                       (data.code && data.code.toLowerCase().includes(lowercasedTerm));
            });
        }
        
        const total = allFilteredDocs.length;
        
        if (sortBy) {
            const [sortField, sortDirection] = sortBy.split('_');
            allFilteredDocs.sort((a, b) => {
                const dataA = a.data();
                const dataB = b.data();
                const valA = dataA[sortField];
                const valB = dataB[sortField];

                if (valA === undefined || valA === null) return 1;
                if (valB === undefined || valB === null) return -1;
                
                let comparison = 0;
                if(typeof valA === 'string' && typeof valB === 'string') {
                    comparison = valA.localeCompare(valB);
                } else if(valA > valB) {
                    comparison = 1;
                } else if (valA < valB) {
                    comparison = -1;
                }

                return sortDirection === 'desc' ? comparison * -1 : comparison;
            });
        }
        
        let finalDocs;
        if (!all) {
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            finalDocs = allFilteredDocs.slice(startIndex, endIndex);
        } else {
            finalDocs = allFilteredDocs;
        }
        
        if (finalDocs.length === 0) {
            return { clients: [], total: 0 };
        }
        
        const clients: Client[] = finalDocs.map(doc => {
            const data = doc.data();
            let createdAt = new Date().toISOString();
            if (data.createdAt) {
                try {
                    if (typeof data.createdAt.toDate === 'function') {
                        createdAt = data.createdAt.toDate().toISOString();
                    } else if (typeof data.createdAt === 'string') {
                        createdAt = parseISO(data.createdAt).toISOString();
                    }
                } catch(e) { /* fallback to now */ }
            } else {
                 createdAt = new Date(0).toISOString();
            }
            return { 
                ...data, // Spread all fields from the document
                id: doc.id,
                createdAt: createdAt,
             } as Client;
        });
        
        return { clients, total };

    } catch (error) {
        console.error("Error getting clients from Firestore: ", String(error));
        // Instead of throwing, return an empty array to prevent app crash
        return { clients: [], total: 0 };
    }
};

export async function getClientById(id: string): Promise<Client | null> {
    const db = await getDb();
    if (!db) return null;

    try {
        const doc = await db.collection('clients').doc(id).get();
        if (!doc.exists) {
            return null;
        }
        const data = doc.data() as any;
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt,
        } as Client;
    } catch (error) {
        console.error(`Error getting client by ID ${id}:`, String(error));
        return null;
    }
}

export async function addClient(data: Partial<Omit<Client, 'id'>>): Promise<{ success: boolean; error?: string, client?: Client }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const username = user.name;
        
        const clientData: Partial<Client> = {
            ...data,
            createdAt: new Date().toISOString(),
            createdBy: username,
            balance: { USD: 0, IQD: 0 },
            lastTransaction: null,
            useCount: 0,
        };

        if (clientData.password && clientData.password.length >= 6) {
            const saltRounds = 10;
            clientData.password = await bcrypt.hash(clientData.password, saltRounds);
        } else {
             delete clientData.password;
        }
        
        const docRef = await db.collection('clients').add(clientData);
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'CREATE',
            targetType: 'CLIENT',
            description: `أنشأ علاقة جديدة باسم: ${clientData.name} (ID: ${docRef.id})`,
        });
        
        revalidatePath('/clients');
        revalidatePath('/suppliers');
        revalidatePath('/reports/debts');
        
        const newClient = { ...clientData, id: docRef.id } as Client;
        return { success: true, client: newClient };
    } catch (e: any) {
        console.error("Error adding client:", e);
        return { success: false, error: e.message };
    }
}

export async function addMultipleClients(clientsData: Omit<Client, 'id' | 'createdAt' | 'createdBy' | 'balance' | 'lastTransaction' | 'avatarUrl' | 'useCount'>[]): Promise<{ success: boolean; count: number; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, count: 0, error: "Database not available." };
    
    const user = await getCurrentUserFromSession();
     if (!user) return { success: false, count: 0, error: "Unauthorized" };
    
    const batch = db.batch();
    
    clientsData.forEach(clientData => {
        const docRef = db.collection('clients').doc();
        const dataToSave: Partial<Client> = {
            ...clientData,
            createdAt: new Date().toISOString(),
            createdBy: `مستورد بواسطة ${user.name}`,
            type: clientData.type || 'individual',
            relationType: clientData.relationType || 'client',
            status: clientData.status || 'active',
            balance: { USD: 0, IQD: 0 },
            lastTransaction: null,
            useCount: 0,
            avatarUrl: '',
        };

        if (!dataToSave.password) {
            delete dataToSave.password;
        }
        
        batch.set(docRef, dataToSave);
    });

    try {
        await batch.commit();

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'CREATE',
            targetType: 'CLIENT',
            description: `استورد ${clientsData.length} علاقات جديدة من ملف.`,
        });

        revalidatePath('/clients');
        revalidatePath('/suppliers');
        revalidatePath('/relations/settings');
        revalidatePath('/reports/debts');
        return { success: true, count: clientsData.length };
    } catch (error) {
        console.error("Error adding multiple clients: ", String(error));
        return { success: false, count: 0, error: "Failed to add clients." };
    }
}


export async function updateClient(id: string, data: Partial<Client>): Promise<{ success: boolean; error?: string; updatedClient?: Client }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const dataToUpdate = JSON.parse(JSON.stringify(data));
        
        if (data.password && data.password.length >= 6) {
            const saltRounds = 10;
            dataToUpdate.password = await bcrypt.hash(data.password, saltRounds);
        } else {
            delete dataToUpdate.password;
        }

        await db.collection('clients').doc(id).update(dataToUpdate);
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'UPDATE',
            targetType: 'CLIENT',
            description: `عدل بيانات العلاقة (ID: ${id})`,
        });
        
        const updatedDoc = await db.collection('clients').doc(id).get();
        const updatedClient = { id: updatedDoc.id, ...updatedDoc.data() } as Client;

        revalidatePath('/clients');
        revalidatePath('/suppliers');
        revalidatePath('/reports/debts');
        return { success: true, updatedClient };
    } catch (e: any) {
        console.error("Error updating client:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteClient(id: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const docRef = await db.collection('clients').doc(id).get();
        const clientData = docRef.data();

        if (clientData?.useCount && clientData.useCount > 0) {
            return { success: false, error: "لا يمكن حذف هذه العلاقة لوجود معاملات مالية مرتبطة بها." };
        }
        
        const clientName = clientData?.name || 'unknown';

        await db.collection('clients').doc(id).delete();

         await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'DELETE',
            targetType: 'CLIENT',
            description: `حذف العلاقة: ${clientName} (ID: ${id})`,
        });
        
        revalidatePath('/clients');
        revalidatePath('/suppliers');
        revalidatePath('/reports/debts');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteMultipleClients(ids: string[]): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "Unauthorized" };


    try {
        const batch = db.batch();
        ids.forEach(id => {
            const docRef = db.collection('clients').doc(id);
            batch.delete(docRef);
        });
        await batch.commit();

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'DELETE',
            targetType: 'CLIENT',
            description: `حذف ${ids.length} علاقات بشكل جماعي.`,
        });

        revalidatePath('/clients');
        revalidatePath('/suppliers');
        revalidatePath('/reports/debts');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
