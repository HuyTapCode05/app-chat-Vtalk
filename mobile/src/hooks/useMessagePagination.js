import { useState, useCallback, useRef } from 'react';
import api from '../config/api';

export const useMessagePagination = (conversationId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [prevCursor, setPrevCursor] = useState(null);
  const loadingRef = useRef(false);

  const loadInitialMessages = useCallback(async () => {
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    setLoading(true);

    try {
      const response = await api.get(`/messages/${conversationId}`, {
        params: {
          limit: 50,
          direction: 'backward'
        }
      });

      const { messages: newMessages, hasMore: more, nextCursor: next, prevCursor: prev } = response.data;
      
      setMessages(newMessages);
      setHasMore(more);
      setNextCursor(next);
      setPrevCursor(prev);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [conversationId]);

  const loadOlderMessages = useCallback(async () => {
    if (loadingRef.current || !hasMore || !nextCursor) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const response = await api.get(`/messages/${conversationId}`, {
        params: {
          cursor: nextCursor,
          limit: 50,
          direction: 'backward'
        }
      });

      const { messages: newMessages, hasMore: more, nextCursor: next } = response.data;
      
      setMessages(prev => [...newMessages, ...prev]);
      setHasMore(more);
      setNextCursor(next);
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [conversationId, hasMore, nextCursor]);

  const loadNewerMessages = useCallback(async () => {
    if (loadingRef.current || !prevCursor) return;

    loadingRef.current = true;

    try {
      const response = await api.get(`/messages/${conversationId}`, {
        params: {
          cursor: prevCursor,
          limit: 50,
          direction: 'forward'
        }
      });

      const { messages: newMessages, prevCursor: prev } = response.data;
      
      setMessages(prev => [...prev, ...newMessages]);
      setPrevCursor(prev);
    } catch (error) {
      console.error('Error loading newer messages:', error);
    } finally {
      loadingRef.current = false;
    }
  }, [conversationId, prevCursor]);

  const addMessage = useCallback((message) => {
    setMessages(prev => {
      if (prev.some(m => m._id === message._id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  const updateMessage = useCallback((messageId, updates) => {
    setMessages(prev => 
      prev.map(msg => 
        msg._id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  const removeMessage = useCallback((messageId) => {
    setMessages(prev => prev.filter(msg => msg._id !== messageId));
  }, []);

  return {
    messages,
    loading,
    hasMore,
    loadInitialMessages,
    loadOlderMessages,
    loadNewerMessages,
    addMessage,
    updateMessage,
    removeMessage
  };
};

