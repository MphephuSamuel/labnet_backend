import admin from "firebase-admin";
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
  password: string;
}

// Create user in Firebase Auth and store profile in Firestore
export async function createUser(user: UserProfile) {
  // Create user in Firebase Auth (with password)
  const firebaseAdmin = getFirebaseAdmin();
  const fbUser = await firebaseAdmin.auth().createUser({
    email: user.email,
    password: user.password,
    emailVerified: false,
    disabled: false,
  });
  

  // Store extra profile fields in Firestore (do NOT store password)
  const db = firebaseAdmin.firestore();
  await db.collection("users").doc(fbUser.uid).set({
    firstName: user.firstName,
    secondName: user.secondName,
    surname: user.surname,
    role: user.role,
    email: user.email,
    uid: fbUser.uid,
    createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
  });

  // Do not return password
  const { password, ...userWithoutPassword } = user;
  return { uid: fbUser.uid, ...userWithoutPassword };
}
