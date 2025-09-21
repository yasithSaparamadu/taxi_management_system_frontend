import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn("[notify] SMTP not fully configured; emails will be no-op");
    return null;
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export async function sendEmail(opts: SendEmailOptions) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@example.com";
  const t = getTransporter();
  if (!t) {
    console.log("[notify] Email (simulated)", { from, ...opts });
    return;
  }
  await t.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text });
}
