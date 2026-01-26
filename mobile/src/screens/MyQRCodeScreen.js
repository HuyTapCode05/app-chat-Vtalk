import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../config/api';
import QRCode from 'react-native-qrcode-svg';

const MyQRCodeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme } = useTheme();

  // Generate QR code data - format: "vtalk:userId:username"
  const qrData = user?.id ? `vtalk:${user.id}:${user.username || ''}` : '';

  const handleShareQR = async () => {
    try {
      // Show QR data - in production, you could generate an image and share it
      Alert.alert(
        'Mã QR của bạn',
        `Mã QR: ${qrData}\n\nNgười khác có thể quét mã này để kết bạn với bạn.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error sharing QR:', error);
      Alert.alert('Lỗi', 'Không thể chia sẻ mã QR');
    }
  };

  const avatarUrl = user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${BASE_URL}${user.avatar}`) : null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.content, { backgroundColor: theme.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Mã QR của tôi</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Quét mã QR này để kết bạn với tôi
          </Text>
        </View>

        <View style={[styles.qrContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
          {qrData ? (
            <QRCode
              value={qrData}
              size={250}
              color={theme.text || '#000000'}
              backgroundColor={theme.background || '#FFFFFF'}
              logo={avatarUrl ? { uri: avatarUrl } : undefined}
              logoSize={50}
              logoBackgroundColor={theme.background || '#FFFFFF'}
              logoMargin={5}
              logoBorderRadius={25}
            />
          ) : (
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code-outline" size={100} color={theme.textMuted} />
              <Text style={[styles.qrPlaceholderText, { color: theme.textMuted }]}>
                Không thể tạo mã QR
              </Text>
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>
                {user?.fullName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <Text style={[styles.userName, { color: theme.text }]}>{user?.fullName || 'User'}</Text>
          <Text style={[styles.userId, { color: theme.textSecondary }]}>@{user?.username || 'username'}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={handleShareQR}
          >
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Chia sẻ mã QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
            onPress={() => navigation.navigate('QRScanner')}
          >
            <Ionicons name="qr-code-outline" size={20} color={theme.primary} />
            <Text style={[styles.actionButtonText, { color: theme.primary }]}>Quét mã QR</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Mã QR này chứa thông tin ID của bạn. Người khác có thể quét để gửi lời mời kết bạn.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  qrContainer: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrPlaceholder: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: {
    marginTop: 16,
    fontSize: 16,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  userId: {
    fontSize: 16,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default MyQRCodeScreen;

