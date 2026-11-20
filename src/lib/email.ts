import nodemailer from "nodemailer";

export function createEmailTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  });
}

export async function sendVerificationEmail(email: string, url: string) {
  if (!process.env.SMTP_HOST) {
    console.warn(`SMTP is not configured. Verification URL for ${email}: ${url}`);
    return;
  }

  await createEmailTransport().sendMail({
    from: process.env.EMAIL_FROM ?? "Scholarship Community <noreply@example.com>",
    to: email,
    subject: "Verify your Scholarship Community account",
    html: `
      <h1>Verify your account</h1>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${url}">Verify email</a></p>
      <p>This link expires soon.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, url: string) {
  if (!process.env.SMTP_HOST) {
    console.warn(`SMTP is not configured. Password reset URL for ${email}: ${url}`);
    return;
  }

  await createEmailTransport().sendMail({
    from: process.env.EMAIL_FROM ?? "Scholarship Community <noreply@example.com>",
    to: email,
    subject: "Reset your Scholarship Community password",
    html: `
      <h1>Reset your password</h1>
      <p>Click the link below to choose a new password:</p>
      <p><a href="${url}">Reset password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}
