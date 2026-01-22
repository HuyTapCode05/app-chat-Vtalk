import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const prefix = 'vtalk://';

export const getDeepLink = (path, params = {}) => {
  const url = Linking.createURL(path, { params });
  return url;
};

export const parseDeepLink = (url) => {
  try {
    const parsed = Linking.parse(url);
    return {
      scheme: parsed.scheme,
      hostname: parsed.hostname,
      path: parsed.path,
      queryParams: parsed.queryParams,
    };
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return null;
  }
};

export const handleConversationLink = (url, navigation) => {
  const parsed = parseDeepLink(url);
  if (!parsed) return false;

  if (parsed.path === 'chat' && parsed.queryParams?.conversationId) {
    const conversationId = parsed.queryParams.conversationId;
    navigation.navigate('Chat', {
      conversationId,
      conversationName: parsed.queryParams.name || 'Chat',
    });
    return true;
  }

  return false;
};

export const handleUserLink = (url, navigation) => {
  const parsed = parseDeepLink(url);
  if (!parsed) return false;

  if (parsed.path === 'user' && parsed.queryParams?.userId) {
    const userId = parsed.queryParams.userId;
    navigation.navigate('PersonalPage', { userId });
    return true;
  }

  return false;
};

export const setupDeepLinking = (navigation) => {
  Linking.getInitialURL().then(url => {
    if (url) {
      handleDeepLink(url, navigation);
    }
  });

  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url, navigation);
  });

  return () => {
    subscription.remove();
  };
};

const handleDeepLink = (url, navigation) => {
  console.log('🔗 Deep link received:', url);
  
  if (handleConversationLink(url, navigation)) {
    return;
  }
  
  if (handleUserLink(url, navigation)) {
    return;
  }
  
  console.warn('⚠️ Unhandled deep link:', url);
};

export const generateConversationLink = (conversationId, conversationName) => {
  return getDeepLink('chat', {
    conversationId,
    name: conversationName,
  });
};

export const generateUserLink = (userId) => {
  return getDeepLink('user', { userId });
};

