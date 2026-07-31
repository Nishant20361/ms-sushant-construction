import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";
import { config } from "../src/config";
import { slugify } from "../src/utils/slug";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ---------- Site settings ----------
  const existingSettings = await prisma.siteSetting.count();
  if (existingSettings === 0) {
    await prisma.siteSetting.create({
      data: {
        companyName: "M/S SUSHANT CONSTRUCTION",
        tagline: "Your trusted construction material supplier",
        heroTitle: "Quality Construction Materials",
        heroSubtitle:
          "ACC Cement, Nuvoco Cement, Tata & Mongia steel rods, roofing sheets, waterproofing chemicals and more — at the best prices.",
        phone: "+91 90000 00000",
        whatsappNumber: "919000000000",
        email: "contact@sushantconstruction.in",
        address: "Main Road, Sushant City, Bihar, India",
        googleMapsUrl: "https://www.google.com/maps/place/Sushant+City,+Bihar",
        aboutContent:
          "M/S Sushant Construction is a trusted supplier of premium construction materials. We supply ACC and Nuvoco cement, Tata and Mongia steel rods, roofing sheets, waterproofing chemicals, and every essential building material — delivered on time, every time.",
      },
    });
    console.log("  ✔ Site settings created");
  } else {
    console.log("  – Site settings already exist, skipping");
  }

  // ---------- Initial admin (from env) ----------
  const adminCount = await prisma.admin.count();
  if (adminCount === 0) {
    const password = config.initialAdmin.password;
    if (!password || password.length < 12) {
      throw new Error(
        "INITIAL_ADMIN_PASSWORD must be set and at least 12 characters long. " +
          "Add it to .env before running db:seed."
      );
    }
    const passwordHash = await hashPassword(password);
    await prisma.admin.create({
      data: {
        username: config.initialAdmin.username,
        email: config.initialAdmin.email || null,
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`  ✔ Initial admin created (username: ${config.initialAdmin.username})`);
  } else {
    console.log("  – Admin already exists, skipping");
  }

  // ---------- Categories & products ----------
  const categoryCount = await prisma.category.count();
  if (categoryCount > 0) {
    console.log("  – Categories already exist, skipping product seed");
    return;
  }

  // [category, products[]]
  const catalog: Array<[string, Array<{ name: string; unit: string; price: number; mrp: number; stock: number }>]> = [
    [
      "ACC Cement",
      [
        { name: "ACC F2R", unit: "bag (50 kg)", price: 380, mrp: 400, stock: 120 },
        { name: "ACC Gold", unit: "bag (50 kg)", price: 400, mrp: 425, stock: 90 },
      ],
    ],
    [
      "Nuvoco Cement",
      [
        { name: "Duraguard", unit: "bag (50 kg)", price: 370, mrp: 395, stock: 100 },
        { name: "Concreto", unit: "bag (50 kg)", price: 360, mrp: 385, stock: 110 },
        { name: "Concreto Uno", unit: "bag (50 kg)", price: 355, mrp: 380, stock: 80 },
      ],
    ],
    [
      "Mongia Steel Rod",
      [
        { name: "8mm", unit: "piece (12 m)", price: 620, mrp: 680, stock: 60 },
        { name: "10mm", unit: "piece (12 m)", price: 970, mrp: 1050, stock: 55 },
        { name: "12mm", unit: "piece (12 m)", price: 1390, mrp: 1500, stock: 45 },
        { name: "16mm", unit: "piece (12 m)", price: 2460, mrp: 2650, stock: 30 },
      ],
    ],
    [
      "Tata Steel Rod",
      [
        { name: "8mm", unit: "piece (12 m)", price: 650, mrp: 700, stock: 50 },
        { name: "10mm", unit: "piece (12 m)", price: 1010, mrp: 1090, stock: 48 },
        { name: "12mm", unit: "piece (12 m)", price: 1450, mrp: 1560, stock: 40 },
        { name: "16mm", unit: "piece (12 m)", price: 2560, mrp: 2750, stock: 25 },
      ],
    ],
    [
      "Stirrup",
      [
        { name: "4x7 Inch Stirrup", unit: "piece", price: 35, mrp: 45, stock: 500 },
        { name: "5x7 Inch Stirrup", unit: "piece", price: 40, mrp: 50, stock: 500 },
        { name: "6x8 Inch Stirrup", unit: "piece", price: 48, mrp: 60, stock: 450 },
        { name: "7x7 Inch Stirrup", unit: "piece", price: 50, mrp: 62, stock: 450 },
        { name: "8x8 Inch Stirrup", unit: "piece", price: 55, mrp: 68, stock: 400 },
        { name: "8x10 Inch Stirrup", unit: "piece", price: 62, mrp: 75, stock: 350 },
        { name: "10x10 Inch Stirrup", unit: "piece", price: 72, mrp: 88, stock: 300 },
      ],
    ],
    [
      "Nuvoco Waterproofing Chemical",
      [
        { name: "Zero M - 1 Litre", unit: "bottle (1 L)", price: 160, mrp: 185, stock: 200 },
        { name: "Zero M - 5 Litre", unit: "can (5 L)", price: 700, mrp: 790, stock: 120 },
        { name: "Zero M - 10 Litre", unit: "can (10 L)", price: 1300, mrp: 1450, stock: 80 },
      ],
    ],
    [
      "Charminar Roofing Sheet",
      [
        { name: "8 Feet Roofing Sheet", unit: "sheet", price: 850, mrp: 950, stock: 70 },
        { name: "10 Feet Roofing Sheet", unit: "sheet", price: 1050, mrp: 1180, stock: 60 },
        { name: "12 Feet Roofing Sheet", unit: "sheet", price: 1250, mrp: 1400, stock: 50 },
      ],
    ],
    [
      "Steel Binding Wire",
      [{ name: "Steel Binding Wire", unit: "kg", price: 75, mrp: 90, stock: 300 }],
    ],
    [
      "Plastic Sheet",
      [
        { name: "Black Plastic Sheet", unit: "kg", price: 95, mrp: 110, stock: 250 },
        { name: "Blue Plastic Sheet", unit: "kg", price: 105, mrp: 120, stock: 250 },
      ],
    ],
    [
      "Iron Nail",
      [
        { name: "1 Inch Iron Nail", unit: "kg", price: 80, mrp: 95, stock: 200 },
        { name: "1.5 Inch Iron Nail", unit: "kg", price: 85, mrp: 100, stock: 200 },
      ],
    ],
    [
      "Nuvoco Cover Block",
      [{ name: "Nuvoco Cover Block", unit: "piece", price: 4, mrp: 6, stock: 1000 }],
    ],
  ];

  for (const [catName, products] of catalog) {
    const slug = slugify(catName);
    const category = await prisma.category.create({
      data: { name: catName, slug, displayOrder: 0, isActive: true },
    });
    console.log(`  ✔ Category: ${catName}`);
    for (const p of products) {
      await prisma.product.create({
        data: {
          name: p.name,
          description: null,
          unit: p.unit,
          price: p.price,
          mrp: p.mrp,
          stock: p.stock,
          isActive: true,
          categoryId: category.id,
        },
      });
    }
    console.log(`    → ${products.length} products`);
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

