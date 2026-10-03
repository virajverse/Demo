/**
 * Centralized file system utilities
 * Shared functions for loading, saving, and appending to JSON files
 */

const fs = require('fs');
const path = require('path');

/**
 * Load data from JSON file with fallback
 * @param {string} filePath - Full path to JSON file
 * @param {*} defaultValue - Value to return/create if file doesn't exist
 * @param {boolean} ensureDir - Whether to create directory if missing (default: true)
 * @returns {*} - Parsed JSON data or defaultValue
 */
function loadJSON(filePath, defaultValue = {}, ensureDir = true) {
  try {
    if (!fs.existsSync(filePath)) {
      if (ensureDir) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) || defaultValue;
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return defaultValue;
  }
}

/**
 * Save data to JSON file
 * @param {string} filePath - Full path to JSON file
 * @param {*} data - Data to write
 * @param {boolean} ensureDir - Whether to create directory if missing (default: true)
 */
function saveJSON(filePath, data, ensureDir = true) {
  try {
    if (ensureDir) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error);
    throw error;
  }
}

/**
 * Append line to text file
 * @param {string} filePath - Full path to file
 * @param {string} text - Text to append (newline added automatically)
 * @param {boolean} ensureDir - Whether to create directory if missing (default: true)
 */
function appendToFile(filePath, text, ensureDir = true) {
  try {
    if (ensureDir) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    fs.appendFileSync(filePath, text + '\n');
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
    throw error;
  }
}

/**
 * Delete file if it exists
 * @param {string} filePath - Full path to file
 */
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Error deleting ${filePath}:`, error);
  }
}

/**
 * Check if file exists
 * @param {string} filePath - Full path to file
 * @returns {boolean}
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

module.exports = {
  loadJSON,
  saveJSON,
  appendToFile,
  deleteFile,
  fileExists,
};
