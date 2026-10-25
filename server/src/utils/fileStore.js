import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory path: /server/data/persistent_storage.json
const DATA_DIR = path.resolve(__dirname, '../../data');
const STORAGE_FILE = path.join(DATA_DIR, 'persistent_storage.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('Could not create data directory:', err.message);
}

/**
 * Reads entire persistent storage file
 */
function readAll() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Persistent storage read warning:', err.message);
  }
  return {};
}

/**
 * Writes entire persistent storage file atomically
 */
function writeAll(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${STORAGE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, STORAGE_FILE);
  } catch (err) {
    console.error('Persistent storage write error:', err.message);
  }
}

/**
 * Loads a collection by key with a fallback default array/object
 */
export function loadCollection(key, defaultValue = []) {
  const all = readAll();
  if (all[key] !== undefined && all[key] !== null) {
    return all[key];
  }
  return defaultValue;
}

/**
 * Saves a collection by key
 */
export function saveCollection(key, data) {
  const all = readAll();
  all[key] = data;
  writeAll(all);
}

export default {
  loadCollection,
  saveCollection,
};
