/**
 * Utility functions for the Thunderbird LLM Mail Sorter
 */

/**
 * Simple sleep function to add delays between operations
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safely parse JSON with error handling
 * @param {string} jsonString - The JSON string to parse
 * @returns {Object|null} Parsed object or null if invalid
 */
function safeJsonParse(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("JSON parse error:", error);
    return null;
  }
}

/**
 * Extract JSON from a string that might contain extra text
 * @param {string} text - Text that may contain JSON
 * @returns {Object|null} Extracted JSON object or null
 */
function extractJsonFromText(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn("No JSON found in text:", text);
    return null;
  }
  return safeJsonParse(jsonMatch[0]);
}

/**
 * Get category color for UI display
 * @param {string} category - The email category
 * @returns {string} CSS color value
 */
function getCategoryColor(category) {
  return window.CATEGORY_COLORS[category] || window.CATEGORY_COLORS.ERROR;
}

/**
 * Format folder list for display
 * @param {Array} folders - Array of folder objects
 * @returns {string} Comma-separated folder names
 */
function formatFolderList(folders) {
  return folders.map(f => f.name).join(", ");
}

/**
 * Validate endpoint URL
 * @param {string} endpoint - The endpoint URL to validate
 * @returns {boolean} True if valid
 */
function isValidEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Make utilities available globally
window.Utils = {
  sleep,
  safeJsonParse,
  extractJsonFromText,
  getCategoryColor,
  formatFolderList,
  isValidEndpoint
};