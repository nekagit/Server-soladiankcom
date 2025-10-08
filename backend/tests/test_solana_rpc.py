"""
Test suite for Solana RPC client
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from backend.solana.rpc_client import SolanaRPCClient, RPCResponse
from backend.solana.config import SolanaConfig


class TestSolanaRPCClient:
    """Test cases for SolanaRPCClient"""

    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return SolanaConfig(
            rpc_url="https://api.testnet.solana.com",
            network="testnet",
            commitment="confirmed"
        )

    @pytest.fixture
    def client(self, config):
        """Create RPC client instance"""
        return SolanaRPCClient(config)

    @pytest.mark.asyncio
    async def test_connect(self, client):
        """Test client connection"""
        async with client:
            assert client.session is not None
            assert not client.session.closed

    @pytest.mark.asyncio
    async def test_get_balance_success(self, client):
        """Test successful balance retrieval"""
        mock_response = {
            "jsonrpc": "2.0",
            "result": {"value": 1000000000},
            "id": "1"
        }

        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response_obj = AsyncMock()
            mock_response_obj.status = 200
            mock_response_obj.json = AsyncMock(return_value=mock_response)
            mock_post.return_value.__aenter__.return_value = mock_response_obj

            async with client:
                response = await client.get_balance("test-address")

            assert response.result == {"value": 1000000000}
            assert response.error is None

    @pytest.mark.asyncio
    async def test_get_balance_error(self, client):
        """Test balance retrieval with error"""
        mock_response = {
            "jsonrpc": "2.0",
            "error": {"code": -32602, "message": "Invalid address"},
            "id": "1"
        }

        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response_obj = AsyncMock()
            mock_response_obj.status = 200
            mock_response_obj.json = AsyncMock(return_value=mock_response)
            mock_post.return_value.__aenter__.return_value = mock_response_obj

            async with client:
                response = await client.get_balance("invalid-address")

            assert response.result is None
            assert response.error == {"code": -32602, "message": "Invalid address"}

    @pytest.mark.asyncio
    async def test_send_transaction_success(self, client):
        """Test successful transaction sending"""
        mock_response = {
            "jsonrpc": "2.0",
            "result": "transaction-signature-123",
            "id": "1"
        }

        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response_obj = AsyncMock()
            mock_response_obj.status = 200
            mock_response_obj.json = AsyncMock(return_value=mock_response)
            mock_post.return_value.__aenter__.return_value = mock_response_obj

            async with client:
                response = await client.send_transaction("encoded-transaction")

            assert response.result == "transaction-signature-123"
            assert response.error is None

    @pytest.mark.asyncio
    async def test_get_transaction_success(self, client):
        """Test successful transaction retrieval"""
        mock_transaction = {
            "signature": "test-signature",
            "slot": 123456,
            "blockTime": 1640995200,
            "meta": {"err": None},
            "transaction": {
                "message": {
                    "accountKeys": ["sender", "receiver"],
                    "instructions": []
                }
            }
        }

        mock_response = {
            "jsonrpc": "2.0",
            "result": mock_transaction,
            "id": "1"
        }

        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response_obj = AsyncMock()
            mock_response_obj.status = 200
            mock_response_obj.json = AsyncMock(return_value=mock_response)
            mock_post.return_value.__aenter__.return_value = mock_response_obj

            async with client:
                response = await client.get_transaction("test-signature")

            assert response.result == mock_transaction
            assert response.error is None

    @pytest.mark.asyncio
    async def test_get_token_accounts_by_owner(self, client):
        """Test token accounts retrieval"""
        mock_response = {
            "jsonrpc": "2.0",
            "result": {
                "value": [
                    {
                        "pubkey": "token-account-1",
                        "account": {
                            "data": {
                                "parsed": {
                                    "info": {
                                        "mint": "token-mint-1",
                                        "tokenAmount": {"amount": "1000000"}
                                    }
                                }
                            }
                        }
                    }
                ]
            },
            "id": "1"
        }

        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response_obj = AsyncMock()
            mock_response_obj.status = 200
            mock_response_obj.json = AsyncMock(return_value=mock_response)
            mock_post.return_value.__aenter__.return_value = mock_response_obj

            async with client:
                response = await client.get_token_accounts_by_owner("owner-address")

            assert response.result["value"] is not None
            assert len(response.result["value"]) == 1

    @pytest.mark.asyncio
    async def test_http_error_handling(self, client):
        """Test HTTP error handling"""
        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response_obj = AsyncMock()
            mock_response_obj.status = 500
            mock_response_obj.json = AsyncMock(return_value={"error": "Internal Server Error"})
            mock_post.return_value.__aenter__.return_value = mock_response_obj

            async with client:
                response = await client.get_balance("test-address")

            assert response.result is None
            assert response.error["code"] == 500

    @pytest.mark.asyncio
    async def test_timeout_handling(self, client):
        """Test timeout handling"""
        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_post.side_effect = asyncio.TimeoutError()

            async with client:
                response = await client.get_balance("test-address")

            assert response.result is None
            assert response.error["code"] == -1
            assert "timeout" in response.error["message"].lower()

    @pytest.mark.asyncio
    async def test_connection_pool_cleanup(self, client):
        """Test connection pool cleanup"""
        async with client:
            assert client.session is not None

        # After context manager, session should be closed
        assert client.session.closed

    def test_get_next_id(self, client):
        """Test request ID generation"""
        id1 = client._get_next_id()
        id2 = client._get_next_id()
        id3 = client._get_next_id()

        assert id1 == "1"
        assert id2 == "2"
        assert id3 == "3"



