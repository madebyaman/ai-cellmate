import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.server";
import { magicLink } from "better-auth/plugins";
import sendEmail from "~/utils/email.server";
import {
  polar,
  checkout,
  portal,
  usage,
  webhooks,
} from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: "sandbox", // or 'production'
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  cookiePrefix: "better-auth",
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
          Subject: "Login to your account",
          TextBody: `Click <a href="${url}">here</a> to login to your account.`,
          HtmlBody: `<p>Click <a href="${url}">here</a> to login to your account.</p>`,
        });
      },
    }),
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            { productId: process.env.POLAR_STARTER_ID!, slug: "starter" },
            { productId: process.env.POLAR__PRO_ID!, slug: "pro" },
            {
              productId: process.env.POLAR_BOOSTER_50_ID!,
              slug: "booster-50",
            },
          ],
          successUrl: "/billing/success?checkout_id={CHECKOUT_ID}",
          authenticatedUsersOnly: true,
        }),
        portal(),
        usage(),
        // webhooks({
        //   secret: process.env.POLAR_WEBHOOK_SECRET!,
        // }),
      ],
    }),
  ],
});
