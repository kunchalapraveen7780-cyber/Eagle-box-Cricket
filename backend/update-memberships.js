const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function updateMemberships() {
  console.log("Updating Memberships...");
  await prisma.membership.deleteMany();

  await prisma.membership.create({
    data: { name: "Starter", price: 999, durationDays: 30, benefitsJson: JSON.stringify(["5% discount on bookings", "Priority support"]) }
  });
  await prisma.membership.create({
    data: { name: "Pro", price: 2499, durationDays: 30, benefitsJson: JSON.stringify(["10% discount on bookings", "Free water bottle per match", "Priority support"]) }
  });
  await prisma.membership.create({
    data: { name: "Elite", price: 4499, durationDays: 30, benefitsJson: JSON.stringify(["15% discount on bookings", "Free gear rental", "Dedicated manager"]) }
  });
  await prisma.membership.create({
    data: { name: "Champion", price: 7999, durationDays: 30, benefitsJson: JSON.stringify(["20% discount on bookings", "VIP locker access", "Free guest passes"]) }
  });

  console.log("Memberships updated successfully.");

  // also check if any existing user has SILVER/GOLD/PLATINUM and update them
  await prisma.user.updateMany({
    where: { membershipTier: "SILVER" },
    data: { membershipTier: "PRO" }
  });
  await prisma.user.updateMany({
    where: { membershipTier: "GOLD" },
    data: { membershipTier: "ELITE" }
  });
  await prisma.user.updateMany({
    where: { membershipTier: "PLATINUM" },
    data: { membershipTier: "CHAMPION" }
  });
  await prisma.user.updateMany({
    where: { membershipTier: "BRONZE" },
    data: { membershipTier: "STARTER" }
  });

  console.log("User tiers migrated successfully.");

  await prisma.$disconnect();
}
updateMemberships();