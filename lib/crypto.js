/**
 * Cryptographic utilities for password hashing and verification
 * Centralized location for all password operations
 */

const crypto = require('crypto');

/**
 * Hash password with PBKDF2
 * @param {string} password - Plain text password
 * @returns {string} - Formatted string: "salt:hash"
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored hash
 * @param {string} password - Plain text password to verify
 * @param {string} storedHash - Stored hash in "salt:hash" format from database
 * @returns {boolean} - True if password matches, false otherwise
 */
function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }

  const [salt, hash] = storedHash.split(':');
  const computed = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return computed === hash;
}

module.exports = {
  hashPassword,
  verifyPassword,
};
