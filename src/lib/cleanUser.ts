"use client";
import type { User as FirebaseUser } from "firebase/auth";

// This is a placeholder for the more complex user object you might have
interface SafeUser {
  uid: string | null;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
}

export function cleanUser(user: FirebaseUser | any): SafeUser | null {
  if (!user) return null;

  return JSON.parse(JSON.stringify({
    uid: user.uid ?? null,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    phoneNumber: user.phoneNumber ?? null,
    emailVerified: user.emailVerified ?? false,
  }));
}
