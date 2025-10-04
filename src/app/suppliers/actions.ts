
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { Supplier } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getCurrentUserFromSession } from '../auth/actions';
import { addClient, getClients, deleteClient, deleteMultipleClients } from '@/app/relations/actions';

// This file is simplified to act as a wrapper around the unified 'relations' actions.

export async function getSuppliers(options: { all?: boolean, limit?: number, searchTerm?: string } = {}): Promise<Supplier[]> {
    const { clients: suppliers } = await getClients({ ...options, relationType: 'supplier' });
    // The getClients function returns Client[], which is compatible with Supplier
    return suppliers as Supplier[];
}

export async function searchSuppliers(options: { searchTerm?: string, includeInactive?: boolean }): Promise<{value: string, label: string}[]> {
    const { clients: suppliers } = await getClients({ ...options, all: true, relationType: 'supplier' });
    return suppliers.map(c => ({ 
        value: c.id, 
        label: `${c.name} ${c.code ? `(${c.code})` : ''}`,
    }));
}

export async function addSupplier(data: Omit<Supplier, 'id' | 'createdAt' | 'createdBy' | 'balance' | 'avatarUrl' | 'relationType' | 'useCount'>): Promise<{ success: boolean; error?: string }> {
    const result = await addClient({ ...data, relationType: 'supplier' });
    return { success: result.success, error: result.error };
}

export async function updateSupplier(id: string, data: Partial<Supplier>): Promise<{ success: boolean; error?: string }> {
    const { updateClient } = await import('@/app/relations/actions');
    return updateClient(id, data);
}

export async function deleteSupplier(id: string): Promise<{ success: boolean; error?: string }> {
    return deleteClient(id);
}

export async function deleteMultipleSuppliers(ids: string[]): Promise<{ success: boolean; error?: string }> {
    return deleteMultipleClients(ids);
}
