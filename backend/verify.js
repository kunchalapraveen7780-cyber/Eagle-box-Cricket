const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function verify() {
  const users = await prisma.user.findMany();
  console.log("Total Users in DB:", users.length);
  users.forEach(u => console.log(`- ${u.name} (${u.role})`));

  const memberships = await prisma.membership.findMany();
  console.log("\nMemberships in DB:", memberships.map(m => m.name).join(", "));

  await prisma.$disconnect();
}
verify();
