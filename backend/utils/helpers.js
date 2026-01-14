/**
 * Backend Helper Utilities
 * Reusable utility functions for backend
 */

/**
 * Generate unique ID
 */
const generateId = (prefix = '') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
};

/**
 * Sanitize string input
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate username format
 */
const isValidUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};

/**
 * Format error response
 */
const formatError = (message, statusCode = 400, code = null) => {
  const error = {
    message,
    status: statusCode,
  };
  if (code) {
    error.code = code;
  }
  return error;
};

/**
 * Format success response
 */
const formatSuccess = (data, message = null) => {
  const response = { data };
  if (message) {
    response.message = message;
  }
  return response;
};

/**
 * Get current timestamp
 */
const getCurrentTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Filter null/undefined values from array
 */
const filterNulls = (array) => {
  return array.filter(item => item !== null && item !== undefined);
};

/**
 * Remove duplicates from array
 */
const unique = (array) => {
  return [...new Set(array)];
};

/**
 * Check if user is participant in conversation
 */
const isParticipant = (conversation, userId) => {
  if (!conversation || !userId) return false;
  const participants = conversation.participants || [];
  return participants.includes(userId);
};

/**
 * Get other participants (excluding current user)
 */
const getOtherParticipants = (participants, currentUserId) => {
  if (!Array.isArray(participants) || !currentUserId) return [];
  return participants.filter(p => p && p !== currentUserId);
};

module.exports = {
  generateId,
  sanitizeString,
  isValidEmail,
  isValidUsername,
  formatError,
  formatSuccess,
  getCurrentTimestamp,
  filterNulls,
  unique,
  isParticipant,
  getOtherParticipants,
};

