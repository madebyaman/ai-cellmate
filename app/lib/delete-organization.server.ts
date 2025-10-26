import { prisma } from "~/lib/prisma.server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

/**
 * Deletes an organization and all associated data
 * This includes members, invitations, credits, subscriptions, tables, and all nested table data
 */
export async function deleteOrganization(
  organizationId: string,
  userId: string,
) {
  // Verify organization exists and user is the owner
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      members: true,
      Subscription: true,
      tables: {
        include: {
          rows: {
            include: {
              cells: true,
            },
          },
          columns: true,
        },
      },
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  // Check if user is the owner
  const userMembership = organization.members.find((m) => m.userId === userId);

  if (!userMembership || userMembership.role !== "owner") {
    throw new Error("Only organization owners can delete the organization");
  }

  // Cancel any active Stripe subscriptions
  if (organization.Subscription && organization.Subscription.length > 0) {
    for (const sub of organization.Subscription) {
      if (sub.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
        } catch (error) {
          console.error(
            `Failed to cancel subscription ${sub.stripeSubscriptionId}:`,
            error,
          );
          // Continue with deletion even if Stripe cancellation fails
        }
      }
    }
  }

  // Explicitly delete all nested data that doesn't have proper cascade deletes
  const tableIds = organization.tables.map((t) => t.id);

  if (tableIds.length > 0) {
    // Delete Run records (they reference tables and have CellVersions referencing them)
    await prisma.run.deleteMany({
      where: { tableId: { in: tableIds } },
    });

    // Delete Hint records (column-level and table-level hints)
    await prisma.hint.deleteMany({
      where: {
        OR: [
          { tableId: { in: tableIds } },
          {
            columnId: {
              in: organization.tables.flatMap((t) => t.columns.map((c) => c.id)),
            },
          },
        ],
      },
    });

    // Delete CachedTable records
    await prisma.cachedTable.deleteMany({
      where: { tableId: { in: tableIds } },
    });

    // Delete Cell records (this will cascade delete CellVersions due to onDelete: Cascade)
    const rowIds = organization.tables.flatMap((t) => t.rows.map((r) => r.id));
    if (rowIds.length > 0) {
      await prisma.cell.deleteMany({
        where: { rowId: { in: rowIds } },
      });
    }

    // Delete Table records (this will cascade delete Row and Column due to onDelete: Cascade)
    await prisma.table.deleteMany({
      where: { id: { in: tableIds } },
    });
  }

  // Delete organization (cascade will handle Members, Invitations, Credits, Subscriptions)
  await prisma.organization.delete({
    where: { id: organizationId },
  });

  return { success: true };
}
