import { UNSAFE_invariant, type ActionFunctionArgs } from "react-router";
import Stripe from "stripe";
import { prisma } from "~/lib/prisma.server";
import { BOOSTER_PLAN_NAME, PLANS } from "~/utils/constants";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function action({ request }: ActionFunctionArgs) {
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return new Response("No signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Webhook signature verification failed", {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response("Success", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  if (session.mode === "subscription" && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string,
    );
    console.log("sub", JSON.stringify(subscription));
    const plan = session.metadata?.plan;
    UNSAFE_invariant(plan, "No plan name found in webhook");
    UNSAFE_invariant(session.metadata?.organizationId, "No organization id");

    await prisma.subscription.create({
      data: {
        id: subscription.id,
        plan,
        organizationId: session.metadata?.organizationId || "",
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        periodStart: new Date(
          subscription.items.data[0].current_period_start * 1000,
        ),
        periodEnd: new Date(
          subscription.items.data[0].current_period_end * 1000,
        ),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        seats: subscription.items.data[0]?.quantity || 1,
      },
    });
  }

  // Credit users on checkout session completed
  try {
    // 1. Get the organization ID from session metadata
    const organizationId = session.metadata?.organizationId;
    const isBooster = session.metadata?.plan === BOOSTER_PLAN_NAME;

    if (!organizationId) {
      console.error("No organizationId found in checkout session metadata");
      return;
    }

    // 2. Get the subscription to find the plan
    const customerId = session.customer;
    if (!customerId || typeof customerId !== "string") {
      console.error("No customerId found in checkout session metadata");
      return;
    }
    const subscription = await prisma.subscription.findFirst({
      where: {
        stripeCustomerId: customerId,
        organizationId: organizationId,
      },
    });

    if (!subscription) {
      console.error("No subscription found for customer:", customerId);
      return;
    }

    // 3. Find the plan details
    const plan = PLANS.find((p) => p.id === subscription.plan);
    if (!plan) {
      console.error("Plan not found:", subscription.plan);
      return;
    }

    // 4. Update or create credits for the organization
    const existingCredits = await prisma.credits.findUnique({
      where: { organizationId },
    });

    if (existingCredits) {
      // For subscriptions, set credits to plan amount
      // For one-off purchases (booster), add credits on top
      const newAmount = isBooster
        ? existingCredits.amount + plan.credits
        : plan.credits;

      await prisma.credits.update({
        where: { organizationId },
        data: { amount: newAmount },
      });
    } else {
      // Create new credits record for the organization
      await prisma.credits.create({
        data: {
          organizationId,
          amount: plan.credits,
        },
      });
    }

    console.log(
      `Successfully credited ${plan.credits} credits to organization ${organizationId} for plan ${plan.name}`,
    );
  } catch (error) {
    console.error("Error processing checkout.session.completed:", error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const planId = subscription.items.data[0].plan.id;
  const plan = PLANS.find((p) => p.priceId === planId);
  if (!plan) throw new Error("Unknown planId");

  const updatedSubscription = await prisma.subscription.updateMany({
    where: {
      stripeSubscriptionId: subscription.id,
    },
    data: {
      status: subscription.status,
      periodStart: new Date(
        subscription.items.data[0].current_period_start * 1000,
      ),
      periodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      seats: subscription.items.data[0]?.quantity || 1,
      plan: plan.id,
    },
  });

  if (updatedSubscription.count === 0) {
    throw new Error(
      `Subscription not found for stripeSubscriptionId: ${subscription.id}`,
    );
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: {
      stripeSubscriptionId: subscription.id,
    },
    data: {
      status: "canceled",
      cancelAtPeriodEnd: true,
    },
  });
}
