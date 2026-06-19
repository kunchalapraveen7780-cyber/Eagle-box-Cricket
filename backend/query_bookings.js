const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const bookings = await prisma.booking.findMany({ include: { slot: true } }); 
  console.log(JSON.stringify(bookings, null, 2)); 
} 
main().catch(console.error).finally(() => prisma.$disconnect());
