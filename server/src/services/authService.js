import crypto from 'crypto';
import prisma from '../config/db.js';
import bcrypt from 'bcryptjs';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { loadCollection, saveCollection } from '../utils/fileStore.js';

// Synchronously compute the hash of the demo admin password for dev environment fallback
const DEMO_ADMIN_PASSWORD_HASH = bcrypt.hashSync('Admin@123', 10);

const DEMO_ADMIN_USER = {
  id: 'admin-seed-uuid-1',
  name: 'Collections by Chandni Admin',
  email: 'admin@collectionsbychandni.in',
  phone: '+919876543210',
  role: 'ADMIN',
  isActive: true,
  passwordHash: DEMO_ADMIN_PASSWORD_HASH,
  createdAt: new Date('2026-09-01T10:00:00Z'),
  updatedAt: new Date('2026-09-01T10:00:00Z'),
};

const DEMO_CUSTOMER_USER = {
  id: 'customer-demo-uuid-2',
  name: 'Demo Customer',
  email: 'customer@collectionsbychandni.in',
  phone: '+919812345678',
  role: 'CUSTOMER',
  isActive: true,
  passwordHash: DEMO_ADMIN_PASSWORD_HASH,
  createdAt: new Date('2026-09-15T12:00:00Z'),
  updatedAt: new Date('2026-09-15T12:00:00Z'),
};

const DEFAULT_USERS = [DEMO_ADMIN_USER, DEMO_CUSTOMER_USER];

// Load persisted users from disk so accounts survive across deploys
const inMemoryUsers = loadCollection('users', DEFAULT_USERS);

function persistUsers() {
  saveCollection('users', inMemoryUsers);
}

export function _getInMemoryUsers() {
  return inMemoryUsers;
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
 * Normalizes email by trimming and converting to lowercase
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Validates email format
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates phone format (optional, 7-20 chars allowing +, digits, spaces, hyphens)
 */
export function isValidPhone(phone) {
  if (!phone) return true;
  if (typeof phone !== 'string') return false;
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,16}$/;
  return phoneRegex.test(phone.trim());
}

/**
 * Finds user by email in PostgreSQL or in-memory fallback
 */
export async function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: normalized },
      });
      if (user) return user;
    } catch (e) {
      // fallback to memory
    }
  }

  return inMemoryUsers.find((u) => u.email === normalized) || null;
}

/**
 * Registers a new Customer
 * - Assigns role = CUSTOMER
 * - Hashes password
 * - Normalizes email
 */
export async function registerCustomer({ name, email, password, phone }) {
  // 1. Name validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    const error = new Error('Full name is required');
    error.status = 400;
    throw error;
  }
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    const error = new Error('Name must be between 2 and 100 characters');
    error.status = 400;
    throw error;
  }

  // 2. Email validation
  if (!email || typeof email !== 'string' || !email.trim()) {
    const error = new Error('Email address is required');
    error.status = 400;
    throw error;
  }
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    const error = new Error('Please enter a valid email address');
    error.status = 400;
    throw error;
  }

  // 3. Password validation
  if (!password || typeof password !== 'string') {
    const error = new Error('Password is required');
    error.status = 400;
    throw error;
  }
  if (password.length < 8) {
    const error = new Error('Password must be at least 8 characters long');
    error.status = 400;
    throw error;
  }

  // 4. Phone validation (optional)
  let trimmedPhone = null;
  if (phone !== undefined && phone !== null && String(phone).trim()) {
    trimmedPhone = String(phone).trim();
    if (!isValidPhone(trimmedPhone)) {
      const error = new Error('Please enter a valid phone number');
      error.status = 400;
      throw error;
    }
  }

  // 5. Unique email check
  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    const error = new Error('An account with this email address already exists');
    error.status = 400;
    throw error;
  }

  // 6. Hash password
  const passwordHash = await hashPassword(password);
  const userId = `user-${crypto.randomUUID()}`;
  const now = new Date();

  const newUser = {
    id: userId,
    name: trimmedName,
    email: normalizedEmail,
    phone: trimmedPhone,
    passwordHash,
    role: 'CUSTOMER', // Strictly customer role
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      const created = await prisma.user.create({
        data: {
          id: userId,
          name: trimmedName,
          email: normalizedEmail,
          phone: trimmedPhone,
          passwordHash,
          role: 'CUSTOMER',
          isActive: true,
        },
      });
      newUser.id = created.id;
    } catch (e) {
      // In-memory fallback
    }
  }

  inMemoryUsers.push(newUser);
  persistUsers();

  // 7. Generate JWT
  const token = generateToken({
    userId: newUser.id,
    role: newUser.role,
  });

  return {
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      createdAt: newUser.createdAt,
    },
  };
}

/**
 * General user authentication (for customers and admins)
 */
export async function authenticateUser({ email, password }) {
  if (!email || typeof email !== 'string' || !email.trim()) {
    const error = new Error('Email is required');
    error.status = 400;
    throw error;
  }

  if (!password || typeof password !== 'string') {
    const error = new Error('Password is required');
    error.status = 400;
    throw error;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    const error = new Error('Invalid email format');
    error.status = 400;
    throw error;
  }

  const user = await findUserByEmail(normalizedEmail);

  // Generic non-revealing error
  if (!user || user.isActive === false) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const token = generateToken({
    userId: user.id,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
}

/**
 * Authenticates an admin user (strict requirement for role === ADMIN)
 */
export async function authenticateAdmin({ email, password }) {
  const result = await authenticateUser({ email, password });
  if (result.user.role !== 'ADMIN') {
    const error = new Error('Admin access required');
    error.status = 403;
    throw error;
  }
  return result;
}

/**
 * Retrieves a user by their unique ID
 */
export async function getUserById(userId) {
  if (!userId) return null;

  const dbConnected = await isDatabaseAlive();
  if (dbConnected) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (dbUser && dbUser.isActive) {
        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          phone: dbUser.phone || null,
          role: dbUser.role,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
        };
      }
    } catch (dbError) {
      // In-memory fallback
    }
  }

  const user = inMemoryUsers.find((u) => u.id === userId);
  if (user && user.isActive) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  return null;
}

/**
 * Updates permitted profile fields (name, phone) for an authenticated user
 */
export async function updateUserProfile(userId, { name, phone }) {
  if (!userId) {
    const error = new Error('User ID is required');
    error.status = 400;
    throw error;
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    const error = new Error('Name cannot be empty');
    error.status = 400;
    throw error;
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    const error = new Error('Name must be between 2 and 100 characters');
    error.status = 400;
    throw error;
  }

  let trimmedPhone = null;
  if (phone !== undefined && phone !== null && String(phone).trim()) {
    trimmedPhone = String(phone).trim();
    if (!isValidPhone(trimmedPhone)) {
      const error = new Error('Please enter a valid phone number');
      error.status = 400;
      throw error;
    }
  }

  const dbConnected = await isDatabaseAlive();
  const now = new Date();

  if (dbConnected) {
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          name: trimmedName,
          phone: trimmedPhone,
          updatedAt: now,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone || null,
        role: updated.role,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } catch (e) {
      // fallback
    }
  }

  const user = inMemoryUsers.find((u) => u.id === userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  user.name = trimmedName;
  user.phone = trimmedPhone;
  user.updatedAt = now;
  persistUsers();

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Changes password for an authenticated user (admin or customer)
 * Verifies current password against stored hash and persists new bcrypt hash.
 */
export async function changePassword(userId, { currentPassword, newPassword, confirmPassword }) {
  if (!userId) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }

  if (!currentPassword || typeof currentPassword !== 'string') {
    const error = new Error('Current password is required');
    error.status = 400;
    throw error;
  }

  if (!newPassword || typeof newPassword !== 'string') {
    const error = new Error('New password is required');
    error.status = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error('New password must be at least 8 characters long');
    error.status = 400;
    throw error;
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    const error = new Error('New password and confirmation password do not match');
    error.status = 400;
    throw error;
  }

  if (currentPassword === newPassword) {
    const error = new Error('New password cannot be the same as your current password');
    error.status = 400;
    throw error;
  }

  const dbConnected = await isDatabaseAlive();
  let userRecord = null;

  if (dbConnected) {
    try {
      userRecord = await prisma.user.findUnique({
        where: { id: userId },
      });
    } catch (e) {
      // In-memory fallback
    }
  }

  if (!userRecord) {
    userRecord = inMemoryUsers.find((u) => u.id === userId);
  }

  if (!userRecord || !userRecord.isActive) {
    const error = new Error('User account not found or inactive');
    error.status = 404;
    throw error;
  }

  // Verify current password
  const isMatch = await comparePassword(currentPassword, userRecord.passwordHash);
  if (!isMatch) {
    const error = new Error('Current password is incorrect');
    error.status = 400;
    throw error;
  }

  // Hash new password using bcrypt
  const newHash = await hashPassword(newPassword);
  const now = new Date();

  // Persist in DB if connected
  if (dbConnected) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newHash,
          updatedAt: now,
        },
      });
    } catch (e) {
      // In-memory fallback
    }
  }

  // Also update in-memory user and persist to disk
  const memoryUser = inMemoryUsers.find((u) => u.id === userId);
  if (memoryUser) {
    memoryUser.passwordHash = newHash;
    memoryUser.updatedAt = now;
    persistUsers();
  }

  return {
    success: true,
    message: 'Password changed successfully',
  };
}
