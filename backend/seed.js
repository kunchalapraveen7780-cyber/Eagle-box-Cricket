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

  // Create Branches (Bangalore locations)
  const b1 = await prisma.branch.create({
    data: { name: "Eagle Box Indiranagar", location: "Indiranagar, Bangalore", pricePerHour: 1200 }
  });
  const b2 = await prisma.branch.create({
    data: { name: "Eagle Box Koramangala", location: "Koramangala, Bangalore", pricePerHour: 1000 }
  });
  const b3 = await prisma.branch.create({
    data: { name: "Eagle Box HSR Layout", location: "HSR Layout, Bangalore", pricePerHour: 1500 }
  });
  const b4 = await prisma.branch.create({
    data: { name: "Eagle Box Whitefield", location: "Whitefield, Bangalore", pricePerHour: 1100 }
  });
  const b5 = await prisma.branch.create({
    data: { name: "Eagle Box Jayanagar", location: "Jayanagar, Bangalore", pricePerHour: 1300 }
  });
  const b6 = await prisma.branch.create({
    data: { name: "Eagle Box Marathahalli", location: "Marathahalli, Bangalore", pricePerHour: 1250 }
  });
  const branches = [b1, b2, b3, b4, b5, b6];

  // 1. Memberships
  const silver = await prisma.membership.create({
    data: { name: "Silver", price: 499, durationDays: 30, benefitsJson: JSON.stringify(["5% discount on bookings", "Priority support"]) }
  });
  const gold = await prisma.membership.create({
    data: { name: "Gold", price: 999, durationDays: 30, benefitsJson: JSON.stringify(["10% discount on bookings", "Free water bottle per match", "Priority support"]) }
  });
  const platinum = await prisma.membership.create({
    data: { name: "Platinum", price: 1999, durationDays: 30, benefitsJson: JSON.stringify(["20% discount on bookings", "Free gear rental", "Dedicated manager"]) }
  });
  
  // 2. Customers
  const pwd = await bcrypt.hash("password123", 10);
  
  const admin = await prisma.user.create({
    data: { name: "Admin", email: "admin@eaglebox.com", password: pwd, phone: "9999999999", role: "ADMIN", referralCode: "ADMINREF" }
  });
  
  const c1 = await prisma.user.create({
    data: { name: "Rahul Sharma", email: "rahul@test.com", password: pwd, phone: "9876543210", membershipTier: "SILVER", referralCode: "RAHUL123", pointsBalance: 600 }
  });
  const c2 = await prisma.user.create({
    data: { name: "Priya Patel", email: "priya@test.com", password: pwd, phone: "9876543211", membershipTier: "GOLD", referralCode: "PRIYA123", pointsBalance: 1600 }
  });
  const c3 = await prisma.user.create({
    data: { name: "Amit Kumar", email: "amit@test.com", password: pwd, phone: "9876543212", membershipTier: "PLATINUM", referralCode: "AMIT123", pointsBalance: 3200 }
  });
  const c4 = await prisma.user.create({
    data: { name: "Sneha Reddy", email: "sneha@test.com", password: pwd, phone: "9876543213", membershipTier: "NONE", referralCode: "SNEHA123", pointsBalance: 100 }
  });
  const c5 = await prisma.user.create({
    data: { name: "Vikram Singh", email: "vikram@test.com", password: pwd, phone: "9876543214", membershipTier: "NONE", referralCode: "VIKRAM123", pointsBalance: 0 }
  });
  const users = [c1, c2, c3, c4, c5];

  // 3. Slots
  const slots = [];
  const today = new Date();
  
  for (let day = 0; day < 7; day++) {
    const d = new Date(today);
    d.setDate(d.getDate() + day);
    const dateStr = d.toISOString().split("T")[0];
    
    for (let hour = 6; hour < 22; hour++) {
      const startTime = `${hour.toString().padStart(2, "0")}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, "0")}:00`;
      
      const branchIndex = (day * 16 + (hour - 6)) % branches.length;
      const selectedBranch = branches[branchIndex];

      slots.push({
        date: dateStr,
        startTime,
        endTime,
        status: "AVAILABLE",
        matchType: "casual",
        price: selectedBranch.pricePerHour,
        branchId: selectedBranch.id
      });
    }
  }
  await prisma.slot.createMany({ data: slots });
  
  const allSlots = await prisma.slot.findMany();
  
  // 4. Bookings
  let bCount = 0;
  for (let i = 0; i < 10; i++) {
    const user = users[i % users.length];
    const slot = allSlots[i];
    
    await prisma.booking.create({
      data: {
        userId: user.id,
        slotId: slot.id,
        status: i % 3 === 0 ? "PENDING" : (i % 5 === 0 ? "CANCELLED" : "CONFIRMED"),
        amountPaid: slot.price,
        pointsEarned: Math.floor(slot.price / 10),
      }
    });
    
    await prisma.slot.update({
      where: { id: slot.id },
      data: { status: "BOOKED" }
    });
  }
  
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
