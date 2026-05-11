export enum AlertSeverity {
  critical = "critical",
  warning = "warning",
  info = "info",
}

export interface CreateAlert {
  title: string;
  description: string;
  device: string;
  ip: string;
  time: string;
  severity: AlertSeverity;
}

export interface Alert {
  id: string; // Unique identifier
  title: string;
  description: string;
  device: string;
  ip: string;
  time: string;
  severity: AlertSeverity;
}
