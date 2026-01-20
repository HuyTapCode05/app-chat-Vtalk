/**
 * LoginScreen Component
 * User login screen
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
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { handleApiError } from '../utils/errorHandler';
import { validateEmail, validatePassword } from '../utils/validation';
import { COLORS, SHADOWS, RADIUS } from '../utils/constants';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme } = useTheme();

  const handleLogin = useCallback(async () => {
    // Validate email
    const emailError = validateEmail(email);
    if (emailError) {
      Alert.alert('Lỗi', emailError);
      return;
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert('Lỗi', passwordError);
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // Navigation sẽ tự động chuyển khi user state thay đổi
    } catch (error) {
      Alert.alert(
        'Đăng nhập thất bại',
        error.response?.data?.message || 'Email hoặc mật khẩu không đúng'
      );
    } finally {
      setLoading(false);
    }
  }, [email, password, login]);

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
          <Text style={[styles.title, { color: '#FFFFFF' }]}>VTalk</Text>
          <Text style={[styles.subtitle, { color: 'rgba(255, 255, 255, 0.9)' }]}>Kết nối gia đình & bạn bè</Text>

          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.inputBorder }]}
              placeholder="Email"
              placeholderTextColor={theme.placeholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.inputBorder }]}
              placeholder="Mật khẩu"
              placeholderTextColor={theme.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled, { backgroundColor: theme.primary }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Đăng Nhập</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              style={styles.linkButton}
            >
              <Text style={[styles.linkText, { color: 'rgba(255, 255, 255, 0.9)' }]}>
                Chưa có tài khoản? Đăng ký ngay
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
    alignItems: 'center',
  },
  content: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 44,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    opacity: 0.9,
    marginBottom: 40,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    borderRadius: RADIUS.LG,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    shadowColor: SHADOWS.CARD.shadowColor,
    shadowOffset: SHADOWS.CARD.shadowOffset,
    shadowOpacity: SHADOWS.CARD.shadowOpacity,
    shadowRadius: SHADOWS.CARD.shadowRadius,
    elevation: SHADOWS.CARD.elevation,
  },
  button: {
    borderRadius: RADIUS.LG,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: SHADOWS.CARD.shadowColor,
    shadowOffset: SHADOWS.CARD.shadowOffset,
    shadowOpacity: SHADOWS.CARD.shadowOpacity,
    shadowRadius: SHADOWS.CARD.shadowRadius,
    elevation: SHADOWS.CARD.elevation,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;

