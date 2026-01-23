/**
 * VerifyEmailScreen Component
 * Screen for verifying email with OTP or token
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import { handleApiError } from '../utils/errorHandler';
import { COLORS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import storage from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';
import { safeGoBack } from '../utils/helpers';

const VerifyEmailScreen = ({ route, navigation }) => {
  const { user, setUser, logout } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);
  const iconScale = useRef(new Animated.Value(1)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const email = user?.email || route?.params?.email || '';

  // Icon animation (pulse + rotate nhẹ)
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(iconScale, {
            toValue: 1.1,
            duration: 700,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
          Animated.timing(iconScale, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
            easing: Easing.in(Easing.ease),
          }),
        ]),
        Animated.sequence([
          Animated.timing(iconRotate, {
            toValue: 1,
            duration: 1400,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          Animated.timing(iconRotate, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [iconScale, iconRotate]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    }

    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [countdown]);

  const handleVerify = useCallback(async () => {
    if (!code || code.length !== 6) {
      // Shake effect khi nhập sai
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -1,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
      ]).start();

      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ 6 số');
      return;
    }

    if (!email) {
      Alert.alert('Lỗi', 'Không tìm thấy email để xác thực. Vui lòng đăng nhập lại.');
      return;
    }

    setLoading(true);
    try {
      // Backend yêu cầu: email + type + code
      const res = await api.post('/auth/verify-email', {
        email,
        code,
        type: 'otp',
      });
      
      const updatedUser = res.data?.user;

      // Update user in context + local storage
      if (updatedUser && setUser) {
        setUser(updatedUser);
        await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      }

      Alert.alert('Thành công', 'Email đã được xác thực thành công!', [
        {
          text: 'OK',
          onPress: () => {
            // Sau khi setUser, AppNavigator sẽ tự render phần main app
            navigation.replace('Conversations');
          },
        },
      ]);
    } catch (error) {
      handleApiError(error, 'Mã xác thực không đúng hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  }, [code, email, navigation, setUser]);

  const handleResend = useCallback(async () => {
    if (countdown > 0) {
      Alert.alert('Thông báo', `Vui lòng đợi ${countdown} giây trước khi gửi lại`);
      return;
    }

    setResending(true);
    try {
      await api.post('/auth/send-verification');
      Alert.alert('Thành công', 'Đã gửi lại mã xác thực đến email của bạn');
      setCountdown(60); // 60 seconds cooldown
    } catch (error) {
      handleApiError(error, 'Không thể gửi lại mã xác thực');
    } finally {
      setResending(false);
    }
  }, [countdown]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={[COLORS.PRIMARY, COLORS.SECONDARY]}
        style={styles.gradient}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (user) {
              // Nếu đã đăng nhập nhưng chưa verify, cho phép logout và quay về đăng ký
              Alert.alert(
                'Quay lại đăng ký?',
                'Bạn có muốn đăng xuất và quay lại màn hình đăng ký không?',
                [
                  { text: 'Hủy', style: 'cancel' },
                  {
                    text: 'Đăng ký lại',
                    onPress: async () => {
                      try {
                        await logout();
                        navigation.replace('Register');
                      } catch (error) {
                        // Nếu logout fail, vẫn quay về Register
                        navigation.replace('Register');
                      }
                    },
                  },
                ]
              );
            } else {
              // Nếu chưa đăng nhập, chỉ cần quay về Register
              safeGoBack(navigation, 'Register');
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.content}>
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [
                  { scale: iconScale },
                  {
                    rotate: iconRotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '8deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="mail-outline" size={80} color="#fff" />
          </Animated.View>

          <Text style={styles.title}>Xác thực Email</Text>
          <Text style={styles.subtitle}>
            Chúng tôi đã gửi mã xác thực 6 số đến email:
          </Text>
          <Text style={styles.email}>{email}</Text>

          <Animated.View
            style={[
              styles.codeContainer,
              {
                transform: [
                  {
                    translateX: shakeAnim.interpolate({
                      inputRange: [-1, 1],
                      outputRange: [-8, 8],
                    }),
                  },
                ],
              },
            ]}
          >
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={setCode}
              placeholder="Nhập mã 6 số"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </Animated.View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading || code.length !== 6}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Xác thực</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Không nhận được mã?</Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resending || countdown > 0}
              style={styles.resendButton}
            >
              {resending ? (
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
              ) : (
                <Text style={styles.resendButtonText}>
                  {countdown > 0 ? `Gửi lại (${countdown}s)` : 'Gửi lại mã'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Bỏ nút “Bỏ qua” để bắt buộc xác thực email
              Nếu sau này muốn cho phép bỏ qua, cần set cờ rõ ràng trên server */}
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
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 20,
    zIndex: 10,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    width: '100%',
    padding: 30,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 40,
    textAlign: 'center',
  },
  codeContainer: {
    width: '100%',
    marginBottom: 30,
  },
  codeInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.PRIMARY,
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  resendButton: {
    padding: 8,
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  skipButton: {
    padding: 12,
  },
  skipText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    textDecorationLine: 'underline',
  },
});

export default VerifyEmailScreen;

