import { redirect, type LoaderFunctionArgs } from "react-router";
import { authClient } from "~/lib/auth-client";
import { ROUTES } from "~/utils/constants";
import { auth } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const invitationId = url.searchParams.get("invitationId");

  if (!invitationId) {
    throw new Error("Missing invitation ID");
  }

  // Check if user is logged in
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // If not logged in, redirect to login
  if (!session) {
    return redirect(ROUTES.LOGIN);
  }

  try {
    // Accept the invitation
    await auth.api.acceptInvitation({
      body: {
        invitationId,
      },
      headers: request.headers,
    });

    // Redirect to dashboard after successful acceptance
    return redirect(ROUTES.DASHBOARD);
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    throw new Error("Failed to accept invitation");
  }
}

// This component should never render since the loader always redirects
export default function AcceptInvitation() {
  return null;
}
