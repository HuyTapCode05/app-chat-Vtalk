const batchProcessor = require('./batchProcessor');
const storage = require('../storage/dbStorage');

class ReadReceiptBatch {
  constructor() {
    this.batchKey = 'read_receipts';
    this.setupProcessor();
  }

  setupProcessor() {
    batchProcessor.add(this.batchKey, null, async (items) => {
      const processed = new Set();
      
      // Filter out null/undefined items
      const validItems = items.filter(item => item && item.conversationId && item.messageId && item.userId);
      
      for (const item of validItems) {
        const key = `${item.conversationId}_${item.messageId}_${item.userId}`;
        if (processed.has(key)) continue;
        processed.add(key);

        try {
          await storage.messages.markMessageAsRead(
            item.messageId,
            item.conversationId,
            item.userId
          );
        } catch (error) {
          console.error(`Error marking message as read:`, error);
        }
      }

      if (processed.size > 0) {
        console.log(`✅ Processed ${processed.size} read receipts in batch`);
      }
    });
  }

  markAsRead(messageId, conversationId, userId) {
    batchProcessor.add(this.batchKey, {
      messageId,
      conversationId,
      userId,
      timestamp: Date.now()
    }, null);
  }

  async flush() {
    await batchProcessor.flush(this.batchKey);
  }
}

const readReceiptBatch = new ReadReceiptBatch();
module.exports = readReceiptBatch;

