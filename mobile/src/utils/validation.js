/**
 * Validation Utilities
 * Input validation functions
 */

import { VALIDATION } from './constants';

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  if (!email) return 'Email là bắt buộc';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Email không hợp lệ';
  return null;
};

/**
 * Validate password
 */
export const validatePassword = (password) => {
  if (!password) return 'Mật khẩu là bắt buộc';
  if (password.length < VALIDATION.MIN_PASSWORD_LENGTH) {
    return `Mật khẩu phải có ít nhất ${VALIDATION.MIN_PASSWORD_LENGTH} ký tự`;
  }
  return null;
};

/**
 * Validate username
 */
export const validateUsername = (username) => {
  if (!username) return 'Tên người dùng là bắt buộc';
  if (username.length < VALIDATION.MIN_USERNAME_LENGTH) {
    return `Tên người dùng phải có ít nhất ${VALIDATION.MIN_USERNAME_LENGTH} ký tự`;
  }
  if (username.length > VALIDATION.MAX_USERNAME_LENGTH) {
    return `Tên người dùng không được quá ${VALIDATION.MAX_USERNAME_LENGTH} ký tự`;
  }
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return 'Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới';
  }
  return null;
};

/**
 * Validate full name
 */
export const validateFullName = (fullName) => {
  if (!fullName || fullName.trim().length === 0) {
    return 'Họ tên là bắt buộc';
  }
  if (fullName.trim().length < 2) {
    return 'Họ tên phải có ít nhất 2 ký tự';
  }
  return null;
};

/**
 * Validate message content
 */
export const validateMessage = (content) => {
  if (!content || content.trim().length === 0) {
    return 'Tin nhắn không được để trống';
  }
  if (content.length > VALIDATION.MAX_MESSAGE_LENGTH) {
    return `Tin nhắn không được quá ${VALIDATION.MAX_MESSAGE_LENGTH} ký tự`;
  }
  return null;
};

/**
 * Validate file size
 */
export const validateFileSize = (fileSize) => {
  if (fileSize > VALIDATION.MAX_FILE_SIZE) {
    const maxSizeMB = VALIDATION.MAX_FILE_SIZE / (1024 * 1024);
    return `File không được quá ${maxSizeMB}MB`;
  }
  return null;
};

/**
 * Validate file type (images)
 */
export const validateImageType = (mimeType) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(mimeType)) {
    return 'Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)';
  }
  return null;
};

