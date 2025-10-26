import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useAppLayoutLoaderData } from "./layout";
import {
  INTENTS,
  DELETE_ORGANIZATION_FORM,
  DELETE_PROFILE_FORM,
} from "~/utils/constants";
import {
  Form,
  useNavigation,
  useLoaderData,
  useActionData,
} from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { redirect } from "react-router";
import { requireActiveOrg } from "~/utils/auth.server";
import Heading from "~/components/ui/heading";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";
import {
  deleteOrganizationSchema,
  deleteProfileSchema,
} from "~/schema/organization";
import FormErrors from "~/components/form-errors";
import { deleteOrganization } from "~/lib/delete-organization.server";
import { deleteUserProfile } from "~/lib/delete-profile.server";
import { auth } from "~/lib/auth.server";
import { ROUTES } from "~/utils/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { useState } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  const { activeOrg, user, orgsList } = await requireActiveOrg(request);

  // Check if user is owner of the active organization
  const membership = await auth.api.listMembers({
    query: {
      organizationId: activeOrg.id,
      limit: 100,
      offset: 0,
    },
    headers: request.headers,
  });

  const userMember = membership.members.find((m) => m.userId === user.user.id);
  const isOwner = userMember?.role === "owner";

  return {
    isOwner,
    organizationName: activeOrg.name,
    organizationId: activeOrg.id,
    ownedOrganizationsCount: orgsList.filter((org) => {
      // This is a simplified check; in production you'd want to check the actual role
      return true; // You can implement proper owner checking
    }).length,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get(INTENTS.INTENT);

  const { activeOrg, user } = await requireActiveOrg(request);

  try {
    switch (intent) {
      case INTENTS.DELETE_ORGANIZATION: {
        const submission = parseWithZod(formData, {
          schema: deleteOrganizationSchema,
        });

        if (submission.status !== "success") {
          return {
            deleteOrgSubmission: submission.reply(),
          };
        }

        const organizationId = formData.get(
          DELETE_ORGANIZATION_FORM.ORGANIZATION_ID,
        );

        if (organizationId !== activeOrg.id) {
          return {
            deleteOrgSubmission: submission.reply({
              formErrors: ["Invalid organization ID"],
            }),
          };
        }

        try {
          await deleteOrganization(activeOrg.id, user.user.id);

          // Log out the user after deleting organization
          await auth.api.signOut({ headers: request.headers });

          return redirect(ROUTES.LOGIN);
        } catch (error) {
          console.error("Error deleting organization:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to delete organization";

          return {
            deleteOrgSubmission: submission.reply({
              formErrors: [errorMessage],
            }),
          };
        }
      }

      case INTENTS.DELETE_PROFILE: {
        const submission = parseWithZod(formData, {
          schema: deleteProfileSchema,
        });

        if (submission.status !== "success") {
          return {
            deleteProfileSubmission: submission.reply(),
          };
        }

        try {
          await deleteUserProfile(user.user.id);

          // Log out the user after deleting profile
          await auth.api.signOut({ headers: request.headers });

          return redirect(ROUTES.LOGIN);
        } catch (error) {
          console.error("Error deleting profile:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Failed to delete profile";

          return {
            deleteProfileSubmission: submission.reply({
              formErrors: [errorMessage],
            }),
          };
        }
      }
    }
  } catch (error) {
    console.error("Danger zone action error:", error);
    return {
      deleteOrgSubmission: undefined,
      deleteProfileSubmission: undefined,
    };
  }

  return {
    deleteOrgSubmission: undefined,
    deleteProfileSubmission: undefined,
  };
}

function DeleteOrganizationDialog({
  organizationName,
  organizationId,
  isSubmitting,
  form,
  fields,
}: {
  organizationName: string;
  organizationId: string;
  isSubmitting: boolean;
  form: any;
  fields: any;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="px-4 py-1.5 h-auto">
          <Trash2 className="size-4 mr-2" />
          Delete Organization
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-600" />
            Delete Organization
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete{" "}
            <span className="font-semibold text-gray-900">
              {organizationName}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-gray-600 space-y-2">
            <p>This will permanently remove:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>All tables and enrichment data</li>
              <li>All team members</li>
              <li>Active subscriptions (will be cancelled)</li>
              <li>All organization settings</li>
            </ul>
          </div>

          <FormErrors className="mb-0" errors={form.errors} />

          <Form method="post" {...getFormProps(form)} className="space-y-4">
            <input
              type="hidden"
              name={INTENTS.INTENT}
              value={INTENTS.DELETE_ORGANIZATION}
            />
            <input
              type="hidden"
              name={DELETE_ORGANIZATION_FORM.ORGANIZATION_ID}
              value={organizationId}
            />

            <div>
              <Label htmlFor={fields.confirmation.id} className="text-sm">
                Type <span className="font-mono font-bold">DELETE</span> to
                confirm
              </Label>
              <Input
                placeholder="DELETE"
                className="px-3 shadow-sm mt-2"
                disabled={isSubmitting}
                errors={fields.confirmation.errors}
                {...getInputProps(fields.confirmation, {
                  type: "text",
                })}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Organization
              </Button>
            </DialogFooter>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProfileDialog({
  isSubmitting,
  form,
  fields,
}: {
  isSubmitting: boolean;
  form: any;
  fields: any;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="px-4 py-1.5 h-auto">
          <Trash2 className="size-4 mr-2" />
          Delete Profile
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-600" />
            Delete Profile
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your
            account and personal data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-gray-600 space-y-2">
            <p>Deleting your profile will automatically:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Delete all organizations you own (and their data)</li>
              <li>Remove you from all teams you're a member of</li>
              <li>Terminate all your sessions</li>
              <li>Permanently delete all your personal data</li>
            </ul>
          </div>

          <FormErrors className="mb-0" errors={form.errors} />

          <Form method="post" {...getFormProps(form)} className="space-y-4">
            <input
              type="hidden"
              name={INTENTS.INTENT}
              value={INTENTS.DELETE_PROFILE}
            />

            <div>
              <Label htmlFor={fields.confirmation.id} className="text-sm">
                Type <span className="font-mono font-bold">DELETE</span> to
                confirm
              </Label>
              <Input
                placeholder="DELETE"
                className="px-3 shadow-sm mt-2"
                disabled={isSubmitting}
                errors={fields.confirmation.errors}
                {...getInputProps(fields.confirmation, {
                  type: "text",
                })}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Profile
              </Button>
            </DialogFooter>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const meta: MetaFunction = () => {
  return [
    { title: "Danger Zone - AI Cellmate" },
    { name: "description", content: "Permanently delete your organization or profile. This action cannot be undone." },
  ];
};

export default function DangerSettings() {
  const { isOwner, organizationName, organizationId } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const [deleteOrgForm, deleteOrgFields] = useForm({
    shouldValidate: "onBlur",
    lastResult: actionData?.deleteOrgSubmission,
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: deleteOrganizationSchema });
    },
  });

  const [deleteProfileForm, deleteProfileFields] = useForm({
    shouldValidate: "onBlur",
    lastResult: actionData?.deleteProfileSubmission,
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: deleteProfileSchema });
    },
  });

  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="space-y-6">
      {/* Delete Organization Section */}
      {isOwner && (
        <div className="bg-white ring-1 shadow-xs ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <Heading
              id="delete-organization"
              className="text-base md:text-base font-semibold text-gray-900 mb-2"
              as="h2"
            >
              Delete Organization
            </Heading>
            <p className="text-sm text-gray-600 mb-6">
              Permanently delete <span className="font-medium">{organizationName}</span> and
              all associated data. This action cannot be undone.
            </p>

            <DeleteOrganizationDialog
              organizationName={organizationName}
              organizationId={organizationId}
              isSubmitting={isSubmitting}
              form={deleteOrgForm}
              fields={deleteOrgFields}
            />
          </div>
        </div>
      )}

      {/* Delete Profile Section */}
      <div className="bg-white ring-1 shadow-xs ring-gray-900/5 sm:rounded-xl">
        <div className="px-4 py-6 sm:p-8">
          <Heading
            id="delete-profile"
            className="text-base md:text-base font-semibold text-gray-900 mb-2"
            as="h2"
          >
            Delete Profile
          </Heading>
          <p className="text-sm text-gray-600 mb-6">
            Permanently delete your account, all personal data, and all organizations you own.
            This action cannot be undone.
          </p>

          <DeleteProfileDialog
            isSubmitting={isSubmitting}
            form={deleteProfileForm}
            fields={deleteProfileFields}
          />
        </div>
      </div>
    </div>
  );
}
