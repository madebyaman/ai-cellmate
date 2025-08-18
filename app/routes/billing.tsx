import { LogOut } from "lucide-react";
import {
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";
import { AuthShell } from "~/components/auth-shell";
import { BillingPlans } from "~/components/billing-plans";
import { GeneralErrorBoundary } from "~/components/general-error-boundry";
import { Button } from "~/components/ui/button";
import Heading from "~/components/ui/heading";
import { authClient } from "~/lib/auth-client";
import { auth } from "~/lib/auth.server";
import {
  getActiveOrganizationId,
  requireOrganization,
  requireUser,
} from "~/utils/auth.server";
import { ROUTES } from "~/utils/constants";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUser(request);
  await requireOrganization(request);
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const plan = formData.get("plan");
  if (typeof plan !== "string") throw new Error("Submitted an invalid value");
  const orgId = await getActiveOrganizationId(request);

  try {
    const data = await auth.api.upgradeSubscription({
      body: {
        plan: plan,
        referenceId: "g2Y6FimGKGrHy7wTXxwyEHAr54oc3Ott",
        successUrl: "http://localhost:5173/billing",
        cancelUrl: "http://localhost:5173/billing",
      },
      headers: request.headers,
    });
    const url = data.url;
    if (!url) throw new Error("Error checkout");
    throw redirect(url);
  } catch (e) {
    console.log("ERROR", e);
  }
}

export default function BillingPage() {
  return (
    <AuthShell>
      <AuthShell.Navigation>
        <AuthShell.Logo />
        <form method="post" action={ROUTES.LOGOUT}>
          <Button variant="link">
            <LogOut className="size-4" />
            Logout
          </Button>
        </form>
      </AuthShell.Navigation>

      <AuthShell.MainContainer className="sm:max-w-6xl">
        <AuthShell.Header>
          <Heading
            as="h1"
            className="text-center text-2xl md:text-3xl font-semibold"
          >
            Choose Your Plan
          </Heading>
          <p className="mt-2 text-center text-sm text-gray-600">
            Select a subscription plan to start using AI Cellmate
          </p>
        </AuthShell.Header>

        <AuthShell.BorderedContainer>
          <BillingPlans />
        </AuthShell.BorderedContainer>

        <AuthShell.CTA>
          <p className="text-center text-sm text-gray-500">
            Need help choosing? Contact us for assistance.
          </p>
        </AuthShell.CTA>
      </AuthShell.MainContainer>
    </AuthShell>
  );
}

export const meta: MetaFunction = () => {
  return [{ title: "Choose Your Plan - AI Cellmate" }];
};

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
