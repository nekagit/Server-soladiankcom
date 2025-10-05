// Solana-specific TypeScript types

export interface SolanaWallet {
  publicKey: string;
  connected: boolean;
  balance?: number;
  provider?: string;
  network?: 'mainnet-beta' | 'testnet' | 'devnet';
  isConnected?: boolean;
  autoConnect?: boolean;
}

export interface SolanaTransaction {
  signature: string;
  amount: number;
  from: string;
  to: string;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
  fee?: number;
  blockTime?: number;
  slot?: number;
}

export interface SolanaTokenAccount {
  address: string;
  mint: string;
  owner: string;
  amount: number;
  decimals: number;
  uiAmount: number;
  state: string;
  isFrozen: boolean;
}

export interface SolanaTokenInfo {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
  uiSupply: number;
  owner?: string;
  isNative: boolean;
}

export interface SolanaNFTMetadata {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  externalUrl?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  collection?: string;
  sellerFeeBasisPoints?: number;
  creators?: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
}

export interface SolanaNFTOwnership {
  mint: string;
  owner: string;
  amount: number;
  delegate?: string;
  state: string;
  isFrozen: boolean;
}

export interface SolanaNFTListing {
  mint: string;
  seller: string;
  price: number; // Price in SOL
  currency: string;
  listingType: 'fixed' | 'auction';
  auctionEnd?: Date;
  currentBid?: number;
  minBid?: number;
  isActive: boolean;
  createdAt: Date;
}

export interface SolanaNFTAuction {
  mint: string;
  seller: string;
  startingPrice: number;
  currentBid: number;
  highestBidder?: string;
  auctionEnd: Date;
  isActive: boolean;
  minBidIncrement: number;
}

export interface SolanaPaymentRequest {
  fromWallet: string;
  toWallet: string;
  amount: number; // Amount in SOL
  memo?: string;
  reference?: string;
  escrowEnabled: boolean;
  escrowDurationHours: number;
}

export interface SolanaPaymentResult {
  success: boolean;
  transactionSignature?: string;
  errorMessage?: string;
  escrowAddress?: string;
  confirmationStatus?: string;
}

export interface SolanaEscrowInfo {
  escrowAddress: string;
  buyer: string;
  seller: string;
  amount: number;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'released' | 'refunded' | 'expired';
  transactionSignature?: string;
}

export interface SolanaWalletProvider {
  name: string;
  icon: string;
  isInstalled: () => boolean;
  connect: () => Promise<{ publicKey: string }>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: any) => Promise<any>;
  signAllTransactions: (transactions: any[]) => Promise<any[]>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  getAccount: () => Promise<{ publicKey: string }>;
}

export interface SolanaTransactionStatus {
  signature: string;
  status: 'pending' | 'confirmed' | 'finalized' | 'failed';
  confirmationStatus?: string;
  slot?: number;
  blockTime?: number;
  error?: any;
  confirmations?: number;
}

export interface SolanaTransactionDetails {
  signature: string;
  slot: number;
  blockTime: number;
  fee: number;
  accounts: string[];
  instructions: any[];
  meta: any;
  version?: string;
}

export interface SolanaNetworkConfig {
  name: string;
  rpcUrl: string;
  wsUrl?: string;
  commitment: 'processed' | 'confirmed' | 'finalized';
  explorerUrl: string;
  isTestnet: boolean;
}

export interface SolanaWalletConfig {
  autoConnect: boolean;
  defaultProvider?: string;
  network: 'mainnet-beta' | 'testnet' | 'devnet';
  supportedProviders: string[];
  connectionTimeout: number;
  confirmationTimeout: number;
}

export interface SolanaRPCResponse<T = any> {
  result: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

export interface SolanaAccountInfo {
  data: string[];
  executable: boolean;
  lamports: number;
  owner: string;
  rentEpoch: number;
}

export interface SolanaTokenSupply {
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
}

export interface SolanaBlockhash {
  blockhash: string;
  lastValidBlockHeight: number;
}

export interface SolanaSignatureStatus {
  slot: number;
  confirmations: number;
  err: any;
  status: {
    Ok: null;
  } | {
    Err: any;
  };
}

export interface SolanaInstruction {
  programId: string;
  accounts: number[];
  data: string;
}

export interface SolanaMessage {
  accountKeys: string[];
  instructions: SolanaInstruction[];
  recentBlockhash: string;
}

export interface SolanaTransactionData {
  signatures: string[];
  message: SolanaMessage;
}

// Event types for custom events
export interface SolanaWalletEventMap {
  'wallet:connected': { wallet: SolanaWallet };
  'wallet:disconnected': {};
  'wallet:accountChanged': { wallet: SolanaWallet };
  'wallet:providerChanged': { provider: string };
  'transaction:created': { transaction: SolanaTransaction };
  'transaction:confirmed': { transaction: SolanaTransaction };
  'transaction:failed': { transaction: SolanaTransaction; error: string };
  'payment:success': { result: SolanaPaymentResult };
  'payment:failed': { result: SolanaPaymentResult };
  'nft:listed': { listing: SolanaNFTListing };
  'nft:sold': { listing: SolanaNFTListing; buyer: string };
  'nft:bid': { auction: SolanaNFTAuction; bidder: string; amount: number };
}

// Utility types
export type SolanaNetwork = 'mainnet-beta' | 'testnet' | 'devnet';
export type SolanaCommitment = 'processed' | 'confirmed' | 'finalized';
export type SolanaTransactionStatusType = 'pending' | 'confirmed' | 'finalized' | 'failed';
export type SolanaEscrowStatus = 'active' | 'released' | 'refunded' | 'expired';
export type SolanaListingType = 'fixed' | 'auction';

// Constants
export const SOLANA_NETWORKS: Record<SolanaNetwork, SolanaNetworkConfig> = {
  'mainnet-beta': {
    name: 'Mainnet Beta',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    commitment: 'confirmed',
    explorerUrl: 'https://explorer.solana.com',
    isTestnet: false
  },
  'testnet': {
    name: 'Testnet',
    rpcUrl: 'https://api.testnet.solana.com',
    commitment: 'confirmed',
    explorerUrl: 'https://explorer.solana.com/?cluster=testnet',
    isTestnet: true
  },
  'devnet': {
    name: 'Devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    commitment: 'confirmed',
    explorerUrl: 'https://explorer.solana.com/?cluster=devnet',
    isTestnet: true
  }
};

export const SOLANA_WALLET_PROVIDERS = [
  'phantom',
  'solflare',
  'backpack',
  'sollet',
  'ledger'
] as const;

export type SolanaWalletProviderName = typeof SOLANA_WALLET_PROVIDERS[number];

// Error types
export class SolanaWalletError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: string
  ) {
    super(message);
    this.name = 'SolanaWalletError';
  }
}

export class SolanaTransactionError extends Error {
  constructor(
    message: string,
    public signature: string,
    public code: string
  ) {
    super(message);
    this.name = 'SolanaTransactionError';
  }
}

export class SolanaRPCError extends Error {
  constructor(
    message: string,
    public code: number,
    public data?: any
  ) {
    super(message);
    this.name = 'SolanaRPCError';
  }
}
