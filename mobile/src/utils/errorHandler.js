/**
 * Error Handler Utilities
 * Centralized error handling and logging
 */

import { Alert, Platform } from 'react-native';

// Web-compatible alert helper
export const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      // For web, use window.confirm for simple confirmations
      const hasCancel = buttons.some(b => b.style === 'cancel');
      const hasDestructive = buttons.some(b => b.style === 'destructive');
      
      if (buttons.length === 2 && hasCancel && hasDestructive) {
        const confirmed = window.confirm(`${title}\n\n${message}`);
        if (confirmed) {
          const destructiveButton = buttons.find(b => b.style === 'destructive');
          if (destructiveButton && destructiveButton.onPress) {
            destructiveButton.onPress();
          }
        } else {
          const cancelButton = buttons.find(b => b.style === 'cancel');
          if (cancelButton && cancelButton.onPress) {
            cancelButton.onPress();
          }
        }
        return;
      }
    }
    // Simple alert for web
    alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message, buttons);
  }
};

/**
 * Handle API errors with user-friendly messages
 */
export const handleApiError = (error, customMessage = null) => {
  console.error('API Error:', error);

  if (customMessage) {
    showAlert('Lỗi', customMessage);
    return;
  }

  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const message = error.response.data?.message || 'Đã xảy ra lỗi';

    switch (status) {
      case 400:
        showAlert('Lỗi', message || 'Dữ liệu không hợp lệ');
        break;
      case 401:
        showAlert('Lỗi', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        break;
      case 403:
        showAlert('Lỗi', 'Bạn không có quyền thực hiện thao tác này');
        break;
      case 404:
        showAlert('Lỗi', 'Không tìm thấy dữ liệu');
        break;
      case 500:
        showAlert('Lỗi', 'Lỗi máy chủ. Vui lòng thử lại sau.');
        break;
      default:
        showAlert('Lỗi', message);
    }
  } else if (error.request) {
    // Request was made but no response received
    showAlert(
      'Lỗi kết nối',
      'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.'
    );
  } else {
    // Something else happened
    showAlert('Lỗi', error.message || 'Đã xảy ra lỗi không xác định');
  }
};

/**
 * Handle network errors specifically
 */
export const handleNetworkError = (error) => {
  if (
    error.code === 'ECONNREFUSED' ||
    error.message?.includes('Network') ||
    error.message?.includes('timeout')
  ) {
    const message = Platform.OS === 'web'
      ? 'Không thể kết nối đến server. Vui lòng kiểm tra:\n1. Backend đang chạy chưa?\n2. URL trong api.js đúng chưa?'
      : 'Không thể kết nối đến server. Vui lòng kiểm tra:\n1. Backend đang chạy chưa?\n2. IP trong api.js đúng chưa?\n3. Mobile và máy tính cùng mạng WiFi?';
    showAlert('Lỗi kết nối', message);
    return true;
  }
  return false;
};

/**
 * Safe async function wrapper
 */
export const safeAsync = async (asyncFn, errorHandler = handleApiError) => {
  try {
    return await asyncFn();
  } catch (error) {
    if (errorHandler) {
      errorHandler(error);
    }
    return null;
  }
};

/**
 * Retry function with exponential backoff
 */
export const retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

