import crypto from 'crypto';
import prisma from '../config/db.js';

/**
 * Collections by Chandni - Address Service
 *
 * Implements Step 14:
 * - Customer Address Management (Add, Edit, Delete, Default, Type)
 * - Strict User Ownership Isolation
 * - Dual DB (Prisma) and In-Memory fallback support
 * - Automatic default promotion on creation & deletion
 */

// In-Memory store for addresses
const inMemoryAddresses = [
  {
    id: 'addr-demo-1',
    userId: 'customer-demo-uuid-2',
    name: 'Demo Customer',
    phone: '+919812345678',
    addressLine1: 'Flat 402, Royal Palms Residency',
    addressLine2: 'Koregaon Park South',
    landmark: 'Near Osho Garden',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    country: 'India',
    addressType: 'HOME',
    isDefault: true,
    createdAt: new Date('2026-09-15T12:00:00Z'),
    updatedAt: new Date('2026-09-15T12:00:00Z'),
  },
  {
    id: 'addr-demo-2',
    userId: 'customer-demo-uuid-2',
    name: 'Demo Customer (Office)',
    phone: '+919812345678',
    addressLine1: 'Tower B, Tech Park Central',
    addressLine2: 'Viman Nagar',
    landmark: 'Opposite Phoenix Market City',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411014',
    country: 'India',
    addressType: 'WORK',
    isDefault: false,
    createdAt: new Date('2026-09-20T14:30:00Z'),
    updatedAt: new Date('2026-09-20T14:30:00Z'),
  },
];

export function _getInMemoryAddresses() {
  return inMemoryAddresses;
}

let lastDbCheckTime = 0;
let lastDbAliveStatus = false;

async function isDatabaseAlive() {
  const now = Date.now();
  if (now - lastDbCheckTime < 10000) {
    return lastDbAliveStatus;
  }
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB_TIMEOUT')), 1000)
    );
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    lastDbAliveStatus = true;
    lastDbCheckTime = now;
    return true;
  } catch (e) {
    lastDbAliveStatus = false;
    lastDbCheckTime = now;
    return false;
  }
}

/**
 * Validates phone format (7-20 chars allowing +, digits, spaces, hyphens)
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,16}$/;
  return phoneRegex.test(phone.trim());
}

/**
 * Validates Indian PIN code (6 digits, cannot start with 0)
 */
export function isValidPincode(pincode) {
  if (!pincode) return false;
  const cleaned = String(pincode).trim();
  const pinRegex = /^[1-9][0-9]{5}$/;
  return pinRegex.test(cleaned);
}

/**
 * Validates address type
 */
export function normalizeAddressType(type) {
  const allowed = ['HOME', 'WORK', 'OTHER'];
  if (!type || typeof type !== 'string') return 'HOME';
  const upper = type.trim().toUpperCase();
  return allowed.includes(upper) ? upper : 'OTHER';
}

/**
 * Normalizes input address payload and validates required fields
 */
export function validateAddressInput(payload, isUpdate = false) {
  const errors = {};

  if (!isUpdate || payload.name !== undefined) {
    if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) {
      errors.name = 'Recipient full name is required';
    } else if (payload.name.trim().length < 2 || payload.name.trim().length > 100) {
      errors.name = 'Recipient name must be between 2 and 100 characters';
    }
  }

  if (!isUpdate || payload.phone !== undefined) {
    if (!payload.phone || typeof payload.phone !== 'string' || !payload.phone.trim()) {
      errors.phone = 'Contact phone number is required';
    } else if (!isValidPhone(payload.phone)) {
      errors.phone = 'Please provide a valid contact phone number';
    }
  }

  if (!isUpdate || payload.addressLine1 !== undefined) {
    if (!payload.addressLine1 || typeof payload.addressLine1 !== 'string' || !payload.addressLine1.trim()) {
      errors.addressLine1 = 'Address line 1 (Flat, House No., Building) is required';
    } else if (payload.addressLine1.trim().length < 3 || payload.addressLine1.trim().length > 200) {
      errors.addressLine1 = 'Address line 1 must be between 3 and 200 characters';
    }
  }

  if (!isUpdate || payload.city !== undefined) {
    if (!payload.city || typeof payload.city !== 'string' || !payload.city.trim()) {
      errors.city = 'City is required';
    } else if (payload.city.trim().length < 2 || payload.city.trim().length > 100) {
      errors.city = 'City must be between 2 and 100 characters';
    }
  }

  if (!isUpdate || payload.state !== undefined) {
    if (!payload.state || typeof payload.state !== 'string' || !payload.state.trim()) {
      errors.state = 'State is required';
    } else if (payload.state.trim().length < 2 || payload.state.trim().length > 100) {
      errors.state = 'State must be between 2 and 100 characters';
    }
  }

  if (!isUpdate || payload.pincode !== undefined) {
    if (!payload.pincode) {
      errors.pincode = 'PIN code is required';
    } else if (!isValidPincode(payload.pincode)) {
      errors.pincode = 'Please enter a valid 6-digit Indian PIN code';
    }
  }

  if (Object.keys(errors).length > 0) {
    const error = new Error('Invalid address data');
    error.status = 400;
    error.details = errors;
    throw error;
  }
}

/**
 * Retrieves all saved addresses for a specific authenticated customer
 */
export async function getAddressesByUserId(userId) {
  if (!userId) return [];

  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      const addresses = await prisma.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
      return addresses;
    } catch (e) {
      // In-memory fallback
    }
  }

  const userAddresses = inMemoryAddresses.filter((a) => a.userId === userId);
  return userAddresses.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

/**
 * Retrieves a single address by ID ensuring ownership
 */
export async function getAddressById({ id, userId }) {
  if (!id || !userId) return null;

  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      const addr = await prisma.address.findFirst({
        where: { id, userId },
      });
      if (addr) return addr;
    } catch (e) {
      // In-memory fallback
    }
  }

  return inMemoryAddresses.find((a) => a.id === id && a.userId === userId) || null;
}

/**
 * Creates a new address for the authenticated customer
 */
export async function createAddress({
  userId,
  name,
  phone,
  addressLine1,
  addressLine2,
  landmark,
  city,
  state,
  pincode,
  country = 'India',
  addressType = 'HOME',
  isDefault = false,
}) {
  if (!userId) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }

  validateAddressInput({
    name,
    phone,
    addressLine1,
    city,
    state,
    pincode,
  });

  const existing = await getAddressesByUserId(userId);
  // If first address, automatically make it default
  const shouldBeDefault = Boolean(isDefault) || existing.length === 0;

  const newId = `addr-${crypto.randomUUID()}`;
  const now = new Date();

  const newAddress = {
    id: newId,
    userId,
    name: name.trim(),
    phone: phone.trim(),
    addressLine1: addressLine1.trim(),
    addressLine2: addressLine2 ? addressLine2.trim() : null,
    landmark: landmark ? landmark.trim() : null,
    city: city.trim(),
    state: state.trim(),
    pincode: String(pincode).trim(),
    country: country ? country.trim() : 'India',
    addressType: normalizeAddressType(addressType),
    isDefault: shouldBeDefault,
    createdAt: now,
    updatedAt: now,
  };

  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      if (shouldBeDefault) {
        await prisma.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      const created = await prisma.address.create({
        data: newAddress,
      });
      return created;
    } catch (e) {
      // In-memory fallback
    }
  }

  if (shouldBeDefault) {
    for (const addr of inMemoryAddresses) {
      if (addr.userId === userId) {
        addr.isDefault = false;
        addr.updatedAt = now;
      }
    }
  }

  inMemoryAddresses.unshift(newAddress);
  return newAddress;
}

/**
 * Updates an existing address for the authenticated customer
 */
export async function updateAddress({
  id,
  userId,
  name,
  phone,
  addressLine1,
  addressLine2,
  landmark,
  city,
  state,
  pincode,
  country,
  addressType,
  isDefault,
}) {
  if (!id || !userId) {
    const error = new Error('Address ID and User ID required');
    error.status = 400;
    throw error;
  }

  validateAddressInput(
    { name, phone, addressLine1, city, state, pincode },
    true
  );

  const existing = await getAddressById({ id, userId });
  if (!existing) {
    const error = new Error('Address not found or unauthorized');
    error.status = 404;
    throw error;
  }

  const now = new Date();
  const shouldBeDefault = isDefault !== undefined ? Boolean(isDefault) : existing.isDefault;

  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      if (shouldBeDefault && !existing.isDefault) {
        await prisma.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      const updated = await prisma.address.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : existing.name,
          phone: phone !== undefined ? phone.trim() : existing.phone,
          addressLine1: addressLine1 !== undefined ? addressLine1.trim() : existing.addressLine1,
          addressLine2: addressLine2 !== undefined ? (addressLine2 ? addressLine2.trim() : null) : existing.addressLine2,
          landmark: landmark !== undefined ? (landmark ? landmark.trim() : null) : existing.landmark,
          city: city !== undefined ? city.trim() : existing.city,
          state: state !== undefined ? state.trim() : existing.state,
          pincode: pincode !== undefined ? String(pincode).trim() : existing.pincode,
          country: country !== undefined ? country.trim() : existing.country,
          addressType: addressType !== undefined ? normalizeAddressType(addressType) : existing.addressType,
          isDefault: shouldBeDefault,
          updatedAt: now,
        },
      });
      return updated;
    } catch (e) {
      // In-memory fallback
    }
  }

  if (shouldBeDefault && !existing.isDefault) {
    for (const addr of inMemoryAddresses) {
      if (addr.userId === userId) {
        addr.isDefault = false;
        addr.updatedAt = now;
      }
    }
  }

  const memoryAddr = inMemoryAddresses.find((a) => a.id === id && a.userId === userId);
  if (!memoryAddr) {
    const error = new Error('Address not found');
    error.status = 404;
    throw error;
  }

  if (name !== undefined) memoryAddr.name = name.trim();
  if (phone !== undefined) memoryAddr.phone = phone.trim();
  if (addressLine1 !== undefined) memoryAddr.addressLine1 = addressLine1.trim();
  if (addressLine2 !== undefined) memoryAddr.addressLine2 = addressLine2 ? addressLine2.trim() : null;
  if (landmark !== undefined) memoryAddr.landmark = landmark ? landmark.trim() : null;
  if (city !== undefined) memoryAddr.city = city.trim();
  if (state !== undefined) memoryAddr.state = state.trim();
  if (pincode !== undefined) memoryAddr.pincode = String(pincode).trim();
  if (country !== undefined) memoryAddr.country = country.trim();
  if (addressType !== undefined) memoryAddr.addressType = normalizeAddressType(addressType);
  if (isDefault !== undefined) memoryAddr.isDefault = Boolean(isDefault);
  memoryAddr.updatedAt = now;

  return memoryAddr;
}

/**
 * Deletes an address and promotes another address to default if needed
 */
export async function deleteAddress({ id, userId }) {
  if (!id || !userId) {
    const error = new Error('Address ID and User ID required');
    error.status = 400;
    throw error;
  }

  const existing = await getAddressById({ id, userId });
  if (!existing) {
    const error = new Error('Address not found or unauthorized');
    error.status = 404;
    throw error;
  }

  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      await prisma.address.delete({
        where: { id },
      });

      // If deleted was default, promote another address
      if (existing.isDefault) {
        const nextAddr = await prisma.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (nextAddr) {
          await prisma.address.update({
            where: { id: nextAddr.id },
            data: { isDefault: true },
          });
        }
      }

      return { success: true, message: 'Address deleted successfully' };
    } catch (e) {
      // In-memory fallback
    }
  }

  const index = inMemoryAddresses.findIndex((a) => a.id === id && a.userId === userId);
  if (index === -1) {
    const error = new Error('Address not found');
    error.status = 404;
    throw error;
  }

  const wasDefault = inMemoryAddresses[index].isDefault;
  inMemoryAddresses.splice(index, 1);

  if (wasDefault) {
    const remaining = inMemoryAddresses.filter((a) => a.userId === userId);
    if (remaining.length > 0) {
      remaining[0].isDefault = true;
      remaining[0].updatedAt = new Date();
    }
  }

  return { success: true, message: 'Address deleted successfully' };
}

/**
 * Sets an address as the default for the customer
 */
export async function setDefaultAddress({ id, userId }) {
  if (!id || !userId) {
    const error = new Error('Address ID and User ID required');
    error.status = 400;
    throw error;
  }

  const existing = await getAddressById({ id, userId });
  if (!existing) {
    const error = new Error('Address not found or unauthorized');
    error.status = 404;
    throw error;
  }

  const now = new Date();
  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
      const updated = await prisma.address.update({
        where: { id },
        data: { isDefault: true, updatedAt: now },
      });
      return updated;
    } catch (e) {
      // In-memory fallback
    }
  }

  for (const addr of inMemoryAddresses) {
    if (addr.userId === userId) {
      addr.isDefault = addr.id === id;
      addr.updatedAt = now;
    }
  }

  return existing;
}
