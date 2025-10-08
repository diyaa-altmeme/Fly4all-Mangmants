
// This utility is not strictly needed anymore as the logic is now embedded
// within the server actions, but it's good practice to keep it.
export function cleanUser(user: any) {
  if (!user) return null;

  // This creates a plain JavaScript object without any methods or prototypes
  // from the Firebase User object, making it safe to pass to Client Components.
  return JSON.parse(JSON.stringify({
    uid: user.uid ?? null,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    phoneNumber: user.phoneNumber ?? null,
    emailVerified: user.emailVerified ?? false,
    ...user, // include any other custom data from firestore
  }));
}
