
'use server';

import { getUserByEmail as fetchUserFromDb } from '@/app/(auth)/actions';
import type { User } from '@/lib/types';

export async function fetchUserByEmail(email: string): Promise<(Omit<User, 'permissions'>) | null> {
    try {
        const user = await fetchUserFromDb(email);
        if (!user || 'isClient' in user) return null;
        
        const { permissions, ...restOfUser } = user;
        return restOfUser;

    } catch (error) {
        console.error("Error fetching user by email from server action:", error);
        return null;
    }
}
