import { Request, Response } from "express";
import { createUser, UserProfile } from "../services/user.service";

export const signup = async (req: Request, res: Response) => {
  const { firstName, secondName, surname, role, email } = req.body;

  if (!firstName || !secondName || !surname || !role || !email) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const user: UserProfile = {
    firstName,
    secondName,
    surname,
    role,
    email,
  };
  try {
    const created = await createUser(user);
    res.status(201).json({ message: "Signup successful", user: created });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Signup failed" });
  }
};
