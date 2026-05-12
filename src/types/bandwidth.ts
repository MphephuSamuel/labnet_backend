export interface Bandwidth {
  id?: string;
  deviceId: string;
  hostName: string;
  downloadUsage: number;
  uploadUsage: number;
  totalUsage: number;
  range: "Day" | "Week" | "Month" | "Year";
  userId: string;
  createdAt: FirebaseFirestore.Timestamp;
}