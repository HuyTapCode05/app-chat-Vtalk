import React, { createContext, useContext, useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import storage from '../utils/storage';
import { logger } from '../utils/logger';

// Theme Configuration
export const THEMES = {
  light: {
    // Main colors
    primary: '#00B14F',
    primaryDark: '#008037',
    primaryLight: '#E6F9EE',
    
    // Background colors
    background: '#FFFFFF',
    surface: '#F5F5F5',
    card: '#FFFFFF',
    
    // Text colors
    text: '#000000',
    textSecondary: '#666666',
    textMuted: '#999999',
    
    // Border and separator
    border: '#E0E0E0',
    divider: '#F0F0F0',
    
    // Status colors
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    
    // Chat specific
    messageOwn: '#00B14F',
    messageOther: '#F0F0F0',
    messageOwnText: '#FFFFFF',
    messageOtherText: '#000000',
    
    // Header
    headerBackground: '#00B14F',
    headerText: '#FFFFFF',
    
    // Tab bar
    tabBarBackground: '#FFFFFF',
    tabBarActive: '#00B14F',
    tabBarInactive: '#999999',
    
    // Input
    inputBackground: '#F5F5F5',
    inputBorder: '#E0E0E0',
    inputText: '#000000',
    placeholder: '#999999',
    
    // Modal and overlay
    modalBackground: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    // Shadow
    shadowColor: '#000000',
  },
  
  dark: {
    // Main colors
    primary: '#00B14F',
    primaryDark: '#008037',
    primaryLight: '#1B3B1F',
    
    // Background colors
    background: '#121212',
    surface: '#1E1E1E',
    card: '#2D2D2D',
    
    // Text colors
    text: '#FFFFFF',
    textSecondary: '#B3B3B3',
    textMuted: '#666666',
    
    // Border and separator
    border: '#404040',
    divider: '#2D2D2D',
    
    // Status colors
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    
    // Chat specific
    messageOwn: '#00B14F',
    messageOther: '#2D2D2D',
    messageOwnText: '#FFFFFF',
    messageOtherText: '#FFFFFF',
    
    // Header
    headerBackground: '#1E1E1E',
    headerText: '#FFFFFF',
    
    // Tab bar
    tabBarBackground: '#1E1E1E',
    tabBarActive: '#00B14F',
    tabBarInactive: '#666666',
    
    // Input
    inputBackground: '#2D2D2D',
    inputBorder: '#404040',
    inputText: '#FFFFFF',
    placeholder: '#666666',
    
    // Modal and overlay
    modalBackground: '#2D2D2D',
    overlay: 'rgba(0, 0, 0, 0.8)',
    
    // Shadow
    shadowColor: '#000000',
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