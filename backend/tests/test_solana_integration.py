"""
Comprehensive tests for Solana integration
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

from main import app
from database import get_db, Base
from models.solana_models import SolanaWallet, SolanaTransaction, SolanaNFT, SolanaToken
from schemas.solana_schemas import (
    SolanaWalletCreate, SolanaTransactionCreate, SolanaNFTCreate,
    SolanaTokenCreate, SolanaEscrowCreate, SolanaAuctionCreate
)

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module")
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    return TestClient(app)

class TestSolanaAPI:
    """Test Solana API endpoints"""
    
    def test_solana_health_endpoint(self, client):
        """Test Solana health check endpoint"""
        response = client.get("/api/solana/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "network" in data
        assert "rpc_url" in data
    
    def test_solana_root_endpoint(self, client):
        """Test Solana root endpoint"""
        response = client.get("/api/solana/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "endpoints" in data
    
    def test_wallet_info_endpoint(self, client):
        """Test wallet info endpoint"""
        test_wallet = "11111111111111111111111111111112"  # System program
        response = client.get(f"/api/solana/wallets/{test_wallet}/info")
        assert response.status_code == 200
        data = response.json()
        assert "address" in data
        assert "balance" in data
        assert "exists" in data
    
    def test_wallet_balance_endpoint(self, client):
        """Test wallet balance endpoint"""
        test_wallet = "11111111111111111111111111111112"
        response = client.get(f"/api/solana/wallets/{test_wallet}/balance")
        assert response.status_code == 200
        data = response.json()
        assert "address" in data
        assert "balance" in data
        assert "lamports" in data
    
    def test_wallet_tokens_endpoint(self, client):
        """Test wallet tokens endpoint"""
        test_wallet = "11111111111111111111111111111112"
        response = client.get(f"/api/solana/wallets/{test_wallet}/tokens")
        assert response.status_code == 200
        data = response.json()
        assert "address" in data
        assert "tokens" in data
        assert "count" in data
    
    def test_transaction_status_endpoint(self, client):
        """Test transaction status endpoint"""
        test_signature = "5VERv8NMvbbJMEZDYzJ1SQDN3biszfBH6N7wUi6Zt5rK2Lf9SgYbGKpf5jHTYfHj7R4r"  # Example signature
        response = client.get(f"/api/solana/transactions/{test_signature}/status")
        # This might return 400 if transaction doesn't exist, which is expected
        assert response.status_code in [200, 400]
    
    def test_nft_metadata_endpoint(self, client):
        """Test NFT metadata endpoint"""
        test_mint = "11111111111111111111111111111112"
        response = client.get(f"/api/solana/nfts/{test_mint}/metadata")
        assert response.status_code in [200, 400]
    
    def test_token_info_endpoint(self, client):
        """Test token info endpoint"""
        test_mint = "11111111111111111111111111111112"
        response = client.get(f"/api/solana/tokens/{test_mint}/info")
        assert response.status_code == 200
        data = response.json()
        assert "mint" in data
        assert "name" in data
        assert "symbol" in data
    
    def test_payment_simulate_endpoint(self, client):
        """Test payment simulation endpoint"""
        response = client.post(
            "/api/solana/payments/simulate",
            params={
                "from_wallet": "11111111111111111111111111111112",
                "to_wallet": "11111111111111111111111111111113",
                "amount": 1.0,
                "token": "SOL"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "simulation" in data
        assert "network" in data
    
    def test_payment_create_endpoint(self, client):
        """Test payment creation endpoint"""
        response = client.post(
            "/api/solana/payments",
            params={
                "from_wallet": "11111111111111111111111111111112",
                "to_wallet": "11111111111111111111111111111113",
                "amount": 1.0,
                "memo": "Test payment",
                "token": "SOL"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "payment" in data
        assert "network" in data
    
    def test_network_info_endpoint(self, client):
        """Test network info endpoint"""
        response = client.get("/api/solana/network/info")
        assert response.status_code == 200
        data = response.json()
        assert "network" in data
        assert "rpc_url" in data
        assert "version" in data
    
    def test_fee_estimate_endpoint(self, client):
        """Test fee estimation endpoint"""
        response = client.get("/api/solana/fees/estimate")
        assert response.status_code == 200
        data = response.json()
        assert "fee_estimation" in data
        assert "network" in data

class TestSolanaModels:
    """Test Solana database models"""
    
    def test_solana_wallet_model(self, setup_database):
        """Test SolanaWallet model"""
        db = TestingSessionLocal()
        
        wallet = SolanaWallet(
            user_id=1,
            wallet_address="11111111111111111111111111111112",
            wallet_type="phantom",
            is_primary=True,
            is_verified=True,
            balance_sol=10.5,
            balance_lamports=10500000000
        )
        
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
        
        assert wallet.id is not None
        assert wallet.wallet_address == "11111111111111111111111111111112"
        assert wallet.wallet_type == "phantom"
        assert wallet.is_primary is True
        assert wallet.balance_sol == 10.5
        
        db.close()
    
    def test_solana_transaction_model(self, setup_database):
        """Test SolanaTransaction model"""
        db = TestingSessionLocal()
        
        transaction = SolanaTransaction(
            wallet_id=1,
            transaction_signature="5VERv8NMvbbJMEZDYzJ1SQDN3biszfBH6N7wUi6Zt5rK2Lf9SgYbGKpf5jHTYfHj7R4r",
            transaction_type="payment",
            from_address="11111111111111111111111111111112",
            to_address="11111111111111111111111111111113",
            amount=1.5,
            amount_lamports=1500000000,
            status="confirmed",
            fee=0.000005
        )
        
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        
        assert transaction.id is not None
        assert transaction.transaction_signature == "5VERv8NMvbbJMEZDYzJ1SQDN3biszfBH6N7wUi6Zt5rK2Lf9SgYbGKpf5jHTYfHj7R4r"
        assert transaction.transaction_type == "payment"
        assert transaction.amount == 1.5
        
        db.close()
    
    def test_solana_nft_model(self, setup_database):
        """Test SolanaNFT model"""
        db = TestingSessionLocal()
        
        nft = SolanaNFT(
            nft_mint="11111111111111111111111111111112",
            owner_wallet_id=1,
            name="Test NFT",
            symbol="TEST",
            description="A test NFT",
            image_url="https://example.com/image.png",
            attributes={"color": "blue", "rarity": "common"}
        )
        
        db.add(nft)
        db.commit()
        db.refresh(nft)
        
        assert nft.id is not None
        assert nft.nft_mint == "11111111111111111111111111111112"
        assert nft.name == "Test NFT"
        assert nft.attributes["color"] == "blue"
        
        db.close()
    
    def test_solana_token_model(self, setup_database):
        """Test SolanaToken model"""
        db = TestingSessionLocal()
        
        token = SolanaToken(
            token_mint="11111111111111111111111111111112",
            symbol="TEST",
            name="Test Token",
            decimals=9,
            supply=1000000000,
            is_verified=True
        )
        
        db.add(token)
        db.commit()
        db.refresh(token)
        
        assert token.id is not None
        assert token.token_mint == "11111111111111111111111111111112"
        assert token.symbol == "TEST"
        assert token.decimals == 9
        
        db.close()

class TestSolanaSchemas:
    """Test Solana Pydantic schemas"""
    
    def test_solana_wallet_create_schema(self):
        """Test SolanaWalletCreate schema"""
        wallet_data = {
            "wallet_address": "11111111111111111111111111111112",
            "wallet_type": "phantom",
            "is_primary": True,
            "is_verified": False
        }
        
        wallet = SolanaWalletCreate(**wallet_data)
        assert wallet.wallet_address == "11111111111111111111111111111112"
        assert wallet.wallet_type == "phantom"
        assert wallet.is_primary is True
    
    def test_solana_transaction_create_schema(self):
        """Test SolanaTransactionCreate schema"""
        transaction_data = {
            "wallet_id": 1,
            "transaction_signature": "5VERv8NMvbbJMEZDYzJ1SQDN3biszfBH6N7wUi6Zt5rK2Lf9SgYbGKpf5jHTYfHj7R4r",
            "transaction_type": "payment",
            "from_address": "11111111111111111111111111111112",
            "to_address": "11111111111111111111111111111113",
            "amount": 1.5,
            "amount_lamports": 1500000000,
            "status": "confirmed"
        }
        
        transaction = SolanaTransactionCreate(**transaction_data)
        assert transaction.wallet_id == 1
        assert transaction.transaction_type == "payment"
        assert transaction.amount == 1.5
    
    def test_solana_nft_create_schema(self):
        """Test SolanaNFTCreate schema"""
        nft_data = {
            "owner_wallet_id": 1,
            "nft_mint": "11111111111111111111111111111112",
            "name": "Test NFT",
            "symbol": "TEST",
            "description": "A test NFT",
            "image_url": "https://example.com/image.png"
        }
        
        nft = SolanaNFTCreate(**nft_data)
        assert nft.owner_wallet_id == 1
        assert nft.name == "Test NFT"
        assert nft.symbol == "TEST"

class TestSolanaServices:
    """Test Solana service classes"""
    
    @pytest.mark.asyncio
    async def test_enhanced_solana_service(self):
        """Test EnhancedSolanaService"""
        from solana.enhanced_service import EnhancedSolanaService
        from solana.config import solana_config
        
        async with EnhancedSolanaService(solana_config) as service:
            # Test wallet info
            wallet_info = await service.get_wallet_info("11111111111111111111111111111112")
            assert wallet_info.address == "11111111111111111111111111111112"
            assert wallet_info.balance >= 0
            
            # Test network info
            network_info = await service.get_network_info()
            assert "network" in network_info
            assert "rpc_url" in network_info
    
    @pytest.mark.asyncio
    async def test_solana_rpc_client(self):
        """Test SolanaRPCClient"""
        from solana.rpc_client import SolanaRPCClient
        from solana.config import solana_config
        
        client = SolanaRPCClient(solana_config)
        await client.connect()
        
        # Test basic RPC call
        response = await client.get_health()
        assert response.error is None
        assert response.result is not None
        
        await client.close()

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
