import { prisma } from "~/lib/prisma.server";
import { auth } from "~/lib/auth.server";
import { deleteOrganization } from "./delete-organization.server";

/**
 * Deletes a user profile and all associated data
 * This includes automatically deleting all owned organizations first,
 * then sessions, accounts, memberships, and invitations
 */
export async function deleteUserProfile(userId: string) {
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      members: {
        include: {
          organization: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Automatically delete all organizations where user is the owner
  const ownedOrgs = user.members.filter((m) => m.role === "owner");

  if (ownedOrgs.length > 0) {
    for (const membership of ownedOrgs) {
      try {
        await deleteOrganization(membership.organizationId, userId);
      } catch (error) {
        console.error(
          `Failed to delete organization ${membership.organizationId}:`,
          error,
        );
        // Continue with other organizations even if one fails
      }
    }
  }

  // Delete user (cascade will handle sessions, accounts, remaining members, invitations)
  await prisma.user.delete({
    where: { id: userId },
  });

  return { success: true };
}
