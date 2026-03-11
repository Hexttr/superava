import { appConfig } from "../config.js";

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  debugLabel: string;
  debugUrl: string;
};

export async function sendAuthEmail(args: SendEmailArgs): Promise<{ debugUrl?: string }> {
  if (!appConfig.resendApiKey || !appConfig.mailFrom) {
    console.log(`[auth-email:${args.debugLabel}] ${args.to} -> ${args.debugUrl}`);
    return appConfig.isProduction ? {} : { debugUrl: args.debugUrl };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appConfig.resendApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: appConfig.mailFrom,
      to: [args.to],
      subject: args.subject,
      html: args.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`email_send_failed:${response.status}:${body}`);
  }

  return {};
}

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<{ debugUrl?: string }> {
  const verifyUrl = `${appConfig.authPublicUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;
  return sendAuthEmail({
    to: email,
    subject: "Verify your newava.pro email",
    debugLabel: "verify-email",
    debugUrl: verifyUrl,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Подтвердите email</h2>
        <p>Нажмите на кнопку ниже, чтобы подтвердить email в newava.pro.</p>
        <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 18px;background:#d946ef;color:#fff;border-radius:999px;text-decoration:none;">Подтвердить email</a></p>
        <p>Если кнопка не открывается, используйте ссылку:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<{ debugUrl?: string }> {
  const resetUrl = `${appConfig.authPublicUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  return sendAuthEmail({
    to: email,
    subject: "Reset your newava.pro password",
    debugLabel: "reset-password",
    debugUrl: resetUrl,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Сброс пароля</h2>
        <p>Нажмите на кнопку ниже, чтобы задать новый пароль для аккаунта newava.pro.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#d946ef;color:#fff;border-radius:999px;text-decoration:none;">Сбросить пароль</a></p>
        <p>Если кнопка не открывается, используйте ссылку:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
      </div>
    `,
  });
}
