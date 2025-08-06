import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma.server';
import sendEmail from '~/utils/email.server';
import {
  ForgotPasswordEmail,
  VerifyEmail,
} from '~/components/email-components';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'sqlite' }),
  cookiePrefix: 'better-auth',
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword(data, request) {
      const { user, url, token } = data;
      await sendEmail({
        To: user.email,
        Subject: 'Reset your password',
        react: <ForgotPasswordEmail onboardingUrl={url} otp={token} />,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail(data, request) {
      console.log('sending verification email >>>>>', data);
      const { user, url, token } = data;
      await sendEmail({
        To: user.email,
        Subject: 'Verify your email',
        react: <VerifyEmail onboardingUrl={url} token={token} />,
      });
    },
  },
});
