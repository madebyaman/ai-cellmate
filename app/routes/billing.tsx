import { LogOut } from "lucide-react";
import { type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { AuthShell } from "~/components/auth-shell";
import { BillingPlans } from "~/components/billing-plans";
import { GeneralErrorBoundary } from "~/components/general-error-boundry";
import { Button } from "~/components/ui/button";
import Heading from "~/components/ui/heading";
import { requireUserWithOrganization } from "~/utils/auth.server";
import { ROUTES } from "~/utils/constants";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserWithOrganization(request);
  return null;
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
