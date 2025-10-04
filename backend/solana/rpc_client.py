"""
Solana RPC Client with connection pooling and failover support
"""

import asyncio
import aiohttp
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from solana.config import SolanaConfig
import logging

logger = logging.getLogger(__name__)

@dataclass
class RPCResponse:
    """RPC response wrapper"""
    result: Any
    error: Optional[Dict[str, Any]] = None
    id: Optional[str] = None

class SolanaRPCClient:
    """Enhanced Solana RPC client with connection pooling and failover"""
    
    def __init__(self, config: SolanaConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        self.request_id = 0
        self._connection_pool = None
        
    async def __aenter__(self):
        await self.connect()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
        
    async def connect(self):
        """Initialize connection pool"""
        connector = aiohttp.TCPConnector(
            limit=100,
            limit_per_host=30,
            ttl_dns_cache=300,
            use_dns_cache=True,
        )
        
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'Soladia-Marketplace/1.0'
            }
        )
        
    async def close(self):
        """Close connection pool"""
        if self.session:
            await self.session.close()
            
    def _get_next_id(self) -> str:
        """Get next request ID"""
        self.request_id += 1
        return str(self.request_id)
        
    async def _make_request(self, method: str, params: List[Any] = None) -> RPCResponse:
        """Make RPC request with error handling"""
        if not self.session:
            await self.connect()
            
        payload = {
            "jsonrpc": "2.0",
            "id": self._get_next_id(),
            "method": method,
            "params": params or []
        }
        
        try:
            async with self.session.post(
                self.config.rpc_url,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                data = await response.json()
                
                if response.status != 200:
                    logger.error(f"RPC request failed with status {response.status}: {data}")
                    return RPCResponse(result=None, error={"code": response.status, "message": "HTTP Error"})
                
                if "error" in data:
                    logger.error(f"RPC error: {data['error']}")
                    return RPCResponse(result=None, error=data["error"], id=data.get("id"))
                
                return RPCResponse(result=data.get("result"), id=data.get("id"))
                
        except asyncio.TimeoutError:
            logger.error("RPC request timeout")
            return RPCResponse(result=None, error={"code": -1, "message": "Request timeout"})
        except Exception as e:
            logger.error(f"RPC request failed: {str(e)}")
            return RPCResponse(result=None, error={"code": -1, "message": str(e)})
    
    # Account methods
    async def get_balance(self, public_key: str) -> RPCResponse:
        """Get account balance"""
        return await self._make_request("getBalance", [public_key])
    
    async def get_account_info(self, public_key: str) -> RPCResponse:
        """Get account information"""
        return await self._make_request("getAccountInfo", [public_key, {"encoding": "base64"}])
    
    # Transaction methods
    async def send_transaction(self, transaction: str, skip_preflight: bool = False) -> RPCResponse:
        """Send transaction"""
        return await self._make_request("sendTransaction", [transaction, {"skipPreflight": skip_preflight}])
    
    async def get_transaction(self, signature: str) -> RPCResponse:
        """Get transaction details"""
        return await self._make_request("getTransaction", [signature, {"encoding": "json"}])
    
    async def get_signature_statuses(self, signatures: List[str]) -> RPCResponse:
        """Get signature statuses"""
        return await self._make_request("getSignatureStatuses", [signatures])
    
    # Token methods
    async def get_token_accounts_by_owner(self, owner: str, mint: str = None) -> RPCResponse:
        """Get token accounts by owner"""
        filters = []
        if mint:
            filters.append({"mint": mint})
        
        return await self._make_request("getTokenAccountsByOwner", [
            owner,
            {"programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},
            {"filters": filters}
        ])
    
    async def get_token_supply(self, mint: str) -> RPCResponse:
        """Get token supply"""
        return await self._make_request("getTokenSupply", [mint])
    
    # Block methods
    async def get_latest_blockhash(self) -> RPCResponse:
        """Get latest blockhash"""
        return await self._make_request("getLatestBlockhash")
    
    async def get_block_height(self) -> RPCResponse:
        """Get current block height"""
        return await self._make_request("getBlockHeight")
    
    # Health check
    async def get_health(self) -> RPCResponse:
        """Check RPC health"""
        return await self._make_request("getHealth")
    
    # Utility methods
    async def get_version(self) -> RPCResponse:
        """Get RPC version"""
        return await self._make_request("getVersion")
    
    async def get_genesis_hash(self) -> RPCResponse:
        """Get genesis hash"""
        return await self._make_request("getGenesisHash")
