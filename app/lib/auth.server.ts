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
    organization({
      async sendInvitationEmail(data) {
        const inviteLink = `${process.env.BASE_URL || "http://localhost:5173"}/accept-invitation/${data.id}`;
        await sendEmail({
          To: data.email,
          Subject: `You're invited to join ${data.organization.name}`,
          TextBody: `${data.inviter.user.name} has invited you to join ${data.organization.name}. Click here to accept: ${inviteLink}`,
          HtmlBody: `
            <p>${data.inviter.user.name} has invited you to join <strong>${data.organization.name}</strong>.</p>
            <p><a href="${inviteLink}">Click here to accept the invitation</a></p>
          `,
        });
      },
      organizationCreation: {
        afterCreate: async ({ organization, user }) => {
          // Create Stripe customer for the organization
          // const customer = await stripeClient.customers.create({
          //   email: user.email,
          //   name: organization.name,
          //   metadata: {
          //     organizationId: organization.id,
          //     userId: user.id,
          //   },
          // });
          // // Update organization metadata with Stripe customer ID
          // await auth.api.updateOrganization({
          //   organizationId: organization.id,
          //   data: {
          //     metadata: JSON.stringify({
          //       stripeCustomerId: customer.id,
          //     }),
          //   },
          // });
        },
      },
    }),
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
      createCustomerOnSignUp: false, // We'll create customers for organizations instead
      authorizeReference: () => {},
      subscription: {
        enabled: true,
        plans,
        //   getCustomerId: async ({ user, request }) => {
        //     // Get the user's active organization
        //     const activeOrganization =
        //       await auth.api.getActiveOrganization(request);

        //     if (!activeOrganization) {
        //       throw new Error("No active organization found");
        //     }

        //     // Parse organization metadata to get Stripe customer ID
        //     if (activeOrganization.metadata) {
        //       try {
        //         const metadata = JSON.parse(activeOrganization.metadata);
        //         if (metadata.stripeCustomerId) {
        //           return metadata.stripeCustomerId;
        //         }
        //       } catch (e) {
        //         console.error("Failed to parse organization metadata:", e);
        //       }
        //     }

        //     // If no customer ID exists, create a new customer for the organization
        //     const customer = await stripeClient.customers.create({
        //       email: user.email,
        //       name: activeOrganization.name,
        //       metadata: {
        //         organizationId: activeOrganization.id,
        //         userId: user.id,
        //       },
        //     });

        //     // Update organization metadata with Stripe customer ID
        //     await auth.api.updateOrganization({
        //       organizationId: activeOrganization.id,
        //       data: {
        //         metadata: JSON.stringify({
        //           stripeCustomerId: customer.id,
        //         }),
        //       },
        //     });

        //     return customer.id;
        //   },
        // },
      },
      onEvent: async (event) => {
        switch (event.type) {
          case "invoice.paid":
            const invoice = event.data.object;
            console.log("invoice", JSON.stringify(invoice));
            const organizationId = invoice.customer?.metadata?.organizationId;
            console.log("organizationId", organizationId);

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
