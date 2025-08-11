import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { requireUser } from "~/utils/auth.server";
import { ROUTES } from "~/utils/constants";
import { redirectWithToast } from "~/utils/toast.server";

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUser(request);
  const response = await auth.api.signOut({
    headers: request.headers,
    asResponse: true,
  });
  return redirectWithToast(
    ROUTES.LOGIN,
    {
      type: "success",
      title: "Logout successful",
      description: "You are now logged out.",
    },
    response,
  );
}
