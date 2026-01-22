import React, { createContext, useContext, useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import storage from '../utils/storage';
import { logger } from '../utils/logger';

// Theme Configuration
export const THEMES = {
  light: {
    // Main colors - Green theme
    primary: '#00B14F',
    primaryDark: '#008037',
    primaryLight: '#E6F9EE',
    
    // Background colors
    background: '#F2F2F7',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    
    // Text colors
    text: '#000000',
    textSecondary: '#8E8E93',
    textMuted: '#C7C7CC',
    
    // Border and separator
    border: '#E5E5EA',
    divider: '#F2F2F7',
    
    // Status colors
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#007AFF',
    
    // Chat specific
    messageOwn: '#00B14F',
    messageOther: '#E5E5EA',
    messageOwnText: '#FFFFFF',
    messageOtherText: '#000000',
    
    // Header
    headerBackground: '#00B14F',
    headerText: '#FFFFFF',
    
    // Tab bar
    tabBarBackground: '#FFFFFF',
    tabBarActive: '#00B14F',
    tabBarInactive: '#8E8E93',
    
    // Input
    inputBackground: '#F2F2F7',
    inputBorder: 'transparent',
    inputText: '#000000',
    placeholder: '#8E8E93',
    
    // Modal and overlay
    modalBackground: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.4)',
    
    // Shadow
    shadowColor: '#000000',
    
    // Additional UI elements
    onlineIndicator: '#34C759',
    unreadBadge: '#FF3B30',
  },
  
  dark: {
    // Main colors
    primary: '#00B14F',
    primaryDark: '#008037',
    primaryLight: '#1B3B1F',
    
    // Background colors
    background: '#000000',
    surface: '#1C1C1E',
    card: '#1C1C1E',
    
    // Text colors
    text: '#FFFFFF',
    textSecondary: '#8D8D93',
    textMuted: '#48484A',
    
    // Border and separator
    border: '#38383A',
    divider: '#2C2C2E',
    
    // Status colors
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    info: '#0A84FF',
    
    // Chat specific
    messageOwn: '#00B14F',
    messageOther: '#2C2C2E',
    messageOwnText: '#FFFFFF',
    messageOtherText: '#FFFFFF',
    
    // Header
    headerBackground: '#1E1E1E',
    headerText: '#FFFFFF',
    
    // Tab bar
    tabBarBackground: '#1E1E1E',
    tabBarActive: '#00B14F',
    tabBarInactive: '#8D8D93',
    
    // Input
    inputBackground: '#2C2C2E',
    inputBorder: 'transparent',
    inputText: '#FFFFFF',
    placeholder: '#8D8D93',
    
    // Modal and overlay
    modalBackground: '#1C1C1E',
    overlay: 'rgba(0, 0, 0, 0.6)',
    
    // Shadow
    shadowColor: '#000000',
    
    // Additional UI elements
    onlineIndicator: '#30D158',
    unreadBadge: '#FF453A',
  }
};

const ThemeContext = createContext();

const STORAGE_KEY = 'theme_preference';

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await storage.getItem(STORAGE_KEY);
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
        logger.info('Theme loaded:', savedTheme);
      } else {
        // Default to light mode
        setIsDarkMode(false);
        logger.info('No saved theme, defaulting to light mode');
      }
    } catch (error) {
      logger.error('Error loading theme preference:', error);
      setIsDarkMode(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await storage.setItem(STORAGE_KEY, newTheme ? 'dark' : 'light');
      logger.info('Theme switched to:', newTheme ? 'dark' : 'light');
    } catch (error) {
      logger.error('Error saving theme preference:', error);
    }
  };

  const setTheme = async (theme) => {
    try {
      const isDark = theme === 'dark';
      setIsDarkMode(isDark);
      await storage.setItem(STORAGE_KEY, theme);
      logger.info('Theme set to:', theme);
    } catch (error) {
      logger.error('Error setting theme:', error);
    }
  };

  const currentTheme = isDarkMode ? THEMES.dark : THEMES.light;
  const themeName = isDarkMode ? 'dark' : 'light';

  const value = {
    isDarkMode,
    theme: currentTheme,
    themeName,
    toggleTheme,
    setTheme,
    loading,
  };

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={currentTheme.headerBackground} />
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;