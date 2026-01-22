const storage = require('../storage/dbStorage');
const { generalCache } = require('./advancedCache');

class MessageIndex {
  constructor() {
    this.indexCache = new Map();
    this.indexTTL = 5 * 60 * 1000;
  }

  async indexConversation(conversationId) {
    const cacheKey = `message_index_${conversationId}`;
    const cached = generalCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const messages = await storage.messages.loadMessages(conversationId, false);
    const index = {
      words: new Map(),
      messages: new Map()
    };

    messages.forEach(message => {
      if (message.type === 'text' && message.content) {
        const words = this.extractWords(message.content);
        const messageData = {
          id: message._id,
          content: message.content,
          words: words,
          sender: message.sender,
          createdAt: message.createdAt
        };

        index.messages.set(message._id, messageData);

        words.forEach(word => {
          if (!index.words.has(word)) {
            index.words.set(word, new Set());
          }
          index.words.get(word).add(message._id);
        });
      }
    });

    generalCache.set(cacheKey, index, this.indexTTL);
    this.indexCache.set(conversationId, index);

    return index;
  }

  extractWords(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => word.length < 50);
  }

  async search(conversationId, query) {
    const index = await this.indexConversation(conversationId);
    const queryWords = this.extractWords(query);

    if (queryWords.length === 0) {
      return [];
    }

    const messageIds = new Set();
    const wordMatches = new Map();

    queryWords.forEach(word => {
      const matches = index.words.get(word);
      if (matches) {
        matches.forEach(messageId => {
          messageIds.add(messageId);
          wordMatches.set(messageId, (wordMatches.get(messageId) || 0) + 1);
        });
      }
    });

    const sortedMessageIds = Array.from(messageIds).sort((a, b) => {
      return (wordMatches.get(b) || 0) - (wordMatches.get(a) || 0);
    });

    const results = sortedMessageIds.map(messageId => {
      return index.messages.get(messageId);
    }).filter(Boolean);

    return results;
  }

  clearIndex(conversationId) {
    this.indexCache.delete(conversationId);
    generalCache.clear(`message_index_${conversationId}`);
  }

  clearAll() {
    this.indexCache.clear();
    generalCache.clear('message_index_');
  }
}

const messageIndex = new MessageIndex();
module.exports = messageIndex;

