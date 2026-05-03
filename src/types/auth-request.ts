import { Request } from "express";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
