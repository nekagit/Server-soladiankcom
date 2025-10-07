/**
 * Wallet Slice
 * Redux slice for Solana wallet state management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { walletService } from '../../services/walletService';

export interface WalletConnection {
  publicKey: string;
  balance: number;
  network: string;
  walletType: 'phantom' | 'solflare' | 'backpack';
  connected: boolean;
  timestamp: number;
  version?: string;
  features?: string[];
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: number;
  network: string;
  walletType: string | null;
  error: string | null;
  loading: boolean;
  lastUpdated: number;
  reconnectAttempts: number;
  isReconnecting: boolean;
  capabilities: {
    canSign: boolean;
    canSignAll: boolean;
    canRequestAirdrop: boolean;
    canSwitchNetwork: boolean;
    supportedNetworks: string[];
    maxSignatures: number;
  } | null;
}

const initialState: WalletState = {
  connected: false,
  address: null,
  balance: 0,
  network: 'mainnet',
  walletType: null,
  error: null,
  loading: false,
  lastUpdated: 0,
  reconnectAttempts: 0,
  isReconnecting: false,
  capabilities: null,
};

// Async thunks
export const connectWallet = createAsyncThunk(
  'wallet/connectWallet',
  async (walletType: 'phantom' | 'solflare' | 'backpack') => {
    const response = await walletService.connectWallet(walletType);
    return response;
  }
);

export const disconnectWallet = createAsyncThunk(
  'wallet/disconnectWallet',
  async () => {
    await walletService.disconnectWallet();
  }
);

export const refreshWalletState = createAsyncThunk(
  'wallet/refreshWalletState',
  async () => {
    const response = await walletService.refreshWalletState();
    return response;
  }
);

export const signTransaction = createAsyncThunk(
  'wallet/signTransaction',
  async (transaction: any) => {
    const response = await walletService.signTransaction(transaction);
    return response;
  }
);

export const signAllTransactions = createAsyncThunk(
  'wallet/signAllTransactions',
  async (transactions: any[]) => {
    const response = await walletService.signAllTransactions(transactions);
    return response;
  }
);

export const requestAirdrop = createAsyncThunk(
  'wallet/requestAirdrop',
  async (amount: number = 1) => {
    const response = await walletService.requestAirdrop(amount);
    return response;
  }
);

export const switchNetwork = createAsyncThunk(
  'wallet/switchNetwork',
  async (network: string) => {
    await walletService.switchNetwork(network);
    return network;
  }
);

export const getWalletCapabilities = createAsyncThunk(
  'wallet/getWalletCapabilities',
  async () => {
    const capabilities = await walletService.getWalletCapabilities();
    return capabilities;
  }
);

// Wallet slice
const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setReconnecting: (state, action: PayloadAction<boolean>) => {
      state.isReconnecting = action.payload;
    },
    updateBalance: (state, action: PayloadAction<number>) => {
      state.balance = action.payload;
      state.lastUpdated = Date.now();
    },
    updateNetwork: (state, action: PayloadAction<string>) => {
      state.network = action.payload;
      state.lastUpdated = Date.now();
    },
    setReconnectAttempts: (state, action: PayloadAction<number>) => {
      state.reconnectAttempts = action.payload;
    },
    resetWallet: () => initialState,
  },
  extraReducers: (builder) => {
    // Connect wallet
    builder
      .addCase(connectWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.reconnectAttempts = 0;
      })
      .addCase(connectWallet.fulfilled, (state, action) => {
        state.loading = false;
        state.connected = action.payload.connected;
        state.address = action.payload.publicKey;
        state.balance = action.payload.balance;
        state.network = action.payload.network;
        state.walletType = action.payload.walletType;
        state.lastUpdated = action.payload.timestamp;
        state.error = null;
        state.reconnectAttempts = 0;
        state.isReconnecting = false;
      })
      .addCase(connectWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Wallet connection failed';
        state.reconnectAttempts += 1;
      });

    // Disconnect wallet
    builder
      .addCase(disconnectWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(disconnectWallet.fulfilled, (state) => {
        state.loading = false;
        state.connected = false;
        state.address = null;
        state.balance = 0;
        state.walletType = null;
        state.lastUpdated = Date.now();
        state.error = null;
        state.reconnectAttempts = 0;
        state.isReconnecting = false;
      })
      .addCase(disconnectWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Wallet disconnection failed';
      });

    // Refresh wallet state
    builder
      .addCase(refreshWalletState.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshWalletState.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = action.payload.balance;
        state.lastUpdated = Date.now();
        state.error = null;
      })
      .addCase(refreshWalletState.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to refresh wallet state';
        state.isReconnecting = true;
      });

    // Sign transaction
    builder
      .addCase(signTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signTransaction.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(signTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Transaction signing failed';
      });

    // Sign all transactions
    builder
      .addCase(signAllTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signAllTransactions.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(signAllTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Batch transaction signing failed';
      });

    // Request airdrop
    builder
      .addCase(requestAirdrop.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestAirdrop.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(requestAirdrop.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Airdrop request failed';
      });

    // Switch network
    builder
      .addCase(switchNetwork.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(switchNetwork.fulfilled, (state, action) => {
        state.loading = false;
        state.network = action.payload;
        state.lastUpdated = Date.now();
        state.error = null;
      })
      .addCase(switchNetwork.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Network switch failed';
      });

    // Get wallet capabilities
    builder
      .addCase(getWalletCapabilities.fulfilled, (state, action) => {
        state.capabilities = action.payload;
      });
  },
});

export const {
  clearError,
  setLoading,
  setReconnecting,
  updateBalance,
  updateNetwork,
  setReconnectAttempts,
  resetWallet,
} = walletSlice.actions;

export default walletSlice.reducer;
