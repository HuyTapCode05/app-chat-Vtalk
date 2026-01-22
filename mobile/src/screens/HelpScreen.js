import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const HelpScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const handleContact = () => {
    Linking.openURL('mailto:support@zaloclone.com');
  };

  const faqs = [
    {
      question: 'Làm thế nào để bắt đầu chat?',
      answer: 'Vào màn hình Danh Bạ, chọn người bạn muốn chat và bắt đầu cuộc trò chuyện.',
    },
    {
      question: 'Làm thế nào để gửi ảnh?',
      answer: 'Trong màn hình chat, nhấn vào icon ảnh và chọn ảnh từ thư viện.',
    },
    {
      question: 'Làm thế nào để tìm kiếm cuộc trò chuyện?',
      answer: 'Sử dụng thanh tìm kiếm ở đầu màn hình Tin Nhắn để tìm theo tên hoặc nội dung tin nhắn.',
    },
    {
      question: 'Làm thế nào để đổi mật khẩu?',
      answer: 'Vào Hồ sơ > Bảo mật > Đổi mật khẩu.',
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.section, { borderBottomColor: theme.divider, backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Câu hỏi thường gặp</Text>
        
        {faqs.map((faq, index) => (
          <View key={index} style={[styles.faqItem, { borderBottomColor: theme.divider }]}>
            <Text style={[styles.faqQuestion, { color: theme.text }]}>{faq.question}</Text>
            <Text style={[styles.faqAnswer, { color: theme.textSecondary }]}>{faq.answer}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.section, { borderBottomColor: theme.divider, backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Liên hệ hỗ trợ</Text>
        
        <TouchableOpacity style={styles.contactItem} onPress={handleContact}>
          <Ionicons name="mail-outline" size={24} color={theme.primary} />
          <View style={styles.contactText}>
            <Text style={[styles.contactLabel, { color: theme.textSecondary }]}>Email hỗ trợ</Text>
            <Text style={[styles.contactValue, { color: theme.primary }]}>support@zaloclone.com</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { borderBottomColor: theme.divider, backgroundColor: theme.card }]}>
        <Text style={[styles.version, { color: theme.textSecondary }]}>Phiên bản 1.0.0</Text>
        <Text style={[styles.copyright, { color: theme.textMuted }]}>© 2024 VTalk. All rights reserved.</Text>
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
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  faqItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  contactText: {
    flex: 1,
    marginLeft: 16,
  },
  contactLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
  },
  version: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  copyright: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default HelpScreen;

