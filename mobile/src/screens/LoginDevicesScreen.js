import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import api from '../config/api';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

const LoginDevicesScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { socket } = useSocket();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);

  useEffect(() => {
    loadDevices();
    
    // Get current device ID
    const deviceId = Constants.installationId || Constants.deviceId || socket?.id;
    setCurrentDeviceId(deviceId);

    // Send device name update if socket is connected and we have device name
    if (socket && socket.connected) {
      const updateDeviceName = async () => {
        try {
          let deviceName = null;
          if (Constants.platform?.web) {
            // For web, use a better name from userAgent
            const ua = navigator?.userAgent || '';
            if (ua.includes('Chrome') && !ua.includes('Edg')) {
              deviceName = 'Chrome (Website)';
            } else if (ua.includes('Firefox')) {
              deviceName = 'Firefox (Website)';
            } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
              deviceName = 'Safari (Website)';
            } else if (ua.includes('Edg')) {
              deviceName = 'Edge (Website)';
            } else {
              deviceName = 'Web Browser';
            }
          } else {
            try {
              deviceName = Device.deviceName || Device.modelName || null;
              console.log('📱 Device name:', deviceName);
            } catch (error) {
              console.log('Could not get device name:', error);
            }
          }
          
          if (deviceName) {
            // Try to update via API first
            try {
              await api.put('/auth/devices/update-name', {
                deviceName: deviceName,
                socketId: socket.id
              });
              console.log('✅ Updated device name via API');
              // Reload devices after update
              setTimeout(() => loadDevices(), 500);
            } catch (apiError) {
              console.log('API update failed, trying socket:', apiError);
              // Fallback: Re-emit join with deviceName to update it
              socket.emit('join', {
                userId: user?.id,
                platform: Constants.platform?.ios ? 'ios' : Constants.platform?.android ? 'android' : 'web',
                userAgent: Constants.platform?.web ? navigator?.userAgent : undefined,
                deviceId: deviceId,
                deviceName: deviceName
              });
            }
          }
        } catch (error) {
          console.error('Error updating device name:', error);
        }
      };
      
      // Update device name after a short delay
      setTimeout(updateDeviceName, 500);
    }

    // Listen for device updates
    if (socket) {
      const handleDevicesUpdated = (data) => {
        console.log('📱 Devices updated:', data);
        if (data.devices) {
          setDevices(data.devices);
        }
      };

      socket.on('devices-updated', handleDevicesUpdated);

      return () => {
        socket.off('devices-updated', handleDevicesUpdated);
      };
    }
  }, [socket, user?.id]);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/devices');
      console.log('📱 Loaded devices:', res.data);
      let loadedDevices = res.data.devices || [];
      
      // Check if current device doesn't have deviceName and update it
      // First, define isCurrentDevice helper
      const checkIsCurrentDevice = (device) => {
        if (!socket) return false;
        if (device.socketId && socket.id && device.socketId === socket.id) return true;
        const deviceId = Constants.installationId || Constants.deviceId;
        if (device.deviceId && deviceId && device.deviceId === deviceId) return true;
        return false;
      };
      
      const currentDevice = loadedDevices.find(d => checkIsCurrentDevice(d));
      console.log('🔍 Current device check:', {
        socketId: socket?.id,
        currentDevice: currentDevice,
        hasDeviceName: currentDevice?.deviceName,
        allDevices: loadedDevices.map(d => ({ socketId: d.socketId, deviceId: d.deviceId }))
      });
      
      if (currentDevice && (!currentDevice.deviceName || currentDevice.deviceName === 'null' || currentDevice.deviceName === null)) {
        console.log('📱 Current device missing deviceName, updating...');
        
        let deviceName = null;
        if (Constants.platform?.web) {
          const ua = navigator?.userAgent || '';
          if (ua.includes('Chrome') && !ua.includes('Edg')) {
            deviceName = 'Chrome (Website)';
          } else if (ua.includes('Firefox')) {
            deviceName = 'Firefox (Website)';
          } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
            deviceName = 'Safari (Website)';
          } else if (ua.includes('Edg')) {
            deviceName = 'Edge (Website)';
          } else {
            deviceName = 'Web Browser';
          }
        } else {
          try {
            deviceName = Device.deviceName || Device.modelName || null;
            console.log('📱 Got device name from expo-device:', deviceName);
          } catch (error) {
            console.log('Could not get device name:', error);
          }
        }
        
        if (deviceName && socket && socket.connected) {
          try {
            // Update via API
            await api.put('/auth/devices/update-name', {
              deviceName: deviceName,
              socketId: currentDevice.socketId || socket?.id,
              deviceId: currentDevice.deviceId || Constants.installationId || Constants.deviceId
            });
            console.log('✅ Updated device name via API:', deviceName);
            
            // Update local state
            loadedDevices = loadedDevices.map(d => 
              d.socketId === currentDevice.socketId 
                ? { ...d, deviceName }
                : d
            );
          } catch (apiError) {
            console.error('Error updating device name via API:', apiError);
            // Fallback: emit join with deviceName
            if (user?.id) {
              socket.emit('join', {
                userId: user.id,
                platform: Constants.platform?.ios ? 'ios' : Constants.platform?.android ? 'android' : 'web',
                userAgent: Constants.platform?.web ? navigator?.userAgent : undefined,
                deviceId: Constants.installationId || Constants.deviceId,
                deviceName: deviceName
              });
            }
          }
        }
      }
      
      setDevices(loadedDevices);
    } catch (error) {
      console.error('Error loading devices:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách thiết bị');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDevices();
  };

  const handleLogoutDevice = async (deviceSocketId) => {
    if (!socket) {
      Alert.alert('Lỗi', 'Không có kết nối đến server');
      return;
    }

    Alert.alert(
      'Đăng xuất thiết bị',
      'Bạn có chắc chắn muốn đăng xuất thiết bị này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              // If logging out current device, use logout API
              if (deviceSocketId === socket.id) {
                await logout();
                return;
              }

              // Otherwise, emit logout-device event
              socket.emit('logout-device', { socketId: deviceSocketId });
              
              // Wait a bit then reload devices
              setTimeout(() => {
                loadDevices();
              }, 1000);
            } catch (error) {
              console.error('Error logging out device:', error);
              Alert.alert('Lỗi', 'Không thể đăng xuất thiết bị');
            }
          },
        },
      ]
    );
  };

  const handleLogoutAllDevices = async () => {
    if (!socket) {
      Alert.alert('Lỗi', 'Không có kết nối đến server');
      return;
    }

    Alert.alert(
      'Đăng xuất tất cả thiết bị',
      'Bạn có chắc chắn muốn đăng xuất tất cả thiết bị? Bạn sẽ phải đăng nhập lại trên tất cả thiết bị.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất tất cả',
          style: 'destructive',
          onPress: async () => {
            try {
              socket.emit('logout-all-devices');
              
              // Wait a bit then logout current device too
              setTimeout(async () => {
                await logout();
              }, 1000);
            } catch (error) {
              console.error('Error logging out all devices:', error);
              Alert.alert('Lỗi', 'Không thể đăng xuất tất cả thiết bị');
            }
          },
        },
      ]
    );
  };

  const getDeviceIcon = (platform) => {
    switch (platform) {
      case 'ios':
        return 'phone-portrait-outline';
      case 'android':
        return 'phone-portrait-outline';
      case 'web':
        return 'desktop-outline';
      default:
        return 'hardware-chip-outline';
    }
  };

  const getDeviceName = (device) => {
    // Use deviceName if available (from expo-device)
    if (device.deviceName && device.deviceName !== 'null' && device.deviceName.trim() !== '') {
      return device.deviceName;
    }
    
    if (device.platform === 'web') {
      // Try to extract browser name from userAgent
      const ua = device.userAgent || '';
      if (ua.includes('Chrome') && !ua.includes('Edg')) {
        return 'Chrome (Website)';
      } else if (ua.includes('Firefox')) {
        return 'Firefox (Website)';
      } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
        return 'Safari (Website)';
      } else if (ua.includes('Edg')) {
        return 'Edge (Website)';
      } else if (ua.includes('Opera') || ua.includes('OPR')) {
        return 'Opera (Website)';
      }
      return 'Trình duyệt web';
    } else if (device.platform === 'ios') {
      // Try to extract device model from userAgent
      const ua = device.userAgent || '';
      if (ua.includes('iPhone')) {
        // Extract iPhone model if possible
        const modelMatch = ua.match(/iPhone(\d+,\d+)/);
        if (modelMatch) {
          return `iPhone ${modelMatch[1]}`;
        }
        return 'iPhone';
      } else if (ua.includes('iPad')) {
        const modelMatch = ua.match(/iPad(\d+,\d+)/);
        if (modelMatch) {
          return `iPad ${modelMatch[1]}`;
        }
        return 'iPad';
      }
      return 'iOS Device';
    } else if (device.platform === 'android') {
      // Try to extract device info from userAgent
      const ua = device.userAgent || '';
      // Extract device model from userAgent (format: "SM-XXX" for Samsung, etc.)
      const modelMatch = ua.match(/\(([^)]+)\)/);
      if (modelMatch && modelMatch[1]) {
        const modelInfo = modelMatch[1];
        // Try to extract brand and model
        if (modelInfo.includes('SM-') || modelInfo.includes('Samsung')) {
          const samsungMatch = modelInfo.match(/SM-([A-Z0-9]+)/);
          if (samsungMatch) {
            return `Samsung ${samsungMatch[1]}`;
          }
          return 'Samsung';
        } else if (modelInfo.includes('Mi ') || modelInfo.includes('Xiaomi')) {
          return 'Xiaomi';
        } else if (modelInfo.includes('OPPO')) {
          return 'OPPO';
        } else if (modelInfo.includes('Vivo')) {
          return 'Vivo';
        } else if (modelInfo.includes('Huawei')) {
          return 'Huawei';
        } else if (modelInfo.includes('OnePlus')) {
          return 'OnePlus';
        }
        // Return the model info if found
        return modelInfo.split(';')[0].trim();
      }
      return 'Android';
    }
    return 'Thiết bị';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Không rõ';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const isCurrentDevice = (device) => {
    return device.socketId === socket?.id || 
           device.deviceId === currentDeviceId ||
           (device.platform === Constants.platform?.ios ? 'ios' : 
            Constants.platform?.android ? 'android' : 'web') === device.platform;
  };

  if (loading && devices.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface || theme.background }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Đang tải...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[theme.primary]}
          tintColor={theme.primary}
        />
      }
    >
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.text }]}>Thiết bị đang đăng nhập</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {devices.length} thiết bị
        </Text>
      </View>

      {devices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="phone-portrait-outline" size={64} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Không có thiết bị nào đang đăng nhập
          </Text>
        </View>
      ) : (
        <>
          {devices.map((device, index) => {
            const isCurrent = isCurrentDevice(device);
            return (
              <View
                key={device.socketId || index}
                style={[styles.deviceItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={styles.deviceInfo}>
                  <View style={[styles.deviceIconContainer, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons
                      name={getDeviceIcon(device.platform)}
                      size={24}
                      color={theme.primary}
                    />
                  </View>
                  <View style={styles.deviceDetails}>
                    <View style={styles.deviceHeader}>
                      <Text style={[styles.deviceName, { color: theme.text }]}>
                        {getDeviceName(device)}
                      </Text>
                      {isCurrent && (
                        <View style={[styles.currentBadge, { backgroundColor: theme.primary }]}>
                          <Text style={styles.currentBadgeText}>Thiết bị này</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.deviceMetaRow}>
                      <View style={[styles.platformBadge, { 
                        backgroundColor: device.platform === 'web' ? '#E3F2FD' : device.platform === 'ios' ? '#F3E5F5' : '#E8F5E9',
                      }]}>
                        <Text style={[styles.platformBadgeText, {
                          color: device.platform === 'web' ? '#1976D2' : device.platform === 'ios' ? '#7B1FA2' : '#388E3C'
                        }]}>
                          {device.platform === 'web' ? '🌐 Website' : device.platform === 'ios' ? '📱 iOS' : '📱 Android'}
                        </Text>
                      </View>
                      <Text style={[styles.deviceMeta, { color: theme.textSecondary }]}>
                        {formatDate(device.lastSeen || device.connectedAt)}
                      </Text>
                    </View>
                    {device.userAgent && device.platform === 'web' && (
                      <Text style={[styles.deviceUserAgent, { color: theme.textMuted }]} numberOfLines={1}>
                        {device.userAgent}
                      </Text>
                    )}
                  </View>
                </View>
                {!isCurrent && (
                  <TouchableOpacity
                    style={[styles.logoutButton, { borderColor: theme.error }]}
                    onPress={() => handleLogoutDevice(device.socketId)}
                  >
                    <Ionicons name="log-out-outline" size={18} color={theme.error} />
                    <Text style={[styles.logoutButtonText, { color: theme.error }]}>Đăng xuất</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          <View style={[styles.footer, { backgroundColor: theme.surface }]}>
            <TouchableOpacity
              style={[styles.logoutAllButton, { backgroundColor: theme.error }]}
              onPress={handleLogoutAllDevices}
            >
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              <Text style={styles.logoutAllButtonText}>Đăng xuất tất cả thiết bị</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  deviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  platformBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  platformBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deviceMeta: {
    fontSize: 13,
  },
  deviceUserAgent: {
    fontSize: 11,
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    marginTop: 24,
    marginBottom: 24,
  },
  logoutAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  logoutAllButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginDevicesScreen;

