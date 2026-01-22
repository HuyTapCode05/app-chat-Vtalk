const storage = require('../storage/dbStorage');

class MessagePagination {
  async getMessages(conversationId, options = {}) {
    const {
      limit = 50,
      cursor = null,
      direction = 'backward'
    } = options;

    const messages = await storage.messages.loadMessages(conversationId, false);
    
    if (messages.length === 0) {
      return {
        messages: [],
        hasMore: false,
        nextCursor: null,
        prevCursor: null
      };
    }

    messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let startIndex = 0;
    let endIndex = messages.length;

    if (cursor) {
      const cursorIndex = messages.findIndex(m => m._id === cursor);
      if (cursorIndex !== -1) {
        if (direction === 'backward') {
          startIndex = cursorIndex + 1;
          endIndex = Math.min(startIndex + limit, messages.length);
        } else {
          endIndex = cursorIndex;
          startIndex = Math.max(0, endIndex - limit);
        }
      }
    } else {
      endIndex = Math.min(limit, messages.length);
    }

    const result = messages.slice(startIndex, endIndex);
    result.reverse();

    return {
      messages: result,
      hasMore: direction === 'backward' ? startIndex + limit < messages.length : startIndex > 0,
      nextCursor: result.length > 0 ? result[result.length - 1]._id : null,
      prevCursor: result.length > 0 ? result[0]._id : null,
      total: messages.length
    };
  }

  async getMessagesAround(conversationId, messageId, limit = 25) {
    const messages = await storage.messages.loadMessages(conversationId, false);
    
    const messageIndex = messages.findIndex(m => m._id === messageId);
    if (messageIndex === -1) {
      return {
        messages: [],
        hasMore: false,
        nextCursor: null,
        prevCursor: null
      };
    }

    const beforeLimit = Math.floor(limit / 2);
    const afterLimit = Math.ceil(limit / 2);

    const startIndex = Math.max(0, messageIndex - beforeLimit);
    const endIndex = Math.min(messages.length, messageIndex + afterLimit + 1);

    const result = messages.slice(startIndex, endIndex);
    result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return {
      messages: result,
      hasMore: startIndex > 0 || endIndex < messages.length,
      nextCursor: endIndex < messages.length ? messages[endIndex]._id : null,
      prevCursor: startIndex > 0 ? messages[startIndex - 1]._id : null,
      centerMessageId: messageId
    };
  }
}

const messagePagination = new MessagePagination();
module.exports = messagePagination;

