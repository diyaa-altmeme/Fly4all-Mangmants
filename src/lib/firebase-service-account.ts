

// This file is a placeholder and is NOT used for Admin SDK initialization anymore.
// The Admin SDK is now securely initialized from the FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable.
// See /src/lib/firebase-admin.ts for details.

// To generate the required Base64 string from your serviceAccount.json file, run:
// cat path/to/your/serviceAccount.json | base64 | tr -d '\n'
// Then, add the output to your .env.local file as FIREBASE_SERVICE_ACCOUNT_BASE64="<your_base64_string>"

import type { ServiceAccount } from 'firebase-admin/app';

export const serviceAccount: Partial<ServiceAccount> = {
  // This object is intentionally left sparse.
  // The actual credentials should be loaded from environment variables.
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};
