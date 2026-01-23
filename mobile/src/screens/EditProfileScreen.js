import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../config/api';
import storage from '../utils/storage';
import { safeGoBack } from '../utils/helpers';

const EditProfileScreen = ({ navigation }) => {
  const { user, setUser } = useAuth();
  const { theme } = useTheme();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setUsername(user.username || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Lỗi', 'Tên không được để trống');
      return;
    }

    if (!username.trim()) {
      Alert.alert('Lỗi', 'Username không được để trống');
      return;
    }

    setLoading(true);
    try {
      const res = await api.put('/users/me', {
        fullName: fullName.trim(),
        username: username.trim(),
      });
      
      // Update user in context and storage
      const updatedUser = res.data;
      setUser(updatedUser);
      await storage.setItem('user', JSON.stringify(updatedUser));
      
      Alert.alert('Thành công', 'Đã cập nhật hồ sơ');
      safeGoBack(navigation, 'Profile');
    } catch (error) {
      const message = error.response?.data?.message || 'Không thể cập nhật hồ sơ';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.section, { borderBottomColor: theme.divider, backgroundColor: theme.card }]}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Tên đầy đủ</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Nhập tên đầy đủ"
          placeholderTextColor={theme.placeholder}
        />
      </View>

      <View style={[styles.section, { borderBottomColor: theme.divider, backgroundColor: theme.card }]}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Username</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
          value={username}
          onChangeText={setUsername}
          placeholder="Nhập username"
          autoCapitalize="none"
          placeholderTextColor={theme.placeholder}
        />
      </View>

      <View style={[styles.section, { borderBottomColor: theme.divider, backgroundColor: theme.card }]}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
        <TextInput
          style={[
            styles.input,
            styles.disabledInput,
            { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textMuted },
          ]}
          value={user?.email || ''}
          editable={false}
        />
        <Text style={[styles.hint, { color: theme.textSecondary }]}>Email không thể thay đổi</Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: theme.primary }, loading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  disabledInput: {
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;

