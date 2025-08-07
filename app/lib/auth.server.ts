import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma.server';
import { magicLink } from 'better-auth/plugins';
import sendEmail from '~/utils/email.server';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),
  cookiePrefix: 'better-auth',
  rateLimit: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async (data, request) => {
        const { email, url } = data;
        await sendEmail({
          To: email,
          Subject: 'Login to your account',
          TextBody: `Click <a href="${url}">here</a> to login to your account.`,
          HtmlBody: `<p>Click <a href="${url}">here</a> to login to your account.</p>`,
        });
      },
    }),
  ],
});
