import { initializeFirebaseAdmin } from "../utils/firebase-admin";
import { Alert } from "../types/alert";

export class AlertService {
  private getDb() {
    const admin = initializeFirebaseAdmin();
    return admin.firestore();
  }

  // Add an alert
  async addAlert(alert: Alert): Promise<Alert> {
    const db = this.getDb();
    await db.collection("alerts").doc(alert.id).set(alert);
    return alert;
  }

  // Retrieve all alerts
  async getAlerts(): Promise<Alert[]> {
    const db = this.getDb();
    const snapshot = await db.collection("alerts").get();
    return snapshot.docs.map((doc: any) => doc.data() as Alert);
  }

  // Retrieve alerts for a specific user
  async getAlertsByUser(userId: string): Promise<Alert[]> {
    const db = this.getDb();
    const snapshot = await db.collection("alerts").where("userId", "==", userId).get();
    return snapshot.docs.map((doc: any) => doc.data() as Alert);
  }
}

export const alertService = new AlertService();
