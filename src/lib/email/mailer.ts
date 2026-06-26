import nodemailer from "nodemailer";

export const EMAIL_NOT_CONFIGURED_MESSAGE =
  "Le mail de vérification n’a pas pu être envoyé pour le moment.";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
};

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.MAIL_FROM?.trim();

  if (!host || !from) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
  const user = process.env.SMTP_USER?.trim() || undefined;
  const pass = process.env.SMTP_PASS || undefined;

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    secure,
    user,
    pass,
    from,
  };
}

export function isEmailTransportConfigured() {
  return Boolean(getSmtpConfig());
}

export async function sendEmail(input: SendEmailInput) {
  const config = getSmtpConfig();

  if (!config) {
    console.error("Email transport not configured.");
    return { ok: false as const, code: "not_configured" as const };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth:
      config.user && config.pass
        ? {
            user: config.user,
            pass: config.pass,
          }
        : undefined,
  });

  try {
    await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    console.info("Verification email sent.");
    return { ok: true as const };
  } catch {
    console.error("Verification email sending failed.");
    return { ok: false as const, code: "send_failed" as const };
  }
}
