const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function cleanupDemoUsers() {
  const demoEmails = [
    "rahul@test.com",
    "priya@test.com",
    "amit@test.com",
    "sneha@test.com",
    "vikram@test.com",
    "bablu@test.com"
  ];

  const demoNames = [
    "Rahul Sharma",
    "Priya Patel",
    "Amit Kumar",
    "Sneha Reddy",
    "Vikram Singh",
    "Bablu Kunchala"
  ];

  console.log("Starting cleanup of demo users...");

  try {
    const usersToDelete = await prisma.user.findMany({
      where: {
        OR: [
          { email: { in: demoEmails } },
          { name: { in: demoNames } }
        ]
      }
    });

    if (usersToDelete.length === 0) {
      console.log("No demo users found in the database.");
      return;
    }

    const userIds = usersToDelete.map(u => u.id);
    console.log(`Found ${userIds.length} demo users to delete.`);

    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.coupon.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.supportTicket.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.referral.deleteMany({ where: { OR: [{ referrerId: { in: userIds } }, { referredId: { in: userIds } }] } });
    await prisma.auditLog.deleteMany({ where: { userAffected: { in: userIds } } });
    await prisma.booking.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });