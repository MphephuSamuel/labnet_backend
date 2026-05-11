import admin from "../utils/firebase-admin";

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
  const fbUser = await admin.auth().createUser({
    email: user.email,
    password: user.password,
    emailVerified: false,
    disabled: false,
  });
  

  // Store extra profile fields in Firestore (do NOT store password)
  const db = admin.firestore();
  await db.collection("users").doc(fbUser.uid).set({
    firstName: user.firstName,
    secondName: user.secondName,
    surname: user.surname,
    role: user.role,
    email: user.email,
    uid: fbUser.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Do not return password
  const { password, ...userWithoutPassword } = user;
  return { uid: fbUser.uid, ...userWithoutPassword };
}
