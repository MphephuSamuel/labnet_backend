import crypto from "crypto";

const PASSWORD_CHARACTERS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";

export function generatePassword(length = 12) {
  return Array.from({ length }, () => {
    const index = crypto.randomInt(0, PASSWORD_CHARACTERS.length);
    return PASSWORD_CHARACTERS[index];
  }).join("");
}
