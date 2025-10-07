/**
 * Soladia Marketplace - React Native Mobile App
 * Main App component with navigation and state management
 */

import React, { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import SplashScreen from 'react-native-splash-screen';

import { store, persistor } from './src/store';
import { theme } from './src/theme';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { WalletProvider } from './src/contexts/WalletContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { LoadingScreen } from './src/components/LoadingScreen';
import { NetworkStatus } from './src/components/NetworkStatus';
import { BiometricAuth } from './src/components/BiometricAuth';

const App: React.FC = () => {
  useEffect(() => {
    // Hide splash screen after app is loaded
    SplashScreen.hide();
  }, []);

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <PaperProvider theme={theme}>
            <AuthProvider>
              <WalletProvider>
                <NotificationProvider>
                  <NavigationContainer>
                    <StatusBar
                      barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
                      backgroundColor={theme.colors.primary}
                    />
                    <NetworkStatus />
                    <BiometricAuth />
                    <AppNavigator />
                    <Toast />
                  </NavigationContainer>
                </NotificationProvider>
              </WalletProvider>
            </AuthProvider>
          </PaperProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
