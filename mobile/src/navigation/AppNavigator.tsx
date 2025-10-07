/**
 * App Navigator
 * Main navigation component for the mobile app
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAppSelector } from '../store/hooks';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Screens
import { AuthNavigator } from './AuthNavigator';
import { HomeScreen } from '../screens/HomeScreen';
import { MarketplaceScreen } from '../screens/MarketplaceScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { NFTScreen } from '../screens/NFTScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { CartScreen } from '../screens/CartScreen';
import { SocialScreen } from '../screens/SocialScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { NFTDetailScreen } from '../screens/NFTDetailScreen';
import { CollectionScreen } from '../screens/CollectionScreen';
import { CreatorScreen } from '../screens/CreatorScreen';
import { CreateNFTScreen } from '../screens/CreateNFTScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { NotificationScreen } from '../screens/NotificationScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tab Navigator
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Marketplace':
              iconName = 'store';
              break;
            case 'Search':
              iconName = 'search';
              break;
            case 'Social':
              iconName = 'people';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#E60012',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Social" component={SocialScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Main Stack Navigator
const MainStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="NFT" component={NFTScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="NFTDetail" component={NFTDetailScreen} />
      <Stack.Screen name="Collection" component={CollectionScreen} />
      <Stack.Screen name="Creator" component={CreatorScreen} />
      <Stack.Screen name="CreateNFT" component={CreateNFTScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
    </Stack.Navigator>
  );
};

// Main App Navigator
export const AppNavigator = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isLoading = useAppSelector((state) => state.auth.isLoading);

  if (isLoading) {
    return null; // Loading screen is handled by PersistGate
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainStackNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};
