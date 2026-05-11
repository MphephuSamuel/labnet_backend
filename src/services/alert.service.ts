import admin from "../utils/firebase-admin";
import { Alert } from "../types/alert";

const db = admin.firestore();

export class AlertService {
  private collection = db.collection("alerts");

  // Add an alert
  async addAlert(alert: Alert): Promise<Alert> {
    await this.collection.doc(alert.id).set(alert);
    return alert;
  }

  // Retrieve all alerts
  async getAlerts(): Promise<Alert[]> {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((doc) => doc.data() as Alert);
  }

  // Retrieve alerts for a specific user
  async getAlertsByUser(userId: string): Promise<Alert[]> {
    const snapshot = await this.collection.where("userId", "==", userId).get();
    return snapshot.docs.map((doc) => doc.data() as Alert);
  }
}

export const alertService = new AlertService();
