"""
Comprehensive test suite for Solana services
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timezone

from solana.enhanced_service import EnhancedSolanaService, WalletInfo, TokenInfo, TransactionInfo
from solana.config import SolanaConfig
from websocket_service import ConnectionManager, SolanaWebSocketService

class TestEnhancedSolanaService:
    """Test cases for EnhancedSolanaService"""
    
    @pytest.fixture
    def mock_config(self):
        """Mock Solana configuration"""
        return SolanaConfig(
            rpc_url="https://api.devnet.solana.com",
            network="devnet"
        )
    
    @pytest.fixture
    def mock_rpc_client(self):
        """Mock RPC client"""
        client = Mock()
        client.connect = AsyncMock()
        client.close = AsyncMock()
        return client
    
    @pytest.fixture
    def service(self, mock_config, mock_rpc_client):
        """Create service instance with mocked dependencies"""
        with patch('solana.enhanced_service.SolanaRPCClient', return_value=mock_rpc_client):
            return EnhancedSolanaService(mock_config)
    
    @pytest.mark.asyncio
    async def test_get_wallet_info_success(self, service, mock_rpc_client):
        """Test successful wallet info retrieval"""
        # Mock RPC responses
        mock_rpc_client.get_balance.return_value = Mock(
            error=None,
            result=5000000000  # 5 SOL in lamports
        )
        mock_rpc_client.get_account_info.return_value = Mock(
            error=None,
            result={
                "owner": "11111111111111111111111111111111",
                "executable": False,
                "rentEpoch": 100
            }
        )
        
        wallet_address = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
        
        async with service:
            wallet_info = await service.get_wallet_info(wallet_address)
        
        assert isinstance(wallet_info, WalletInfo)
        assert wallet_info.address == wallet_address
        assert wallet_info.balance == 5.0
        assert wallet_info.lamports == 5000000000
        assert wallet_info.exists is True
        assert wallet_info.owner == "11111111111111111111111111111111"
        assert wallet_info.executable is False
        assert wallet_info.rent_epoch == 100
    
    @pytest.mark.asyncio
    async def test_get_wallet_info_nonexistent(self, service, mock_rpc_client):
        """Test wallet info for non-existent wallet"""
        # Mock RPC responses
        mock_rpc_client.get_balance.return_value = Mock(
            error=None,
            result=0
        )
        mock_rpc_client.get_account_info.return_value = Mock(
            error={"code": -32600, "message": "Invalid account"},
            result=None
        )
        
        wallet_address = "InvalidAddress"
        
        async with service:
            wallet_info = await service.get_wallet_info(wallet_address)
        
        assert isinstance(wallet_info, WalletInfo)
        assert wallet_info.address == wallet_address
        assert wallet_info.balance == 0.0
        assert wallet_info.lamports == 0
        assert wallet_info.exists is False
    
    @pytest.mark.asyncio
    async def test_validate_wallet_address_valid(self, service, mock_rpc_client):
        """Test wallet address validation for valid address"""
        mock_rpc_client.get_account_info.return_value = Mock(
            error=None,
            result={"owner": "11111111111111111111111111111111"}
        )
        
        wallet_address = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
        
        async with service:
            is_valid = await service.validate_wallet_address(wallet_address)
        
        assert is_valid is True
    
    @pytest.mark.asyncio
    async def test_validate_wallet_address_invalid(self, service, mock_rpc_client):
        """Test wallet address validation for invalid address"""
        mock_rpc_client.get_account_info.return_value = Mock(
            error={"code": -32600, "message": "Invalid account"},
            result=None
        )
        
        wallet_address = "InvalidAddress"
        
        async with service:
            is_valid = await service.validate_wallet_address(wallet_address)
        
        assert is_valid is False
    
    @pytest.mark.asyncio
    async def test_get_token_accounts_success(self, service, mock_rpc_client):
        """Test successful token accounts retrieval"""
        mock_rpc_client.get_token_accounts_by_owner.return_value = Mock(
            error=None,
            result={
                "value": [
                    {
                        "account": {
                            "data": {
                                "parsed": {
                                    "info": {
                                        "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                                        "tokenAmount": {
                                            "amount": "1000000000",
                                            "decimals": 6,
                                            "uiAmount": 1000.0
                                        }
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        )
        mock_rpc_client.get_token_supply.return_value = Mock(
            error=None,
            result={"value": {"amount": "1000000000000"}}
        )
        
        wallet_address = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
        
        async with service:
            tokens = await service.get_token_accounts(wallet_address)
        
        assert len(tokens) == 1
        assert isinstance(tokens[0], TokenInfo)
        assert tokens[0].mint == "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        assert tokens[0].balance == 1000.0
        assert tokens[0].ui_amount == 1000.0
        assert tokens[0].decimals == 6
    
    @pytest.mark.asyncio
    async def test_get_transaction_info_success(self, service, mock_rpc_client):
        """Test successful transaction info retrieval"""
        mock_rpc_client.get_transaction.return_value = Mock(
            error=None,
            result={
                "slot": 12345,
                "blockTime": 1640995200,
                "confirmationStatus": "confirmed",
                "meta": {
                    "err": None,
                    "logMessages": ["Program log: Transfer successful"],
                    "fee": 5000
                }
            }
        )
        
        signature = "5J7X8C9D2E1F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7"
        
        async with service:
            tx_info = await service.get_transaction_info(signature)
        
        assert isinstance(tx_info, TransactionInfo)
        assert tx_info.signature == signature
        assert tx_info.slot == 12345
        assert tx_info.block_time == 1640995200
        assert tx_info.confirmation_status == "confirmed"
        assert tx_info.success is True
        assert tx_info.error is None
        assert tx_info.fee == 5000
    
    @pytest.mark.asyncio
    async def test_simulate_payment_success(self, service, mock_rpc_client):
        """Test successful payment simulation"""
        # Mock wallet info responses
        mock_rpc_client.get_balance.return_value = Mock(
            error=None,
            result=10000000000  # 10 SOL
        )
        mock_rpc_client.get_account_info.return_value = Mock(
            error=None,
            result={"owner": "11111111111111111111111111111111"}
        )
        
        from_wallet = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
        to_wallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
        amount = 2.5
        
        async with service:
            result = await service.simulate_payment(from_wallet, to_wallet, amount)
        
        assert result["success"] is True
        assert result["from_balance"] == 10.0
        assert result["amount"] == amount
        assert "estimated_fee" in result
    
    @pytest.mark.asyncio
    async def test_simulate_payment_insufficient_balance(self, service, mock_rpc_client):
        """Test payment simulation with insufficient balance"""
        # Mock wallet info responses
        mock_rpc_client.get_balance.return_value = Mock(
            error=None,
            result=1000000000  # 1 SOL
        )
        mock_rpc_client.get_account_info.return_value = Mock(
            error=None,
            result={"owner": "11111111111111111111111111111111"}
        )
        
        from_wallet = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
        to_wallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
        amount = 2.5
        
        async with service:
            result = await service.simulate_payment(from_wallet, to_wallet, amount)
        
        assert result["success"] is False
        assert "Insufficient balance" in result["error"]
    
    @pytest.mark.asyncio
    async def test_get_system_health_success(self, service, mock_rpc_client):
        """Test successful system health check"""
        mock_rpc_client.get_health.return_value = Mock(
            error=None,
            result="ok"
        )
        mock_rpc_client.get_version.return_value = Mock(
            error=None,
            result={"solana-core": "1.14.0"}
        )
        mock_rpc_client.get_block_height.return_value = Mock(
            error=None,
            result=12345
        )
        
        async with service:
            health = await service.get_system_health()
        
        assert health["rpc_status"] == "healthy"
        assert "version" in health
        assert "current_slot" in health
        assert "timestamp" in health
    
    @pytest.mark.asyncio
    async def test_get_system_health_failure(self, service, mock_rpc_client):
        """Test system health check with RPC failure"""
        mock_rpc_client.get_health.return_value = Mock(
            error={"code": -32600, "message": "RPC error"},
            result=None
        )
        
        async with service:
            health = await service.get_system_health()
        
        assert health["rpc_status"] == "unhealthy"
        assert "error" in health


class TestConnectionManager:
    """Test cases for ConnectionManager"""
    
    @pytest.fixture
    def manager(self):
        """Create ConnectionManager instance"""
        return ConnectionManager()
    
    @pytest.fixture
    def mock_websocket(self):
        """Mock WebSocket connection"""
        websocket = Mock()
        websocket.accept = AsyncMock()
        websocket.send_text = AsyncMock()
        websocket.close = AsyncMock()
        return websocket
    
    @pytest.mark.asyncio
    async def test_connect_success(self, manager, mock_websocket):
        """Test successful connection"""
        client_id = await manager.connect(mock_websocket, "user123")
        
        assert client_id is not None
        assert len(manager.connection_metadata) == 1
        assert "user123" in manager.active_connections
        assert mock_websocket in manager.active_connections["user123"]
        mock_websocket.accept.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_disconnect(self, manager, mock_websocket):
        """Test connection disconnection"""
        await manager.connect(mock_websocket, "user123")
        manager.disconnect(mock_websocket)
        
        assert len(manager.connection_metadata) == 0
        assert "user123" not in manager.active_connections
    
    @pytest.mark.asyncio
    async def test_subscribe_to_topic(self, manager, mock_websocket):
        """Test topic subscription"""
        await manager.connect(mock_websocket, "user123")
        await manager.subscribe_to_topic(mock_websocket, "wallet_updates")
        
        assert mock_websocket in manager.subscriptions["wallet_updates"]
        assert "wallet_updates" in manager.connection_metadata[mock_websocket]["subscriptions"]
    
    @pytest.mark.asyncio
    async def test_broadcast_to_topic(self, manager, mock_websocket):
        """Test topic broadcasting"""
        await manager.connect(mock_websocket, "user123")
        await manager.subscribe_to_topic(mock_websocket, "wallet_updates")
        
        message = "Test message"
        await manager.broadcast_to_topic(message, "wallet_updates")
        
        mock_websocket.send_text.assert_called_with(message)
    
    def test_get_stats(self, manager):
        """Test statistics retrieval"""
        stats = manager.get_stats()
        
        assert "total_connections" in stats
        assert "total_users" in stats
        assert "topic_subscriptions" in stats
        assert "timestamp" in stats


class TestSolanaWebSocketService:
    """Test cases for SolanaWebSocketService"""
    
    @pytest.fixture
    def manager(self):
        """Create ConnectionManager instance"""
        return ConnectionManager()
    
    @pytest.fixture
    def service(self, manager):
        """Create SolanaWebSocketService instance"""
        return SolanaWebSocketService(manager)
    
    @pytest.mark.asyncio
    async def test_start_stop(self, service):
        """Test service start and stop"""
        await service.start()
        assert service.running is True
        assert len(service.tasks) > 0
        
        await service.stop()
        assert service.running is False
    
    @pytest.mark.asyncio
    async def test_notify_wallet_change(self, service, manager, mock_websocket):
        """Test wallet change notification"""
        await manager.connect(mock_websocket, "user123")
        
        await service.notify_wallet_change("user123", "wallet123", 5.0)
        
        mock_websocket.send_text.assert_called_once()
        call_args = mock_websocket.send_text.call_args[0][0]
        message = json.loads(call_args)
        assert message["type"] == "wallet_balance_change"
        assert message["data"]["wallet_address"] == "wallet123"
        assert message["data"]["balance"] == 5.0
    
    @pytest.mark.asyncio
    async def test_notify_transaction_update(self, service, manager, mock_websocket):
        """Test transaction update notification"""
        await manager.connect(mock_websocket, "user123")
        
        await service.notify_transaction_update("tx123", "confirmed", "user123")
        
        mock_websocket.send_text.assert_called_once()
        call_args = mock_websocket.send_text.call_args[0][0]
        message = json.loads(call_args)
        assert message["type"] == "transaction_status_change"
        assert message["data"]["signature"] == "tx123"
        assert message["data"]["status"] == "confirmed"


# Integration tests
class TestSolanaIntegration:
    """Integration tests for Solana services"""
    
    @pytest.mark.asyncio
    async def test_full_wallet_workflow(self):
        """Test complete wallet workflow"""
        # This would test the full integration between services
        # In a real test, this would use actual test RPC endpoints
        pass
    
    @pytest.mark.asyncio
    async def test_websocket_integration(self):
        """Test WebSocket integration with Solana services"""
        # This would test the integration between WebSocket service and Solana services
        pass


# Performance tests
class TestSolanaPerformance:
    """Performance tests for Solana services"""
    
    @pytest.mark.asyncio
    async def test_concurrent_wallet_requests(self):
        """Test concurrent wallet info requests"""
        # This would test performance under load
        pass
    
    @pytest.mark.asyncio
    async def test_websocket_scalability(self):
        """Test WebSocket service scalability"""
        # This would test WebSocket performance with many connections
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
