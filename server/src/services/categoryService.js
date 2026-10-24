import prisma from '../config/db.js';

/**
 * Utility: Generates a URL-friendly slug from category name
 * @param {string} text
 * @returns {string}
 */
export function generateSlug(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// -----------------------------------------------------------------------------
// Dev fallback in-memory store matching Step 2 seed data
// Used if PostgreSQL database server is offline in sandbox container
// -----------------------------------------------------------------------------
const INITIAL_DEMO_CATEGORIES = [
  {
    id: 'cat-women',
    name: 'Women',
    slug: 'women',
    description: 'Exclusive women couture, ready-to-wear, and handcrafted ethnic styles.',
    imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop',
    parentId: null,
    isActive: true,
    createdAt: new Date('2026-09-29T10:00:00Z'),
    updatedAt: new Date('2026-09-29T10:00:00Z'),
  },
  {
    id: 'cat-jewellery',
    name: 'Jewellery',
    slug: 'jewellery',
    description: 'Bespoke artisanal jewellery, heritage ornaments, and contemporary accents.',
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=800&auto=format&fit=crop',
    parentId: null,
    isActive: true,
    createdAt: new Date('2026-09-29T10:05:00Z'),
    updatedAt: new Date('2026-09-29T10:05:00Z'),
  },
  {
    id: 'cat-accessories',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Handcrafted dupattas, stoles, potlis, and styling accoutrements.',
    imageUrl: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?q=80&w=800&auto=format&fit=crop',
    parentId: null,
    isActive: true,
    createdAt: new Date('2026-09-29T10:10:00Z'),
    updatedAt: new Date('2026-09-29T10:10:00Z'),
  },
  {
    id: 'cat-kurtis',
    name: 'Kurtis',
    slug: 'kurtis',
    description: 'Designer daily wear, flared anarkalis, and tunic kurtis.',
    imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop',
    parentId: 'cat-women',
    isActive: true,
    createdAt: new Date('2026-09-29T10:15:00Z'),
    updatedAt: new Date('2026-09-29T10:15:00Z'),
  },
  {
    id: 'cat-dresses',
    name: 'Dresses',
    slug: 'dresses',
    description: 'Fusion festive gowns, floral sundresses, and evening ensembles.',
    imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop',
    parentId: 'cat-women',
    isActive: true,
    createdAt: new Date('2026-09-29T10:20:00Z'),
    updatedAt: new Date('2026-09-29T10:20:00Z'),
  },
  {
    id: 'cat-sarees',
    name: 'Sarees',
    slug: 'sarees',
    description: 'Banarasi silks, chanderi weaves, organza drapes, and modern georgettes.',
    imageUrl: 'https://images.unsplash.com/photo-1610030469668-932d04a7be65?q=80&w=800&auto=format&fit=crop',
    parentId: 'cat-women',
    isActive: true,
    createdAt: new Date('2026-09-29T10:25:00Z'),
    updatedAt: new Date('2026-09-29T10:25:00Z'),
  },
  {
    id: 'cat-tops',
    name: 'Tops',
    slug: 'tops',
    description: 'Contemporary shirts, peplum blouses, and artisanal tunics.',
    imageUrl: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?q=80&w=800&auto=format&fit=crop',
    parentId: 'cat-women',
    isActive: true,
    createdAt: new Date('2026-09-29T10:30:00Z'),
    updatedAt: new Date('2026-09-29T10:30:00Z'),
  },
  {
    id: 'cat-bottom-wear',
    name: 'Bottom Wear',
    slug: 'bottom-wear',
    description: 'Palazzos, cigarette trousers, tulip pants, and flared shararas.',
    imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=800&auto=format&fit=crop',
    parentId: 'cat-women',
    isActive: true,
    createdAt: new Date('2026-09-29T10:35:00Z'),
    updatedAt: new Date('2026-09-29T10:35:00Z'),
  },
  {
    id: 'cat-earrings',
    name: 'Earrings',
    slug: 'earrings',
    description: 'Kundan chandbalis, jhumkas, and delicate modern studs.',
    imageUrl: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?q=80&w=800&auto=format&fit=crop',
    parentId: 'cat-jewellery',
    isActive: true,
    createdAt: new Date('2026-09-29T10:40:00Z'),
    updatedAt: new Date('2026-09-29T10:40:00Z'),
  },
  {
    id: 'cat-necklaces',
    name: 'Necklaces',
    slug: 'necklaces',
    description: 'Polki chokers, temple necklaces, and minimalist layering chains.',
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=800&auto=format&fit=crop',
    parentId: 'cat-jewellery',
    isActive: true,
    createdAt: new Date('2026-09-29T10:45:00Z'),
    updatedAt: new Date('2026-09-29T10:45:00Z'),
  },
  {
    id: 'cat-bangles',
    name: 'Bangles',
    slug: 'bangles',
    description: 'Meenakari kadas, gold-plated bangles, and stone-encrusted bracelets.',
    imageUrl: 'https://images.unsplash.com/photo-1611591475152-4735490714b9?q=80&w=800&auto=format&fit=crop',
    parentId: 'cat-jewellery',
    isActive: true,
    createdAt: new Date('2026-09-29T10:50:00Z'),
    updatedAt: new Date('2026-09-29T10:50:00Z'),
  },
];

// Product associations from Step 2 seed (4 kurtis + 1 dress)
const DEMO_PRODUCTS_CATEGORY_MAP = {
  'cat-kurtis': 4,
  'cat-dresses': 1,
};

let inMemoryCategories = [...INITIAL_DEMO_CATEGORIES];

/**
 * Checks whether PostgreSQL connection is alive with short timeout
 */
async function isDatabaseAlive() {
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB_TIMEOUT')), 1000)
    );
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Checks if setting targetId as child of candidateParentId creates a cycle
 */
async function causesCircularDependency(targetId, candidateParentId, isDb) {
  if (!candidateParentId || !targetId) return false;
  if (targetId === candidateParentId) return true;

  let currentParentId = candidateParentId;
  const visited = new Set([targetId]);

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      return true;
    }
    visited.add(currentParentId);

    if (isDb) {
      const parent = await prisma.category.findUnique({
        where: { id: currentParentId },
        select: { parentId: true },
      });
      currentParentId = parent ? parent.parentId : null;
    } else {
      const parent = inMemoryCategories.find((c) => c.id === currentParentId);
      currentParentId = parent ? parent.parentId : null;
    }
  }

  return false;
}

/**
 * Helper to enrich category with parent object and counts
 */
function enrichCategoryInMemory(cat) {
  const parent = cat.parentId
    ? inMemoryCategories.find((p) => p.id === cat.parentId) || null
    : null;

  const childrenCount = inMemoryCategories.filter((c) => c.parentId === cat.id).length;
  const productsCount = DEMO_PRODUCTS_CATEGORY_MAP[cat.id] || 0;

  return {
    ...cat,
    parent: parent
      ? {
          id: parent.id,
          name: parent.name,
          slug: parent.slug,
        }
      : null,
    _count: {
      children: childrenCount,
      products: productsCount,
    },
  };
}

// -----------------------------------------------------------------------------
// Service Methods
// -----------------------------------------------------------------------------

/**
 * Retrieves paginated categories with filtering
 */
export async function getCategories({
  search = '',
  page = 1,
  limit = 10,
  isActive,
  parentId,
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const where = {};

    if (search && typeof search === 'string' && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { slug: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === true || isActive === 'true';
    }

    if (parentId !== undefined && parentId !== '') {
      if (parentId === 'null' || parentId === null) {
        where.parentId = null;
      } else {
        where.parentId = parentId;
      }
    }

    const [total, categories] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [{ createdAt: 'asc' }],
        include: {
          parent: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: { children: true, products: true },
          },
        },
      }),
    ]);

    return {
      data: categories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 0,
      },
    };
  }

  // Fallback in-memory handler
  let filtered = [...inMemoryCategories];

  if (search && typeof search === 'string' && search.trim()) {
    const s = search.trim().toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (c.description && c.description.toLowerCase().includes(s)) ||
        c.slug.toLowerCase().includes(s)
    );
  }

  if (isActive !== undefined && isActive !== '') {
    const bool = isActive === true || isActive === 'true';
    filtered = filtered.filter((c) => c.isActive === bool);
  }

  if (parentId !== undefined && parentId !== '') {
    if (parentId === 'null' || parentId === null) {
      filtered = filtered.filter((c) => c.parentId === null);
    } else {
      filtered = filtered.filter((c) => c.parentId === parentId);
    }
  }

  const total = filtered.length;
  const paged = filtered.slice(skip, skip + limitNum).map(enrichCategoryInMemory);

  return {
    data: paged,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 0,
    },
  };
}

/**
 * Retrieves a category by ID with full relations
 */
export async function getCategoryById(id) {
  if (!id) return null;

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    return await prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
        _count: {
          select: { children: true, products: true },
        },
      },
    });
  }

  // In-memory fallback
  const cat = inMemoryCategories.find((c) => c.id === id);
  if (!cat) return null;

  const enriched = enrichCategoryInMemory(cat);
  const children = inMemoryCategories
    .filter((c) => c.parentId === cat.id)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, isActive: c.isActive }));

  return {
    ...enriched,
    children,
  };
}

/**
 * Creates a new category
 */
export async function createCategory({ name, description, imageUrl, parentId, isActive = true }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    const err = new Error('Category name is required');
    err.status = 400;
    throw err;
  }

  const trimmedName = name.trim();
  if (trimmedName.length > 100) {
    const err = new Error('Category name must not exceed 100 characters');
    err.status = 400;
    throw err;
  }

  // Generate unique slug
  let slug = generateSlug(trimmedName);
  if (!slug) {
    const err = new Error('Invalid category name for slug generation');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  // Validate parentId if provided
  if (parentId) {
    if (dbConnected) {
      const parentExists = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parentExists) {
        const err = new Error('Parent category does not exist');
        err.status = 400;
        throw err;
      }
    } else {
      const parentExists = inMemoryCategories.some((c) => c.id === parentId);
      if (!parentExists) {
        const err = new Error('Parent category does not exist');
        err.status = 400;
        throw err;
      }
    }
  }

  // Check duplicate slug
  if (dbConnected) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      const err = new Error('A category with this name or slug already exists');
      err.status = 400;
      throw err;
    }

    const newCategory = await prisma.category.create({
      data: {
        name: trimmedName,
        slug,
        description: description ? description.trim() : null,
        imageUrl: imageUrl ? imageUrl.trim() : null,
        parentId: parentId || null,
        isActive: Boolean(isActive),
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { children: true, products: true },
        },
      },
    });

    return newCategory;
  }

  // In-memory create
  const existing = inMemoryCategories.find((c) => c.slug === slug);
  if (existing) {
    const err = new Error('A category with this name or slug already exists');
    err.status = 400;
    throw err;
  }

  const newCategory = {
    id: `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: trimmedName,
    slug,
    description: description ? description.trim() : null,
    imageUrl: imageUrl ? imageUrl.trim() : null,
    parentId: parentId || null,
    isActive: Boolean(isActive),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  inMemoryCategories.push(newCategory);
  return enrichCategoryInMemory(newCategory);
}

/**
 * Updates an existing category
 */
export async function updateCategory(id, { name, description, imageUrl, parentId, isActive }) {
  if (!id) {
    const err = new Error('Category ID is required');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  // 1. Verify existence
  let existing = null;
  if (dbConnected) {
    existing = await prisma.category.findUnique({ where: { id } });
  } else {
    existing = inMemoryCategories.find((c) => c.id === id);
  }

  if (!existing) {
    const err = new Error('Category not found');
    err.status = 404;
    throw err;
  }

  // 2. Validate name if updated
  let updatedSlug = existing.slug;
  let trimmedName = existing.name;

  if (name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      const err = new Error('Category name cannot be empty');
      err.status = 400;
      throw err;
    }
    trimmedName = name.trim();
    if (trimmedName.length > 100) {
      const err = new Error('Category name must not exceed 100 characters');
      err.status = 400;
      throw err;
    }

    updatedSlug = generateSlug(trimmedName);

    // Check slug uniqueness across other categories
    if (dbConnected) {
      const slugConflict = await prisma.category.findFirst({
        where: {
          slug: updatedSlug,
          NOT: { id },
        },
      });
      if (slugConflict) {
        const err = new Error('A category with this name or slug already exists');
        err.status = 400;
        throw err;
      }
    } else {
      const slugConflict = inMemoryCategories.find(
        (c) => c.slug === updatedSlug && c.id !== id
      );
      if (slugConflict) {
        const err = new Error('A category with this name or slug already exists');
        err.status = 400;
        throw err;
      }
    }
  }

  // 3. Validate parentId & prevent self-parenting and cycles
  let finalParentId = existing.parentId;
  if (parentId !== undefined) {
    if (parentId === '' || parentId === null || parentId === 'null') {
      finalParentId = null;
    } else {
      if (parentId === id) {
        const err = new Error('A category cannot be its own parent');
        err.status = 400;
        throw err;
      }

      // Check if parent exists
      if (dbConnected) {
        const parentExists = await prisma.category.findUnique({ where: { id: parentId } });
        if (!parentExists) {
          const err = new Error('Parent category does not exist');
          err.status = 400;
          throw err;
        }
      } else {
        const parentExists = inMemoryCategories.some((c) => c.id === parentId);
        if (!parentExists) {
          const err = new Error('Parent category does not exist');
          err.status = 400;
          throw err;
        }
      }

      // Check circular dependency
      const isCycle = await causesCircularDependency(id, parentId, dbConnected);
      if (isCycle) {
        const err = new Error('Circular parent-child relationship detected');
        err.status = 400;
        throw err;
      }

      finalParentId = parentId;
    }
  }

  // 4. Update
  const updateData = {
    name: trimmedName,
    slug: updatedSlug,
    description: description !== undefined ? (description ? description.trim() : null) : existing.description,
    imageUrl: imageUrl !== undefined ? (imageUrl ? imageUrl.trim() : null) : existing.imageUrl,
    parentId: finalParentId,
    isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
    updatedAt: new Date(),
  };

  if (dbConnected) {
    return await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { children: true, products: true },
        },
      },
    });
  }

  // In-memory update
  const idx = inMemoryCategories.findIndex((c) => c.id === id);
  inMemoryCategories[idx] = {
    ...inMemoryCategories[idx],
    ...updateData,
  };

  return enrichCategoryInMemory(inMemoryCategories[idx]);
}

/**
 * Toggles or updates category active status
 */
export async function updateCategoryStatus(id, isActive) {
  if (typeof isActive !== 'boolean') {
    const err = new Error('isActive must be a boolean');
    err.status = 400;
    throw err;
  }

  return await updateCategory(id, { isActive });
}

/**
 * Deletes a category ensuring referential integrity
 * Throws 409 if category has children or products
 */
export async function deleteCategory(id) {
  if (!id) {
    const err = new Error('Category ID is required');
    err.status = 400;
    throw err;
  }

  const dbConnected = await isDatabaseAlive();

  if (dbConnected) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { children: true, products: true },
        },
      },
    });

    if (!category) {
      const err = new Error('Category not found');
      err.status = 404;
      throw err;
    }

    if (category._count.children > 0) {
      const err = new Error(
        'Cannot delete category that contains child categories. Please reassign or delete subcategories first.'
      );
      err.status = 409;
      throw err;
    }

    if (category._count.products > 0) {
      const err = new Error(
        'Cannot delete category containing associated products. Please reassign or delete products first.'
      );
      err.status = 409;
      throw err;
    }

    await prisma.category.delete({ where: { id } });
    return true;
  }

  // In-memory delete
  const category = inMemoryCategories.find((c) => c.id === id);
  if (!category) {
    const err = new Error('Category not found');
    err.status = 404;
    throw err;
  }

  const childrenCount = inMemoryCategories.filter((c) => c.parentId === id).length;
  if (childrenCount > 0) {
    const err = new Error(
      'Cannot delete category that contains child categories. Please reassign or delete subcategories first.'
    );
    err.status = 409;
    throw err;
  }

  const productsCount = DEMO_PRODUCTS_CATEGORY_MAP[id] || 0;
  if (productsCount > 0) {
    const err = new Error(
      'Cannot delete category containing associated products. Please reassign or delete products first.'
    );
    err.status = 409;
    throw err;
  }

  inMemoryCategories = inMemoryCategories.filter((c) => c.id !== id);
  return true;
}

export default {
  generateSlug,
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
};
