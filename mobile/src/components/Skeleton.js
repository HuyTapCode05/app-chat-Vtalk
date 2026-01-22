/**
 * Skeleton Component with Shimmer Effect
 * Beautiful loading placeholder with animated shimmer
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const Shimmer = ({ style, children }) => {
  const { theme, isDarkMode } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.8, 0.2],
  });

  const baseColor = isDarkMode ? '#2D2D2D' : '#E0E0E0';
  const highlightColor = isDarkMode ? '#404040' : '#F0F0F0';

  return (
    <View style={[styles.container, style, { backgroundColor: baseColor, overflow: 'hidden' }]}>
      {children}
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
            opacity,
            backgroundColor: highlightColor,
          },
        ]}
      />
    </View>
  );
};

export const SkeletonBox = ({ width, height, borderRadius = 8, style }) => {
  const { theme, isDarkMode } = useTheme();
  const baseColor = isDarkMode ? '#2D2D2D' : '#E0E0E0';

  return (
    <Shimmer style={[{ width, height, borderRadius }, style]}>
      <View style={[styles.box, { backgroundColor: baseColor, borderRadius }]} />
    </Shimmer>
  );
};

export const SkeletonCircle = ({ size = 50, style }) => {
  const { theme, isDarkMode } = useTheme();
  const baseColor = isDarkMode ? '#2D2D2D' : '#E0E0E0';

  return (
    <Shimmer style={[{ width: size, height: size, borderRadius: size / 2 }, style]}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: baseColor }]} />
    </Shimmer>
  );
};

export const SkeletonText = ({ width = '100%', height = 16, style, lines = 1 }) => {
  if (lines === 1) {
    return <SkeletonBox width={width} height={height} borderRadius={4} style={style} />;
  }

  return (
    <View style={styles.textContainer}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBox
          key={index}
          width={index === lines - 1 ? width * 0.7 : width}
          height={height}
          borderRadius={4}
          style={[styles.textLine, { marginBottom: index < lines - 1 ? 8 : 0 }, style]}
        />
      ))}
    </View>
  );
};

// Conversation Item Skeleton
export const ConversationSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.conversationItem, { backgroundColor: theme.card }]}>
      <SkeletonCircle size={56} />
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <SkeletonText width={120} height={18} />
          <SkeletonBox width={50} height={14} borderRadius={4} />
        </View>
        <SkeletonText width={200} height={16} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
};

// Contact Item Skeleton
export const ContactSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.contactItem, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
      <SkeletonCircle size={50} />
      <View style={styles.contactContent}>
        <SkeletonText width={150} height={18} />
        <SkeletonText width={100} height={14} style={{ marginTop: 6 }} />
      </View>
      <View style={styles.actionButtons}>
        <SkeletonBox width={36} height={36} borderRadius={18} />
        <SkeletonBox width={36} height={36} borderRadius={18} />
      </View>
    </View>
  );
};

// Group Item Skeleton
export const GroupSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.groupItem, { backgroundColor: theme.card }]}>
      <SkeletonCircle size={50} />
      <View style={styles.groupContent}>
        <View style={styles.groupHeader}>
          <SkeletonText width={140} height={18} />
          <SkeletonBox width={50} height={14} borderRadius={4} />
        </View>
        <SkeletonText width={180} height={16} style={{ marginTop: 6 }} />
        <SkeletonText width={80} height={14} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
};

// Message Skeleton
export const MessageSkeleton = ({ isOwn = false }) => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.messageContainer, isOwn && styles.messageOwn]}>
      {!isOwn && <SkeletonCircle size={32} style={{ marginRight: 8 }} />}
      <View style={[styles.messageBubble, { backgroundColor: theme.card }]}>
        <SkeletonText width={Math.random() * 100 + 100} height={16} lines={Math.floor(Math.random() * 2) + 1} />
      </View>
    </View>
  );
};

// Post Skeleton
export const PostSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.postContainer, { backgroundColor: theme.card }]}>
      <View style={styles.postHeader}>
        <SkeletonCircle size={40} />
        <View style={styles.postHeaderContent}>
          <SkeletonText width={120} height={16} />
          <SkeletonText width={80} height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
      <SkeletonText width="100%" height={16} lines={3} style={{ marginTop: 12 }} />
      <SkeletonBox width="100%" height={200} borderRadius={8} style={{ marginTop: 12 }} />
      <View style={styles.postActions}>
        <SkeletonBox width={60} height={24} borderRadius={4} />
        <SkeletonBox width={60} height={24} borderRadius={4} />
        <SkeletonBox width={60} height={24} borderRadius={4} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  box: {
    width: '100%',
    height: '100%',
  },
  circle: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    width: '100%',
  },
  textLine: {
    marginBottom: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  groupItem: {
    flexDirection: 'row',
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  groupContent: {
    flex: 1,
    marginLeft: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  messageOwn: {
    flexDirection: 'row-reverse',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '75%',
  },
  postContainer: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postHeaderContent: {
    marginLeft: 12,
    flex: 1,
  },
  postActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
});

export default Shimmer;

