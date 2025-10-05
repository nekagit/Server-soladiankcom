"""
Comprehensive Blockchain Analytics for Soladia
Real-time monitoring, analysis, and insights for Solana blockchain data
"""

import asyncio
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import json
import numpy as np
import pandas as pd
from collections import defaultdict, Counter
import aiohttp
import websockets
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Commitment
from solana.publickey import PublicKey

logger = logging.getLogger(__name__)

class AnalyticsType(Enum):
    TRANSACTION = "transaction"
    WALLET = "wallet"
    NFT = "nft"
    TOKEN = "token"
    MARKET = "market"
    NETWORK = "network"

@dataclass
class TransactionAnalytics:
    """Transaction analytics data"""
    transaction_id: str
    timestamp: datetime
    sender: str
    receiver: str
    amount: float
    token: str
    fee: float
    status: str
    block_height: int
    gas_used: int
    success: bool

@dataclass
class WalletAnalytics:
    """Wallet analytics data"""
    wallet_address: str
    total_balance: float
    token_balances: Dict[str, float]
    transaction_count: int
    nft_count: int
    activity_score: float
    risk_score: float
    last_active: datetime
    creation_date: datetime

@dataclass
class NFTAnalytics:
    """NFT analytics data"""
    nft_id: str
    collection: str
    owner: str
    floor_price: float
    volume_24h: float
    volume_7d: float
    volume_30d: float
    sales_count: int
    rarity_score: float
    popularity_score: float
    last_sale_price: float
    last_sale_date: datetime

@dataclass
class TokenAnalytics:
    """Token analytics data"""
    token_address: str
    symbol: str
    name: str
    price: float
    market_cap: float
    volume_24h: float
    volume_7d: float
    volume_30d: float
    price_change_24h: float
    price_change_7d: float
    price_change_30d: float
    holders_count: int
    transactions_count: int
    liquidity: float

@dataclass
class MarketAnalytics:
    """Market analytics data"""
    timestamp: datetime
    total_volume: float
    total_transactions: int
    active_wallets: int
    new_wallets: int
    nft_sales: int
    nft_volume: float
    token_volume: float
    average_transaction_size: float
    gas_price: float
    network_congestion: float

@dataclass
class NetworkAnalytics:
    """Network analytics data"""
    timestamp: datetime
    block_height: int
    block_time: float
    transactions_per_second: float
    active_validators: int
    total_stake: float
    inflation_rate: float
    network_health: float
    uptime: float
    finality_time: float

class BlockchainAnalyticsEngine:
    """Comprehensive blockchain analytics engine"""
    
    def __init__(self, rpc_client: AsyncClient, websocket_url: str):
        self.rpc_client = rpc_client
        self.websocket_url = websocket_url
        self.analytics_data = {}
        self.real_time_subscriptions = {}
        self.analytics_cache = {}
        self.metrics_history = defaultdict(list)
        
    async def initialize(self):
        """Initialize the analytics engine"""
        try:
            # Start real-time monitoring
            await self._start_real_time_monitoring()
            
            # Initialize analytics data
            await self._load_historical_data()
            
            # Start background analytics tasks
            asyncio.create_task(self._background_analytics())
            
            logger.info("Blockchain analytics engine initialized")
        except Exception as e:
            logger.error(f"Failed to initialize analytics engine: {e}")
            raise
    
    async def get_transaction_analytics(
        self,
        transaction_id: str,
        include_details: bool = True
    ) -> Optional[TransactionAnalytics]:
        """Get detailed analytics for a specific transaction"""
        try:
            # Get transaction details
            transaction = await self.rpc_client.get_transaction(transaction_id)
            if not transaction.value:
                return None
            
            tx_data = transaction.value
            
            # Parse transaction data
            analytics = TransactionAnalytics(
                transaction_id=transaction_id,
                timestamp=datetime.fromtimestamp(tx_data.block_time),
                sender=tx_data.transaction.message.account_keys[0].pubkey,
                receiver=tx_data.transaction.message.account_keys[1].pubkey if len(tx_data.transaction.message.account_keys) > 1 else "",
                amount=tx_data.meta.pre_balances[0] - tx_data.meta.post_balances[0] if tx_data.meta.pre_balances else 0,
                token="SOL",
                fee=tx_data.meta.fee,
                status="success" if tx_data.meta.err is None else "failed",
                block_height=tx_data.slot,
                gas_used=tx_data.meta.compute_units_consumed or 0,
                success=tx_data.meta.err is None
            )
            
            return analytics
            
        except Exception as e:
            logger.error(f"Failed to get transaction analytics: {e}")
            return None
    
    async def get_wallet_analytics(self, wallet_address: str) -> Optional[WalletAnalytics]:
        """Get comprehensive analytics for a wallet"""
        try:
            wallet_pubkey = PublicKey(wallet_address)
            
            # Get wallet balance
            balance = await self.rpc_client.get_balance(wallet_pubkey)
            
            # Get token accounts
            token_accounts = await self.rpc_client.get_token_accounts_by_owner(
                wallet_pubkey, {"programId": PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")}
            )
            
            # Get transaction history
            signatures = await self.rpc_client.get_signatures_for_address(wallet_pubkey, limit=1000)
            
            # Calculate analytics
            token_balances = {}
            for account in token_accounts.value:
                account_info = await self.rpc_client.get_account_info(account.pubkey)
                if account_info.value:
                    # Parse token balance
                    token_balances[account.pubkey] = account_info.value.lamports / 1e9
            
            # Calculate activity score
            activity_score = self._calculate_activity_score(signatures)
            
            # Calculate risk score
            risk_score = self._calculate_risk_score(wallet_address, signatures)
            
            analytics = WalletAnalytics(
                wallet_address=wallet_address,
                total_balance=balance.value / 1e9,
                token_balances=token_balances,
                transaction_count=len(signatures),
                nft_count=0,  # Would need NFT-specific queries
                activity_score=activity_score,
                risk_score=risk_score,
                last_active=datetime.fromtimestamp(signatures[0].block_time) if signatures else datetime.now(),
                creation_date=datetime.fromtimestamp(signatures[-1].block_time) if signatures else datetime.now()
            )
            
            return analytics
            
        except Exception as e:
            logger.error(f"Failed to get wallet analytics: {e}")
            return None
    
    async def get_nft_analytics(self, nft_id: str) -> Optional[NFTAnalytics]:
        """Get analytics for an NFT"""
        try:
            # This would require NFT-specific queries
            # For now, return placeholder data
            analytics = NFTAnalytics(
                nft_id=nft_id,
                collection="Unknown",
                owner="",
                floor_price=0.0,
                volume_24h=0.0,
                volume_7d=0.0,
                volume_30d=0.0,
                sales_count=0,
                rarity_score=0.0,
                popularity_score=0.0,
                last_sale_price=0.0,
                last_sale_date=datetime.now()
            )
            
            return analytics
            
        except Exception as e:
            logger.error(f"Failed to get NFT analytics: {e}")
            return None
    
    async def get_token_analytics(self, token_address: str) -> Optional[TokenAnalytics]:
        """Get analytics for a token"""
        try:
            # This would require token-specific queries
            # For now, return placeholder data
            analytics = TokenAnalytics(
                token_address=token_address,
                symbol="UNKNOWN",
                name="Unknown Token",
                price=0.0,
                market_cap=0.0,
                volume_24h=0.0,
                volume_7d=0.0,
                volume_30d=0.0,
                price_change_24h=0.0,
                price_change_7d=0.0,
                price_change_30d=0.0,
                holders_count=0,
                transactions_count=0,
                liquidity=0.0
            )
            
            return analytics
            
        except Exception as e:
            logger.error(f"Failed to get token analytics: {e}")
            return None
    
    async def get_market_analytics(
        self,
        time_range: str = "24h"
    ) -> Optional[MarketAnalytics]:
        """Get market-wide analytics"""
        try:
            # Get current market data
            current_time = datetime.now()
            
            # Calculate time range
            if time_range == "24h":
                start_time = current_time - timedelta(hours=24)
            elif time_range == "7d":
                start_time = current_time - timedelta(days=7)
            elif time_range == "30d":
                start_time = current_time - timedelta(days=30)
            else:
                start_time = current_time - timedelta(hours=24)
            
            # Get network statistics
            epoch_info = await self.rpc_client.get_epoch_info()
            block_height = epoch_info.value.absolute_slot
            
            # Calculate market metrics
            analytics = MarketAnalytics(
                timestamp=current_time,
                total_volume=0.0,  # Would need to calculate from transaction data
                total_transactions=0,  # Would need to count transactions
                active_wallets=0,  # Would need to count unique wallets
                new_wallets=0,  # Would need to track new wallet creation
                nft_sales=0,  # Would need to count NFT transactions
                nft_volume=0.0,  # Would need to sum NFT transaction volumes
                token_volume=0.0,  # Would need to sum token transaction volumes
                average_transaction_size=0.0,  # Would need to calculate
                gas_price=0.0,  # Would need to get current gas price
                network_congestion=0.0  # Would need to calculate
            )
            
            return analytics
            
        except Exception as e:
            logger.error(f"Failed to get market analytics: {e}")
            return None
    
    async def get_network_analytics(self) -> Optional[NetworkAnalytics]:
        """Get network-wide analytics"""
        try:
            # Get network statistics
            epoch_info = await self.rpc_client.get_epoch_info()
            block_height = epoch_info.value.absolute_slot
            
            # Get validator information
            validators = await self.rpc_client.get_vote_accounts()
            active_validators = len(validators.value.current)
            
            # Calculate network metrics
            analytics = NetworkAnalytics(
                timestamp=datetime.now(),
                block_height=block_height,
                block_time=0.4,  # Average block time for Solana
                transactions_per_second=0.0,  # Would need to calculate
                active_validators=active_validators,
                total_stake=0.0,  # Would need to calculate from validator data
                inflation_rate=0.0,  # Would need to get from network parameters
                network_health=1.0,  # Would need to calculate
                uptime=1.0,  # Would need to calculate
                finality_time=0.0  # Would need to calculate
            )
            
            return analytics
            
        except Exception as e:
            logger.error(f"Failed to get network analytics: {e}")
            return None
    
    async def get_trending_tokens(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get trending tokens based on volume and activity"""
        try:
            # This would analyze token data to find trends
            # For now, return placeholder data
            trending_tokens = []
            
            for i in range(limit):
                trending_tokens.append({
                    "token_address": f"token_{i}",
                    "symbol": f"TOKEN{i}",
                    "name": f"Token {i}",
                    "price": 1.0 + (i * 0.1),
                    "volume_24h": 1000000 + (i * 100000),
                    "price_change_24h": (i - 5) * 0.1,
                    "market_cap": 10000000 + (i * 1000000),
                    "trend_score": 0.8 - (i * 0.05)
                })
            
            return trending_tokens
            
        except Exception as e:
            logger.error(f"Failed to get trending tokens: {e}")
            return []
    
    async def get_trending_nfts(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get trending NFTs based on sales and activity"""
        try:
            # This would analyze NFT data to find trends
            # For now, return placeholder data
            trending_nfts = []
            
            for i in range(limit):
                trending_nfts.append({
                    "nft_id": f"nft_{i}",
                    "collection": f"Collection {i}",
                    "name": f"NFT {i}",
                    "floor_price": 1.0 + (i * 0.5),
                    "volume_24h": 50000 + (i * 5000),
                    "sales_count": 10 + i,
                    "trend_score": 0.9 - (i * 0.08)
                })
            
            return trending_nfts
            
        except Exception as e:
            logger.error(f"Failed to get trending NFTs: {e}")
            return []
    
    async def get_risk_analysis(self, wallet_address: str) -> Dict[str, Any]:
        """Get risk analysis for a wallet"""
        try:
            # Calculate various risk factors
            risk_factors = {
                "suspicious_activity": False,
                "high_volume_transactions": False,
                "frequent_address_changes": False,
                "unusual_patterns": False,
                "blacklist_status": False
            }
            
            # Get wallet analytics
            wallet_analytics = await self.get_wallet_analytics(wallet_address)
            if not wallet_analytics:
                return {"risk_score": 0.0, "risk_factors": risk_factors}
            
            # Calculate risk score
            risk_score = wallet_analytics.risk_score
            
            # Determine risk factors
            if wallet_analytics.activity_score > 0.8:
                risk_factors["high_volume_transactions"] = True
            
            if wallet_analytics.transaction_count > 1000:
                risk_factors["frequent_address_changes"] = True
            
            return {
                "risk_score": risk_score,
                "risk_factors": risk_factors,
                "recommendations": self._get_risk_recommendations(risk_score, risk_factors)
            }
            
        except Exception as e:
            logger.error(f"Failed to get risk analysis: {e}")
            return {"risk_score": 0.0, "risk_factors": {}, "recommendations": []}
    
    def _calculate_activity_score(self, signatures: List[Any]) -> float:
        """Calculate activity score for a wallet"""
        try:
            if not signatures:
                return 0.0
            
            # Calculate score based on transaction frequency and recency
            now = datetime.now()
            recent_transactions = 0
            
            for sig in signatures[:100]:  # Check last 100 transactions
                if sig.block_time:
                    tx_time = datetime.fromtimestamp(sig.block_time)
                    if (now - tx_time).days < 7:  # Transactions in last 7 days
                        recent_transactions += 1
            
            # Normalize score
            activity_score = min(recent_transactions / 100, 1.0)
            return activity_score
            
        except Exception as e:
            logger.error(f"Failed to calculate activity score: {e}")
            return 0.0
    
    def _calculate_risk_score(self, wallet_address: str, signatures: List[Any]) -> float:
        """Calculate risk score for a wallet"""
        try:
            risk_score = 0.0
            
            # High transaction count increases risk
            if len(signatures) > 1000:
                risk_score += 0.3
            
            # Recent high activity increases risk
            recent_transactions = 0
            now = datetime.now()
            
            for sig in signatures[:50]:
                if sig.block_time:
                    tx_time = datetime.fromtimestamp(sig.block_time)
                    if (now - tx_time).hours < 24:  # Transactions in last 24 hours
                        recent_transactions += 1
            
            if recent_transactions > 50:
                risk_score += 0.4
            
            # Unusual patterns increase risk
            if len(signatures) > 0 and recent_transactions > 100:
                risk_score += 0.3
            
            return min(risk_score, 1.0)
            
        except Exception as e:
            logger.error(f"Failed to calculate risk score: {e}")
            return 0.0
    
    def _get_risk_recommendations(self, risk_score: float, risk_factors: Dict[str, bool]) -> List[str]:
        """Get risk mitigation recommendations"""
        recommendations = []
        
        if risk_score > 0.7:
            recommendations.append("High risk detected. Consider additional verification.")
        
        if risk_factors.get("high_volume_transactions"):
            recommendations.append("Monitor for unusual transaction patterns.")
        
        if risk_factors.get("frequent_address_changes"):
            recommendations.append("Verify wallet ownership and activity.")
        
        if risk_factors.get("unusual_patterns"):
            recommendations.append("Review transaction history for anomalies.")
        
        return recommendations
    
    async def _start_real_time_monitoring(self):
        """Start real-time monitoring of blockchain events"""
        try:
            # Start WebSocket connection for real-time updates
            asyncio.create_task(self._websocket_monitor())
            
            # Start periodic analytics updates
            asyncio.create_task(self._periodic_analytics())
            
        except Exception as e:
            logger.error(f"Failed to start real-time monitoring: {e}")
    
    async def _websocket_monitor(self):
        """Monitor blockchain events via WebSocket"""
        try:
            async with websockets.connect(self.websocket_url) as websocket:
                # Subscribe to relevant events
                await websocket.send(json.dumps({
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "logsSubscribe",
                    "params": [
                        {"mentions": ["11111111111111111111111111111111"]},  # System program
                        {"commitment": "confirmed"}
                    ]
                }))
                
                async for message in websocket:
                    try:
                        data = json.loads(message)
                        await self._process_websocket_event(data)
                    except Exception as e:
                        logger.error(f"Failed to process WebSocket event: {e}")
                        
        except Exception as e:
            logger.error(f"WebSocket monitoring failed: {e}")
    
    async def _process_websocket_event(self, event_data: Dict[str, Any]):
        """Process real-time blockchain events"""
        try:
            # Process different types of events
            if "result" in event_data:
                result = event_data["result"]
                
                # Update analytics data
                await self._update_real_time_analytics(result)
                
        except Exception as e:
            logger.error(f"Failed to process WebSocket event: {e}")
    
    async def _update_real_time_analytics(self, event_data: Dict[str, Any]):
        """Update analytics data with real-time events"""
        try:
            # Update relevant analytics metrics
            timestamp = datetime.now()
            
            # Store event data
            self.analytics_data[timestamp] = event_data
            
            # Update metrics
            await self._update_metrics(event_data)
            
        except Exception as e:
            logger.error(f"Failed to update real-time analytics: {e}")
    
    async def _update_metrics(self, event_data: Dict[str, Any]):
        """Update analytics metrics"""
        try:
            # Update various metrics based on event data
            # This would update transaction counts, volumes, etc.
            pass
            
        except Exception as e:
            logger.error(f"Failed to update metrics: {e}")
    
    async def _background_analytics(self):
        """Background analytics processing"""
        try:
            while True:
                # Process analytics data
                await self._process_analytics_data()
                
                # Update trends
                await self._update_trends()
                
                # Clean up old data
                await self._cleanup_old_data()
                
                # Wait before next iteration
                await asyncio.sleep(60)  # Run every minute
                
        except Exception as e:
            logger.error(f"Background analytics failed: {e}")
    
    async def _process_analytics_data(self):
        """Process accumulated analytics data"""
        try:
            # Process and analyze collected data
            # This would include trend analysis, pattern detection, etc.
            pass
            
        except Exception as e:
            logger.error(f"Failed to process analytics data: {e}")
    
    async def _update_trends(self):
        """Update trending items and patterns"""
        try:
            # Update trending tokens, NFTs, etc.
            # This would analyze recent activity to identify trends
            pass
            
        except Exception as e:
            logger.error(f"Failed to update trends: {e}")
    
    async def _cleanup_old_data(self):
        """Clean up old analytics data"""
        try:
            # Remove data older than 30 days
            cutoff_date = datetime.now() - timedelta(days=30)
            
            keys_to_remove = []
            for timestamp in self.analytics_data.keys():
                if timestamp < cutoff_date:
                    keys_to_remove.append(timestamp)
            
            for key in keys_to_remove:
                del self.analytics_data[key]
                
        except Exception as e:
            logger.error(f"Failed to cleanup old data: {e}")
    
    async def _load_historical_data(self):
        """Load historical analytics data"""
        try:
            # Load historical data from database
            # This would populate initial analytics data
            pass
            
        except Exception as e:
            logger.error(f"Failed to load historical data: {e}")
    
    async def _periodic_analytics(self):
        """Run periodic analytics updates"""
        try:
            while True:
                # Update market analytics
                await self.get_market_analytics()
                
                # Update network analytics
                await self.get_network_analytics()
                
                # Wait before next update
                await asyncio.sleep(300)  # Run every 5 minutes
                
        except Exception as e:
            logger.error(f"Periodic analytics failed: {e}")
