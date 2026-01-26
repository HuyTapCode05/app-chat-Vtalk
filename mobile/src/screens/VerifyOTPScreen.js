/**
 * VerifyOTPScreen Component
 * Screen for verifying OTP code for password reset
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import api from '../config/api';

const VerifyOTPScreen = ({ route, navigation }) => {
  const { email } = route.params || {};
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const inputRefs = useRef([]);

  const handleOtpChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index, key) => {
    // Handle backspace
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = useCallback(async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ 6 chữ số');
      return;
    }

    if (!email) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      navigation.goBack();
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/verify-reset-otp', { 
        email,
        code: otpCode 
      });
      
      navigation.navigate('ResetPassword', { 
        email,
        resetToken: res.data.resetToken 
      });
    } catch (error) {
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn'
      );
    } finally {
      setLoading(false);
    }
  }, [otp, email, navigation]);

  const handleResend = useCallback(async () => {
    if (!email) return;

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      Alert.alert('Thành công', 'Mã OTP mới đã được gửi đến email của bạn');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error) {
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || 'Không thể gửi lại mã OTP'
      );
    } finally {
      setLoading(false);
    }
  }, [email]);

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
          <Text style={[styles.title, { color: '#FFFFFF' }]}>Nhập mã OTP</Text>
          <Text style={[styles.subtitle, { color: 'rgba(255, 255, 255, 0.9)' }]}>
            Mã OTP đã được gửi đến{'\n'}
            <Text style={{ fontWeight: 'bold' }}>{email}</Text>
          </Text>

          <View style={styles.form}>
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    { 
                      backgroundColor: theme.inputBackground, 
                      color: theme.inputText, 
                      borderColor: theme.inputBorder 
                    }
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled, { backgroundColor: '#FFFFFF' }]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Text style={[styles.buttonText, { color: theme.primary }]}>Xác thực</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleResend}
              disabled={loading}
            >
              <Text style={[styles.linkText, { color: 'rgba(255, 255, 255, 0.9)' }]}>
                Gửi lại mã OTP
              </Text>
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
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

export default VerifyOTPScreen;

