'use server';

import { getUserByEmail as fetchUserFromDb } from '@/lib/auth/actions';
import type { User } from '@/lib/types';

export async function fetchUserByEmail(email: string): Promise<User | null> {
    try {
        const user = await fetchUserFromDb(email);
        // We return a cleaned user object without permissions for the client-side display
        if (!user || 'isClient' in user) return null;
        
        const { permissions, ...restOfUser } = user;
        return restOfUser;

    } catch (error) {
        console.error("Error fetching user by email from server action:", error);
        return null;
    }
}
