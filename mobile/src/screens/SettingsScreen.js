import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const SettingsScreen = ({ navigation }) => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Theme Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Giao diện</Text>
        
        <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
          <View style={styles.settingInfo}>
            <Ionicons name={isDarkMode ? "moon" : "sunny"} size={24} color={theme.primary} />
            <View style={styles.settingText}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Chế độ tối</Text>
              <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                {isDarkMode ? 'Đang sử dụng giao diện tối' : 'Đang sử dụng giao diện sáng'}
              </Text>
            </View>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Thông báo</Text>
        
        <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications-outline" size={24} color={theme.primary} />
            <View style={styles.settingText}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Bật thông báo</Text>
              <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                Nhận thông báo khi có tin nhắn mới
              </Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
          <View style={styles.settingInfo}>
            <Ionicons name="volume-high-outline" size={24} color={theme.primary} />
            <View style={styles.settingText}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Âm thanh</Text>
              <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                Phát âm thanh khi có thông báo
              </Text>
            </View>
          </View>
          <Switch
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={soundEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
          <View style={styles.settingInfo}>
            <Ionicons name="phone-portrait-outline" size={24} color={theme.primary} />
            <View style={styles.settingText}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Rung</Text>
              <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                Rung khi có thông báo
              </Text>
            </View>
          </View>
          <Switch
            value={vibrationEnabled}
            onValueChange={setVibrationEnabled}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={vibrationEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 16,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default SettingsScreen;

