"""
Comprehensive Solana Service Tests
Complete testing suite for all Solana-related functionality
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from solana.rpc_client import SolanaRPCClient
from solana.wallet_service import SolanaWalletService
from solana.transaction_service import SolanaTransactionService
from solana.nft_service import SolanaNFTService
from solana.token_service import SolanaTokenService
from solana.payment_processor import SolanaPaymentProcessor
from models.solana_models import SolanaWallet, SolanaTransaction, SolanaNFT, SolanaToken


class TestSolanaRPCClient:
    """Test Solana RPC Client functionality"""
    
    @pytest.fixture
    def rpc_client(self):
        return SolanaRPCClient()
    
    @pytest.mark.asyncio
    async def test_connect_success(self, rpc_client):
        """Test successful RPC connection"""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.json.return_value = {"jsonrpc": "2.0", "result": {"value": "healthy"}}
            mock_response.status = 200
            mock_get.return_value.__aenter__.return_value = mock_response
            
            result = await rpc_client.connect()
            assert result is True
    
    @pytest.mark.asyncio
    async def test_connect_failure(self, rpc_client):
        """Test RPC connection failure"""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.side_effect = Exception("Connection failed")
            
            result = await rpc_client.connect()
            assert result is False
    
    @pytest.mark.asyncio
    async def test_get_balance_success(self, rpc_client):
        """Test getting wallet balance successfully"""
        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "jsonrpc": "2.0",
                "result": {"value": 1000000000}  # 1 SOL in lamports
            }
            mock_response.status = 200
            mock_post.return_value.__aenter__.return_value = mock_response
            
            balance = await rpc_client.get_balance("test-address")
            assert balance == 1.0  # Should convert lamports to SOL
    
    @pytest.mark.asyncio
    async def test_get_balance_failure(self, rpc_client):
        """Test getting wallet balance failure"""
        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_post.side_effect = Exception("RPC error")
            
            with pytest.raises(Exception):
                await rpc_client.get_balance("test-address")
    
    @pytest.mark.asyncio
    async def test_get_account_info_success(self, rpc_client):
        """Test getting account info successfully"""
        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "jsonrpc": "2.0",
                "result": {
                    "value": {
                        "lamports": 1000000000,
                        "owner": "11111111111111111111111111111112",
                        "executable": False,
                        "rentEpoch": 0,
                        "data": ["base64data", "base64"]
                    }
                }
            }
            mock_response.status = 200
            mock_post.return_value.__aenter__.return_value = mock_response
            
            account_info = await rpc_client.get_account_info("test-address")
            assert account_info["lamports"] == 1000000000
            assert account_info["owner"] == "11111111111111111111111111111112"
    
    @pytest.mark.asyncio
    async def test_send_transaction_success(self, rpc_client):
        """Test sending transaction successfully"""
        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "jsonrpc": "2.0",
                "result": "test-signature-123"
            }
            mock_response.status = 200
            mock_post.return_value.__aenter__.return_value = mock_response
            
            signature = await rpc_client.send_transaction("test-transaction")
            assert signature == "test-signature-123"
    
    @pytest.mark.asyncio
    async def test_get_transaction_success(self, rpc_client):
        """Test getting transaction details successfully"""
        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "jsonrpc": "2.0",
                "result": {
                    "slot": 12345,
                    "blockTime": 1640995200,
                    "confirmationStatus": "confirmed",
                    "err": None,
                    "fee": 5000,
                    "accounts": ["account1", "account2"],
                    "instructions": [{"programId": "program1", "accounts": ["acc1"], "data": "data1"}]
                }
            }
            mock_response.status = 200
            mock_post.return_value.__aenter__.return_value = mock_response
            
            transaction = await rpc_client.get_transaction("test-signature")
            assert transaction["slot"] == 12345
            assert transaction["confirmationStatus"] == "confirmed"
            assert transaction["err"] is None


class TestSolanaWalletService:
    """Test Solana Wallet Service functionality"""
    
    @pytest.fixture
    def wallet_service(self):
        return SolanaWalletService()
    
    def test_validate_address_valid(self, wallet_service):
        """Test validating valid Solana address"""
        valid_address = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
        result = wallet_service.validate_address(valid_address)
        assert result is True
    
    def test_validate_address_invalid(self, wallet_service):
        """Test validating invalid Solana address"""
        invalid_address = "invalid-address"
        result = wallet_service.validate_address(invalid_address)
        assert result is False
    
    def test_validate_address_empty(self, wallet_service):
        """Test validating empty address"""
        result = wallet_service.validate_address("")
        assert result is False
    
    def test_validate_address_none(self, wallet_service):
        """Test validating None address"""
        result = wallet_service.validate_address(None)
        assert result is False
    
    @pytest.mark.asyncio
    async def test_get_wallet_info_success(self, wallet_service):
        """Test getting wallet info successfully"""
        with patch.object(wallet_service, 'rpc_client') as mock_rpc:
            mock_rpc.get_balance.return_value = 2.5
            mock_rpc.get_account_info.return_value = {
                "lamports": 2500000000,
                "owner": "11111111111111111111111111111112",
                "executable": False
            }
            
            wallet_info = await wallet_service.get_wallet_info("test-address")
            assert wallet_info["address"] == "test-address"
            assert wallet_info["balance"] == 2.5
            assert wallet_info["lamports"] == 2500000000
    
    @pytest.mark.asyncio
    async def test_get_wallet_info_failure(self, wallet_service):
        """Test getting wallet info failure"""
        with patch.object(wallet_service, 'rpc_client') as mock_rpc:
            mock_rpc.get_balance.side_effect = Exception("RPC error")
            
            with pytest.raises(Exception):
                await wallet_service.get_wallet_info("test-address")
    
    def test_format_address_short(self, wallet_service):
        """Test formatting address for display"""
        address = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
        formatted = wallet_service.format_address(address)
        assert formatted == "9WzDX...tAWWM"
    
    def test_format_address_very_short(self, wallet_service):
        """Test formatting very short address"""
        address = "short"
        formatted = wallet_service.format_address(address)
        assert formatted == address  # Should return as-is if too short


class TestSolanaTransactionService:
    """Test Solana Transaction Service functionality"""
    
    @pytest.fixture
    def transaction_service(self):
        return SolanaTransactionService()
    
    @pytest.mark.asyncio
    async def test_create_transfer_transaction_success(self, transaction_service):
        """Test creating transfer transaction successfully"""
        with patch.object(transaction_service, 'rpc_client') as mock_rpc:
            mock_rpc.get_latest_blockhash.return_value = "test-blockhash"
            mock_rpc.create_transaction.return_value = "test-transaction"
            
            result = await transaction_service.create_transfer_transaction(
                from_address="from-address",
                to_address="to-address",
                amount=1.5
            )
            
            assert result["transaction"] == "test-transaction"
            assert result["from_address"] == "from-address"
            assert result["to_address"] == "to-address"
            assert result["amount"] == 1.5
    
    @pytest.mark.asyncio
    async def test_create_transfer_transaction_invalid_address(self, transaction_service):
        """Test creating transfer transaction with invalid address"""
        with pytest.raises(ValueError):
            await transaction_service.create_transfer_transaction(
                from_address="invalid-address",
                to_address="to-address",
                amount=1.5
            )
    
    @pytest.mark.asyncio
    async def test_verify_transaction_success(self, transaction_service):
        """Test verifying transaction successfully"""
        with patch.object(transaction_service, 'rpc_client') as mock_rpc:
            mock_rpc.get_transaction.return_value = {
                "slot": 12345,
                "confirmationStatus": "confirmed",
                "err": None
            }
            
            result = await transaction_service.verify_transaction("test-signature")
            assert result["confirmed"] is True
            assert result["success"] is True
            assert result["slot"] == 12345
    
    @pytest.mark.asyncio
    async def test_verify_transaction_failed(self, transaction_service):
        """Test verifying failed transaction"""
        with patch.object(transaction_service, 'rpc_client') as mock_rpc:
            mock_rpc.get_transaction.return_value = {
                "slot": 12345,
                "confirmationStatus": "confirmed",
                "err": {"code": 1, "message": "Insufficient funds"}
            }
            
            result = await transaction_service.verify_transaction("test-signature")
            assert result["confirmed"] is True
            assert result["success"] is False
            assert result["error"] == "Insufficient funds"
    
    @pytest.mark.asyncio
    async def test_estimate_fee_success(self, transaction_service):
        """Test estimating transaction fee successfully"""
        with patch.object(transaction_service, 'rpc_client') as mock_rpc:
            mock_rpc.get_fee_for_message.return_value = 5000
            
            fee = await transaction_service.estimate_fee("test-transaction")
            assert fee == 5000


class TestSolanaNFTService:
    """Test Solana NFT Service functionality"""
    
    @pytest.fixture
    def nft_service(self):
        return SolanaNFTService()
    
    @pytest.mark.asyncio
    async def test_create_nft_success(self, nft_service):
        """Test creating NFT successfully"""
        with patch.object(nft_service, 'rpc_client') as mock_rpc:
            mock_rpc.create_nft.return_value = {
                "mint": "test-mint-address",
                "signature": "test-signature"
            }
            
            nft_data = {
                "name": "Test NFT",
                "description": "Test NFT Description",
                "image": "https://example.com/image.jpg",
                "attributes": [{"trait_type": "Color", "value": "Blue"}]
            }
            
            result = await nft_service.create_nft(nft_data)
            assert result["mint"] == "test-mint-address"
            assert result["signature"] == "test-signature"
    
    @pytest.mark.asyncio
    async def test_get_nft_info_success(self, nft_service):
        """Test getting NFT info successfully"""
        with patch.object(nft_service, 'rpc_client') as mock_rpc:
            mock_rpc.get_account_info.return_value = {
                "data": "base64-encoded-metadata"
            }
            
            with patch.object(nft_service, 'decode_metadata') as mock_decode:
                mock_decode.return_value = {
                    "name": "Test NFT",
                    "description": "Test NFT Description",
                    "image": "https://example.com/image.jpg"
                }
                
                nft_info = await nft_service.get_nft_info("test-mint")
                assert nft_info["name"] == "Test NFT"
                assert nft_info["description"] == "Test NFT Description"
    
    @pytest.mark.asyncio
    async def test_transfer_nft_success(self, nft_service):
        """Test transferring NFT successfully"""
        with patch.object(nft_service, 'rpc_client') as mock_rpc:
            mock_rpc.transfer_nft.return_value = "test-signature"
            
            result = await nft_service.transfer_nft(
                mint="test-mint",
                from_address="from-address",
                to_address="to-address"
            )
            assert result["signature"] == "test-signature"
    
    @pytest.mark.asyncio
    async def test_list_nft_for_sale_success(self, nft_service):
        """Test listing NFT for sale successfully"""
        with patch.object(nft_service, 'rpc_client') as mock_rpc:
            mock_rpc.create_listing.return_value = "test-signature"
            
            result = await nft_service.list_for_sale(
                mint="test-mint",
                price=2.5,
                seller="seller-address"
            )
            assert result["signature"] == "test-signature"
            assert result["price"] == 2.5


class TestSolanaTokenService:
    """Test Solana Token Service functionality"""
    
    @pytest.fixture
    def token_service(self):
        return SolanaTokenService()
    
    @pytest.mark.asyncio
    async def test_get_token_info_success(self, token_service):
        """Test getting token info successfully"""
        with patch.object(token_service, 'rpc_client') as mock_rpc:
            mock_rpc.get_account_info.return_value = {
                "data": "base64-encoded-token-info"
            }
            
            with patch.object(token_service, 'decode_token_info') as mock_decode:
                mock_decode.return_value = {
                    "mint": "test-mint",
                    "name": "Test Token",
                    "symbol": "TEST",
                    "decimals": 6,
                    "supply": 1000000
                }
                
                token_info = await token_service.get_token_info("test-mint")
                assert token_info["name"] == "Test Token"
                assert token_info["symbol"] == "TEST"
                assert token_info["decimals"] == 6
    
    @pytest.mark.asyncio
    async def test_get_user_tokens_success(self, token_service):
        """Test getting user tokens successfully"""
        with patch.object(token_service, 'rpc_client') as mock_rpc:
            mock_rpc.get_token_accounts_by_owner.return_value = [
                {"mint": "token1", "balance": 1000},
                {"mint": "token2", "balance": 2000}
            ]
            
            tokens = await token_service.get_user_tokens("user-address")
            assert len(tokens) == 2
            assert tokens[0]["mint"] == "token1"
            assert tokens[0]["balance"] == 1000
    
    @pytest.mark.asyncio
    async def test_transfer_token_success(self, token_service):
        """Test transferring token successfully"""
        with patch.object(token_service, 'rpc_client') as mock_rpc:
            mock_rpc.transfer_token.return_value = "test-signature"
            
            result = await token_service.transfer_token(
                mint="test-mint",
                from_address="from-address",
                to_address="to-address",
                amount=1000
            )
            assert result["signature"] == "test-signature"


class TestSolanaPaymentProcessor:
    """Test Solana Payment Processor functionality"""
    
    @pytest.fixture
    def payment_processor(self):
        return SolanaPaymentProcessor()
    
    @pytest.mark.asyncio
    async def test_process_sol_payment_success(self, payment_processor):
        """Test processing SOL payment successfully"""
        with patch.object(payment_processor, 'transaction_service') as mock_transaction:
            mock_transaction.create_transfer_transaction.return_value = {
                "transaction": "test-transaction",
                "signature": "test-signature"
            }
            mock_transaction.verify_transaction.return_value = {
                "confirmed": True,
                "success": True
            }
            
            result = await payment_processor.process_sol_payment(
                from_address="from-address",
                to_address="to-address",
                amount=1.5
            )
            assert result["success"] is True
            assert result["signature"] == "test-signature"
    
    @pytest.mark.asyncio
    async def test_process_spl_payment_success(self, payment_processor):
        """Test processing SPL token payment successfully"""
        with patch.object(payment_processor, 'token_service') as mock_token:
            mock_token.transfer_token.return_value = {
                "signature": "test-signature"
            }
            
            result = await payment_processor.process_spl_payment(
                mint="test-mint",
                from_address="from-address",
                to_address="to-address",
                amount=1000
            )
            assert result["success"] is True
            assert result["signature"] == "test-signature"
    
    @pytest.mark.asyncio
    async def test_process_payment_insufficient_funds(self, payment_processor):
        """Test processing payment with insufficient funds"""
        with patch.object(payment_processor, 'transaction_service') as mock_transaction:
            mock_transaction.create_transfer_transaction.side_effect = Exception("Insufficient funds")
            
            with pytest.raises(Exception, match="Insufficient funds"):
                await payment_processor.process_sol_payment(
                    from_address="from-address",
                    to_address="to-address",
                    amount=1000.0  # Very large amount
                )


class TestSolanaAPIEndpoints:
    """Test Solana API endpoints"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_solana_health_check(self, client):
        """Test Solana health check endpoint"""
        with patch('solana.rpc_client.SolanaRPCClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.connect.return_value = True
            mock_client.return_value = mock_instance
            
            response = client.get("/api/solana/health")
            assert response.status_code == 200
            
            data = response.json()
            assert "status" in data
            assert "timestamp" in data
            assert "network" in data
    
    def test_get_wallet_info(self, client):
        """Test getting wallet information endpoint"""
        with patch('solana.wallet_service.SolanaWalletService') as mock_service:
            mock_instance = AsyncMock()
            mock_instance.get_wallet_info.return_value = {
                "address": "test-address",
                "balance": 1.5,
                "lamports": 1500000000
            }
            mock_service.return_value = mock_instance
            
            response = client.get("/api/solana/wallets/test-address/info")
            assert response.status_code == 200
            
            data = response.json()
            assert data["address"] == "test-address"
            assert data["balance"] == 1.5
    
    def test_create_transaction(self, client):
        """Test creating transaction endpoint"""
        with patch('solana.transaction_service.SolanaTransactionService') as mock_service:
            mock_instance = AsyncMock()
            mock_instance.create_transfer_transaction.return_value = {
                "transaction": "test-transaction",
                "signature": "test-signature"
            }
            mock_service.return_value = mock_instance
            
            transaction_data = {
                "from_address": "from-address",
                "to_address": "to-address",
                "amount": 1.5
            }
            
            response = client.post("/api/solana/transactions/", json=transaction_data)
            assert response.status_code == 200
            
            data = response.json()
            assert data["transaction"] == "test-transaction"
            assert data["signature"] == "test-signature"
    
    def test_verify_transaction(self, client):
        """Test verifying transaction endpoint"""
        with patch('solana.transaction_service.SolanaTransactionService') as mock_service:
            mock_instance = AsyncMock()
            mock_instance.verify_transaction.return_value = {
                "confirmed": True,
                "success": True,
                "slot": 12345
            }
            mock_service.return_value = mock_instance
            
            response = client.get("/api/solana/transactions/test-signature/verify")
            assert response.status_code == 200
            
            data = response.json()
            assert data["confirmed"] is True
            assert data["success"] is True
    
    def test_get_nft_info(self, client):
        """Test getting NFT information endpoint"""
        with patch('solana.nft_service.SolanaNFTService') as mock_service:
            mock_instance = AsyncMock()
            mock_instance.get_nft_info.return_value = {
                "mint": "test-mint",
                "name": "Test NFT",
                "description": "Test NFT Description",
                "image": "https://example.com/image.jpg"
            }
            mock_service.return_value = mock_instance
            
            response = client.get("/api/solana/nfts/test-mint")
            assert response.status_code == 200
            
            data = response.json()
            assert data["name"] == "Test NFT"
            assert data["mint"] == "test-mint"
    
    def test_create_nft(self, client):
        """Test creating NFT endpoint"""
        with patch('solana.nft_service.SolanaNFTService') as mock_service:
            mock_instance = AsyncMock()
            mock_instance.create_nft.return_value = {
                "mint": "test-mint",
                "signature": "test-signature"
            }
            mock_service.return_value = mock_instance
            
            nft_data = {
                "name": "Test NFT",
                "description": "Test NFT Description",
                "image": "https://example.com/image.jpg"
            }
            
            response = client.post("/api/solana/nfts/", json=nft_data)
            assert response.status_code == 200
            
            data = response.json()
            assert data["mint"] == "test-mint"
            assert data["signature"] == "test-signature"


class TestSolanaDatabaseIntegration:
    """Test Solana database integration"""
    
    @pytest.fixture
    def db_session(self):
        # Mock database session
        session = Mock(spec=Session)
        return session
    
    def test_create_wallet_record(self, db_session):
        """Test creating wallet record in database"""
        wallet_data = {
            "address": "test-address",
            "user_id": 1,
            "wallet_type": "phantom",
            "is_active": True
        }
        
        wallet = SolanaWallet(**wallet_data)
        db_session.add(wallet)
        db_session.commit()
        
        assert wallet.address == "test-address"
        assert wallet.wallet_type == "phantom"
    
    def test_create_transaction_record(self, db_session):
        """Test creating transaction record in database"""
        transaction_data = {
            "signature": "test-signature",
            "from_address": "from-address",
            "to_address": "to-address",
            "amount": 1.5,
            "status": "confirmed"
        }
        
        transaction = SolanaTransaction(**transaction_data)
        db_session.add(transaction)
        db_session.commit()
        
        assert transaction.signature == "test-signature"
        assert transaction.amount == 1.5
    
    def test_create_nft_record(self, db_session):
        """Test creating NFT record in database"""
        nft_data = {
            "mint": "test-mint",
            "name": "Test NFT",
            "description": "Test NFT Description",
            "image_url": "https://example.com/image.jpg",
            "owner_address": "owner-address"
        }
        
        nft = SolanaNFT(**nft_data)
        db_session.add(nft)
        db_session.commit()
        
        assert nft.mint == "test-mint"
        assert nft.name == "Test NFT"
    
    def test_create_token_record(self, db_session):
        """Test creating token record in database"""
        token_data = {
            "mint": "test-mint",
            "name": "Test Token",
            "symbol": "TEST",
            "decimals": 6,
            "supply": 1000000
        }
        
        token = SolanaToken(**token_data)
        db_session.add(token)
        db_session.commit()
        
        assert token.mint == "test-mint"
        assert token.symbol == "TEST"
        assert token.decimals == 6


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
