import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.server";
import { magicLink, organization } from "better-auth/plugins";
import { stripe } from "@better-auth/stripe";
import sendEmail from "~/utils/email.server";
import Stripe from "stripe";

const stripeClient = new Stripe(process.env.STRIPE_TEST_KEY!, {
  apiVersion: "2025-07-30.basil",
});

const plans = [
  {
    id: "starter",
    name: "Starter",
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    credits: 200,
  },
  {
    id: "pro",
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    credits: 1000,
  },
  {
    id: "booster",
    name: "Booster",
    priceId: process.env.STRIPE_BOOSTER_PRICE_ID!,
    credits: 200,
  },
];

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
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
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans,
      },
      onEvent: async (event) => {
        switch (event.type) {
          case "invoice.paid":
            const invoice = event.data.object;
            console.log("invoice", JSON.stringify(invoice));
            const userId = invoice.metadata?.userId;
            console.log("userId", userId);

            // const priceId = invoice.lines?.data[0]?.

            // if (invoice.lines?.data) {
            //   for (const lineItem of invoice.lines.data) {
            //     if (
            //       lineItem.parent?.type === "subscription_item_details" &&
            //       lineItem.parent.subscription_item_details?.subscription
            //     ) {
            //       subscriptionId =
            //         lineItem.parent.subscription_item_details.subscription;
            //       break;
            //     }
            //   }
            // }

            // // If no subscription found in lines, this might not be a subscription invoice
            // if (!subscriptionId) {
            //   console.error("No subscription found for invoice", invoice.id);
            //   return new Response(null, { status: 200 });
            // }
            // if (!userId) {
            //   console.error("No userId found for invoice", invoice.id);
            //   return new Response(null, { status: 200 });
            // }

            // const credits

            // await prisma.credits.upsert({
            //   where: { userId },
            //   update: {
            //     amount: {
            //       increment: credits,
            //     },
            //   },
            //   create: {
            //     userId,
            //     amount: credits,
            //   },
            // });
            break;
          default:
            console.log("No event handling for ", event.type);
            return;
        }
      },
    }),
  ],
});
