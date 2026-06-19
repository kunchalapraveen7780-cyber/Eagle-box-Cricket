const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  
  // Delete existing data in correct dependency order
  await prisma.notification.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.user.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.offer.deleteMany();

  // Create Branches (Hyderabad locations)
  await prisma.branch.createMany({
    data: [
      { name: "Eagle Box Nagole", location: "Nagole, Hyderabad", pricePerHour: 800 },
      { name: "Eagle Box Uppal", location: "Uppal, Hyderabad", pricePerHour: 900 },
      { name: "Eagle Box Gachibowli", location: "Gachibowli, Hyderabad", pricePerHour: 1500 },
      { name: "Eagle Box Kukatpally", location: "Kukatpally, Hyderabad", pricePerHour: 1200 },
      { name: "Eagle Box Madhapur", location: "Madhapur, Hyderabad", pricePerHour: 1400 },
      { name: "Eagle Box Kompally", location: "Kompally, Hyderabad", pricePerHour: 1000 }
    ]
  });
  const branches = await prisma.branch.findMany();

  // 1. Memberships
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
  
  // 2. Customers
  const pwd = await bcrypt.hash("password123", 10);
  
  const admin = await prisma.user.create({
    data: { name: "Admin", email: "admin@eaglebox.com", password: pwd, phone: "9999999999", role: "ADMIN", referralCode: "ADMINREF" }
  });

  const users = [admin];
  // 3. Slots
  const slots = [];
  const today = new Date();
  
  function formatAMPM(hour) {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h.toString().padStart(2, "0")}:00 ${ampm}`;
  }

  for (const branch of branches) {
    for (let day = 0; day < 14; day++) {
      const d = new Date(today);
      d.setDate(d.getDate() + day);
      const dateStr = d.toISOString().split("T")[0];
      
      for (let hour = 6; hour < 22; hour++) {
        const startTime = formatAMPM(hour);
        const endTime = formatAMPM(hour + 1);
        
        slots.push({
          date: dateStr,
          startTime,
          endTime,
          status: "AVAILABLE",
          matchType: "casual",
          price: branch.pricePerHour,
          branchId: branch.id
        });
      }
    }
  }
  await prisma.slot.createMany({ data: slots });
  
  const allSlots = await prisma.slot.findMany();
  

  
  // 5. Offers
  await prisma.offer.deleteMany();
  await prisma.offer.create({
    data: { code: "WELCOME10", discountPercent: 10, validFrom: new Date(), validTo: new Date(today.setMonth(today.getMonth() + 1)), targetSegment: "ALL" }
  });
  await prisma.offer.create({
    data: { code: "PLATINUM50", discountPercent: 50, validFrom: new Date(), validTo: new Date(today.setMonth(today.getMonth() + 1)), targetSegment: "PLATINUM" }
  });

  console.log("Seeding complete!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
