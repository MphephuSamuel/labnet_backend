import { Request, Response } from "express";
import { getAllUsers } from "../services/user.service";

export const getUsers = async (_req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    return res.status(200).json({ users });
  } catch (err: any) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to fetch users" });
  }
};
