
'use server';

import { getUserByEmail as fetchUserFromDb } from '@/lib/auth/actions';
import type { User } from '@/lib/types';

export async function fetchUserByEmail(email: string): Promise<(Omit<User, 'permissions'>) | null> {
    try {
        const user = await fetchUserFromDb(email);
        // We return a cleaned user object without permissions for the client-side display
        if (!user || 'isClient' in user) return null;
        
        // This is a server action, but we are returning data to a client component.
        // It's good practice to not expose permissions directly.
        const { permissions, ...restOfUser } = user;
        return restOfUser;

    } catch (error) {
        console.error("Error fetching user by email from server action:", error);
        return null;
    }
}
