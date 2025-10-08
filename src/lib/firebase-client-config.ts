
// This file is the single source of truth for the client-side Firebase configuration.
// It is used by the application to connect to Firebase services from the browser.

export const getFirebaseConfig = () => {
    // These variables will be set by Firebase App Hosting during the build process
    // based on the active configuration.
    const firebaseConfig = {
      apiKey: "AIzaSyCtlF3onBhtwg0Hh3iOOEjygi9mj81wxrA",
      authDomain: "fly4all-78277122-3cbd0.firebaseapp.com",
      projectId: "fly4all-78277122-3cbd0",
      storageBucket: "fly4all-78277122-3cbd0.appspot.com",
      messagingSenderId: "108505683067",
      appId: "1:108505683067:web:3ab7755349630154e77ede"
    };

    if (!firebaseConfig.projectId) {
        console.error("Firebase config environment variables are not set. Check your deployment settings.");
        return null;
    }

    return firebaseConfig;
};
