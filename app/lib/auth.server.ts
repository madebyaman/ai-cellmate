import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma.server';
import sendEmail from '~/utils/email.server';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),
  cookiePrefix: 'better-auth',
  verification: {
    disableCleanup: true,
  },
  rateLimit: {
    enabled: true,
    window: 100,
    max: 3,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword(data, request) {
      const { user, url, token } = data;
      await sendEmail({
        To: user.email,
        Subject: 'Reset your password',
        // react: <ForgotPasswordEmail onboardingUrl={url} otp={token} />,
        TextBody: `Click <a href="${url}">here</a> to reset your password.`,
        HtmlBody: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 1000 * 60 * 60, // 1 hour
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail(data, request) {
      const { user, url, token } = data;
      await sendEmail({
        To: user.email,
        Subject: 'Verify your email',
        TextBody: `Click <a href="${url}">here</a> to verify your email.`,
        HtmlBody: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
        // react: <VerifyEmail onboardingUrl={url} token={token} />,
      });
    },
  },
});
