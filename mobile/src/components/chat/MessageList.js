import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import MessageItem from './MessageItem';

const MessageList = React.forwardRef(({ messages, user, nicknames, messageReactions, onLongPress, onAddReaction }, ref) => {
  const renderItem = ({ item }) => (
    <MessageItem
      item={item}
      user={user}
      nicknames={nicknames}
      messageReactions={messageReactions[item._id || item.id]}
      onLongPress={onLongPress}
      onAddReaction={onAddReaction}
    />
  );

  return (
    <FlatList
      ref={ref}
      data={messages}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      contentContainerStyle={styles.messagesList}
      initialNumToRender={20}
      maxToRenderPerBatch={10}
      windowSize={11}
      removeClippedSubviews={true}
      getItemLayout={(data, index) => (
        { length: 100, offset: 100 * index, index }
      )}
    />
  );
});

const styles = StyleSheet.create({
  messagesList: {
    padding: 16,
  },
});

export default MessageList;

