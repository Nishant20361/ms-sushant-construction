import { prisma } from "../src/db.js";
import { hashPassword } from "../src/utils/password.js";

async function main() {
  const newPassword = "XdCx1UWcRRQOcv-T";

  const passwordHash = await hashPassword(newPassword);

  await prisma.admin.update({
    where: {
      username: "admin",
    },
    data: {
      passwordHash,
      isActive: true,
    },
  });

  console.log("Admin password updated successfully");

  await prisma.$disconnect();
}

main();
