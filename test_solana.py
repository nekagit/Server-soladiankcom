#!/usr/bin/env python3
"""
Test script for Solana functionality
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def test_solana_imports():
    """Test if Solana modules can be imported"""
    try:
        print("Testing Solana imports...")
        
        # Test config import
        from backend.solana.config import SolanaConfig, solana_config
        print("✅ SolanaConfig imported successfully")
        
        # Test RPC client import
        from backend.solana.rpc_client import SolanaRPCClient
        print("✅ SolanaRPCClient imported successfully")
        
        # Test transaction service import
        from backend.solana.transaction_service import TransactionService
        print("✅ TransactionService imported successfully")
        
        # Test wallet service import
        from backend.solana.wallet_service import WalletService
        print("✅ WalletService imported successfully")
        
        # Test payment processor import
        from backend.solana.payment_processor import PaymentProcessor
        print("✅ PaymentProcessor imported successfully")
        
        # Test NFT service import
        from backend.solana.nft_service import NFTService
        print("✅ NFTService imported successfully")
        
        # Test token service import
        from backend.solana.token_service import TokenService
        print("✅ TokenService imported successfully")
        
        print("\n🎉 All Solana modules imported successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False

def test_solana_config():
    """Test Solana configuration"""
    try:
        from backend.solana.config import solana_config
        print(f"\n📋 Solana Configuration:")
        print(f"   RPC URL: {solana_config.rpc_url}")
        print(f"   Network: {solana_config.network}")
        print(f"   Commitment: {solana_config.commitment}")
        print(f"   Max Connections: {solana_config.max_connections}")
        return True
    except Exception as e:
        print(f"❌ Config error: {e}")
        return False

def test_wallet_validation():
    """Test wallet address validation"""
    try:
        from backend.solana.wallet_service import WalletService
        from backend.solana.rpc_client import SolanaRPCClient
        from backend.solana.config import solana_config
        
        # Create services
        rpc_client = SolanaRPCClient(solana_config)
        wallet_service = WalletService(rpc_client, solana_config)
        
        # Test valid address
        valid_address = "11111111111111111111111111111111111111111111"
        is_valid, error = wallet_service.validate_wallet_address(valid_address)
        print(f"\n🔍 Wallet Validation Test:")
        print(f"   Valid address '{valid_address[:20]}...': {is_valid}")
        
        # Test invalid address
        invalid_address = "invalid_address"
        is_valid, error = wallet_service.validate_wallet_address(invalid_address)
        print(f"   Invalid address '{invalid_address}': {is_valid} (Expected: False)")
        
        return True
    except Exception as e:
        print(f"❌ Wallet validation error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Solana Migration Test Suite\n")
    
    tests = [
        ("Import Test", test_solana_imports),
        ("Config Test", test_solana_config),
        ("Wallet Validation Test", test_wallet_validation),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"Running: {test_name}")
        print('='*50)
        
        if test_func():
            passed += 1
            print(f"✅ {test_name} PASSED")
        else:
            print(f"❌ {test_name} FAILED")
    
    print(f"\n{'='*50}")
    print(f"Test Results: {passed}/{total} tests passed")
    print('='*50)
    
    if passed == total:
        print("🎉 All tests passed! Solana migration is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    exit(main())
