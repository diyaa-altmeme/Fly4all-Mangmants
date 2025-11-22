

// scripts/migrate-users.ts

/**
 * @fileoverview One-time script to migrate users from the manual Firestore 'users' collection
 * to the official Firebase Authentication system.
 * 
 * How to run:
 * 1. Ensure you have the necessary permissions and your service account is configured correctly.
 * 2. From your terminal, run: `npm run migrate:users`
 * 
 * What it does:
 * - Reads all documents from the `users` collection.
 * - For each user, it creates a new user in Firebase Authentication with the same email.
 * - It assigns a secure, random temporary password. Users will need to use the "Forgot Password" flow.
 * - It then DELETES the old user document and creates a NEW one using the Firebase Auth UID as the document ID,
 *   preserving all original data (except the now-obsolete password).
 */

import { getDb, getAuthAdmin } from '@/lib/firebase/firebase-admin-sdk';
import { randomBytes } from 'crypto';
import type { User } from '../lib/types';

async function migrateUsers() {
    console.log("Starting user migration process...");

    const db = await getDb();
    const auth = await getAuthAdmin();

    const usersSnapshot = await db.collection('users').get();

    if (usersSnapshot.empty) {
        console.log("No users found in the 'users' collection. Nothing to migrate.");
        return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const userDoc of usersSnapshot.docs) {
        const oldUserData = userDoc.data() as Omit<User, 'uid'>;
        const oldId = userDoc.id;
        const email = oldUserData.email;

        if (!email) {
            console.error(`Skipping user with old ID ${oldId} due to missing email.`);
            errorCount++;
            continue;
        }

        try {
            // 1. Check if user already exists in Firebase Auth
            let userRecord;
            try {
                userRecord = await auth.getUserByEmail(email);
                console.log(`User with email ${email} already exists in Firebase Auth. Skipping creation.`);
            } catch (error: any) {
                if (error.code === 'auth/user-not-found') {
                    // If user is not found, proceed to create them.
                    const tempPassword = randomBytes(16).toString('hex');
                    userRecord = await auth.createUser({
                        email: email,
                        emailVerified: true, // Assuming old users are verified
                        password: tempPassword,
                        displayName: oldUserData.name,
                        disabled: oldUserData.status !== 'active',
                    });
                     console.log(`Successfully created new auth user for ${email} with UID: ${userRecord.uid}`);
                } else {
                    throw error; // Re-throw other unexpected auth errors
                }
            }
            
            // 2. Check if a new document with the correct UID already exists
            const newUserDocRef = db.collection('users').doc(userRecord.uid);
            const newUserDoc = await newUserDocRef.get();

            if (newUserDoc.exists) {
                console.log(`User document already exists at users/${userRecord.uid}. Skipping document migration for ${email}.`);
                // If the old doc is not the new one, delete it.
                if (oldId !== userRecord.uid) {
                    await db.collection('users').doc(oldId).delete();
                    console.log(`Deleted old Firestore document: users/${oldId}`);
                }
                continue;
            }


            // 3. Create a new Firestore document with the new UID
            const { password, ...restOfData } = oldUserData; // Exclude old password
            
            await newUserDocRef.set({
                ...restOfData,
                // Ensure essential fields are consistent
                uid: userRecord.uid,
                email: userRecord.email,
                name: userRecord.displayName || oldUserData.name,
            });

            console.log(`Created new Firestore document at users/${userRecord.uid}`);
            
            // 4. Delete the old document if the ID was not the email
            if (oldId !== email && oldId !== userRecord.uid) {
                await db.collection('users').doc(oldId).delete();
                console.log(`Deleted old Firestore document: users/${oldId}`);
            }

            successCount++;

        } catch (error: any) {
            console.error(`Failed to migrate user ${email}. Error: ${error.message}`);
            errorCount++;
        }
    }

    console.log("\n--- Migration Summary ---");
    console.log(`✅ Successfully migrated: ${successCount} users.`);
    console.log(`❌ Failed to migrate or already migrated: ${errorCount} users.`);
    console.log("-------------------------\n");
    console.log("IMPORTANT: Migrated users must use the 'Forgot Password' flow to set a new password before they can log in.");
}

migrateUsers().then(() => {
    console.log("Migration script finished.");
    process.exit(0);
}).catch(error => {
    console.error("Critical error during migration script:", error);
    process.exit(1);
});
