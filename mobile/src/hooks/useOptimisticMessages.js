import { useState, useCallback, useRef } from 'react';
import optimisticUpdates from '../utils/optimisticUpdates';

export const useOptimisticMessages = (conversationId, onMessageSent) => {
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const tempIdCounter = useRef(0);

  const addOptimisticMessage = useCallback((messageData, sendFn) => {
    const tempId = `temp_${Date.now()}_${tempIdCounter.current++}`;
    
    const optimisticMessage = {
      _id: tempId,
      ...messageData,
      isOptimistic: true,
      status: 'sending',
      createdAt: new Date().toISOString()
    };

    setOptimisticMessages(prev => [...prev, optimisticMessage]);

    const updateId = optimisticUpdates.add(tempId, optimisticMessage, async (data) => {
      const result = await sendFn(data);
      
      setOptimisticMessages(prev => 
        prev.map(msg => 
          msg._id === tempId 
            ? { ...result, isOptimistic: false, status: 'sent' }
            : msg
        )
      );

      if (onMessageSent) {
        onMessageSent(result);
      }

      return result;
    });

    optimisticUpdates.onUpdate(updateId, (id, event, data) => {
      if (event === 'synced') {
        setOptimisticMessages(prev => 
          prev.map(msg => 
            msg._id === id 
              ? { ...msg, status: 'sent', isOptimistic: false }
              : msg
          )
        );
      } else if (event === 'failed') {
        setOptimisticMessages(prev => 
          prev.map(msg => 
            msg._id === id 
              ? { ...msg, status: 'failed', error: data.error }
              : msg
          )
        );
      }
    });

    return tempId;
  }, [conversationId, onMessageSent]);

  const removeOptimisticMessage = useCallback((tempId) => {
    setOptimisticMessages(prev => prev.filter(msg => msg._id !== tempId));
    optimisticUpdates.remove(tempId);
  }, []);

  const clearOptimisticMessages = useCallback(() => {
    optimisticMessages.forEach(msg => {
      if (msg.isOptimistic) {
        optimisticUpdates.remove(msg._id);
      }
    });
    setOptimisticMessages([]);
  }, [optimisticMessages]);

  return {
    optimisticMessages,
    addOptimisticMessage,
    removeOptimisticMessage,
    clearOptimisticMessages
  };
};

