import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

const stripe = new Stripe(key);

interface CreateCheckoutSessionParams {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  mode?: "payment" | "subscription";
  customerId?: string;
  organizationId: string;
  plan: string;
}

export async function createCheckoutSession({
  priceId,
  successUrl,
  cancelUrl,
  mode = "payment",
  customerId,
  organizationId,
  plan,
}: CreateCheckoutSessionParams) {
  try {
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    if (customerId) {
      sessionConfig.customer = customerId;
    }

    sessionConfig.metadata = {
      organizationId,
      plan,
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return { url: session.url };
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    throw new Error("Failed to create checkout session");
  }
}

interface CreateBillingPortalSessionParams {
  customerId: string;
  returnUrl: string;
}

export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: CreateBillingPortalSessionParams) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  } catch (error) {
    console.error("Failed to create billing portal session:", error);
    throw new Error("Failed to create billing portal session");
  }
}

interface CreateCustomerParams {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export async function createCustomer({
  email,
  name,
  metadata,
}: CreateCustomerParams) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });

    return customer;
  } catch (error) {
    console.error("Failed to create customer:", error);
    throw new Error("Failed to create customer");
  }
}

interface UpgradeSubscriptionParams {
  subscriptionId: string;
  newPriceId: string;
  returnUrl: string;
}

export async function upgradeSubscription({
  subscriptionId,
  newPriceId,
  returnUrl,
}: UpgradeSubscriptionParams) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.customer as string,
      return_url: returnUrl,
      flow_data: {
        type: "subscription_update_confirm",
        subscription_update_confirm: {
          subscription: subscriptionId,
          items: [
            {
              id: subscription.items.data[0].id,
              price: newPriceId,
              quantity: 1,
            },
          ],
        },
      },
    });

    return { url: session.url };
  } catch (error) {
    console.error("Failed to create upgrade session:", error);
    throw new Error("Failed to create upgrade session");
  }
}
