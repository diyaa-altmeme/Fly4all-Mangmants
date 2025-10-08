
// This file is the single source of truth for the client-side Firebase configuration.
// It is used by the application to connect to Firebase services from the browser.

export const getFirebaseConfig = () => {
    // These values are now hardcoded to ensure correctness.
    const firebaseConfig = {
      apiKey: "AIzaSyBNZ8ZJKKZJKKZJKKZJKKZJKKZJKKZJKK",
      authDomain: "fly4all-mangmants-go-591-d7ffe.firebaseapp.com",
      projectId: "fly4all-mangmants-go-591-d7ffe",
      storageBucket: "fly4all-mangmants-go-591-d7ffe.appspot.com",
      messagingSenderId: "108505683067",
      appId: "1:108505683067:web:3ab7755349630154e77ede"
    };

    if (!firebaseConfig.projectId) {
        console.error("Firebase config is missing or invalid.");
        return null;
    }

    return firebaseConfig;
};
