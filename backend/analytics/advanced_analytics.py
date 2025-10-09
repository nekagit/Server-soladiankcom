"""
Advanced Analytics Service for Soladia Marketplace
Provides comprehensive analytics for blockchain, trading, and user behavior
"""

import asyncio
import aiohttp
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging
from collections import defaultdict
import statistics

logger = logging.getLogger(__name__)

@dataclass
class TradingMetrics:
    """Trading performance metrics"""
    total_volume: float
    total_trades: int
    average_trade_size: float
    win_rate: float
    profit_loss: float
    sharpe_ratio: float
    max_drawdown: float
    volatility: float

@dataclass
class MarketTrends:
    """Market trend analysis"""
    trend_direction: str  # 'bullish', 'bearish', 'sideways'
    trend_strength: float  # 0-1
    support_level: float
    resistance_level: float
    volume_trend: str
    momentum: float

@dataclass
class UserBehavior:
    """User behavior analytics"""
    session_duration: float
    page_views: int
    bounce_rate: float
    conversion_rate: float
    favorite_categories: List[str]
    trading_frequency: float
    risk_tolerance: str

@dataclass
class BlockchainMetrics:
    """Blockchain network metrics"""
    network_hash_rate: float
    transaction_count: int
    average_gas_price: float
    block_time: float
    active_addresses: int
    network_health: float

class AdvancedAnalyticsService:
    """Advanced analytics service for comprehensive market analysis"""
    
    def __init__(self, 
                 solana_rpc_url: str = "https://api.mainnet-beta.solana.com",
                 database_connection=None):
        self.solana_rpc_url = solana_rpc_url
        self.db = database_connection
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        await self.connect()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
        
    async def connect(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        )
        
    async def close(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()
            
    async def get_trading_analytics(self, 
                                   user_id: Optional[str] = None,
                                   time_period: str = '30d') -> Dict[str, Any]:
        """Get comprehensive trading analytics"""
        try:
            # Get trading data
            trades = await self._get_trading_data(user_id, time_period)
            
            if not trades:
                return self._empty_analytics()
                
            # Calculate metrics
            metrics = self._calculate_trading_metrics(trades)
            
            # Get market comparison
            market_comparison = await self._get_market_comparison(time_period)
            
            # Get performance insights
            insights = self._generate_performance_insights(metrics, market_comparison)
            
            return {
                'metrics': metrics,
                'market_comparison': market_comparison,
                'insights': insights,
                'time_period': time_period,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get trading analytics: {str(e)}")
            return self._empty_analytics()
            
    async def get_market_trends(self, 
                               asset_type: str = 'nft',
                               time_period: str = '7d') -> MarketTrends:
        """Analyze market trends for specific asset type"""
        try:
            # Get price data
            price_data = await self._get_price_data(asset_type, time_period)
            
            if not price_data:
                return self._empty_market_trends()
                
            # Calculate trend indicators
            trend_direction = self._calculate_trend_direction(price_data)
            trend_strength = self._calculate_trend_strength(price_data)
            support_resistance = self._calculate_support_resistance(price_data)
            volume_trend = self._analyze_volume_trend(price_data)
            momentum = self._calculate_momentum(price_data)
            
            return MarketTrends(
                trend_direction=trend_direction,
                trend_strength=trend_strength,
                support_level=support_resistance['support'],
                resistance_level=support_resistance['resistance'],
                volume_trend=volume_trend,
                momentum=momentum
            )
            
        except Exception as e:
            logger.error(f"Failed to analyze market trends: {str(e)}")
            return self._empty_market_trends()
            
    async def get_user_behavior_analytics(self, 
                                        user_id: str,
                                        time_period: str = '30d') -> UserBehavior:
        """Analyze user behavior patterns"""
        try:
            # Get user activity data
            activity_data = await self._get_user_activity(user_id, time_period)
            
            if not activity_data:
                return self._empty_user_behavior()
                
            # Calculate behavior metrics
            session_duration = self._calculate_average_session_duration(activity_data)
            page_views = self._calculate_total_page_views(activity_data)
            bounce_rate = self._calculate_bounce_rate(activity_data)
            conversion_rate = self._calculate_conversion_rate(activity_data)
            favorite_categories = self._get_favorite_categories(activity_data)
            trading_frequency = self._calculate_trading_frequency(activity_data)
            risk_tolerance = self._assess_risk_tolerance(activity_data)
            
            return UserBehavior(
                session_duration=session_duration,
                page_views=page_views,
                bounce_rate=bounce_rate,
                conversion_rate=conversion_rate,
                favorite_categories=favorite_categories,
                trading_frequency=trading_frequency,
                risk_tolerance=risk_tolerance
            )
            
        except Exception as e:
            logger.error(f"Failed to analyze user behavior: {str(e)}")
            return self._empty_user_behavior()
            
    async def get_blockchain_analytics(self) -> BlockchainMetrics:
        """Get comprehensive blockchain network analytics"""
        try:
            if not self.session:
                await self.connect()
                
            # Get network statistics
            network_stats = await self._get_network_statistics()
            
            # Calculate network health
            network_health = self._calculate_network_health(network_stats)
            
            return BlockchainMetrics(
                network_hash_rate=network_stats.get('hash_rate', 0),
                transaction_count=network_stats.get('transaction_count', 0),
                average_gas_price=network_stats.get('average_gas_price', 0),
                block_time=network_stats.get('block_time', 0),
                active_addresses=network_stats.get('active_addresses', 0),
                network_health=network_health
            )
            
        except Exception as e:
            logger.error(f"Failed to get blockchain analytics: {str(e)}")
            return self._empty_blockchain_metrics()
            
    async def get_predictive_analytics(self, 
                                     asset_type: str = 'nft',
                                     prediction_horizon: str = '7d') -> Dict[str, Any]:
        """Get predictive analytics and forecasts"""
        try:
            # Get historical data
            historical_data = await self._get_historical_data(asset_type, '90d')
            
            if not historical_data:
                return self._empty_predictions()
                
            # Generate predictions
            price_predictions = self._predict_prices(historical_data, prediction_horizon)
            volume_predictions = self._predict_volume(historical_data, prediction_horizon)
            trend_predictions = self._predict_trends(historical_data, prediction_horizon)
            
            # Calculate confidence intervals
            confidence_intervals = self._calculate_confidence_intervals(price_predictions)
            
            return {
                'price_predictions': price_predictions,
                'volume_predictions': volume_predictions,
                'trend_predictions': trend_predictions,
                'confidence_intervals': confidence_intervals,
                'prediction_horizon': prediction_horizon,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get predictive analytics: {str(e)}")
            return self._empty_predictions()
            
    async def get_risk_analysis(self, 
                               portfolio_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze portfolio risk and diversification"""
        try:
            # Calculate portfolio metrics
            portfolio_metrics = self._calculate_portfolio_metrics(portfolio_data)
            
            # Calculate risk metrics
            risk_metrics = self._calculate_risk_metrics(portfolio_data)
            
            # Calculate diversification metrics
            diversification = self._calculate_diversification(portfolio_data)
            
            # Generate risk recommendations
            recommendations = self._generate_risk_recommendations(portfolio_metrics, risk_metrics)
            
            return {
                'portfolio_metrics': portfolio_metrics,
                'risk_metrics': risk_metrics,
                'diversification': diversification,
                'recommendations': recommendations,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze portfolio risk: {str(e)}")
            return self._empty_risk_analysis()
            
    async def get_social_trading_analytics(self) -> Dict[str, Any]:
        """Get social trading and community analytics"""
        try:
            # Get social trading data
            social_data = await self._get_social_trading_data()
            
            # Calculate leaderboard metrics
            leaderboard = self._calculate_leaderboard(social_data)
            
            # Analyze social sentiment
            sentiment = self._analyze_social_sentiment(social_data)
            
            # Get trending topics
            trending_topics = self._get_trending_topics(social_data)
            
            # Calculate community engagement
            engagement = self._calculate_community_engagement(social_data)
            
            return {
                'leaderboard': leaderboard,
                'sentiment': sentiment,
                'trending_topics': trending_topics,
                'engagement': engagement,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get social trading analytics: {str(e)}")
            return self._empty_social_analytics()
            
    # Private helper methods
    
    async def _get_trading_data(self, user_id: Optional[str], time_period: str) -> List[Dict[str, Any]]:
        """Get trading data from database"""
        # Implementation would query the database for trading data
        # This is a mock implementation
        return []
        
    def _calculate_trading_metrics(self, trades: List[Dict[str, Any]]) -> TradingMetrics:
        """Calculate trading performance metrics"""
        if not trades:
            return self._empty_trading_metrics()
            
        # Calculate basic metrics
        total_volume = sum(trade.get('amount', 0) for trade in trades)
        total_trades = len(trades)
        average_trade_size = total_volume / total_trades if total_trades > 0 else 0
        
        # Calculate win rate
        profitable_trades = sum(1 for trade in trades if trade.get('profit', 0) > 0)
        win_rate = profitable_trades / total_trades if total_trades > 0 else 0
        
        # Calculate profit/loss
        profit_loss = sum(trade.get('profit', 0) for trade in trades)
        
        # Calculate Sharpe ratio (simplified)
        returns = [trade.get('return', 0) for trade in trades if trade.get('return') is not None]
        sharpe_ratio = self._calculate_sharpe_ratio(returns)
        
        # Calculate maximum drawdown
        max_drawdown = self._calculate_max_drawdown(returns)
        
        # Calculate volatility
        volatility = statistics.stdev(returns) if len(returns) > 1 else 0
        
        return TradingMetrics(
            total_volume=total_volume,
            total_trades=total_trades,
            average_trade_size=average_trade_size,
            win_rate=win_rate,
            profit_loss=profit_loss,
            sharpe_ratio=sharpe_ratio,
            max_drawdown=max_drawdown,
            volatility=volatility
        )
        
    def _calculate_trend_direction(self, price_data: List[Dict[str, Any]]) -> str:
        """Calculate trend direction from price data"""
        if len(price_data) < 2:
            return 'sideways'
            
        prices = [point['price'] for point in price_data]
        first_half = prices[:len(prices)//2]
        second_half = prices[len(prices)//2:]
        
        first_avg = statistics.mean(first_half)
        second_avg = statistics.mean(second_half)
        
        change_percent = (second_avg - first_avg) / first_avg * 100
        
        if change_percent > 5:
            return 'bullish'
        elif change_percent < -5:
            return 'bearish'
        else:
            return 'sideways'
            
    def _calculate_trend_strength(self, price_data: List[Dict[str, Any]]) -> float:
        """Calculate trend strength (0-1)"""
        if len(price_data) < 2:
            return 0.0
            
        prices = [point['price'] for point in price_data]
        
        # Calculate linear regression slope
        n = len(prices)
        x = list(range(n))
        y = prices
        
        # Simple linear regression
        x_mean = statistics.mean(x)
        y_mean = statistics.mean(y)
        
        numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return 0.0
            
        slope = numerator / denominator
        
        # Normalize slope to 0-1 range
        max_slope = max(abs(slope) for _ in range(100))  # Simplified normalization
        strength = min(abs(slope) / max_slope, 1.0) if max_slope > 0 else 0.0
        
        return strength
        
    def _calculate_support_resistance(self, price_data: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate support and resistance levels"""
        if not price_data:
            return {'support': 0.0, 'resistance': 0.0}
            
        prices = [point['price'] for point in price_data]
        
        # Simple support/resistance calculation
        support = min(prices)
        resistance = max(prices)
        
        return {'support': support, 'resistance': resistance}
        
    def _analyze_volume_trend(self, price_data: List[Dict[str, Any]]) -> str:
        """Analyze volume trend"""
        if len(price_data) < 2:
            return 'stable'
            
        volumes = [point.get('volume', 0) for point in price_data]
        first_half = volumes[:len(volumes)//2]
        second_half = volumes[len(volumes)//2:]
        
        first_avg = statistics.mean(first_half)
        second_avg = statistics.mean(second_half)
        
        change_percent = (second_avg - first_avg) / first_avg * 100 if first_avg > 0 else 0
        
        if change_percent > 10:
            return 'increasing'
        elif change_percent < -10:
            return 'decreasing'
        else:
            return 'stable'
            
    def _calculate_momentum(self, price_data: List[Dict[str, Any]]) -> float:
        """Calculate price momentum"""
        if len(price_data) < 2:
            return 0.0
            
        prices = [point['price'] for point in price_data]
        
        # Calculate rate of change
        if len(prices) >= 14:  # 14-day momentum
            momentum = (prices[-1] - prices[-14]) / prices[-14] * 100
        else:
            momentum = (prices[-1] - prices[0]) / prices[0] * 100 if prices[0] > 0 else 0
            
        return momentum
        
    def _calculate_sharpe_ratio(self, returns: List[float]) -> float:
        """Calculate Sharpe ratio"""
        if not returns or len(returns) < 2:
            return 0.0
            
        mean_return = statistics.mean(returns)
        std_return = statistics.stdev(returns)
        
        if std_return == 0:
            return 0.0
            
        # Assuming risk-free rate of 0 for simplicity
        sharpe_ratio = mean_return / std_return
        return sharpe_ratio
        
    def _calculate_max_drawdown(self, returns: List[float]) -> float:
        """Calculate maximum drawdown"""
        if not returns:
            return 0.0
            
        cumulative_returns = []
        cumulative = 1.0
        
        for ret in returns:
            cumulative *= (1 + ret)
            cumulative_returns.append(cumulative)
            
        peak = cumulative_returns[0]
        max_drawdown = 0.0
        
        for value in cumulative_returns:
            if value > peak:
                peak = value
            drawdown = (peak - value) / peak
            max_drawdown = max(max_drawdown, drawdown)
            
        return max_drawdown
        
    # Empty data methods
    def _empty_analytics(self) -> Dict[str, Any]:
        return {
            'metrics': self._empty_trading_metrics(),
            'market_comparison': {},
            'insights': [],
            'time_period': '30d',
            'generated_at': datetime.utcnow().isoformat()
        }
        
    def _empty_trading_metrics(self) -> TradingMetrics:
        return TradingMetrics(
            total_volume=0.0,
            total_trades=0,
            average_trade_size=0.0,
            win_rate=0.0,
            profit_loss=0.0,
            sharpe_ratio=0.0,
            max_drawdown=0.0,
            volatility=0.0
        )
        
    def _empty_market_trends(self) -> MarketTrends:
        return MarketTrends(
            trend_direction='sideways',
            trend_strength=0.0,
            support_level=0.0,
            resistance_level=0.0,
            volume_trend='stable',
            momentum=0.0
        )
        
    def _empty_user_behavior(self) -> UserBehavior:
        return UserBehavior(
            session_duration=0.0,
            page_views=0,
            bounce_rate=0.0,
            conversion_rate=0.0,
            favorite_categories=[],
            trading_frequency=0.0,
            risk_tolerance='conservative'
        )
        
    def _empty_blockchain_metrics(self) -> BlockchainMetrics:
        return BlockchainMetrics(
            network_hash_rate=0.0,
            transaction_count=0,
            average_gas_price=0.0,
            block_time=0.0,
            active_addresses=0,
            network_health=0.0
        )
        
    def _empty_predictions(self) -> Dict[str, Any]:
        return {
            'price_predictions': [],
            'volume_predictions': [],
            'trend_predictions': [],
            'confidence_intervals': {},
            'prediction_horizon': '7d',
            'generated_at': datetime.utcnow().isoformat()
        }
        
    def _empty_risk_analysis(self) -> Dict[str, Any]:
        return {
            'portfolio_metrics': {},
            'risk_metrics': {},
            'diversification': {},
            'recommendations': [],
            'generated_at': datetime.utcnow().isoformat()
        }
        
    def _empty_social_analytics(self) -> Dict[str, Any]:
        return {
            'leaderboard': [],
            'sentiment': {},
            'trending_topics': [],
            'engagement': {},
            'generated_at': datetime.utcnow().isoformat()
        }

# Create singleton instance
advanced_analytics_service = AdvancedAnalyticsService()




