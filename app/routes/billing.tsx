import { LogOut } from "lucide-react";
import {
  redirect,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";
import { AuthShell } from "~/components/auth-shell";
import { BillingPlans } from "~/components/billing-plans";
import { GeneralErrorBoundary } from "~/components/general-error-boundry";
import { Button } from "~/components/ui/button";
import Heading from "~/components/ui/heading";
import WorkspaceDropdown from "~/components/workspace-dropdown";
import { auth } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { getActiveOrganizationId, requireActiveOrg } from "~/utils/auth.server";
import { CHANGE_WORKSPACE_FORM, INTENTS, ROUTES } from "~/utils/constants";
import { getUserSubscription } from "~/utils/sub.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { activeOrg, orgsList, user } = await requireActiveOrg(request);
  if (activeOrg.id) {
    const sub = await getUserSubscription(request, activeOrg.id);
    if (sub) throw redirect(ROUTES.DASHBOARD);
  }

  return { activeOrg, orgsList };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get(INTENTS.INTENT);

  if (intent === INTENTS.CHANGE_WORKSPACE) {
    const workspace = formData.get(CHANGE_WORKSPACE_FORM.WORKSPACE_ID);
    console.log("workspace", workspace);

    if (workspace === CHANGE_WORKSPACE_FORM.NEW_VALUE) {
      // This case is handled by the dialog form, not here
      return null;
    }

    // Find the organization to get its slug
    const selectedOrg = await prisma.organization.findUnique({
      where: { id: String(workspace) },
      select: { id: true, slug: true },
    });
    console.log("selectedOrg", selectedOrg);

    if (selectedOrg) {
      await auth.api.setActiveOrganization({
        body: {
          organizationId: selectedOrg.id,
          organizationSlug: selectedOrg.slug ?? undefined,
        },
        headers: request.headers,
      });
    }
    return null;
  }

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
  const { activeOrg, orgsList } = useLoaderData<typeof loader>();

  return (
    <AuthShell>
      <AuthShell.Navigation>
        <div className="flex gap-4">
          <AuthShell.Logo />
          {orgsList.length > 1 && (
            <WorkspaceDropdown
              selectedOrgId={activeOrg.id ?? null}
              orgs={orgsList}
              hideCreateOption={true}
            />
          )}
        </div>
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
