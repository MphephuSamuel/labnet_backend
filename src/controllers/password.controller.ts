import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types/auth-request";
import {
  changePasswordWithOldPassword,
  requestPasswordReset,
} from "../services/password.service";

export const requestPasswordResetHandler = async (
  req: Request,
  res: Response,
) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    const result = await requestPasswordReset(email);
    return res.status(200).json(result);
  } catch (err: any) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to send reset email." });
  }
};

export const changePasswordHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const user = req.user;
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!user?.uid || !user.email) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!oldPassword || !newPassword || !confirmPassword) {
    return res
      .status(400)
      .json({
        message:
          "Old password, new password, and confirm password are required.",
      });
  }

  try {
    const result = await changePasswordWithOldPassword({
      uid: user.uid,
      email: user.email,
      oldPassword,
      newPassword,
      confirmPassword,
    });

    return res.status(200).json(result);
  } catch (err: any) {
    const message = err.message || "Failed to change password.";
    const validationErrors = new Set([
      "Old password is incorrect.",
      "New password and confirm password do not match.",
      "New password must be at least 8 characters long.",
      "New password must be different from the old password.",
    ]);
    const status = validationErrors.has(message) ? 400 : 500;
    return res.status(status).json({ message });
  }
};
