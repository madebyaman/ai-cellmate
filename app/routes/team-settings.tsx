import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { UserPlus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useAppLayoutLoaderData } from "./layout";
import { PLANS, INTENTS, INVITE_MEMBER_FORM } from "~/utils/constants";
import {
  Form,
  useNavigation,
  useLoaderData,
  useActionData,
} from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { redirect } from "react-router";
import { auth } from "~/lib/auth.server";
import { requireActiveOrg } from "~/utils/auth.server";
import { getUserSubscription } from "~/utils/sub.server";
import Heading from "~/components/ui/heading";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";
import { inviteMemberSchema } from "~/schema/organization";
import FormErrors from "~/components/form-errors";
import { prisma } from "~/lib/prisma.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { activeOrg } = await requireActiveOrg(request);

  // Get organization members and invitations
  const [members, invitations] = await Promise.all([
    auth.api.listMembers({
      query: {
        organizationId: activeOrg.id,
        limit: 100,
        offset: 0,
        sortBy: "createdAt",
        sortDirection: "desc",
      },
      headers: request.headers,
    }),
    auth.api.listInvitations({
      query: {
        organizationId: activeOrg.id,
      },
      headers: request.headers,
    }),
  ]);

  return {
    members: members.members,
    invitations,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get(INTENTS.INTENT);
  const currentUrl = new URL(request.url);
  const returnUrl = `${currentUrl.origin}${currentUrl.pathname}`;

  const { activeOrg } = await requireActiveOrg(request);
  const submission = parseWithZod(formData, {
    schema: inviteMemberSchema,
  });

  try {
    switch (intent) {
      case INTENTS.INVITE_MEMBER: {
        if (submission.status !== "success") {
          return {
            submission: submission.reply(),
          };
        }

        const { email } = submission.value;

        // Get current subscription to check team member limits
        const subscription = await getUserSubscription(activeOrg.id);
        let teamMemberLimit = 1; // Free plan default

        if (subscription) {
          const plan = PLANS.find((p) => p.id === subscription?.plan);
          teamMemberLimit = plan?.teamMembers || 1;
        }

        // Get current member count
        const members = await prisma.member.count({
          where: { organizationId: activeOrg.id },
        });
        const currentMemberCount = members || 1; // At least 1 (the owner)

        if (currentMemberCount >= teamMemberLimit) {
          return {
            submission: submission.reply({
              formErrors: [
                `Your plan allows up to ${teamMemberLimit} team member${teamMemberLimit > 1 ? "s" : ""}. Please upgrade to add more members.`,
              ],
            }),
          };
        }

        // Send invitation
        await auth.api.createInvitation({
          body: {
            email,
            role: "member",
            organizationId: activeOrg.id,
            resend: true,
          },
          headers: request.headers,
        });

        return redirect(returnUrl);
      }
    }
  } catch (error) {
    console.error("Team settings action error:", error);
    return {
      submission: submission.reply({
        formErrors: ["Error inviting team member"],
      }),
    };
  }

  return redirect(returnUrl);
}

export const meta: MetaFunction = () => {
  return [
    { title: "Team Settings - AI Cellmate" },
    { name: "description", content: "Manage your team members and send invitations to collaborate." },
  ];
};

export default function TeamSettings() {
  const { subscription } = useAppLayoutLoaderData();
  const { members, invitations } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const hasActiveSubscription = subscription;
  const currentPlan = hasActiveSubscription
    ? PLANS.find((plan) => plan.id === subscription?.plan)
    : null;
  const teamMemberLimit = currentPlan?.teamMembers || 1;
  const currentMemberCount = Math.max(members.length, 1); // At least 1 member
  const canAddMembers = currentMemberCount < teamMemberLimit;

  const [form, fields] = useForm({
    shouldValidate: "onBlur",
    lastResult: actionData?.submission,
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: inviteMemberSchema });
    },
  });

  return (
    <div className="bg-white ring-1 shadow-xs ring-gray-900/5 sm:rounded-xl">
      <div className="px-4 py-6 sm:p-8">
        <Heading
          id="team-members"
          className="text-base md:text-base font-semibold text-gray-900 mb-2"
          as="h2"
        >
          Team Members
        </Heading>
        <p className="text-sm text-gray-600 mb-6">
          Manage your team members and send invitations
        </p>

        {/* Plan info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            Your plan allows up to{" "}
            <span className="font-medium">{teamMemberLimit}</span> team member
            {teamMemberLimit > 1 ? "s" : ""}. Currently using{" "}
            <span className="font-medium">{currentMemberCount}</span> of{" "}
            {teamMemberLimit}.
          </p>
          {!canAddMembers && (
            <p className="text-sm text-amber-600 mt-1">
              Upgrade your plan to add more team members.
            </p>
          )}
        </div>

        {/* Add member form */}
        <div className="mb-8">
          <FormErrors className="mb-3" errors={form.errors} />
          <Form
            method="post"
            className="flex gap-3 items-end"
            {...getFormProps(form)}
          >
            <input
              type="hidden"
              name={INTENTS.INTENT}
              value={INTENTS.INVITE_MEMBER}
            />
            <div className="flex-1">
              <Label htmlFor={fields.email.id}>Email address</Label>
              <Input
                placeholder="colleague@company.com"
                className="px-3 shadow-sm"
                disabled={navigation.state === "submitting" || !canAddMembers}
                errors={fields.email.errors}
                {...getInputProps(fields.email, { type: "email" })}
              />
            </div>
            <Button
              type="submit"
              disabled={navigation.state === "submitting" || !canAddMembers}
              className="px-4 py-1.5 h-auto"
            >
              <UserPlus className="size-4 mr-2" />
              Invite Member
            </Button>
          </Form>
        </div>

        {/* Members list */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Your Team</h3>
          <div className="space-y-3">
            {/* Current members */}
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-indigo-600">
                      {member.user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.user.name || member.user.email}
                    </p>
                    <p className="text-xs text-gray-500">{member.user.email}</p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                  {member.role === "owner" ? "Owner" : "Member"}
                </span>
              </div>
            ))}

            {/* Pending invitations */}
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {invitation.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {invitation.email}
                    </p>
                    <p className="text-xs text-gray-500">Invited</p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
