import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Pressable, Platform, LogBox } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';

// Suppress known warnings that don't affect functionality
if (LogBox) {
  LogBox.ignoreLogs([
    /expo-av/, // expo-av deprecated warning (will migrate to expo-audio/expo-video later)
    /expo-notifications/, // expo-notifications limitations in Expo Go (expected behavior)
    /Android Push notifications/, // Push notifications require development build
    /expo-notifications functionality is not fully supported/, // Expected in Expo Go
    /development build/, // Development build warnings
  ]);
  
  // Also ignore all warnings in production (optional)
  if (__DEV__) {
    // In development, we still want to see important warnings
    // but suppress the known ones above
  }
}
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import ErrorBoundary from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import VerifyEmailScreen from './src/screens/VerifyEmailScreen';
import ChatScreen from './src/screens/ChatScreen';
import ConversationsScreen from './src/screens/ConversationsScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SecurityScreen from './src/screens/SecurityScreen';
import HelpScreen from './src/screens/HelpScreen';
import PersonalPageScreen from './src/screens/PersonalPageScreen';
import CallScreen from './src/screens/CallScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import CreateStoryScreen from './src/screens/CreateStoryScreen';
import StoryViewer from './src/screens/StoryViewer';
import AdminScreen from './src/screens/AdminScreen';
import IncomingCallHandler from './src/components/IncomingCallHandler';
import { COLORS } from './src/utils/constants';
import notificationService from './src/services/notificationService';

// Web-compatible button component for header
const HeaderButton = ({ onPress, children, style }) => {
  const handlePress = (e) => {
    console.log('🔘 HeaderButton pressed', { hasEvent: !!e, onPressDefined: !!onPress });
    if (onPress) {
      onPress(e);
    } else {
      console.error('❌ onPress is null/undefined');
    }
  };

  // Use Pressable for both web and native to avoid View onClick quirks
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        {
          padding: 8,
          cursor: Platform.OS === 'web' ? 'pointer' : undefined,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          zIndex: 10,
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
    >
      {children}
    </Pressable>
  );
};

// Header Right Component with navigation - using useNavigation hook
const HeaderRight = ({ routeName }) => {
  const navigation = useNavigation();
  
  console.log('🔍 HeaderRight rendered:', { 
    routeName, 
    hasNavigation: !!navigation, 
    navigationType: typeof navigation,
    navigationMethods: navigation ? Object.keys(navigation) : []
  });
  
  return (
    <View 
      style={{ flexDirection: 'row', marginRight: 8 }}
      pointerEvents="box-none"
    >
      {routeName === 'Messages' && (
        <>
          <HeaderButton
            style={{ marginRight: 12 }}
            onPress={() => {
              console.log('📱 CreateGroup button clicked');
              navigation?.navigate('CreateGroup');
            }}
          >
            <Ionicons name="people" size={24} color="#fff" />
          </HeaderButton>
          <HeaderButton
            style={{ marginRight: 12 }}
            onPress={() => {
              console.log('📱 Contacts button clicked');
              navigation?.navigate('Contacts');
            }}
          >
            <Ionicons name="person-add" size={24} color="#fff" />
          </HeaderButton>
        </>
      )}
      {routeName === 'Groups' && (
        <HeaderButton
          style={{ marginRight: 12 }}
          onPress={() => {
            console.log('📱 CreateGroup button clicked');
            navigation?.navigate('CreateGroup');
          }}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
        </HeaderButton>
      )}
      <HeaderButton
        onPress={(e) => {
          console.log('📱 Menu 3 chấm clicked', { hasEvent: !!e });
          console.log('   navigation methods:', navigation ? Object.keys(navigation) : []);

          const navigateProfile = () => {
            // Try tab jump first
            if (navigation?.jumpTo) {
              console.log('🔄 Using jumpTo(Profile)');
              navigation.jumpTo('Profile');
              return true;
            }
            // Try tab navigate
            if (navigation?.navigate) {
              console.log('🔄 Using navigate(Profile)');
              navigation.navigate('Profile');
              return true;
            }
            return false;
          };

          try {
            let handled = navigateProfile();
            if (!handled) {
              const parentNav = navigation?.getParent?.();
              console.log('   parent navigation methods:', parentNav ? Object.keys(parentNav) : []);
              if (parentNav?.navigate) {
                console.log('🔄 Using parent navigate(MainTabs/Profile)');
                parentNav.navigate('MainTabs', { screen: 'Profile' });
                handled = true;
              }
            }
            if (!handled) {
              console.error('❌ No navigation method succeeded for Profile');
            }
          } catch (error) {
            console.error('❌ Navigation error:', error);
          }
        }}
      >
        <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
      </HeaderButton>
    </View>
  );
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator - Main Navigation (like Zalo)
function MainTabsNavigator() {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Contacts') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Groups') {
            iconName = focused ? 'people-circle' : 'people-circle-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.tabBarBackground,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: theme.headerBackground,
        },
        headerTintColor: theme.headerText,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => <HeaderRight routeName={route.name} />,
      })}
    >
      <Tab.Screen 
        name="Messages" 
        component={ConversationsScreen}
        options={{ title: 'Tin Nhắn' }}
      />
      <Tab.Screen 
        name="Contacts" 
        component={ContactsScreen}
        options={{ title: 'Danh Bạ' }}
      />
      <Tab.Screen 
        name="Groups" 
        component={GroupsScreen}
        options={{ title: 'Nhóm' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Cá Nhân' }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  // Initialize notifications when user is logged in
  useEffect(() => {
    if (user && !loading) {
      notificationService.initialize();
    }
    
    return () => {
      notificationService.cleanup();
    };
  }, [user, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <Text style={{ color: theme.text }}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <IncomingCallHandler />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.headerBackground,
          },
          headerTintColor: theme.headerText,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen}
              options={{ title: 'Đăng Ký' }}
            />
            <Stack.Screen 
              name="VerifyEmail" 
              component={VerifyEmailScreen}
              options={{ title: 'Xác thực Email', headerShown: false }}
            />
          </>
        ) : user.emailVerified === false || user.emailVerified === 0 ? (
          <>
            {/* User logged in but email not verified - show verification screen */}
            <Stack.Screen 
              name="VerifyEmail" 
              component={VerifyEmailScreen}
              options={{ 
                title: 'Xác thực Email', 
                headerShown: false,
                gestureEnabled: false,
                headerLeft: null
              }}
            />
          </>
        ) : (
          <>
            {/* Bottom Tab Navigator - Main Navigation */}
            <Stack.Screen 
              name="MainTabs" 
              component={MainTabsNavigator}
              options={{ headerShown: false }}
            />
            
            {/* Stack Screens - Detail Screens */}
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={({ route }) => ({
                title: route.params?.conversationName || 'Chat',
              })}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{ title: 'Hồ sơ' }}
            />
            <Stack.Screen 
              name="EditProfile" 
              component={EditProfileScreen}
              options={{ title: 'Chỉnh sửa hồ sơ' }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ title: 'Thông báo' }}
            />
            <Stack.Screen 
              name="Security" 
              component={SecurityScreen}
              options={{ title: 'Bảo mật' }}
            />
            <Stack.Screen 
              name="Help" 
              component={HelpScreen}
              options={{ title: 'Trợ giúp' }}
            />
            <Stack.Screen 
              name="PersonalPage" 
              component={PersonalPageScreen}
              options={{ title: 'Trang cá nhân' }}
            />
            <Stack.Screen 
              name="Call" 
              component={CallScreen}
              options={{ 
                headerShown: false,
                gestureEnabled: false,
                presentation: 'modal'
              }}
            />
            <Stack.Screen 
              name="CreateGroup" 
              component={CreateGroupScreen}
              options={{ title: 'Tạo nhóm' }}
            />
            <Stack.Screen 
              name="CreateStory" 
              component={CreateStoryScreen}
              options={{ 
                headerShown: false,
                presentation: 'modal'
              }}
            />
            <Stack.Screen 
              name="StoryViewer" 
              component={StoryViewer}
              options={{ 
                headerShown: false,
                presentation: 'modal',
                gestureEnabled: true
              }}
            />
            <Stack.Screen 
              name="Admin" 
              component={AdminScreen}
              options={{ title: 'Quản trị' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <AppNavigator />
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

