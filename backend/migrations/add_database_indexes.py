"""
Database Indexing Migration for Soladia
Comprehensive database indexing for optimal performance
"""

import asyncio
import logging
from sqlalchemy import text, Index, create_engine
from sqlalchemy.orm import sessionmaker
from typing import List, Dict, Any
import os

logger = logging.getLogger(__name__)

class DatabaseIndexer:
    """Database indexing system for performance optimization"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engine = create_engine(database_url)
        self.Session = sessionmaker(bind=self.engine)
        
    async def create_all_indexes(self):
        """Create all database indexes for optimal performance"""
        try:
            logger.info("Starting database indexing...")
            
            # Create indexes for different tables
            await self._create_user_indexes()
            await self._create_product_indexes()
            await self._create_order_indexes()
            await self._create_transaction_indexes()
            await self._create_solana_indexes()
            await self._create_nft_indexes()
            await self._create_analytics_indexes()
            await self._create_search_indexes()
            
            logger.info("Database indexing completed successfully")
            
        except Exception as e:
            logger.error(f"Failed to create database indexes: {e}")
            raise
    
    async def _create_user_indexes(self):
        """Create indexes for user-related tables"""
        try:
            indexes = [
                # Users table indexes
                "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
                "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
                "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login)",
                "CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)",
                "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
                
                # User profiles indexes
                "CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(location)",
                "CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at ON user_profiles(updated_at)",
                
                # User preferences indexes
                "CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_user_preferences_category ON user_preferences(category)",
                
                # User sessions indexes
                "CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token)",
                "CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)",
                "CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at)",
            ]
            
            await self._execute_indexes(indexes, "User indexes")
            
        except Exception as e:
            logger.error(f"Failed to create user indexes: {e}")
            raise
    
    async def _create_product_indexes(self):
        """Create indexes for product-related tables"""
        try:
            indexes = [
                # Products table indexes
                "CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)",
                "CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)",
                "CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id)",
                "CREATE INDEX IF NOT EXISTS idx_products_price ON products(price)",
                "CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)",
                "CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at)",
                "CREATE INDEX IF NOT EXISTS idx_products_is_nft ON products(is_nft)",
                "CREATE INDEX IF NOT EXISTS idx_products_is_solana ON products(is_solana)",
                
                # Composite indexes for common queries
                "CREATE INDEX IF NOT EXISTS idx_products_category_status ON products(category_id, status)",
                "CREATE INDEX IF NOT EXISTS idx_products_seller_status ON products(seller_id, status)",
                "CREATE INDEX IF NOT EXISTS idx_products_price_range ON products(price) WHERE status = 'active'",
                "CREATE INDEX IF NOT EXISTS idx_products_nft_solana ON products(is_nft, is_solana) WHERE status = 'active'",
                
                # Product categories indexes
                "CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name)",
                "CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)",
                "CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id)",
                "CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active)",
                
                # Product images indexes
                "CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)",
                "CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(is_primary)",
                
                # Product attributes indexes
                "CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON product_attributes(product_id)",
                "CREATE INDEX IF NOT EXISTS idx_product_attributes_name ON product_attributes(name)",
                "CREATE INDEX IF NOT EXISTS idx_product_attributes_value ON product_attributes(value)",
            ]
            
            await self._execute_indexes(indexes, "Product indexes")
            
        except Exception as e:
            logger.error(f"Failed to create product indexes: {e}")
            raise
    
    async def _create_order_indexes(self):
        """Create indexes for order-related tables"""
        try:
            indexes = [
                # Orders table indexes
                "CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
                "CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at)",
                "CREATE INDEX IF NOT EXISTS idx_orders_total_amount ON orders(total_amount)",
                "CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method)",
                
                # Composite indexes for order queries
                "CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status)",
                "CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at)",
                "CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_method, status)",
                
                # Order items indexes
                "CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)",
                "CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)",
                "CREATE INDEX IF NOT EXISTS idx_order_items_quantity ON order_items(quantity)",
                "CREATE INDEX IF NOT EXISTS idx_order_items_price ON order_items(price)",
                
                # Order status history indexes
                "CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id)",
                "CREATE INDEX IF NOT EXISTS idx_order_status_history_status ON order_status_history(status)",
                "CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at)",
            ]
            
            await self._execute_indexes(indexes, "Order indexes")
            
        except Exception as e:
            logger.error(f"Failed to create order indexes: {e}")
            raise
    
    async def _create_transaction_indexes(self):
        """Create indexes for transaction-related tables"""
        try:
            indexes = [
                # Transactions table indexes
                "CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)",
                "CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)",
                "CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount)",
                "CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency)",
                
                # Composite indexes for transaction queries
                "CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type)",
                "CREATE INDEX IF NOT EXISTS idx_transactions_status_created ON transactions(status, created_at)",
                "CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(type, status)",
                
                # Transaction details indexes
                "CREATE INDEX IF NOT EXISTS idx_transaction_details_transaction_id ON transaction_details(transaction_id)",
                "CREATE INDEX IF NOT EXISTS idx_transaction_details_field_name ON transaction_details(field_name)",
                
                # Payment methods indexes
                "CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type)",
                "CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(is_default)",
            ]
            
            await self._execute_indexes(indexes, "Transaction indexes")
            
        except Exception as e:
            logger.error(f"Failed to create transaction indexes: {e}")
            raise
    
    async def _create_solana_indexes(self):
        """Create indexes for Solana-related tables"""
        try:
            indexes = [
                # Solana wallets indexes
                "CREATE INDEX IF NOT EXISTS idx_solana_wallets_user_id ON solana_wallets(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_solana_wallets_address ON solana_wallets(address)",
                "CREATE INDEX IF NOT EXISTS idx_solana_wallets_wallet_type ON solana_wallets(wallet_type)",
                "CREATE INDEX IF NOT EXISTS idx_solana_wallets_is_primary ON solana_wallets(is_primary)",
                "CREATE INDEX IF NOT EXISTS idx_solana_wallets_created_at ON solana_wallets(created_at)",
                
                # Solana transactions indexes
                "CREATE INDEX IF NOT EXISTS idx_solana_transactions_wallet_id ON solana_transactions(wallet_id)",
                "CREATE INDEX IF NOT EXISTS idx_solana_transactions_tx_hash ON solana_transactions(tx_hash)",
                "CREATE INDEX IF NOT EXISTS idx_solana_transactions_type ON solana_transactions(type)",
                "CREATE INDEX IF NOT EXISTS idx_solana_transactions_status ON solana_transactions(status)",
                "CREATE INDEX IF NOT EXISTS idx_solana_transactions_created_at ON solana_transactions(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_solana_transactions_amount ON solana_transactions(amount)",
                
                # Composite indexes for Solana queries
                "CREATE INDEX IF NOT EXISTS idx_solana_transactions_wallet_type ON solana_transactions(wallet_id, type)",
                "CREATE INDEX IF NOT EXISTS idx_solana_transactions_status_created ON solana_transactions(status, created_at)",
                
                # Solana NFTs indexes
                "CREATE INDEX IF NOT EXISTS idx_solana_nfts_wallet_id ON solana_nfts(wallet_id)",
                "CREATE INDEX IF NOT EXISTS idx_solana_nfts_mint_address ON solana_nfts(mint_address)",
                "CREATE INDEX IF NOT EXISTS idx_solana_nfts_collection ON solana_nfts(collection)",
                "CREATE INDEX IF NOT EXISTS idx_solana_nfts_created_at ON solana_nfts(created_at)",
                
                # Solana tokens indexes
                "CREATE INDEX IF NOT EXISTS idx_solana_tokens_wallet_id ON solana_tokens(wallet_id)",
                "CREATE INDEX IF NOT EXISTS idx_solana_tokens_mint_address ON solana_tokens(mint_address)",
                "CREATE INDEX IF NOT EXISTS idx_solana_tokens_symbol ON solana_tokens(symbol)",
                "CREATE INDEX IF NOT EXISTS idx_solana_tokens_balance ON solana_tokens(balance)",
            ]
            
            await self._execute_indexes(indexes, "Solana indexes")
            
        except Exception as e:
            logger.error(f"Failed to create Solana indexes: {e}")
            raise
    
    async def _create_nft_indexes(self):
        """Create indexes for NFT-related tables"""
        try:
            indexes = [
                # NFTs table indexes
                "CREATE INDEX IF NOT EXISTS idx_nfts_token_id ON nfts(token_id)",
                "CREATE INDEX IF NOT EXISTS idx_nfts_collection_id ON nfts(collection_id)",
                "CREATE INDEX IF NOT EXISTS idx_nfts_owner_id ON nfts(owner_id)",
                "CREATE INDEX IF NOT EXISTS idx_nfts_creator_id ON nfts(creator_id)",
                "CREATE INDEX IF NOT EXISTS idx_nfts_status ON nfts(status)",
                "CREATE INDEX IF NOT EXISTS idx_nfts_price ON nfts(price)",
                "CREATE INDEX IF NOT EXISTS idx_nfts_created_at ON nfts(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_nfts_updated_at ON nfts(updated_at)",
                
                # Composite indexes for NFT queries
                "CREATE INDEX IF NOT EXISTS idx_nfts_collection_status ON nfts(collection_id, status)",
                "CREATE INDEX IF NOT EXISTS idx_nfts_owner_status ON nfts(owner_id, status)",
                "CREATE INDEX IF NOT EXISTS idx_nfts_price_range ON nfts(price) WHERE status = 'listed'",
                
                # NFT collections indexes
                "CREATE INDEX IF NOT EXISTS idx_nft_collections_name ON nft_collections(name)",
                "CREATE INDEX IF NOT EXISTS idx_nft_collections_creator_id ON nft_collections(creator_id)",
                "CREATE INDEX IF NOT EXISTS idx_nft_collections_created_at ON nft_collections(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_nft_collections_floor_price ON nft_collections(floor_price)",
                
                # NFT attributes indexes
                "CREATE INDEX IF NOT EXISTS idx_nft_attributes_nft_id ON nft_attributes(nft_id)",
                "CREATE INDEX IF NOT EXISTS idx_nft_attributes_trait_type ON nft_attributes(trait_type)",
                "CREATE INDEX IF NOT EXISTS idx_nft_attributes_value ON nft_attributes(value)",
                
                # NFT sales indexes
                "CREATE INDEX IF NOT EXISTS idx_nft_sales_nft_id ON nft_sales(nft_id)",
                "CREATE INDEX IF NOT EXISTS idx_nft_sales_seller_id ON nft_sales(seller_id)",
                "CREATE INDEX IF NOT EXISTS idx_nft_sales_buyer_id ON nft_sales(buyer_id)",
                "CREATE INDEX IF NOT EXISTS idx_nft_sales_price ON nft_sales(price)",
                "CREATE INDEX IF NOT EXISTS idx_nft_sales_created_at ON nft_sales(created_at)",
            ]
            
            await self._execute_indexes(indexes, "NFT indexes")
            
        except Exception as e:
            logger.error(f"Failed to create NFT indexes: {e}")
            raise
    
    async def _create_analytics_indexes(self):
        """Create indexes for analytics-related tables"""
        try:
            indexes = [
                # Analytics events indexes
                "CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type)",
                "CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id)",
                
                # Composite indexes for analytics queries
                "CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type ON analytics_events(user_id, event_type)",
                "CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created ON analytics_events(event_type, created_at)",
                
                # User behavior indexes
                "CREATE INDEX IF NOT EXISTS idx_user_behavior_user_id ON user_behavior(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_user_behavior_action ON user_behavior(action)",
                "CREATE INDEX IF NOT EXISTS idx_user_behavior_created_at ON user_behavior(created_at)",
                
                # Performance metrics indexes
                "CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint)",
                "CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_performance_metrics_response_time ON performance_metrics(response_time)",
            ]
            
            await self._execute_indexes(indexes, "Analytics indexes")
            
        except Exception as e:
            logger.error(f"Failed to create analytics indexes: {e}")
            raise
    
    async def _create_search_indexes(self):
        """Create indexes for search functionality"""
        try:
            indexes = [
                # Full-text search indexes
                "CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || description))",
                "CREATE INDEX IF NOT EXISTS idx_categories_search ON categories USING gin(to_tsvector('english', name || ' ' || description))",
                "CREATE INDEX IF NOT EXISTS idx_nfts_search ON nfts USING gin(to_tsvector('english', name || ' ' || description))",
                
                # Tag-based search indexes
                "CREATE INDEX IF NOT EXISTS idx_product_tags_tag ON product_tags(tag)",
                "CREATE INDEX IF NOT EXISTS idx_product_tags_product_id ON product_tags(product_id)",
                "CREATE INDEX IF NOT EXISTS idx_nft_tags_tag ON nft_tags(tag)",
                "CREATE INDEX IF NOT EXISTS idx_nft_tags_nft_id ON nft_tags(nft_id)",
                
                # Search history indexes
                "CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query)",
                "CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at)",
            ]
            
            await self._execute_indexes(indexes, "Search indexes")
            
        except Exception as e:
            logger.error(f"Failed to create search indexes: {e}")
            raise
    
    async def _execute_indexes(self, indexes: List[str], category: str):
        """Execute a list of index creation statements"""
        try:
            with self.engine.connect() as connection:
                for index_sql in indexes:
                    try:
                        await connection.execute(text(index_sql))
                        logger.debug(f"Created index: {index_sql}")
                    except Exception as e:
                        logger.warning(f"Index creation failed (may already exist): {index_sql} - {e}")
                
                await connection.commit()
                logger.info(f"Created {len(indexes)} {category}")
                
        except Exception as e:
            logger.error(f"Failed to execute {category}: {e}")
            raise
    
    async def analyze_table_performance(self):
        """Analyze table performance and suggest optimizations"""
        try:
            analysis_queries = [
                # Table size analysis
                """
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
                FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
                """,
                
                # Index usage analysis
                """
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_scan,
                    idx_tup_read,
                    idx_tup_fetch
                FROM pg_stat_user_indexes 
                WHERE schemaname = 'public'
                ORDER BY idx_scan DESC;
                """,
                
                # Slow query analysis
                """
                SELECT 
                    query,
                    calls,
                    total_time,
                    mean_time,
                    rows
                FROM pg_stat_statements 
                ORDER BY mean_time DESC 
                LIMIT 10;
                """
            ]
            
            with self.engine.connect() as connection:
                for query in analysis_queries:
                    try:
                        result = await connection.execute(text(query))
                        rows = result.fetchall()
                        logger.info(f"Performance analysis result: {rows}")
                    except Exception as e:
                        logger.warning(f"Performance analysis query failed: {e}")
                        
        except Exception as e:
            logger.error(f"Failed to analyze table performance: {e}")
    
    async def optimize_database(self):
        """Optimize database performance"""
        try:
            optimization_queries = [
                # Update table statistics
                "ANALYZE;",
                
                # Vacuum tables
                "VACUUM ANALYZE;",
                
                # Reindex if needed
                "REINDEX DATABASE;"
            ]
            
            with self.engine.connect() as connection:
                for query in optimization_queries:
                    try:
                        await connection.execute(text(query))
                        logger.info(f"Executed optimization: {query}")
                    except Exception as e:
                        logger.warning(f"Optimization query failed: {e}")
                        
        except Exception as e:
            logger.error(f"Failed to optimize database: {e}")

# Main execution function
async def main():
    """Main function to create database indexes"""
    database_url = os.getenv('DATABASE_URL', 'sqlite:///./soladia.db')
    
    indexer = DatabaseIndexer(database_url)
    
    try:
        await indexer.create_all_indexes()
        await indexer.analyze_table_performance()
        await indexer.optimize_database()
        print("Database indexing completed successfully!")
    except Exception as e:
        print(f"Database indexing failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
