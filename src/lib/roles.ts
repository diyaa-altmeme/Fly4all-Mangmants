
import { getDb } from "@/lib/firebase-admin";

/**
 * Ensures that the essential roles, like 'admin', exist in the database.
 */
export async function ensureRolesExist() {
    const db = await getDb();
    const rolesRef = db.collection('roles');

    // Define the admin role
    const adminRole = {
        name: 'Administrator',
        // Using a wildcard to signify all permissions. 
        // The application logic should be adapted to handle this.
        permissions: ['*'], 
        description: 'Full access to all system features.',
        isDefault: false,
    };

    // Create the admin role only if it doesn't exist
    const adminDoc = await rolesRef.doc('admin').get();
    if (!adminDoc.exists) {
        await rolesRef.doc('admin').set(adminRole);
        console.log("'admin' role created successfully.");
    }
    
    // You can add other default roles here in the future
    // For example, a 'viewer' role
    const viewerRole = {
        name: 'Viewer',
        permissions: ['read:data'],
        description: 'Read-only access to most data.',
        isDefault: true,
    };

    const viewerDoc = await rolesRef.doc('viewer').get();
    if (!viewerDoc.exists) {
        await rolesRef.doc('viewer').set(viewerRole);
        console.log("'viewer' role created successfully.");
    }
}
