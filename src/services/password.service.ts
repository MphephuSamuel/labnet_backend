import { initializeFirebaseAdmin } from "../utils/firebase-admin";
import { sendPasswordResetEmail } from "./email.service";

const DEFAULT_CONTINUE_URL =
  "http://localhost:3000/reset-redirect.html";

export interface PasswordChangeInput {
  uid: string;
  email: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function getPasswordResetContinueUrl() {
  return (
    process.env.PASSWORD_RESET_CONTINUE_URL ||
    process.env.APP_PUBLIC_URL ||
    DEFAULT_CONTINUE_URL
  );
}

async function verifyOldPassword(email: string, oldPassword: string) {
  const apiKey =
    process.env.FIREBASE_WEB_API_KEY || process.env.FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error("FIREBASE_WEB_API_KEY is not configured.");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email,
        password: oldPassword,
        returnSecureToken: true,
      }),
    },
  );

  return response.ok;
}

export async function requestPasswordReset(email: string) {
  const firebaseAdmin = initializeFirebaseAdmin();
  try {
    // 1. Get the user from Firebase Auth (handles case-insensitivity automatically)
    const userRecord = await firebaseAdmin.auth().getUserByEmail(email);

    // 2. Fetch the corresponding Firestore profile using the unique UID
    const db = firebaseAdmin.firestore();
    const userDoc = await db.collection("users").doc(userRecord.uid).get();

    let firstName = "there";
    if (userDoc.exists) {
      const userData = userDoc.data() as { firstName?: string };
      firstName = userData.firstName || "there";
    }

    // 3. Generate password reset link
    const resetLink = await firebaseAdmin
      .auth()
      .generatePasswordResetLink(email, {
        url: getPasswordResetContinueUrl(),
        handleCodeInApp: false,
      });

    // 4. Send the reset email
    await sendPasswordResetEmail({
      to: email,
      firstName,
      email,
      resetUrl: resetLink,
    });
  } catch (error: any) {
    // If user is not found or mail sending fails, log warning but don't fail the request
    // to prevent email enumeration probing
    console.warn(
      `Password reset process for email: ${email} completed with status:`,
      error.message || error,
    );
  }

  return {
    message: "If the email exists, a password reset link has been sent.",
  };
}

export async function changePasswordWithOldPassword(
  input: PasswordChangeInput,
) {
  const firebaseAdmin = initializeFirebaseAdmin();
  const db = firebaseAdmin.firestore();

  if (input.newPassword !== input.confirmPassword) {
    throw new Error("New password and confirm password do not match.");
  }

  if (input.newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters long.");
  }

  if (input.oldPassword === input.newPassword) {
    throw new Error("New password must be different from the old password.");
  }

  const isOldPasswordValid = await verifyOldPassword(
    input.email,
    input.oldPassword,
  );

  if (!isOldPasswordValid) {
    throw new Error("Old password is incorrect.");
  }

  await firebaseAdmin.auth().updateUser(input.uid, {
    password: input.newPassword,
  });

  const userDoc = await db.collection("users").doc(input.uid).get();

  if (userDoc.exists) {
    await userDoc.ref.set(
      {
        passwordChangedAt: Date.now(),
      },
      { merge: true },
    );
  }

  return {
    message: "Password changed successfully.",
  };
}
