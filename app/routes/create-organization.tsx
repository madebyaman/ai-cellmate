import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { useSpinDelay } from "spin-delay";
import { useEffect } from "react";
import { parseWithZod } from "@conform-to/zod";
import {
  redirect,
  useFetcher,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";
import { AuthenticityTokenInput } from "remix-utils/csrf/react";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { toast } from "sonner";
import { AuthShell } from "~/components/auth-shell";
import FormErrors from "~/components/form-errors";
import { GeneralErrorBoundary } from "~/components/general-error-boundry";
import { Button } from "~/components/ui/button";
import Heading from "~/components/ui/heading";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";
import { authClient } from "~/lib/auth-client";
import { createOrganizationSchema } from "~/schema/organization";
import { requireAuth } from "~/utils/auth.server";
import { INTENTS, ROUTES } from "~/utils/constants";
import { OrganizationCreationError } from "~/utils/errors";
import type { Route } from "./+types/create-organization";
import { LogOut } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await requireAuth(request);
  return {
    user: {
      name: session.user.name || "",
    },
  };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const intent = formData.get(INTENTS.INTENT);

  const submission = parseWithZod(formData, {
    schema: createOrganizationSchema,
  });
  if (submission.status !== "success") {
    return {
      submission: submission.reply(),
      shouldClearForm: false,
    };
  }

  let shouldClearForm = false;
  const { name, slug, userName } = submission.value;

  // Update user name first (only for regular organization creation, not from dropdown)
  if (userName && intent !== INTENTS.CREATE_WORKSPACE) {
    await authClient.updateUser(
      { name: userName },
      {
        onError: (ctx) => {
          toast.error("Failed to update user name", {
            description: ctx.error.message,
          });
          return;
        },
      },
    );
  }

  await authClient.organization.create(
    { name, slug },
    {
      onSuccess: ({ data }) => {
        const id = data?.id ?? null;
        const slug = data?.slug ?? null;
        console.log("data", data);
        if (!id || !slug) {
          throw new OrganizationCreationError(
            "Error setting active org: missing id or slug from organization creation response",
            data,
            "create-organization.tsx:onSuccess",
          );
        }
        shouldClearForm = true;

        // Set the newly created organization as active
        authClient.organization
          .setActive({
            organizationId: id,
            organizationSlug: slug,
          })
          .then(() => {
            toast("Workspace created successfully");
            redirect(ROUTES.DASHBOARD);
          });
      },
      onError: (ctx) => {
        toast.error("Failed to create organization", {
          description: ctx.error.message,
        });
      },
    },
  );

  return { submission: null, shouldClearForm };
}

export default function CreateOrganizationPage({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  let fetcher = useFetcher();
  let isLoading = fetcher.state !== "idle";
  const showSpinner = useSpinDelay(isLoading, {
    delay: 100,
    minDuration: 200,
  });

  const [form, fields] = useForm({
    shouldValidate: "onBlur",
    lastResult: actionData?.submission,
    shouldRevalidate: "onInput",
    defaultValue: {
      userName: loaderData?.user?.name || "",
    },
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: createOrganizationSchema });
    },
  });

  useEffect(() => {
    if (actionData?.shouldClearForm) {
      form.reset();
    }
  }, [actionData?.shouldClearForm]);

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

      <AuthShell.MainContainer>
        <AuthShell.Header>
          <Heading
            as="h1"
            className="text-center text-2xl md:text-3xl font-semibold"
          >
            Welcome to AiCellmate!
          </Heading>
          <p className="mt-2 text-center text-sm text-gray-600">
            Set up your workspace and account to get started with AI Cellmate
          </p>
        </AuthShell.Header>

        <AuthShell.BorderedContainer>
          <fetcher.Form
            className="flex flex-col gap-6 justify-center"
            method="POST"
            {...getFormProps(form)}
          >
            <AuthenticityTokenInput />
            <HoneypotInputs />
            <FormErrors errors={form.errors} />

            <div>
              <Label htmlFor={fields.userName.id} className="mb-1">
                Full Name
              </Label>
              <Input
                errors={fields.userName.errors}
                placeholder="e.g., John Doe"
                {...getInputProps(fields.userName, { type: "text" })}
              />
            </div>

            <div>
              <Label htmlFor={fields.name.id} className="mb-1">
                Workspace Name
              </Label>
              <Input
                errors={fields.name.errors}
                placeholder="e.g., Acme Corp"
                {...getInputProps(fields.name, { type: "text" })}
              />
            </div>

            <div>
              <Label htmlFor={fields.slug.id} className="mb-1">
                Workspace Slug
              </Label>
              <Input
                errors={fields.slug.errors}
                placeholder="e.g., acme-corp"
                {...getInputProps(fields.slug, { type: "text" })}
              />
              <p className="mt-1 text-sm text-gray-500">
                Used in URLs and must be unique. Only lowercase letters,
                numbers, and hyphens.
              </p>
            </div>
          </fetcher.Form>
        </AuthShell.BorderedContainer>

        <AuthShell.CTA>
          <Button
            type="submit"
            form={form.id}
            disabled={isLoading}
            isLoading={showSpinner}
          >
            Submit
          </Button>
        </AuthShell.CTA>
      </AuthShell.MainContainer>
    </AuthShell>
  );
}

export const meta: MetaFunction = () => {
  return [{ title: "Create Organization - AI Cellmate" }];
};

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
