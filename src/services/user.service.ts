import admin from "firebase-admin";
import { sendCredentialsEmail } from "./email.service";
import { generatePassword } from "../utils/password";
import { initializeFirebaseAdmin } from "../utils/firebase-admin";

const getFirebaseAdmin = () => {
  initializeFirebaseAdmin();
  return admin;
};

export interface UserProfile {
  firstName: string;
  secondName: string;
  surname: string;
  role: string;
  email: string;
}

// Create user in Firebase Auth and store profile in Firestore
export async function createUser(user: UserProfile) {
  const firebaseAdmin = getFirebaseAdmin();
  const auth = firebaseAdmin.auth();
  const db = firebaseAdmin.firestore();
  const password = generatePassword();

  let fbUser: admin.auth.UserRecord | null = null;

  try {
    fbUser = await auth.createUser({
      email: user.email,
      password,
      emailVerified: false,
      disabled: false,
    });

    await db.collection("users").doc(fbUser.uid).set({
      firstName: user.firstName,
      secondName: user.secondName,
      surname: user.surname,
      role: user.role,
      email: user.email,
      uid: fbUser.uid,
      createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    });

    await sendCredentialsEmail({
      to: user.email,
      firstName: user.firstName,
      email: user.email,
      password,
      role: user.role,
    });

    return { uid: fbUser.uid, ...user };
  } catch (error) {
    if (fbUser) {
      await Promise.all([
        auth.deleteUser(fbUser.uid).catch(() => undefined),
        db
          .collection("users")
          .doc(fbUser.uid)
          .delete()
          .catch(() => undefined),
      ]);
    }

    throw error;
  }
}
