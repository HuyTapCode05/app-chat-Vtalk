import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
} from 'react-native';
import { getImageUrl, getFirstChar } from '../utils/helpers';
import { COLORS } from '../utils/constants';

/**
 * MentionOverlay Component
 * Shows list of members to mention when @ is typed
 */
export const MentionOverlay = ({
  visible,
  members = [],
  searchText = '',
  onSelectMember,
  onSearchChange,
  theme,
  isDarkMode,
}) => {
  if (!visible || !members.length) {
    return null;
  }

  // Filter members based on search text
  const filteredMembers = useMemo(() => {
    if (!searchText.trim()) return members;
    
    const query = searchText.toLowerCase().trim();
    return members.filter(member => {
      const name = member.username || member.name || '';
      const displayName = member.fullName || member.displayName || '';
      return (
        name.toLowerCase().includes(query) ||
        displayName.toLowerCase().includes(query)
      );
    });
  }, [members, searchText]);

  const renderMember = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.memberItem,
        { backgroundColor: theme?.card || (isDarkMode ? '#2D2D2D' : '#F5F5F5') }
      ]}
      onPress={() => onSelectMember(item)}
    >
      {item.avatar ? (
        <Image
          source={{ uri: getImageUrl(item.avatar) }}
          style={styles.avatar}
        />
      ) : (
        <View 
          style={[
            styles.avatar,
            { backgroundColor: COLORS.PRIMARY }
          ]}
        >
          <Text style={styles.avatarText}>
            {getFirstChar(item.username || item.name || 'U')}
          </Text>
        </View>
      )}
      
      <View style={styles.memberInfo}>
        <Text 
          style={[
            styles.memberName,
            { color: theme?.text || (isDarkMode ? '#FFFFFF' : '#000000') }
          ]}
          numberOfLines={1}
        >
          {String(item.username || item.name || 'User')}
        </Text>
        {(item.fullName || item.displayName) && (
          <Text 
            style={[
              styles.memberFullName,
              { color: theme?.textSecondary || (isDarkMode ? '#999999' : '#666666') }
            ]}
            numberOfLines={1}
          >
            {String(item.fullName || item.displayName || '')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[
      styles.container,
      { backgroundColor: theme?.background || (isDarkMode ? '#121212' : '#FFFFFF') }
    ]}>
      {/* Search input for mentions */}
      <TextInput
        style={[
          styles.searchInput,
          {
            backgroundColor: theme?.inputBackground || (isDarkMode ? '#2D2D2D' : '#F5F5F5'),
            color: theme?.text || (isDarkMode ? '#FFFFFF' : '#000000'),
            borderColor: theme?.border || (isDarkMode ? '#404040' : '#E0E0E0')
          }
        ]}
        placeholder="Tìm kiếm thành viên..."
        placeholderTextColor={theme?.placeholder || (isDarkMode ? '#666666' : '#999999')}
        value={searchText}
        onChangeText={onSearchChange}
      />

      {/* Members list */}
      {filteredMembers.length > 0 ? (
        <FlatList
          data={filteredMembers}
          renderItem={renderMember}
          keyExtractor={(item, index) => `${item.id || item._id || index}`}
          scrollEnabled
          style={styles.list}
          nestedScrollEnabled
          maxHeight={300}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text 
            style={[
              styles.emptyText,
              { color: theme?.textSecondary || (isDarkMode ? '#999999' : '#666666') }
            ]}
          >
            Không tìm thấy thành viên
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    maxHeight: 350,
    paddingTop: 8,
  },
  searchInput: {
    marginHorizontal: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 5,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 5,
    marginBottom: 8,
    borderRadius: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberFullName: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
  },
});

export default MentionOverlay;

