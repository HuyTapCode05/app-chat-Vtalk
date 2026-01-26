/**
 * ResetPasswordScreen Component
 * Screen for setting new password after OTP verification
 */

import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import api from '../config/api';
import { validatePassword } from '../utils/validation';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { email, resetToken } = route.params || {};
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const handleReset = useCallback(async () => {
    // Validate password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      Alert.alert('Lỗi', passwordError);
      return;
    }

    // Check password match
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    if (!resetToken) {
      Alert.alert('Lỗi', 'Token không hợp lệ');
      navigation.goBack();
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        resetToken,
        newPassword
      });
      
      Alert.alert(
        'Thành công',
        'Đặt lại mật khẩu thành công',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  }, [newPassword, confirmPassword, resetToken, navigation]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <LinearGradient
        colors={[theme.primary, theme.primaryDark || theme.primary]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: '#FFFFFF' }]}>Đặt lại mật khẩu</Text>
          <Text style={[styles.subtitle, { color: 'rgba(255, 255, 255, 0.9)' }]}>
            Nhập mật khẩu mới của bạn
          </Text>

          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.inputBorder }]}
              placeholder="Mật khẩu mới"
              placeholderTextColor={theme.placeholder}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoFocus
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.inputBorder }]}
              placeholder="Xác nhận mật khẩu"
              placeholderTextColor={theme.placeholder}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled, { backgroundColor: '#FFFFFF' }]}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Text style={[styles.buttonText, { color: theme.primary }]}>Đặt lại mật khẩu</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.linkText, { color: 'rgba(255, 255, 255, 0.9)' }]}>
                Quay lại
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
  },
});

export default ResetPasswordScreen;

