const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.emailLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(logs);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
