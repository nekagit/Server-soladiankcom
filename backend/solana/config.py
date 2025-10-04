"""
Solana configuration and settings
"""

from dataclasses import dataclass
from typing import List, Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

@dataclass
class SolanaConfig:
    """Solana blockchain configuration"""
    
    # RPC Configuration
    rpc_url: str
    network: str
    commitment: str = "confirmed"
    
    # Connection Pool Settings
    max_connections: int = 100
    max_connections_per_host: int = 30
    connection_timeout: int = 30
    request_timeout: int = 30
    
    # Retry Settings
    max_retries: int = 3
    retry_delay: float = 1.0
    backoff_factor: float = 2.0
    
    # Transaction Settings
    max_retries_for_get_signature_statuses: int = 3
    skip_preflight: bool = False
    preflight_commitment: str = "confirmed"
    
    # Fee Settings
    priority_fee_lamports: int = 0
    compute_unit_limit: int = 200000
    compute_unit_price: int = 0
    
    # Wallet Settings
    supported_wallets: List[str] = None
    
    def __post_init__(self):
        if self.supported_wallets is None:
            self.supported_wallets = [
                "phantom",
                "solflare", 
                "backpack",
                "sollet",
                "ledger"
            ]

# Create global config instance
solana_config = SolanaConfig(
    rpc_url=settings.SOLANA_RPC_URL,
    network=settings.SOLANA_NETWORK
)
