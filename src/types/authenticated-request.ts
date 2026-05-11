import { Request } from "express";

// Extend the Express Request type to include a user property
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    [key: string]: any;
  };
}
