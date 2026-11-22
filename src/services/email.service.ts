import { Resend } from 'resend';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new AppError('Email service is not configured (missing RESEND_API_KEY)', 503);
  }
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Sends a 4-digit email verification code via Resend.
 */
export async function sendEmailVerificationCodeEmail(
  to: string,
  code: string,
  name?: string
): Promise<void> {
  const resend = getResendClient();
  const greeting = name ? `Hi ${name},` : 'Hi,';

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: [to],
    subject: 'Verify your Planora email',
    text: `${greeting}\n\nYour 4-digit email verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not create a Planora account, you can safely ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
        <h2 style="margin: 0 0 12px; color: #15803d;">Verify Your Email</h2>
        <p style="margin: 0 0 16px; line-height: 1.5;">${greeting}</p>
        <p style="margin: 0 0 16px; line-height: 1.5;">Enter the 4-digit code below in Planora to verify your email address. This code expires in <strong>10 minutes</strong>.</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; letter-spacing: 10px; font-size: 32px; font-weight: 700; color: #111827; margin: 20px 0;">
          ${code}
        </div>
        <p style="margin: 16px 0 0; font-size: 13px; color: #6b7280;">If you did not create a Planora account, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new AppError(`Failed to send verification email: ${error.message}`, 502);
  }
}

/**
 * Sends the 4-digit password reset code via Resend.
 */
export async function sendPasswordResetCodeEmail(
  to: string,
  code: string,
  name?: string
): Promise<void> {
  const resend = getResendClient();
  const greeting = name ? `Hi ${name},` : 'Hi,';

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: [to],
    subject: 'Your Planora password reset code',
    text: `${greeting}\n\nYour 4-digit password reset code is: ${code}\n\nThis code expires in 10 minutes. If you did not request a password reset, you can safely ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
        <h2 style="margin: 0 0 12px; color: #15803d;">Planora Password Reset</h2>
        <p style="margin: 0 0 16px; line-height: 1.5;">${greeting}</p>
        <p style="margin: 0 0 16px; line-height: 1.5;">Use the 4-digit code below to reset your password. This code expires in <strong>10 minutes</strong>.</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; letter-spacing: 10px; font-size: 32px; font-weight: 700; color: #111827; margin: 20px 0;">
          ${code}
        </div>
        <p style="margin: 16px 0 0; font-size: 13px; color: #6b7280;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new AppError(`Failed to send reset email: ${error.message}`, 502);
  }
}

/**
 * Sends a welcome email after account creation. Logs and continues if Resend is unconfigured in dev.
 */
export async function sendWelcomeEmail(to: string, name?: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    return;
  }

  const resend = getResendClient();
  const greeting = name ? `Welcome to Planora, ${name}!` : 'Welcome to Planora!';

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: [to],
    subject: 'Welcome to Planora',
    text: `${greeting}\n\nYour account has been created. Start managing your tasks in minutes!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
        <h2 style="margin: 0 0 12px; color: #15803d;">${greeting}</h2>
        <p style="margin: 0; line-height: 1.5;">Your account has been created. Start managing your tasks in minutes.</p>
      </div>
    `,
  });

  if (error) {
    console.warn(`Welcome email failed for ${to}:`, error.message);
  }
}
