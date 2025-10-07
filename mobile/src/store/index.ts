/**
 * Redux Store Configuration
 * Centralized state management for the mobile app
 */

import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import reducers
import authReducer from './slices/authSlice';
import walletReducer from './slices/walletSlice';
import nftReducer from './slices/nftSlice';
import marketplaceReducer from './slices/marketplaceSlice';
import searchReducer from './slices/searchSlice';
import cartReducer from './slices/cartSlice';
import socialReducer from './slices/socialSlice';
import analyticsReducer from './slices/analyticsSlice';
import settingsReducer from './slices/settingsSlice';
import notificationReducer from './slices/notificationSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'wallet', 'settings'], // Only persist these reducers
  blacklist: ['notifications'], // Don't persist notifications
};

// Root reducer
const rootReducer = combineReducers({
  auth: authReducer,
  wallet: walletReducer,
  nft: nftReducer,
  marketplace: marketplaceReducer,
  search: searchReducer,
  cart: cartReducer,
  social: socialReducer,
  analytics: analyticsReducer,
  settings: settingsReducer,
  notifications: notificationReducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: __DEV__,
});

// Persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Hooks
export { useAppDispatch, useAppSelector } from './hooks';
