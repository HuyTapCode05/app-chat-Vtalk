import React, { memo, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { REACTIONS } from '../utils/constants';

/**
 * QuickReactions Component
 * Quick reaction picker for messages
 */
const QuickReactions = memo(({ visible, onReaction, onClose, position, messageReactions = {}, currentUserId, messageId }) => {
  if (!visible) return null;

  const handleReaction = useCallback(async (reaction) => {
    if (onReaction) {
      await onReaction(reaction);
    }
    if (onClose) {
      onClose();
    }
  }, [onReaction, onClose]);

  if (!position) return null;

  return (
    <View style={[styles.container, { top: position.y - 60, left: Math.max(10, position.x - 100) }]}>
      <View style={styles.reactionsContainer}>
        {REACTIONS.map((reaction) => {
          const hasReacted = messageReactions[reaction]?.includes(currentUserId);
          return (
            <TouchableOpacity
              key={reaction}
              style={[styles.reactionButton, hasReacted && styles.reactionButtonActive]}
              onPress={() => handleReaction(reaction)}
            >
              <Text style={styles.reactionEmoji}>{reaction}</Text>
              {messageReactions[reaction] && messageReactions[reaction].length > 0 && (
                <View style={styles.reactionCount}>
                  <Text style={styles.reactionCountText}>
                    {messageReactions[reaction].length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  reactionsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reactionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    backgroundColor: '#f0f0f0',
  },
  reactionButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  reactionEmoji: {
    fontSize: 20,
  },
  reactionCount: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#00B14F',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  reactionCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default QuickReactions;

