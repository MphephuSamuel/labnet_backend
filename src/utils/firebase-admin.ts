import admin from "firebase-admin";

let initialized = false;

export function initializeFirebaseAdmin() {
  if (initialized) {
    return admin;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // For development: allow running without Firebase credentials
  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "⚠️ Firebase Admin credentials not found. Running in development mode without Firebase.",
    );
    // Create a minimal mock that prevents Firebase errors
    const mockAdmin = {
      auth: () => ({
        verifyIdToken: async () => ({
          uid: "dev-user",
          email: "dev@example.com",
        }),
        createCustomToken: async () => "dev-token",
        updateUser: async () => ({}),
        generatePasswordResetLink: async () =>
          "https://example.com/reset-password-link",
      }),
      firestore: () => ({
        collection: () => ({
          doc: () => ({
            get: async () => ({ exists: false, data: () => null }),
            set: async () => {},
            update: async () => {},
            delete: async () => {},
          }),
          where: () => ({
            get: async () => ({ docs: [] }),
          }),
          get: async () => ({ docs: [] }),
        }),
      }),
      initializeApp: () => {}, // Mock initializeApp
      app: () => mockAdmin, // Return self for app()
    };

    // Set initialized to prevent re-initialization
    initialized = true;
    return mockAdmin as any;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  initialized = true;
  return admin;
}
