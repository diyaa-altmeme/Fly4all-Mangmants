
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { CompanyGroup, WorkType } from '@/lib/types';
import { revalidatePath } from 'next/cache';

// This file is deprecated as groups and work types are no longer used.
// It can be safely removed in a future cleanup.
// All relation management is now done via the dynamic fields in AppSettings.

export async function getCompanyGroups(): Promise<CompanyGroup[]> {
   return [];
}

export async function getWorkTypes(): Promise<WorkType[]> {
    return [];
}
