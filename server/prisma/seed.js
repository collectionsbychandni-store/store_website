/**
 * Collections by Chandni - Database Seeding Script (Step 2)
 *
 * Safe to execute repeatedly (idempotent upsert operations).
 * Seeds:
 * 1. Admin account with hashed password
 * 2. Category hierarchy (Parent and Subcategories)
 * 3. 5 Demo Clothing Products with multiple images, sizes, colors, and stock in INR.
 *
 * NOTE: Admin credentials (admin@collectionsbychandni.in / Admin@123) are DEMO DEVELOPMENT CREDENTIALS
 * and MUST be rotated/changed prior to production deployment.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Collections by Chandni...');

  // --------------------------------------------------------------------------
  // 1. Seed Admin User
  // --------------------------------------------------------------------------
  console.log('👤 Seeding Demo Admin user...');
  const saltRounds = 10;
  const rawAdminPassword = 'Admin@123';
  const hashedPassword = await bcrypt.hash(rawAdminPassword, saltRounds);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@collectionsbychandni.in' },
    update: {
      name: 'Collections by Chandni Admin',
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      name: 'Collections by Chandni Admin',
      email: 'admin@collectionsbychandni.in',
      phone: '+919876543210',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log(`✅ Admin user verified: ${adminUser.email} (Role: ${adminUser.role})`);
  console.log('   ⚠️  DEMO CREDENTIALS: admin@collectionsbychandni.in / Admin@123 (Change before production!)');

  // --------------------------------------------------------------------------
  // 2. Seed Category Hierarchy
  // --------------------------------------------------------------------------
  console.log('📂 Seeding Categories with parent/child relationships...');

  // Root Parents
  const rootCategoriesData = [
    {
      name: 'Women',
      slug: 'women',
      description: 'Exclusive women couture, ready-to-wear, and handcrafted ethnic styles.',
      imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop',
    },
    {
      name: 'Jewellery',
      slug: 'jewellery',
      description: 'Bespoke artisanal jewellery, heritage ornaments, and contemporary accents.',
      imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=800&auto=format&fit=crop',
    },
    {
      name: 'Accessories',
      slug: 'accessories',
      description: 'Handcrafted dupattas, stoles, potlis, and styling accoutrements.',
      imageUrl: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?q=80&w=800&auto=format&fit=crop',
    },
  ];

  const parentMap = {};
  for (const cat of rootCategoriesData) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, imageUrl: cat.imageUrl },
      create: cat,
    });
    parentMap[cat.slug] = record.id;
  }

  // Subcategories
  const subCategoriesData = [
    // Under Women
    {
      name: 'Kurtis',
      slug: 'kurtis',
      description: 'Designer daily wear, flared anarkalis, and tunic kurtis.',
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop',
      parentSlug: 'women',
    },
    {
      name: 'Dresses',
      slug: 'dresses',
      description: 'Fusion festive gowns, floral sundresses, and evening ensembles.',
      imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop',
      parentSlug: 'women',
    },
    {
      name: 'Sarees',
      slug: 'sarees',
      description: 'Banarasi silks, chanderi weaves, organza drapes, and modern georgettes.',
      imageUrl: 'https://images.unsplash.com/photo-1610030469668-932d04a7be65?q=80&w=800&auto=format&fit=crop',
      parentSlug: 'women',
    },
    {
      name: 'Tops',
      slug: 'tops',
      description: 'Contemporary shirts, peplum blouses, and artisanal tunics.',
      imageUrl: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?q=80&w=800&auto=format&fit=crop',
      parentSlug: 'women',
    },
    {
      name: 'Bottom Wear',
      slug: 'bottom-wear',
      description: 'Palazzos, cigarette trousers, tulip pants, and flared shararas.',
      imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=800&auto=format&fit=crop',
      parentSlug: 'women',
    },
    // Under Jewellery
    {
      name: 'Earrings',
      slug: 'earrings',
      description: 'Kundan chandbalis, jhumkas, and delicate modern studs.',
      imageUrl: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?q=80&w=800&auto=format&fit=crop',
      parentSlug: 'jewellery',
    },
    {
      name: 'Necklaces',
      slug: 'necklaces',
      description: 'Polki chokers, temple necklaces, and minimalist layering chains.',
      imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=800&auto=format&fit=crop',
      parentSlug: 'jewellery',
    },
    {
      name: 'Bangles',
      slug: 'bangles',
      description: 'Meenakari kadas, gold-plated bangles, and stone-encrusted bracelets.',
      imageUrl: 'https://images.unsplash.com/photo-1611591475152-4735490714b9?q=80&w=800&auto=format&fit=crop',
      parentSlug: 'jewellery',
    },
  ];

  const categoryMap = { ...parentMap };
  for (const sub of subCategoriesData) {
    const parentId = parentMap[sub.parentSlug];
    const record = await prisma.category.upsert({
      where: { slug: sub.slug },
      update: {
        name: sub.name,
        description: sub.description,
        imageUrl: sub.imageUrl,
        parentId,
      },
      create: {
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
        imageUrl: sub.imageUrl,
        parentId,
      },
    });
    categoryMap[sub.slug] = record.id;
  }

  console.log(`✅ ${Object.keys(categoryMap).length} Categories seeded successfully.`);

  // --------------------------------------------------------------------------
  // 3. Seed 5 Demo Clothing Products
  // --------------------------------------------------------------------------
  console.log('👗 Seeding 5 Demo Clothing Products with variants and images...');

  const productsData = [
    {
      title: "Women's Designer Kurti",
      slug: 'womens-designer-kurti',
      description:
        'A masterfully crafted A-line designer kurti featuring intricate gota patti handwork, tailored in breathable chanderi silk. Perfect for festive celebrations and intimate gatherings.',
      categorySlug: 'kurtis',
      brand: 'Collections by Chandni',
      featured: true,
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop',
          altText: "Women's Designer Kurti Front View in Blush Rose",
          sortOrder: 1,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop',
          altText: "Women's Designer Kurti Neckline Embroidery Detail",
          sortOrder: 2,
        },
      ],
      variants: [
        { size: 'S', color: 'Blush Pink', sku: 'CBC-WDK-PNK-S', mrp: 3499.0, sellingPrice: 2499.0, stock: 15 },
        { size: 'M', color: 'Blush Pink', sku: 'CBC-WDK-PNK-M', mrp: 3499.0, sellingPrice: 2499.0, stock: 20 },
        { size: 'L', color: 'Blush Pink', sku: 'CBC-WDK-PNK-L', mrp: 3499.0, sellingPrice: 2499.0, stock: 12 },
        { size: 'XL', color: 'Blush Pink', sku: 'CBC-WDK-PNK-XL', mrp: 3499.0, sellingPrice: 2499.0, stock: 8 },
        { size: 'S', color: 'Royal Teal', sku: 'CBC-WDK-TEA-S', mrp: 3499.0, sellingPrice: 2499.0, stock: 10 },
        { size: 'M', color: 'Royal Teal', sku: 'CBC-WDK-TEA-M', mrp: 3499.0, sellingPrice: 2499.0, stock: 18 },
        { size: 'L', color: 'Royal Teal', sku: 'CBC-WDK-TEA-L', mrp: 3499.0, sellingPrice: 2499.0, stock: 14 },
      ],
    },
    {
      title: 'Floral Print Kurti',
      slug: 'floral-print-kurti',
      description:
        'Breezy mulmul cotton kurti adorned with hand-block botanical floral prints and mother-of-pearl button accents along the placket. Designed for effortless all-day grace.',
      categorySlug: 'kurtis',
      brand: 'Collections by Chandni',
      featured: true,
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=800&auto=format&fit=crop',
          altText: 'Floral Print Kurti in Sage Olive',
          sortOrder: 1,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=800&auto=format&fit=crop',
          altText: 'Floral Print Kurti Textile Detail',
          sortOrder: 2,
        },
      ],
      variants: [
        { size: 'S', color: 'Sage Green', sku: 'CBC-FPK-SGE-S', mrp: 2199.0, sellingPrice: 1599.0, stock: 25 },
        { size: 'M', color: 'Sage Green', sku: 'CBC-FPK-SGE-M', mrp: 2199.0, sellingPrice: 1599.0, stock: 30 },
        { size: 'L', color: 'Sage Green', sku: 'CBC-FPK-SGE-L', mrp: 2199.0, sellingPrice: 1599.0, stock: 20 },
        { size: 'XL', color: 'Sage Green', sku: 'CBC-FPK-SGE-XL', mrp: 2199.0, sellingPrice: 1599.0, stock: 10 },
        { size: 'M', color: 'Indigo Blue', sku: 'CBC-FPK-IND-M', mrp: 2199.0, sellingPrice: 1599.0, stock: 22 },
        { size: 'L', color: 'Indigo Blue', sku: 'CBC-FPK-IND-L', mrp: 2199.0, sellingPrice: 1599.0, stock: 15 },
      ],
    },
    {
      title: 'Elegant Party Wear Dress',
      slug: 'elegant-party-wear-dress',
      description:
        'Floor-sweeping maxi gown rendered in lightweight crushed georgette, complemented by a sequin-embellished waistline and cascading flared hem for soirees and receptions.',
      categorySlug: 'dresses',
      brand: 'Collections by Chandni',
      featured: true,
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop',
          altText: 'Elegant Party Wear Dress in Midnight Burgundy',
          sortOrder: 1,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=800&auto=format&fit=crop',
          altText: 'Party Wear Dress Silhouette and Drape',
          sortOrder: 2,
        },
      ],
      variants: [
        { size: 'XS', color: 'Wine Burgundy', sku: 'CBC-EPD-WIN-XS', mrp: 5999.0, sellingPrice: 4299.0, stock: 6 },
        { size: 'S', color: 'Wine Burgundy', sku: 'CBC-EPD-WIN-S', mrp: 5999.0, sellingPrice: 4299.0, stock: 12 },
        { size: 'M', color: 'Wine Burgundy', sku: 'CBC-EPD-WIN-M', mrp: 5999.0, sellingPrice: 4299.0, stock: 16 },
        { size: 'L', color: 'Wine Burgundy', sku: 'CBC-EPD-WIN-L', mrp: 5999.0, sellingPrice: 4299.0, stock: 10 },
        { size: 'M', color: 'Emerald Green', sku: 'CBC-EPD-EMR-M', mrp: 5999.0, sellingPrice: 4299.0, stock: 14 },
        { size: 'L', color: 'Emerald Green', sku: 'CBC-EPD-EMR-L', mrp: 5999.0, sellingPrice: 4299.0, stock: 8 },
      ],
    },
    {
      title: 'Cotton Casual Kurti',
      slug: 'cotton-casual-kurti',
      description:
        'Everyday essential straight-cut kurti made with 100% combed organic cotton. Features subtle thread pintucks, dual side slits, and comfortable 3/4 sleeves.',
      categorySlug: 'kurtis',
      brand: 'Collections by Chandni',
      featured: false,
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?q=80&w=800&auto=format&fit=crop',
          altText: 'Cotton Casual Kurti in Ivory Linen',
          sortOrder: 1,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop',
          altText: 'Cotton Casual Kurti Hem and Fabric Finish',
          sortOrder: 2,
        },
      ],
      variants: [
        { size: 'S', color: 'Ivory White', sku: 'CBC-CCK-IVR-S', mrp: 1599.0, sellingPrice: 1199.0, stock: 30 },
        { size: 'M', color: 'Ivory White', sku: 'CBC-CCK-IVR-M', mrp: 1599.0, sellingPrice: 1199.0, stock: 40 },
        { size: 'L', color: 'Ivory White', sku: 'CBC-CCK-IVR-L', mrp: 1599.0, sellingPrice: 1199.0, stock: 25 },
        { size: 'XL', color: 'Ivory White', sku: 'CBC-CCK-IVR-XL', mrp: 1599.0, sellingPrice: 1199.0, stock: 15 },
        { size: 'M', color: 'Dusty Peach', sku: 'CBC-CCK-PCH-M', mrp: 1599.0, sellingPrice: 1199.0, stock: 28 },
        { size: 'L', color: 'Dusty Peach', sku: 'CBC-CCK-PCH-L', mrp: 1599.0, sellingPrice: 1199.0, stock: 20 },
      ],
    },
    {
      title: "Embroidered Women's Kurti",
      slug: 'embroidered-womens-kurti',
      description:
        'Resham and zardozi embroidered ceremonial kurti with delicate scalloped borders on the cuffs and hemline. Pairs seamlessly with organza dupattas and flared palazzos.',
      categorySlug: 'kurtis',
      brand: 'Collections by Chandni',
      featured: true,
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1610030469668-932d04a7be65?q=80&w=800&auto=format&fit=crop',
          altText: "Embroidered Women's Kurti in Deep Crimson",
          sortOrder: 1,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?q=80&w=800&auto=format&fit=crop',
          altText: 'Embroidered Border and Sequin Highlights',
          sortOrder: 2,
        },
      ],
      variants: [
        { size: 'S', color: 'Crimson Red', sku: 'CBC-EWK-CRM-S', mrp: 4499.0, sellingPrice: 3299.0, stock: 12 },
        { size: 'M', color: 'Crimson Red', sku: 'CBC-EWK-CRM-M', mrp: 4499.0, sellingPrice: 3299.0, stock: 18 },
        { size: 'L', color: 'Crimson Red', sku: 'CBC-EWK-CRM-L', mrp: 4499.0, sellingPrice: 3299.0, stock: 14 },
        { size: 'XL', color: 'Crimson Red', sku: 'CBC-EWK-CRM-XL', mrp: 4499.0, sellingPrice: 3299.0, stock: 9 },
        { size: 'M', color: 'Golden Mustard', sku: 'CBC-EWK-MST-M', mrp: 4499.0, sellingPrice: 3299.0, stock: 16 },
        { size: 'L', color: 'Golden Mustard', sku: 'CBC-EWK-MST-L', mrp: 4499.0, sellingPrice: 3299.0, stock: 12 },
      ],
    },
  ];

  for (const item of productsData) {
    const categoryId = categoryMap[item.categorySlug];
    if (!categoryId) {
      console.warn(`Category slug '${item.categorySlug}' not found for product '${item.title}'`);
      continue;
    }

    // Upsert product
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        description: item.description,
        categoryId,
        brand: item.brand,
        featured: item.featured,
        isActive: true,
      },
      create: {
        title: item.title,
        slug: item.slug,
        description: item.description,
        categoryId,
        brand: item.brand,
        featured: item.featured,
        isActive: true,
      },
    });

    // Upsert / Refresh images
    for (const img of item.images) {
      // Find existing image or create
      const existingImg = await prisma.productImage.findFirst({
        where: { productId: product.id, imageUrl: img.imageUrl },
      });
      if (!existingImg) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            imageUrl: img.imageUrl,
            altText: img.altText,
            sortOrder: img.sortOrder,
          },
        });
      }
    }

    // Upsert variants
    for (const v of item.variants) {
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          size: v.size,
          color: v.color,
          mrp: v.mrp,
          sellingPrice: v.sellingPrice,
          stock: v.stock,
          isActive: true,
        },
        create: {
          productId: product.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          mrp: v.mrp,
          sellingPrice: v.sellingPrice,
          stock: v.stock,
          isActive: true,
        },
      });
    }

    console.log(`   ✨ Seeded product: ${product.title} (${item.variants.length} variants)`);
  }

  // --------------------------------------------------------------------------
  // 4. Seed Homepage Banner (Optional initial banner)
  // --------------------------------------------------------------------------
  console.log('🖼️ Seeding initial storefront banner...');
  const existingBanner = await prisma.banner.findFirst({
    where: { title: 'Discover Your Style' },
  });
  if (!existingBanner) {
    await prisma.banner.create({
      data: {
        title: 'Discover Your Style',
        subtitle: 'Artisanal Elegance · Haute Couture Silhouettes',
        imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=1600&auto=format&fit=crop',
        buttonText: 'Explore Collection',
        buttonLink: '/shop',
        sortOrder: 1,
        isActive: true,
      },
    });
  }

  console.log('🎉 Seeding successfully completed for Collections by Chandni!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
