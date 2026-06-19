const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting membership migration...");

  const usersWithMemberships = await prisma.user.findMany({
    where: {
      membershipTier: {
        notIn: ["NONE"]
      }
    }
  });

  console.log(`Found ${usersWithMemberships.length} users with active memberships.`);

  for (const user of usersWithMemberships) {
    if (!user.membershipTier) continue;

    // Check if a membership already exists for this user to avoid duplicates if run multiple times
    const existing = await prisma.userMembership.findFirst({
      where: { userId: user.id }
    });

    if (!existing) {
      await prisma.userMembership.create({
        data: {
          userId: user.id,
          tier: user.membershipTier,
          totalSlots: user.membershipSlotsTotal || 0,
          usedSlots: user.membershipSlotsUsed || 0,
          status: user.membershipExpiry && new Date(user.membershipExpiry) > new Date() ? "ACTIVE" : "EXPIRED",
          purchaseDate: user.createdAt, // Fallback since purchase date wasn't explicitly stored
          expiryDate: user.membershipExpiry || new Date()
        }
      });
      console.log(`Migrated membership for user ${user.id} (${user.membershipTier})`);
    } else {
      console.log(`User ${user.id} already has a migrated membership.`);
    }
  }

  console.log("Migration complete!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })