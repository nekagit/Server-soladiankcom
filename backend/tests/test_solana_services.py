"""
Test suite for Solana services
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.solana.wallet_service import SolanaWalletService
from backend.solana.transaction_service import SolanaTransactionService
from backend.solana.nft_service import SolanaNFTService
from backend.solana.token_service import SolanaTokenService


class TestSolanaWalletService:
    """Test cases for SolanaWalletService"""

    @pytest.fixture
    def mock_rpc_client(self):
        """Create mock RPC client"""
        client = AsyncMock()
        client.get_balance.return_value = AsyncMock(
            result={"value": 1000000000},
            error=None
        )
        client.get_account_info.return_value = AsyncMock(
            result={"data": ["base64-data", "base64"]},
            error=None
        )
        return client

    @pytest.fixture
    def wallet_service(self, mock_rpc_client):
        """Create wallet service instance"""
        return SolanaWalletService(mock_rpc_client)

    @pytest.mark.asyncio
    async def test_get_wallet_balance(self, wallet_service, mock_rpc_client):
        """Test wallet balance retrieval"""
        balance = await wallet_service.get_wallet_balance("test-address")

        assert balance == 1.0  # 1000000000 lamports = 1 SOL
        mock_rpc_client.get_balance.assert_called_once_with("test-address")

    @pytest.mark.asyncio
    async def test_get_wallet_info(self, wallet_service, mock_rpc_client):
        """Test wallet info retrieval"""
        info = await wallet_service.get_wallet_info("test-address")

        assert "balance" in info
        assert "address" in info
        assert info["balance"] == 1.0

    @pytest.mark.asyncio
    async def test_validate_wallet_address(self, wallet_service):
        """Test wallet address validation"""
        # Valid address
        assert wallet_service.validate_wallet_address("11111111111111111111111111111112") == True
        
        # Invalid address (too short)
        assert wallet_service.validate_wallet_address("invalid") == False
        
        # Invalid address (too long)
        assert wallet_service.validate_wallet_address("1" * 50) == False

    @pytest.mark.asyncio
    async def test_get_wallet_tokens(self, wallet_service, mock_rpc_client):
        """Test wallet token retrieval"""
        mock_rpc_client.get_token_accounts_by_owner.return_value = AsyncMock(
            result={
                "value": [
                    {
                        "pubkey": "token-account-1",
                        "account": {
                            "data": {
                                "parsed": {
                                    "info": {
                                        "mint": "token-mint-1",
                                        "tokenAmount": {"amount": "1000000", "decimals": 6}
                                    }
                                }
                            }
                        }
                    }
                ]
            },
            error=None
        )

        tokens = await wallet_service.get_wallet_tokens("test-address")

        assert len(tokens) == 1
        assert tokens[0]["mint"] == "token-mint-1"
        assert tokens[0]["amount"] == 1.0  # 1000000 / 10^6


class TestSolanaTransactionService:
    """Test cases for SolanaTransactionService"""

    @pytest.fixture
    def mock_rpc_client(self):
        """Create mock RPC client"""
        client = AsyncMock()
        client.get_transaction.return_value = AsyncMock(
            result={
                "signature": "test-signature",
                "slot": 123456,
                "blockTime": 1640995200,
                "meta": {"err": None}
            },
            error=None
        )
        client.send_transaction.return_value = AsyncMock(
            result="transaction-signature",
            error=None
        )
        client.get_signature_statuses.return_value = AsyncMock(
            result={"value": [{"signature": "test-signature", "err": None}]},
            error=None
        )
        return client

    @pytest.fixture
    def transaction_service(self, mock_rpc_client):
        """Create transaction service instance"""
        return SolanaTransactionService(mock_rpc_client)

    @pytest.mark.asyncio
    async def test_get_transaction(self, transaction_service, mock_rpc_client):
        """Test transaction retrieval"""
        transaction = await transaction_service.get_transaction("test-signature")

        assert transaction["signature"] == "test-signature"
        assert transaction["slot"] == 123456
        mock_rpc_client.get_transaction.assert_called_once_with("test-signature")

    @pytest.mark.asyncio
    async def test_send_transaction(self, transaction_service, mock_rpc_client):
        """Test transaction sending"""
        signature = await transaction_service.send_transaction("encoded-transaction")

        assert signature == "transaction-signature"
        mock_rpc_client.send_transaction.assert_called_once_with("encoded-transaction")

    @pytest.mark.asyncio
    async def test_get_transaction_status(self, transaction_service, mock_rpc_client):
        """Test transaction status retrieval"""
        status = await transaction_service.get_transaction_status("test-signature")

        assert status["signature"] == "test-signature"
        assert status["err"] is None
        mock_rpc_client.get_signature_statuses.assert_called_once_with(["test-signature"])

    @pytest.mark.asyncio
    async def test_wait_for_confirmation(self, transaction_service, mock_rpc_client):
        """Test waiting for transaction confirmation"""
        status = await transaction_service.wait_for_confirmation("test-signature", 1000)

        assert status["signature"] == "test-signature"
        assert status["err"] is None


class TestSolanaNFTService:
    """Test cases for SolanaNFTService"""

    @pytest.fixture
    def mock_rpc_client(self):
        """Create mock RPC client"""
        client = AsyncMock()
        client.get_token_accounts_by_owner.return_value = AsyncMock(
            result={
                "value": [
                    {
                        "pubkey": "token-account-1",
                        "account": {
                            "data": {
                                "parsed": {
                                    "info": {
                                        "mint": "nft-mint-1",
                                        "tokenAmount": {"amount": "1"}
                                    }
                                }
                            }
                        }
                    }
                ]
            },
            error=None
        )
        client.get_account_info.return_value = AsyncMock(
            result={
                "data": ["base64-metadata", "base64"]
            },
            error=None
        )
        return client

    @pytest.fixture
    def nft_service(self, mock_rpc_client):
        """Create NFT service instance"""
        return SolanaNFTService(mock_rpc_client)

    @pytest.mark.asyncio
    async def test_get_nfts_by_owner(self, nft_service, mock_rpc_client):
        """Test NFT retrieval by owner"""
        nfts = await nft_service.get_nfts_by_owner("owner-address")

        assert len(nfts) == 1
        assert nfts[0]["mint"] == "nft-mint-1"
        mock_rpc_client.get_token_accounts_by_owner.assert_called_once_with("owner-address")

    @pytest.mark.asyncio
    async def test_get_nft_metadata(self, nft_service, mock_rpc_client):
        """Test NFT metadata retrieval"""
        # Mock metadata
        metadata = {"name": "Test NFT", "image": "https://example.com/nft.png"}
        import base64
        import json
        encoded_metadata = base64.b64encode(json.dumps(metadata).encode()).decode()
        
        mock_rpc_client.get_account_info.return_value = AsyncMock(
            result={"data": [encoded_metadata, "base64"]},
            error=None
        )

        result = await nft_service.get_nft_metadata("metadata-address")

        assert result["name"] == "Test NFT"
        assert result["image"] == "https://example.com/nft.png"

    @pytest.mark.asyncio
    async def test_mint_nft(self, nft_service, mock_rpc_client):
        """Test NFT minting"""
        mock_rpc_client.send_transaction.return_value = AsyncMock(
            result="mint-signature",
            error=None
        )

        signature = await nft_service.mint_nft("owner-address", {
            "name": "New NFT",
            "symbol": "NNFT",
            "description": "A new NFT",
            "image": "https://example.com/new-nft.png"
        })

        assert signature == "mint-signature"

    @pytest.mark.asyncio
    async def test_transfer_nft(self, nft_service, mock_rpc_client):
        """Test NFT transfer"""
        mock_rpc_client.send_transaction.return_value = AsyncMock(
            result="transfer-signature",
            error=None
        )

        signature = await nft_service.transfer_nft(
            "from-address",
            "to-address",
            "nft-mint",
            "token-account"
        )

        assert signature == "transfer-signature"


class TestSolanaTokenService:
    """Test cases for SolanaTokenService"""

    @pytest.fixture
    def mock_rpc_client(self):
        """Create mock RPC client"""
        client = AsyncMock()
        client.get_token_supply.return_value = AsyncMock(
            result={"value": {"amount": "1000000000", "decimals": 6}},
            error=None
        )
        client.get_token_accounts_by_owner.return_value = AsyncMock(
            result={
                "value": [
                    {
                        "pubkey": "token-account-1",
                        "account": {
                            "data": {
                                "parsed": {
                                    "info": {
                                        "mint": "token-mint-1",
                                        "tokenAmount": {"amount": "1000000", "decimals": 6}
                                    }
                                }
                            }
                        }
                    }
                ]
            },
            error=None
        )
        return client

    @pytest.fixture
    def token_service(self, mock_rpc_client):
        """Create token service instance"""
        return SolanaTokenService(mock_rpc_client)

    @pytest.mark.asyncio
    async def test_get_token_supply(self, token_service, mock_rpc_client):
        """Test token supply retrieval"""
        supply = await token_service.get_token_supply("token-mint")

        assert supply == 1000.0  # 1000000000 / 10^6
        mock_rpc_client.get_token_supply.assert_called_once_with("token-mint")

    @pytest.mark.asyncio
    async def test_get_token_accounts(self, token_service, mock_rpc_client):
        """Test token accounts retrieval"""
        accounts = await token_service.get_token_accounts("owner-address")

        assert len(accounts) == 1
        assert accounts[0]["mint"] == "token-mint-1"
        assert accounts[0]["amount"] == 1.0

    @pytest.mark.asyncio
    async def test_transfer_tokens(self, token_service, mock_rpc_client):
        """Test token transfer"""
        mock_rpc_client.send_transaction.return_value = AsyncMock(
            result="transfer-signature",
            error=None
        )

        signature = await token_service.transfer_tokens(
            "from-address",
            "to-address",
            "token-mint",
            1.0
        )

        assert signature == "transfer-signature"




