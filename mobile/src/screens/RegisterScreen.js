/**
 * RegisterScreen Component
 * User registration screen
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { handleApiError } from '../utils/errorHandler';
import { validateEmail, validatePassword, validateUsername, validateFullName } from '../utils/validation';
import { COLORS } from '../utils/constants';
import { logger } from '../utils/logger';
import { safeGoBack } from '../utils/helpers';

// Web-compatible alert helper
const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      const hasCancel = buttons.some(b => b.style === 'cancel');
      const hasDestructive = buttons.some(b => b.style === 'destructive');
      
      if (buttons.length === 2 && hasCancel && hasDestructive) {
        const confirmed = window.confirm(`${title}\n\n${message}`);
        if (confirmed) {
          const destructiveButton = buttons.find(b => b.style === 'destructive' || !b.style);
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
    alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message, buttons);
  }
};

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const isSubmittingRef = useRef(false); // Prevent double submission

  const handleRegister = useCallback(async () => {
    // Prevent double submission
    if (isSubmittingRef.current || loading) {
      return;
    }

    // Validate all fields
    const fullNameError = validateFullName(formData.fullName);
    if (fullNameError) {
      showAlert('Lỗi', fullNameError);
      return;
    }

    const usernameError = validateUsername(formData.username);
    if (usernameError) {
      showAlert('Lỗi', usernameError);
      return;
    }

    const emailError = validateEmail(formData.email);
    if (emailError) {
      showAlert('Lỗi', emailError);
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      showAlert('Lỗi', passwordError);
      return;
    }

    if (formData.password.length < 6) {
      showAlert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    // Set loading state immediately to prevent double clicks
    isSubmittingRef.current = true;
    setLoading(true);
    try {
      logger.info('Starting registration...', { email: formData.email, username: formData.username });
      const result = await register(
        formData.username,
        formData.email,
        formData.password,
        formData.fullName
      );
      
      logger.success('Registration successful', { requiresVerification: result?.requiresVerification });
      
      // Check if email verification is required
      if (result?.requiresVerification) {
        // Navigate to verification screen
        if (Platform.OS === 'web') {
          // On web, use navigate instead of replace for better compatibility
          navigation.navigate('VerifyEmail', { 
            email: formData.email,
            verificationMethod: result.verificationMethod || 'otp'
          });
        } else {
          navigation.replace('VerifyEmail', { 
            email: formData.email,
            verificationMethod: result.verificationMethod || 'otp'
          });
        }
      } else {
        // Navigation will automatically change when user state updates
        logger.info('No verification required, user should be logged in');
      }
    } catch (error) {
      logger.error('Registration error:', error);
      const errorCode = error.response?.data?.code;
      const errorMessage = error.response?.data?.message || 'Đăng ký thất bại';
      
      // Nếu email đã tồn tại, hỏi có muốn đăng nhập không
      if (errorCode === 'EMAIL_EXISTS') {
        showAlert(
          'Email đã được sử dụng',
          'Email này đã được đăng ký. Bạn có muốn đăng nhập không?',
          [
            {
              text: 'Hủy',
              style: 'cancel'
            },
            {
              text: 'Đăng nhập',
              onPress: () => {
                navigation.navigate('Login');
              }
            }
          ]
        );
      } else if (errorCode === 'USERNAME_EXISTS') {
        // Username đã tồn tại - đề xuất username khác
        const suggestedUsername = `${formData.username}${Math.floor(Math.random() * 1000)}`;
        showAlert(
          'Username đã được sử dụng',
          `${errorMessage}\n\nGợi ý username: ${suggestedUsername}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Tự động điền username gợi ý vào ô input
                setFormData({ ...formData, username: suggestedUsername });
              }
            }
          ]
        );
      } else {
        // Các lỗi khác
        handleApiError(error, 'Đăng ký thất bại');
      }
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }, [formData, register, navigation, loading]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Đăng Ký</Text>
          <Text style={styles.subtitle}>Tạo tài khoản mới</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Tên đầy đủ"
              placeholderTextColor="#999"
              value={formData.fullName}
              onChangeText={(text) => setFormData({ ...formData, fullName: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#999"
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Mật khẩu (tối thiểu 6 ký tự)"
              placeholderTextColor="#999"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, (loading || isSubmittingRef.current) && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading || isSubmittingRef.current}
              activeOpacity={loading || isSubmittingRef.current ? 1 : 0.7}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Đăng Ký</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => safeGoBack(navigation, 'Login')}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>
                Đã có tài khoản? Đăng nhập
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#00B14F',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    minHeight: 50,
    justifyContent: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      userSelect: 'none',
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
    backgroundColor: '#999',
    ...(Platform.OS === 'web' && {
      cursor: 'not-allowed',
    }),
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#00B14F',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default RegisterScreen;

