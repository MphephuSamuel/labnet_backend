export interface CreateAlert {
  type: string;
  deviceId: string;
  createdAt: Date;
  description: string;
  hostName: string;
  severity: string;
}

export interface Alert {
  id: string; // Unique identifier
  type: string;
  deviceId: string;
  createdAt: Date;
  description: string;
  hostName: string;
  severity: string;
}
