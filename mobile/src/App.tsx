import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './providers/AuthProvider';
import { NotificationProvider } from './providers/NotificationProvider';
import { WalletProvider } from './providers/WalletProvider';
import { persistor, store } from './store';
import { theme } from './theme';

const App: React.FC = () => {
    useEffect(() => {
        // Set status bar style
        StatusBar.setBarStyle('dark-content');
        if (Platform.OS === 'android') {
            StatusBar.setBackgroundColor('#ffffff');
        }
    }, []);

    return (
        <ErrorBoundary>
            <Provider store={store}>
                <PersistGate loading={<SplashScreen />} persistor={persistor}>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                        <SafeAreaProvider>
                            <PaperProvider theme={theme}>
                                <NavigationContainer>
                                    <AuthProvider>
                                        <WalletProvider>
                                            <NotificationProvider>
                                                <AppNavigator />
                                            </NotificationProvider>
                                        </WalletProvider>
                                    </AuthProvider>
                                </NavigationContainer>
                            </PaperProvider>
                        </SafeAreaProvider>
                    </GestureHandlerRootView>
                </PersistGate>
            </Provider>
        </ErrorBoundary>
    );
};

export default App;
