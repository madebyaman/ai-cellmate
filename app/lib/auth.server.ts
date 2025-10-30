import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.server";
import { magicLink, organization } from "better-auth/plugins";
import sendEmail from "~/utils/email.server";
import { BOOSTER_PLAN_NAME, PLANS } from "~/utils/constants";
import { createCustomer } from "./stripe.server";

// const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const auth = betterAuth({
  appName: "AI Cellmate",
  baseURL: process.env.BASE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
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
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        const inviteLink = `${process.env.BASE_URL || "http://localhost:5173"}/accept-invitation?invitationId=${data.id}`;
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
        afterCreate: async (params) => {
          const { user, organization } = params;

          // Create Stripe customer for the organization
          const customer = await createCustomer({
            email: user.email,
            name: organization.name,
            metadata: {
              organizationId: organization.id,
              userId: user.id,
            },
          });
          // Update organization metadata with Stripe customer ID
          await prisma.organization.update({
            where: { id: organization.id },
            data: {
              stripeCustomerId: customer.id,
            },
          });
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
    //   onEvent: async (event) => {
    //     switch (event.type) {
    //       case "checkout.session.completed":
    //         const session = event.data.object;

    //         try {
    //           // 1. Get the organization ID from session metadata
    //           const organizationId = session.metadata?.organizationId;
    //           const isBooster = session.metadata?.plan === BOOSTER_PLAN_NAME;
    //           if (!organizationId) {
    //             console.error(
    //               "No organizationId found in checkout session metadata",
    //             );
    //             break;
    //           }

    //           // 2. Get the subscription to find the plan
    //           const customerId = session.customer;
    //           if (!customerId || typeof customerId !== "string") {
    //             console.error(
    //               "No customerId found in checkout session metadata",
    //             );
    //             break;
    //           }
    //           const subscription = await prisma.subscription.findFirst({
    //             where: {
    //               stripeCustomerId: customerId,
    //               referenceId: organizationId,
    //             },
    //           });

    //           if (!subscription) {
    //             console.error(
    //               "No subscription found for customer:",
    //               customerId,
    //             );
    //             break;
    //           }

    //           // 3. Find the plan details
    //           const plan = PLANS.find((p) => p.id === subscription.plan);
    //           if (!plan) {
    //             console.error("Plan not found:", subscription.plan);
    //             break;
    //           }

    //           // 4. Update or create credits for the organization
    //           const existingCredits = await prisma.credits.findUnique({
    //             where: { organizationId },
    //           });

    //           if (existingCredits) {
    //             // For subscriptions, set credits to plan amount
    //             // For one-off purchases (booster), add credits on top
    //             const newAmount = isBooster
    //               ? existingCredits.amount + plan.credits
    //               : plan.credits;

    //             await prisma.credits.update({
    //               where: { organizationId },
    //               data: { amount: newAmount },
    //             });
    //           } else {
    //             // Create new credits record for the organization
    //             await prisma.credits.create({
    //               data: {
    //                 organizationId,
    //                 amount: plan.credits,
    //               },
    //             });
    //           }

    //           console.log(
    //             `Successfully credited ${plan.credits} credits to organization ${organizationId} for plan ${plan.name}`,
    //           );
    //         } catch (error) {
    //           console.error(
    //             "Error processing checkout.session.completed:",
    //             error,
    //           );
    //         }
    //         break;
    //       default:
    //         console.log("No event handling for ", event.type);
    //         return;
    //     }
    //   },
    // }),
  ],
});
