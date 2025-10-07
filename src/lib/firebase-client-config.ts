

// This file is the single source of truth for the client-side Firebase configuration.
// It is used by the application to connect to Firebase services from the browser.

export const getFirebaseConfig = () => {
    // These variables will be set by Firebase App Hosting during the build process
    // based on the active configuration.
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };

    if (!firebaseConfig.projectId) {
        console.error("Firebase config environment variables are not set. Check your deployment settings.");
        return null;
    }

    return firebaseConfig;
};
