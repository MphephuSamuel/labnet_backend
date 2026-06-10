import { renderTemplate, sendBrevoEmail } from "../utils/mailer";

export interface CredentialsEmailInput {
  to: string;
  firstName: string;
  email: string;
  password: string;
  role: string;
}

export interface PasswordResetEmailInput {
  to: string;
  firstName: string;
  email: string;
  resetUrl: string;
}

export async function sendCredentialsEmail(input: CredentialsEmailInput) {
  const html = await renderTemplate("credentials.ejs", input);

  const text = [
    `Hello ${input.firstName},`,
    "",
    "Your LabNet Guardian account has been created.",
    `Email: ${input.email}`,
    `Password: ${input.password}`,
    `Role: ${input.role}`,
    "",
    "Please sign in and change your password after your first login.",
  ].join("\n");

  await sendBrevoEmail({
    to: input.to,
    subject: "Your LabNet Guardian login credentials",
    html,
    text,
  });
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  const html = await renderTemplate("password-reset.ejs", input);

  const text = [
    `Hello ${input.firstName},`,
    "",
    "We received a request to reset your LabNet Guardian password.",
    `Reset link: ${input.resetUrl}`,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  await sendBrevoEmail({
    to: input.to,
    subject: "Reset your LabNet Guardian password",
    html,
    text,
  });
}
