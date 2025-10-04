// Core types for Soladia marketplace

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  profile?: UserProfile;
}

export interface UserProfile {
  id: number;
  user_id: number;
  bio?: string;
  avatar_url?: string;
  location?: string;
  phone?: string;
  website?: string;
  social_links?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  original_price?: number;
  condition: ProductCondition;
  category_id: number;
  seller_id: number;
  images: string[];
  tags: string[];
  is_featured: boolean;
  is_active: boolean;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
  category?: Category;
  seller?: User;
  reviews?: Review[];
  average_rating?: number;
  review_count?: number;
}

export type ProductCondition = 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';

export interface Category {
  id: number;
  name: string;
  description?: string;
  slug: string;
  icon?: string;
  parent_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: Category[];
  product_count?: number;
}

export interface Order {
  id: number;
  buyer_id: number;
  seller_id: number;
  status: OrderStatus;
  total_amount: number;
  shipping_address: Address;
  billing_address: Address;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  tracking_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  buyer?: User;
  seller?: User;
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled' 
  | 'refunded';

export type PaymentStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'refunded';

export type PaymentMethod = 
  | 'solana' 
  | 'credit_card' 
  | 'paypal' 
  | 'bank_transfer';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: Product;
}

export interface Review {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  title?: string;
  comment?: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  user?: User;
  product?: Product;
}

export interface Watchlist {
  id: number;
  user_id: number;
  product_id: number;
  created_at: string;
  product?: Product;
}

export interface Address {
  id?: number;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default?: boolean;
}

export interface CartItem {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  added_at: string;
  product?: Product;
}

export interface SearchFilters {
  query?: string;
  category_id?: number;
  min_price?: number;
  max_price?: number;
  condition?: ProductCondition;
  location?: string;
  sort_by?: 'price_asc' | 'price_desc' | 'newest' | 'oldest' | 'rating' | 'popularity';
  page?: number;
  limit?: number;
}

export interface SearchResults {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  filters: SearchFilters;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  first_name: string;
  last_name: string;
  agree_to_terms: boolean;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface TokenRefreshRequest {
  refresh_token: string;
}

// Solana wallet types
export interface SolanaWallet {
  publicKey: string;
  connected: boolean;
  balance?: number;
}

export interface SolanaTransaction {
  signature: string;
  amount: number;
  from: string;
  to: string;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
}

// API Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field_errors?: Record<string, string[]>;
}

// Form types
export interface FormState<T> {
  data: T;
  errors: Record<keyof T, string>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Component props types
export interface BaseComponentProps {
  className?: string;
  children?: any;
}

export interface ProductCardProps extends BaseComponentProps {
  product: Product;
  showActions?: boolean;
  onAddToCart?: (productId: number) => void;
  onAddToWatchlist?: (productId: number) => void;
}

export interface SearchBarProps extends BaseComponentProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  suggestions?: string[];
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Environment types
export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  API_BASE_URL: string;
  SOLANA_RPC_URL: string;
  SOLANA_NETWORK: 'mainnet' | 'testnet' | 'devnet';
  STRIPE_PUBLISHABLE_KEY?: string;
  GOOGLE_ANALYTICS_ID?: string;
}

// Event types for custom events
export interface CustomEventMap {
  'product:added-to-cart': { productId: number; quantity: number };
  'product:added-to-watchlist': { productId: number };
  'user:logged-in': { user: User };
  'user:logged-out': {};
  'cart:updated': { itemCount: number; total: number };
  'search:performed': { query: string; results: number };
}

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: string }>;
      disconnect: () => Promise<void>;
      signTransaction: (transaction: any) => Promise<any>;
      signAllTransactions: (transactions: any[]) => Promise<any[]>;
    };
  }
}
