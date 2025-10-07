"""
Tests for Solana service
"""
import pytest
from unittest.mock import AsyncMock, patch
from solana.rpc_client import RPCClient
from solana.publickey import PublicKey

from solana.rpc_client import SolanaRPCClient
from solana.transaction_service import TransactionService
from solana.wallet_service import WalletService
from solana.payment_processor import PaymentProcessor
from solana.nft_service import NFTService
from solana.token_service import TokenService


class TestSolanaRPCClient:
    """Test Solana RPC Client"""
    
    @pytest.mark.asyncio
    async def test_connect_success(self):
        """Test successful connection to Solana RPC"""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_session.return_value.__aenter__.return_value = AsyncMock()
            
            client = SolanaRPCClient({
                'rpc_url': 'https://api.devnet.solana.com',
                'network': 'devnet'
            })
            
            result = await client.connect()
            assert result is True
    
    @pytest.mark.asyncio
    async def test_connect_failure(self):
        """Test connection failure to Solana RPC"""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_session.side_effect = Exception("Connection failed")
            
            client = SolanaRPCClient({
                'rpc_url': 'https://api.devnet.solana.com',
                'network': 'devnet'
            })
            
            result = await client.connect()
            assert result is False
    
    @pytest.mark.asyncio
    async def test_get_balance(self):
        """Test getting wallet balance"""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                'result': {'value': 1000000000}  # 1 SOL in lamports
            }
            mock_session.return_value.__aenter__.return_value.post.return_value = mock_response
            
            client = SolanaRPCClient({
                'rpc_url': 'https://api.devnet.solana.com',
                'network': 'devnet'
            })
            await client.connect()
            
            balance = await client.get_balance('mock-wallet-address')
            assert balance == 1.0  # 1 SOL


class TestWalletService:
    """Test Wallet Service"""
    
    @pytest.mark.asyncio
    async def test_validate_wallet_address_valid(self):
        """Test validation of valid wallet address"""
        with patch('solana.publickey.PublicKey') as mock_public_key:
            mock_public_key.return_value = PublicKey('mock-address')
            
            wallet_service = WalletService(None, {})
            result = await wallet_service.validate_wallet_address('valid-address')
            assert result is True
    
    @pytest.mark.asyncio
    async def test_validate_wallet_address_invalid(self):
        """Test validation of invalid wallet address"""
        with patch('solana.publickey.PublicKey') as mock_public_key:
            mock_public_key.side_effect = ValueError("Invalid address")
            
            wallet_service = WalletService(None, {})
            result = await wallet_service.validate_wallet_address('invalid-address')
            assert result is False
    
    @pytest.mark.asyncio
    async def test_get_wallet_info(self):
        """Test getting wallet information"""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                'result': {
                    'value': 1000000000,  # 1 SOL in lamports
                    'owner': 'mock-owner'
                }
            }
            mock_session.return_value.__aenter__.return_value.post.return_value = mock_response
            
            client = SolanaRPCClient({
                'rpc_url': 'https://api.devnet.solana.com',
                'network': 'devnet'
            })
            await client.connect()
            
            wallet_service = WalletService(client, {})
            info = await wallet_service.get_wallet_info('mock-address')
            
            assert info['balance'] == 1.0
            assert info['owner'] == 'mock-owner'


class TestTransactionService:
    """Test Transaction Service"""
    
    @pytest.mark.asyncio
    async def test_create_transfer_transaction(self):
        """Test creating a transfer transaction"""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                'result': {
                    'value': {
                        'blockhash': 'mock-blockhash',
                        'feeCalculator': {'lamportsPerSignature': 5000}
                    }
                }
            }
            mock_session.return_value.__aenter__.return_value.post.return_value = mock_response
            
            client = SolanaRPCClient({
                'rpc_url': 'https://api.devnet.solana.com',
                'network': 'devnet'
            })
            await client.connect()
            
            transaction_service = TransactionService(client, {})
            transaction = await transaction_service.create_transfer_transaction(
                'from-address',
                'to-address',
                1.0
            )
            
            assert transaction is not None
            assert 'blockhash' in transaction
    
    @pytest.mark.asyncio
    async def test_verify_transaction(self):
        """Test verifying a transaction"""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                'result': {
                    'value': {
                        'confirmationStatus': 'finalized',
                        'err': None
                    }
                }
            }
            mock_session.return_value.__aenter__.return_value.post.return_value = mock_response
            
            client = SolanaRPCClient({
                'rpc_url': 'https://api.devnet.solana.com',
                'network': 'devnet'
            })
            await client.connect()
            
            transaction_service = TransactionService(client, {})
            result = await transaction_service.verify_transaction('mock-signature')
            
            assert result['confirmed'] is True
            assert result['success'] is True


class TestPaymentProcessor:
    """Test Payment Processor"""
    
    @pytest.mark.asyncio
    async def test_process_payment_success(self):
        """Test successful payment processing"""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                'result': {
                    'value': {
                        'blockhash': 'mock-blockhash',
                        'feeCalculator': {'lamportsPerSignature': 5000}
                    }
                }
            }
            mock_session.return_value.__aenter__.return_value.post.return_value = mock_response
            
            client = SolanaRPCClient({
                'rpc_url': 'https://api.devnet.solana.com',
                'network': 'devnet'
            })
            await client.connect()
            
            transaction_service = TransactionService(client, {})
            wallet_service = WalletService(client, {})
            payment_processor = PaymentProcessor(client, transaction_service, wallet_service, {})
            
            result = await payment_processor.process_payment(
                'from-address',
                'to-address',
                1.0,
                'mock-signature'
            )
            
            assert result['success'] is True
            assert 'transaction_id' in result
    
    @pytest.mark.asyncio
    async def test_process_payment_failure(self):
        """Test payment processing failure"""
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                'result': {
                    'value': {
                        'err': 'Insufficient funds'
                    }
                }
            }
            mock_session.return_value.__aenter__.return_value.post.return_value = mock_response
            
            client = SolanaRPCClient({
                'rpc_url': 'https://api.devnet.solana.com',
                'network': 'devnet'
            })
            await client.connect()
            
            transaction_service = TransactionService(client, {})
            wallet_service = WalletService(client, {})
            payment_processor = PaymentProcessor(client, transaction_service, wallet_service, {})
            
            result = await payment_processor.process_payment(
                'from-address',
                'to-address',
                1.0,
                'mock-signature'
            )
            
            assert result['success'] is False
            assert 'error' in result

