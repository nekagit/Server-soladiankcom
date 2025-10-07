/**
 * Advanced NFT Tools Service
 * IPFS integration, bulk operations, and advanced NFT management
 */

import { productionWalletService } from './production-wallet-service';
import { productionNFTMarketplace } from './production-nft-marketplace';

export interface IPFSUpload {
  hash: string;
  size: number;
  url: string;
  type: string;
  name: string;
  uploadedAt: number;
}

export interface IPFSMetadata {
  name: string;
  description: string;
  image: string;
  animation_url?: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
    max_value?: number;
  }>;
  properties?: {
    files?: Array<{
      uri: string;
      type: string;
    }>;
    category?: string;
    creators?: Array<{
      address: string;
      share: number;
    }>;
  };
}

export interface BulkOperation {
  id: string;
  type: 'mint' | 'transfer' | 'list' | 'delist' | 'update_metadata';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  items: BulkOperationItem[];
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
  createdAt: number;
  completedAt?: number;
  error?: string;
  metadata: any;
}

export interface BulkOperationItem {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data: any;
  result?: any;
  error?: string;
  retryCount: number;
}

export interface NFTBatch {
  id: string;
  name: string;
  description: string;
  collection: string;
  items: NFTBatchItem[];
  metadata: IPFSMetadata;
  status: 'draft' | 'uploading' | 'minting' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
  createdAt: number;
  completedAt?: number;
}

export interface NFTBatchItem {
  id: string;
  name: string;
  description: string;
  image: File | string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  metadata: IPFSMetadata;
  status: 'pending' | 'uploading' | 'minted' | 'failed';
  tokenId?: string;
  error?: string;
}

export interface AdvancedNFTToolsState {
  ipfsUploads: IPFSUpload[];
  bulkOperations: BulkOperation[];
  nftBatches: NFTBatch[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

export interface AdvancedNFTToolsError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: number;
}

export class AdvancedNFTToolsService {
  private state: AdvancedNFTToolsState = {
    ipfsUploads: [],
    bulkOperations: [],
    nftBatches: [],
    isLoading: false,
    error: null,
    lastUpdated: 0
  };

  private listeners: Set<(state: AdvancedNFTToolsState) => void> = new Set();
  private readonly STORAGE_KEY = 'soladia-advanced-nft-tools-state';
  private readonly IPFS_URL = '/api/ipfs';
  private readonly BULK_OPERATIONS_URL = '/api/nfts/bulk';
  private readonly NFT_BATCHES_URL = '/api/nfts/batches';

  constructor() {
    this.loadAdvancedNFTToolsStateFromStorage();
  }

  /**
   * Upload file to IPFS
   */
  async uploadToIPFS(file: File, metadata?: any): Promise<IPFSUpload | null> {
    try {
      this.setState({ isLoading: true, error: null });

      const formData = new FormData();
      formData.append('file', file);
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      const response = await fetch(`${this.IPFS_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      const upload: IPFSUpload = {
        hash: data.hash,
        size: data.size,
        url: data.url,
        type: data.type,
        name: data.name,
        uploadedAt: Date.now()
      };

      this.setState({
        ipfsUploads: [...this.state.ipfsUploads, upload],
        isLoading: false
      });

      this.saveAdvancedNFTToolsStateToStorage();
      this.notifyListeners();

      return upload;

    } catch (error) {
      this.handleAdvancedNFTToolsError(error);
      return null;
    }
  }

  /**
   * Upload multiple files to IPFS
   */
  async uploadMultipleToIPFS(files: File[], metadata?: any): Promise<IPFSUpload[]> {
    const uploads: IPFSUpload[] = [];

    for (const file of files) {
      const upload = await this.uploadToIPFS(file, metadata);
      if (upload) {
        uploads.push(upload);
      }
    }

    return uploads;
  }

  /**
   * Create IPFS metadata
   */
  createIPFSMetadata(
    name: string,
    description: string,
    image: string,
    attributes: Array<{ trait_type: string; value: string | number }>,
    additionalData?: any
  ): IPFSMetadata {
    return {
      name,
      description,
      image,
      attributes,
      ...additionalData
    };
  }

  /**
   * Upload metadata to IPFS
   */
  async uploadMetadataToIPFS(metadata: IPFSMetadata): Promise<IPFSUpload | null> {
    try {
      const response = await fetch(`${this.IPFS_URL}/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        throw new Error(`Metadata upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      const upload: IPFSUpload = {
        hash: data.hash,
        size: data.size,
        url: data.url,
        type: 'metadata',
        name: `${metadata.name}_metadata.json`,
        uploadedAt: Date.now()
      };

      this.setState({
        ipfsUploads: [...this.state.ipfsUploads, upload]
      });

      this.saveAdvancedNFTToolsStateToStorage();
      this.notifyListeners();

      return upload;

    } catch (error) {
      this.handleAdvancedNFTToolsError(error);
      return null;
    }
  }

  /**
   * Create NFT batch
   */
  async createNFTBatch(
    name: string,
    description: string,
    collection: string,
    items: Omit<NFTBatchItem, 'id' | 'status' | 'metadata'>[]
  ): Promise<NFTBatch | null> {
    try {
      this.setState({ isLoading: true, error: null });

      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const batchItems: NFTBatchItem[] = items.map((item, index) => ({
        ...item,
        id: `${batchId}_item_${index}`,
        status: 'pending',
        metadata: this.createIPFSMetadata(
          item.name,
          item.description,
          typeof item.image === 'string' ? item.image : '',
          item.attributes
        )
      }));

      const nftBatch: NFTBatch = {
        id: batchId,
        name,
        description,
        collection,
        items: batchItems,
        metadata: this.createIPFSMetadata(name, description, '', []),
        status: 'draft',
        progress: {
          total: batchItems.length,
          completed: 0,
          failed: 0,
          percentage: 0
        },
        createdAt: Date.now()
      };

      this.setState({
        nftBatches: [...this.state.nftBatches, nftBatch],
        isLoading: false
      });

      this.saveAdvancedNFTToolsStateToStorage();
      this.notifyListeners();

      return nftBatch;

    } catch (error) {
      this.handleAdvancedNFTToolsError(error);
      return null;
    }
  }

  /**
   * Process NFT batch
   */
  async processNFTBatch(batchId: string): Promise<boolean> {
    try {
      const batch = this.state.nftBatches.find(b => b.id === batchId);
      if (!batch) {
        throw new Error('Batch not found');
      }

      this.setState({
        isLoading: true,
        error: null
      });

      // Update batch status
      const updatedBatch = { ...batch, status: 'uploading' as const };
      this.updateBatchInState(updatedBatch);

      // Process each item in the batch
      for (const item of batch.items) {
        try {
          // Upload image to IPFS
          let imageUrl = '';
          if (item.image instanceof File) {
            const imageUpload = await this.uploadToIPFS(item.image);
            if (imageUpload) {
              imageUrl = imageUpload.url;
            }
          } else {
            imageUrl = item.image;
          }

          // Update item metadata with image URL
          const updatedItem = {
            ...item,
            metadata: {
              ...item.metadata,
              image: imageUrl
            },
            status: 'uploading' as const
          };

          this.updateBatchItemInState(batchId, updatedItem);

          // Upload metadata to IPFS
          const metadataUpload = await this.uploadMetadataToIPFS(updatedItem.metadata);
          if (!metadataUpload) {
            throw new Error('Failed to upload metadata to IPFS');
          }

          // Mint NFT
          const mintResult = await this.mintNFT({
            name: item.name,
            description: item.description,
            image: imageUrl,
            metadata: metadataUpload.url,
            collection: batch.collection
          });

          if (mintResult.success) {
            const completedItem = {
              ...updatedItem,
              status: 'minted' as const,
              tokenId: mintResult.tokenId
            };
            this.updateBatchItemInState(batchId, completedItem);
          } else {
            throw new Error(mintResult.error || 'Failed to mint NFT');
          }

        } catch (error) {
          const failedItem = {
            ...item,
            status: 'failed' as const,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          this.updateBatchItemInState(batchId, failedItem);
        }
      }

      // Update batch status
      const finalBatch = this.state.nftBatches.find(b => b.id === batchId);
      if (finalBatch) {
        const completedItems = finalBatch.items.filter(item => item.status === 'minted').length;
        const failedItems = finalBatch.items.filter(item => item.status === 'failed').length;
        
        const updatedFinalBatch = {
          ...finalBatch,
          status: completedItems > 0 ? 'completed' as const : 'failed' as const,
          progress: {
            ...finalBatch.progress,
            completed: completedItems,
            failed: failedItems,
            percentage: Math.round((completedItems / finalBatch.items.length) * 100)
          },
          completedAt: Date.now()
        };

        this.updateBatchInState(updatedFinalBatch);
      }

      this.setState({ isLoading: false });
      this.saveAdvancedNFTToolsStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleAdvancedNFTToolsError(error);
      return false;
    }
  }

  /**
   * Create bulk operation
   */
  async createBulkOperation(
    type: BulkOperation['type'],
    items: any[],
    metadata?: any
  ): Promise<BulkOperation | null> {
    try {
      this.setState({ isLoading: true, error: null });

      const operationId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const bulkItems: BulkOperationItem[] = items.map((item, index) => ({
        id: `${operationId}_item_${index}`,
        status: 'pending',
        data: item,
        retryCount: 0
      }));

      const bulkOperation: BulkOperation = {
        id: operationId,
        type,
        status: 'pending',
        items: bulkItems,
        progress: {
          total: bulkItems.length,
          completed: 0,
          failed: 0,
          percentage: 0
        },
        createdAt: Date.now(),
        metadata
      };

      this.setState({
        bulkOperations: [...this.state.bulkOperations, bulkOperation],
        isLoading: false
      });

      this.saveAdvancedNFTToolsStateToStorage();
      this.notifyListeners();

      return bulkOperation;

    } catch (error) {
      this.handleAdvancedNFTToolsError(error);
      return null;
    }
  }

  /**
   * Process bulk operation
   */
  async processBulkOperation(operationId: string): Promise<boolean> {
    try {
      const operation = this.state.bulkOperations.find(op => op.id === operationId);
      if (!operation) {
        throw new Error('Bulk operation not found');
      }

      this.setState({ isLoading: true, error: null });

      // Update operation status
      const updatedOperation = { ...operation, status: 'processing' as const };
      this.updateBulkOperationInState(updatedOperation);

      // Process each item in the operation
      for (const item of operation.items) {
        try {
          this.updateBulkOperationItemInState(operationId, {
            ...item,
            status: 'processing'
          });

          let result;
          switch (operation.type) {
            case 'mint':
              result = await this.mintNFT(item.data);
              break;
            case 'transfer':
              result = await this.transferNFT(item.data);
              break;
            case 'list':
              result = await this.listNFT(item.data);
              break;
            case 'delist':
              result = await this.delistNFT(item.data);
              break;
            case 'update_metadata':
              result = await this.updateNFTMetadata(item.data);
              break;
            default:
              throw new Error(`Unknown operation type: ${operation.type}`);
          }

          if (result.success) {
            this.updateBulkOperationItemInState(operationId, {
              ...item,
              status: 'completed',
              result
            });
          } else {
            throw new Error(result.error || 'Operation failed');
          }

        } catch (error) {
          this.updateBulkOperationItemInState(operationId, {
            ...item,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount: item.retryCount + 1
          });
        }
      }

      // Update operation status
      const finalOperation = this.state.bulkOperations.find(op => op.id === operationId);
      if (finalOperation) {
        const completedItems = finalOperation.items.filter(item => item.status === 'completed').length;
        const failedItems = finalOperation.items.filter(item => item.status === 'failed').length;
        
        const updatedFinalOperation = {
          ...finalOperation,
          status: completedItems > 0 ? 'completed' as const : 'failed' as const,
          progress: {
            ...finalOperation.progress,
            completed: completedItems,
            failed: failedItems,
            percentage: Math.round((completedItems / finalOperation.items.length) * 100)
          },
          completedAt: Date.now()
        };

        this.updateBulkOperationInState(updatedFinalOperation);
      }

      this.setState({ isLoading: false });
      this.saveAdvancedNFTToolsStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleAdvancedNFTToolsError(error);
      return false;
    }
  }

  /**
   * Mint NFT
   */
  private async mintNFT(data: any): Promise<{ success: boolean; tokenId?: string; error?: string }> {
    try {
      const response = await fetch('/api/nfts/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Mint failed: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, tokenId: result.tokenId };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Transfer NFT
   */
  private async transferNFT(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/nfts/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Transfer failed: ${response.statusText}`);
      }

      return { success: true };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * List NFT
   */
  private async listNFT(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/nfts/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`List failed: ${response.statusText}`);
      }

      return { success: true };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Delist NFT
   */
  private async delistNFT(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/nfts/delist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Delist failed: ${response.statusText}`);
      }

      return { success: true };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Update NFT metadata
   */
  private async updateNFTMetadata(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/nfts/update-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Update metadata failed: ${response.statusText}`);
      }

      return { success: true };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Update batch in state
   */
  private updateBatchInState(updatedBatch: NFTBatch): void {
    const updatedBatches = this.state.nftBatches.map(batch =>
      batch.id === updatedBatch.id ? updatedBatch : batch
    );
    this.setState({ nftBatches: updatedBatches });
  }

  /**
   * Update batch item in state
   */
  private updateBatchItemInState(batchId: string, updatedItem: NFTBatchItem): void {
    const updatedBatches = this.state.nftBatches.map(batch => {
      if (batch.id === batchId) {
        const updatedItems = batch.items.map(item =>
          item.id === updatedItem.id ? updatedItem : item
        );
        return { ...batch, items: updatedItems };
      }
      return batch;
    });
    this.setState({ nftBatches: updatedBatches });
  }

  /**
   * Update bulk operation in state
   */
  private updateBulkOperationInState(updatedOperation: BulkOperation): void {
    const updatedOperations = this.state.bulkOperations.map(operation =>
      operation.id === updatedOperation.id ? updatedOperation : operation
    );
    this.setState({ bulkOperations: updatedOperations });
  }

  /**
   * Update bulk operation item in state
   */
  private updateBulkOperationItemInState(operationId: string, updatedItem: BulkOperationItem): void {
    const updatedOperations = this.state.bulkOperations.map(operation => {
      if (operation.id === operationId) {
        const updatedItems = operation.items.map(item =>
          item.id === updatedItem.id ? updatedItem : item
        );
        return { ...operation, items: updatedItems };
      }
      return operation;
    });
    this.setState({ bulkOperations: updatedOperations });
  }

  /**
   * Get auth token
   */
  private getAuthToken(): string {
    return localStorage.getItem('soladia-auth-token') || '';
  }

  /**
   * Get current state
   */
  getState(): AdvancedNFTToolsState {
    return { ...this.state };
  }

  /**
   * Add state change listener
   */
  addStateListener(listener: (state: AdvancedNFTToolsState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get IPFS uploads
   */
  getIPFSUploads(): IPFSUpload[] {
    return [...this.state.ipfsUploads];
  }

  /**
   * Get bulk operations
   */
  getBulkOperations(): BulkOperation[] {
    return [...this.state.bulkOperations];
  }

  /**
   * Get NFT batches
   */
  getNFTBatches(): NFTBatch[] {
    return [...this.state.nftBatches];
  }

  /**
   * Handle advanced NFT tools errors
   */
  private handleAdvancedNFTToolsError(error: any): void {
    const advancedNFTToolsError = this.createAdvancedNFTToolsError(
      error.code || 'UNKNOWN_ERROR',
      error.message || 'An unknown error occurred',
      error.details
    );

    this.setState({
      isLoading: false,
      error: advancedNFTToolsError.message,
      lastUpdated: Date.now()
    });

    console.error('Advanced NFT tools error:', advancedNFTToolsError);
  }

  /**
   * Create advanced NFT tools error
   */
  private createAdvancedNFTToolsError(code: string, message: string, details?: any): AdvancedNFTToolsError {
    return {
      code,
      message,
      details,
      retryable: false,
      timestamp: Date.now()
    };
  }

  /**
   * Set advanced NFT tools state
   */
  private setState(updates: Partial<AdvancedNFTToolsState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Notify listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in advanced NFT tools state listener:', error);
      }
    });
  }

  /**
   * Save advanced NFT tools state to storage
   */
  private saveAdvancedNFTToolsStateToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save advanced NFT tools state to storage:', error);
    }
  }

  /**
   * Load advanced NFT tools state from storage
   */
  private loadAdvancedNFTToolsStateFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        this.setState(state);
      }
    } catch (error) {
      console.warn('Failed to load advanced NFT tools state from storage:', error);
    }
  }

  /**
   * Clear advanced NFT tools data
   */
  clearAdvancedNFTToolsData(): void {
    this.setState({
      ipfsUploads: [],
      bulkOperations: [],
      nftBatches: [],
      error: null
    });
    this.saveAdvancedNFTToolsStateToStorage();
  }
}

// Export singleton instance
export const advancedNFTToolsService = new AdvancedNFTToolsService();
export default advancedNFTToolsService;
