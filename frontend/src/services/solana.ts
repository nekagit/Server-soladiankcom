/**
 * Solana API service
 */

import { apiService, ApiResponse } from './api';

export interface WalletInfo {
  address: string;
  balance: number;
  balance_sol: number;
  owner: string;
  is_connected: boolean;
  wallet_type?: 'phantom' | 'solflare' | 'backpack';
}

export interface TransactionInfo {
  signature: string;
  slot: number;
  block_time: number;
  confirmation_status: 'processed' | 'confirmed' | 'finalized';
  err: any;
  fee: number;
  accounts: string[];
  instructions: Array<{
    program_id: string;
    accounts: string[];
    data: string;
  }>;
}

export interface TransactionRequest {
  from_address: string;
  to_address: string;
  amount: number;
  memo?: string;
  priority_fee?: number;
}

export interface TransactionResponse {
  transaction: string;
  signature: string;
  estimated_fee: number;
  priority_fee: number;
}

export interface TokenInfo {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
  owner: string;
  metadata?: {
    name: string;
    symbol: string;
    description: string;
    image: string;
    attributes?: Array<{
      trait_type: string;
      value: string;
    }>;
  };
}

export interface NFTInfo {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  animation_url?: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
  properties?: {
    files?: Array<{
      uri: string;
      type: string;
    }>;
    category: string;
    creators?: Array<{
      address: string;
      verified: boolean;
      share: number;
    }>;
  };
  collection?: {
    name: string;
    family: string;
  };
}

export interface EscrowInfo {
  escrow_address: string;
  buyer: string;
  seller: string;
  amount: number;
  token_mint?: string;
  status: 'pending' | 'funded' | 'released' | 'cancelled';
  created_at: string;
  expires_at?: string;
}

export interface NetworkInfo {
  network: string;
  rpc_url: string;
  status: 'online' | 'offline' | 'degraded';
  block_height: number;
  slot: number;
  epoch: number;
  transaction_count: number;
  average_fee: number;
  average_priority_fee: number;
}

export class SolanaService {
  /**
   * Get Solana network health status
   */
  async getHealthStatus(): Promise<ApiResponse<{
    status: string;
    network: string;
    rpc_url: string;
    block_height: number;
    slot: number;
    epoch: number;
    timestamp: string;
  }>> {
    return apiService.get<{
      status: string;
      network: string;
      rpc_url: string;
      block_height: number;
      slot: number;
      epoch: number;
      timestamp: string;
    }>('/solana/health');
  }

  /**
   * Get wallet information
   */
  async getWalletInfo(address: string): Promise<ApiResponse<WalletInfo>> {
    return apiService.get<WalletInfo>(`/solana/wallets/${address}/info`);
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(address: string): Promise<ApiResponse<{
    balance: number;
    balance_sol: number;
    token_accounts: Array<{
      mint: string;
      balance: number;
      decimals: number;
    }>;
  }>> {
    return apiService.get<{
      balance: number;
      balance_sol: number;
      token_accounts: Array<{
        mint: string;
        balance: number;
        decimals: number;
      }>;
    }>(`/solana/wallets/${address}/balance`);
  }

  /**
   * Create transfer transaction
   */
  async createTransferTransaction(
    transactionData: TransactionRequest
  ): Promise<ApiResponse<TransactionResponse>> {
    return apiService.post<TransactionResponse>('/solana/transactions/', transactionData);
  }

  /**
   * Verify transaction
   */
  async verifyTransaction(signature: string): Promise<ApiResponse<{
    confirmed: boolean;
    success: boolean;
    confirmation_status: string;
    slot: number;
    block_time: number;
    fee: number;
  }>> {
    return apiService.get<{
      confirmed: boolean;
      success: boolean;
      confirmation_status: string;
      slot: number;
      block_time: number;
      fee: number;
    }>(`/solana/transactions/${signature}/verify`);
  }

  /**
   * Get transaction details
   */
  async getTransaction(signature: string): Promise<ApiResponse<TransactionInfo>> {
    return apiService.get<TransactionInfo>(`/solana/transactions/${signature}`);
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    address: string,
    limit: number = 20,
    before?: string
  ): Promise<ApiResponse<TransactionInfo[]>> {
    const params: Record<string, any> = { limit };
    if (before) params.before = before;

    return apiService.get<TransactionInfo[]>(`/solana/wallets/${address}/transactions`, {
      params,
    });
  }

  /**
   * Get token information
   */
  async getTokenInfo(mint: string): Promise<ApiResponse<TokenInfo>> {
    return apiService.get<TokenInfo>(`/solana/tokens/${mint}`);
  }

  /**
   * Get user's tokens
   */
  async getUserTokens(address: string): Promise<ApiResponse<TokenInfo[]>> {
    return apiService.get<TokenInfo[]>(`/solana/wallets/${address}/tokens`);
  }

  /**
   * Get NFT information
   */
  async getNFTInfo(mint: string): Promise<ApiResponse<NFTInfo>> {
    return apiService.get<NFTInfo>(`/solana/nfts/${mint}`);
  }

  /**
   * Get user's NFTs
   */
  async getUserNFTs(address: string): Promise<ApiResponse<NFTInfo[]>> {
    return apiService.get<NFTInfo[]>(`/solana/wallets/${address}/nfts`);
  }

  /**
   * Get NFT collection
   */
  async getNFTCollection(collection: string): Promise<ApiResponse<NFTInfo[]>> {
    return apiService.get<NFTInfo[]>(`/solana/nfts/collection/${collection}`);
  }

  /**
   * Create NFT
   */
  async createNFT(nftData: {
    name: string;
    symbol: string;
    description: string;
    image: string;
    attributes?: Array<{
      trait_type: string;
      value: string;
    }>;
    collection?: string;
  }): Promise<ApiResponse<{
    mint: string;
    signature: string;
    nft: NFTInfo;
  }>> {
    return apiService.post<{
      mint: string;
      signature: string;
      nft: NFTInfo;
    }>('/solana/nfts/', nftData);
  }

  /**
   * Transfer NFT
   */
  async transferNFT(
    mint: string,
    from: string,
    to: string
  ): Promise<ApiResponse<{
    signature: string;
    transaction: string;
  }>> {
    return apiService.post<{
      signature: string;
      transaction: string;
    }>('/solana/nfts/transfer', {
      mint,
      from,
      to,
    });
  }

  /**
   * Create escrow
   */
  async createEscrow(escrowData: {
    buyer: string;
    seller: string;
    amount: number;
    token_mint?: string;
    expires_in_hours?: number;
  }): Promise<ApiResponse<{
    escrow_address: string;
    signature: string;
    escrow: EscrowInfo;
  }>> {
    return apiService.post<{
      escrow_address: string;
      signature: string;
      escrow: EscrowInfo;
    }>('/solana/escrow/', escrowData);
  }

  /**
   * Fund escrow
   */
  async fundEscrow(
    escrowAddress: string,
    amount: number
  ): Promise<ApiResponse<{
    signature: string;
    status: string;
  }>> {
    return apiService.post<{
      signature: string;
      status: string;
    }>(`/solana/escrow/${escrowAddress}/fund`, { amount });
  }

  /**
   * Release escrow
   */
  async releaseEscrow(escrowAddress: string): Promise<ApiResponse<{
    signature: string;
    status: string;
  }>> {
    return apiService.post<{
      signature: string;
      status: string;
    }>(`/solana/escrow/${escrowAddress}/release`);
  }

  /**
   * Cancel escrow
   */
  async cancelEscrow(escrowAddress: string): Promise<ApiResponse<{
    signature: string;
    status: string;
  }>> {
    return apiService.post<{
      signature: string;
      status: string;
    }>(`/solana/escrow/${escrowAddress}/cancel`);
  }

  /**
   * Get escrow information
   */
  async getEscrowInfo(escrowAddress: string): Promise<ApiResponse<EscrowInfo>> {
    return apiService.get<EscrowInfo>(`/solana/escrow/${escrowAddress}`);
  }

  /**
   * Get user's escrows
   */
  async getUserEscrows(address: string): Promise<ApiResponse<EscrowInfo[]>> {
    return apiService.get<EscrowInfo[]>(`/solana/wallets/${address}/escrows`);
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<ApiResponse<NetworkInfo>> {
    return apiService.get<NetworkInfo>('/solana/network');
  }

  /**
   * Get recent blocks
   */
  async getRecentBlocks(limit: number = 10): Promise<ApiResponse<Array<{
    slot: number;
    block_height: number;
    block_time: number;
    transaction_count: number;
    parent_slot: number;
  }>>> {
    return apiService.get<Array<{
      slot: number;
      block_height: number;
      block_time: number;
      transaction_count: number;
      parent_slot: number;
    }>>(`/solana/blocks?limit=${limit}`);
  }

  /**
   * Get account information
   */
  async getAccountInfo(address: string): Promise<ApiResponse<{
    address: string;
    lamports: number;
    owner: string;
    executable: boolean;
    rent_epoch: number;
    data: string;
  }>> {
    return apiService.get<{
      address: string;
      lamports: number;
      owner: string;
      executable: boolean;
      rent_epoch: number;
      data: string;
    }>(`/solana/accounts/${address}`);
  }

  /**
   * Get program accounts
   */
  async getProgramAccounts(
    programId: string,
    filters?: Array<{
      memcmp: {
        offset: number;
        bytes: string;
      };
    }>
  ): Promise<ApiResponse<Array<{
    pubkey: string;
    account: {
      lamports: number;
      owner: string;
      executable: boolean;
      rent_epoch: number;
      data: string;
    };
  }>>> {
    return apiService.post<Array<{
      pubkey: string;
      account: {
        lamports: number;
        owner: string;
        executable: boolean;
        rent_epoch: number;
        data: string;
      };
    }>>('/solana/programs/accounts', { program_id: programId, filters });
  }

  /**
   * Estimate transaction fee
   */
  async estimateTransactionFee(transactionData: {
    from: string;
    to: string;
    amount: number;
    priority_fee?: number;
  }): Promise<ApiResponse<{
    base_fee: number;
    priority_fee: number;
    total_fee: number;
  }>> {
    return apiService.post<{
      base_fee: number;
      priority_fee: number;
      total_fee: number;
    }>('/solana/transactions/estimate-fee', transactionData);
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(limit: number = 20): Promise<ApiResponse<Array<{
    signature: string;
    slot: number;
    block_time: number;
    fee: number;
    success: boolean;
    accounts: string[];
  }>>> {
    return apiService.get<Array<{
      signature: string;
      slot: number;
      block_time: number;
      fee: number;
      success: boolean;
      accounts: string[];
    }>>(`/solana/transactions/recent?limit=${limit}`);
  }
}

// Create singleton instance
export const solanaService = new SolanaService();



