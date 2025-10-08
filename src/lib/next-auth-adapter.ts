
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { FirestoreAdapter } from "@next-auth/firebase-adapter"


function getServiceAccount(): ServiceAccount {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!serviceAccountStr) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is not set. Please encode your service account JSON file to Base64 and set it.");
    }
    try {
        const decodedString = Buffer.from(serviceAccountStr, 'base64').toString('utf8');
        return JSON.parse(decodedString) as ServiceAccount;
    } catch (e) {
        console.error("Failed to parse Firebase service account from environment variable.", e);
        throw new Error("Could not parse FIREBASE_SERVICE_ACCOUNT_BASE64. Make sure it's a valid Base64 encoded JSON.");
    }
}


let app: App;

if (getApps().length === 0) {
  app = initializeApp({
    credential: cert(getServiceAccount()),
  });
} else {
  app = getApps()[0];
}

const db = getFirestore(app);


export const CustomFirestoreAdapter = FirestoreAdapter(db as Firestore)
