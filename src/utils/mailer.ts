import fs from "fs/promises";
import path from "path";
import ejs from "ejs";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const DEFAULT_SENDER_EMAIL = "labnetguardian@gmail.com";
const DEFAULT_SENDER_NAME = "LabNet Guardian";

export interface BrevoEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function renderTemplate(templateName: string, data: object) {
  const templatePath = path.resolve(
    process.cwd(),
    "src",
    "templates",
    "emails",
    templateName,
  );
  const template = await fs.readFile(templatePath, "utf8");

  return ejs.render(template, data);
}

export async function sendBrevoEmail(payload: BrevoEmailPayload) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured.");
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: DEFAULT_SENDER_EMAIL,
        name: DEFAULT_SENDER_NAME,
      },
      to: [{ email: payload.to }],
      subject: payload.subject,
      htmlContent: payload.html,
      textContent: payload.text,
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `Brevo email failed with status ${response.status}: ${responseBody}`,
    );
  }
}
