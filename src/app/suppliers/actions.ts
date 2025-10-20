

'use server';

import { getClients } from '@/app/relations/actions';
import type { Supplier } from '@/lib/types';


export async function getSuppliers(options?: { searchTerm?: string, all?: boolean }): Promise<Supplier[]> {
    const { clients } = await getClients({ ...options, relationType: 'supplier', all: true });
    return clients as Supplier[];
}
