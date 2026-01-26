import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../config/api';

const QRScannerScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || loading) return;

    setScanned(true);
    setLoading(true);

    try {
      console.log('📱 QR Code scanned:', data);

      // Parse QR code data - format: "vtalk:userId:username"
      if (!data.startsWith('vtalk:')) {
        Alert.alert('Lỗi', 'Mã QR không hợp lệ. Vui lòng quét mã QR từ ứng dụng VTalk.');
        setScanned(false);
        setLoading(false);
        return;
      }

      const parts = data.split(':');
      if (parts.length < 2) {
        Alert.alert('Lỗi', 'Mã QR không hợp lệ.');
        setScanned(false);
        setLoading(false);
        return;
      }

      const targetUserId = parts[1];
      const targetUsername = parts[2] || '';

      // Check if scanning own QR code
      if (targetUserId === user?.id) {
        Alert.alert('Thông báo', 'Đây là mã QR của chính bạn.');
        setScanned(false);
        setLoading(false);
        return;
      }

      // Check if already friends
      try {
        const friendCheck = await api.get(`/friends/check/${targetUserId}`);
        if (friendCheck.data.areFriends) {
          Alert.alert('Thông báo', 'Bạn đã là bạn bè với người này rồi.');
          setScanned(false);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error checking friendship:', error);
      }

      // Show confirmation dialog
      Alert.alert(
        'Kết bạn',
        `Bạn muốn gửi lời mời kết bạn đến @${targetUsername || targetUserId}?`,
        [
          {
            text: 'Hủy',
            style: 'cancel',
            onPress: () => {
              setScanned(false);
              setLoading(false);
            },
          },
          {
            text: 'Gửi lời mời',
            onPress: async () => {
              try {
                await api.post('/friends/request', { toUserId: targetUserId });
                Alert.alert('Thành công', 'Đã gửi lời mời kết bạn!', [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.goBack();
                    },
                  },
                ]);
              } catch (error) {
                console.error('Error sending friend request:', error);
                const errorMessage =
                  error.response?.data?.message || 'Không thể gửi lời mời kết bạn';
                Alert.alert('Lỗi', errorMessage, [
                  {
                    text: 'OK',
                    onPress: () => {
                      setScanned(false);
                      setLoading(false);
                    },
                  },
                ]);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert('Lỗi', 'Không thể xử lý mã QR. Vui lòng thử lại.');
      setScanned(false);
      setLoading(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.text, { color: theme.text }]}>Đang kiểm tra quyền camera...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContent}>
          <Ionicons name="camera-outline" size={64} color={theme.textMuted} />
          <Text style={[styles.text, { color: theme.text, marginTop: 16 }]}>
            Không có quyền truy cập camera
          </Text>
          <Text style={[styles.text, { color: theme.textSecondary, marginTop: 8, textAlign: 'center' }]}>
            Vui lòng cấp quyền camera trong cài đặt để quét mã QR
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary, marginTop: 24 }]}
            onPress={requestPermission}
          >
            <Text style={styles.buttonText}>Cấp quyền</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.scannerArea}>
          <View style={[styles.scannerFrame, { borderColor: theme.primary }]}>
            <View style={[styles.corner, styles.topLeft, { borderColor: theme.primary }]} />
            <View style={[styles.corner, styles.topRight, { borderColor: theme.primary }]} />
            <View style={[styles.corner, styles.bottomLeft, { borderColor: theme.primary }]} />
            <View style={[styles.corner, styles.bottomRight, { borderColor: theme.primary }]} />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.instructionText, { color: '#FFFFFF' }]}>
            Đặt mã QR vào khung để quét
          </Text>
          {scanned && (
            <TouchableOpacity
              style={[styles.rescanButton, { backgroundColor: theme.primary }]}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.rescanButtonText}>Quét lại</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  scannerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderRadius: 16,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 4,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 16,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  rescanButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  rescanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QRScannerScreen;

