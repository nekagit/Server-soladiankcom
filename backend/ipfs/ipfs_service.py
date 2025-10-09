"""
IPFS integration service for Soladia NFT marketplace
"""
import asyncio
import aiohttp
import json
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import hashlib
import base64
from datetime import datetime
import uuid

class IPFSService:
    """Service for IPFS operations"""
    
    def __init__(self, ipfs_gateway: str = "https://ipfs.io/ipfs/", ipfs_api: str = "http://localhost:5001"):
        self.ipfs_gateway = ipfs_gateway
        self.ipfs_api = ipfs_api
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def add_file(self, file_path: str, pin: bool = True) -> str:
        """Add file to IPFS"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        try:
            with open(file_path, 'rb') as f:
                files = {'file': f}
                data = {'pin': str(pin).lower()}
                
                async with self.session.post(
                    f"{self.ipfs_api}/api/v0/add",
                    data=data,
                    files=files
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result['Hash']
                    else:
                        raise Exception(f"IPFS add failed: {response.status}")
        except Exception as e:
            raise Exception(f"Failed to add file to IPFS: {str(e)}")
    
    async def add_data(self, data: bytes, pin: bool = True) -> str:
        """Add data to IPFS"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        try:
            files = {'file': data}
            params = {'pin': str(pin).lower()}
            
            async with self.session.post(
                f"{self.ipfs_api}/api/v0/add",
                data=params,
                files=files
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return result['Hash']
                else:
                    raise Exception(f"IPFS add failed: {response.status}")
        except Exception as e:
            raise Exception(f"Failed to add data to IPFS: {str(e)}")
    
    async def get_file(self, ipfs_hash: str) -> bytes:
        """Get file from IPFS"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        try:
            async with self.session.get(f"{self.ipfs_gateway}{ipfs_hash}") as response:
                if response.status == 200:
                    return await response.read()
                else:
                    raise Exception(f"Failed to get file from IPFS: {response.status}")
        except Exception as e:
            raise Exception(f"Failed to get file from IPFS: {str(e)}")
    
    async def pin_hash(self, ipfs_hash: str) -> bool:
        """Pin hash to IPFS"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        try:
            async with self.session.post(
                f"{self.ipfs_api}/api/v0/pin/add",
                params={'arg': ipfs_hash}
            ) as response:
                return response.status == 200
        except Exception as e:
            raise Exception(f"Failed to pin hash: {str(e)}")
    
    async def unpin_hash(self, ipfs_hash: str) -> bool:
        """Unpin hash from IPFS"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        try:
            async with self.session.post(
                f"{self.ipfs_api}/api/v0/pin/rm",
                params={'arg': ipfs_hash}
            ) as response:
                return response.status == 200
        except Exception as e:
            raise Exception(f"Failed to unpin hash: {str(e)}")
    
    async def get_pinned_hashes(self) -> List[str]:
        """Get list of pinned hashes"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        try:
            async with self.session.post(f"{self.ipfs_api}/api/v0/pin/ls") as response:
                if response.status == 200:
                    result = await response.json()
                    return [pin['Hash'] for pin in result['Keys'].values()]
                else:
                    return []
        except Exception as e:
            raise Exception(f"Failed to get pinned hashes: {str(e)}")
    
    def get_gateway_url(self, ipfs_hash: str) -> str:
        """Get gateway URL for IPFS hash"""
        return f"{self.ipfs_gateway}{ipfs_hash}"

class NFTMetadataService:
    """Service for NFT metadata operations"""
    
    def __init__(self, ipfs_service: IPFSService):
        self.ipfs_service = ipfs_service
    
    async def create_metadata(
        self,
        name: str,
        description: str,
        image_url: str,
        attributes: List[Dict[str, Any]],
        external_url: Optional[str] = None,
        animation_url: Optional[str] = None,
        background_color: Optional[str] = None,
        youtube_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create NFT metadata following OpenSea standards"""
        metadata = {
            "name": name,
            "description": description,
            "image": image_url,
            "attributes": attributes,
            "external_url": external_url,
            "animation_url": animation_url,
            "background_color": background_color,
            "youtube_url": youtube_url,
            "created_at": datetime.utcnow().isoformat(),
            "metadata_version": "1.0"
        }
        
        # Remove None values
        metadata = {k: v for k, v in metadata.items() if v is not None}
        
        return metadata
    
    async def upload_metadata(self, metadata: Dict[str, Any]) -> str:
        """Upload metadata to IPFS"""
        metadata_json = json.dumps(metadata, indent=2)
        metadata_bytes = metadata_json.encode('utf-8')
        
        ipfs_hash = await self.ipfs_service.add_data(metadata_bytes, pin=True)
        return ipfs_hash
    
    async def get_metadata(self, ipfs_hash: str) -> Dict[str, Any]:
        """Get metadata from IPFS"""
        metadata_bytes = await self.ipfs_service.get_file(ipfs_hash)
        metadata_json = metadata_bytes.decode('utf-8')
        return json.loads(metadata_json)
    
    async def update_metadata(
        self,
        ipfs_hash: str,
        updates: Dict[str, Any]
    ) -> str:
        """Update metadata and upload new version"""
        current_metadata = await self.get_metadata(ipfs_hash)
        updated_metadata = {**current_metadata, **updates}
        updated_metadata['updated_at'] = datetime.utcnow().isoformat()
        
        return await self.upload_metadata(updated_metadata)

class NFTBulkService:
    """Service for bulk NFT operations"""
    
    def __init__(self, ipfs_service: IPFSService, metadata_service: NFTMetadataService):
        self.ipfs_service = ipfs_service
        self.metadata_service = metadata_service
    
    async def bulk_upload_images(
        self,
        image_paths: List[str],
        batch_size: int = 10
    ) -> List[Tuple[str, str]]:
        """Bulk upload images to IPFS"""
        results = []
        
        for i in range(0, len(image_paths), batch_size):
            batch = image_paths[i:i + batch_size]
            tasks = [self.ipfs_service.add_file(path, pin=True) for path in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for j, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    results.append((batch[j], None))
                else:
                    results.append((batch[j], result))
        
        return results
    
    async def bulk_create_metadata(
        self,
        nft_data: List[Dict[str, Any]],
        batch_size: int = 10
    ) -> List[Tuple[int, str]]:
        """Bulk create NFT metadata"""
        results = []
        
        for i in range(0, len(nft_data), batch_size):
            batch = nft_data[i:i + batch_size]
            tasks = []
            
            for nft in batch:
                metadata = await self.metadata_service.create_metadata(
                    name=nft['name'],
                    description=nft['description'],
                    image_url=nft['image_url'],
                    attributes=nft.get('attributes', []),
                    external_url=nft.get('external_url'),
                    animation_url=nft.get('animation_url'),
                    background_color=nft.get('background_color'),
                    youtube_url=nft.get('youtube_url')
                )
                tasks.append(self.metadata_service.upload_metadata(metadata))
            
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for j, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    results.append((i + j, None))
                else:
                    results.append((i + j, result))
        
        return results
    
    async def bulk_pin_hashes(self, hashes: List[str], batch_size: int = 20) -> List[bool]:
        """Bulk pin hashes to IPFS"""
        results = []
        
        for i in range(0, len(hashes), batch_size):
            batch = hashes[i:i + batch_size]
            tasks = [self.ipfs_service.pin_hash(hash) for hash in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in batch_results:
                if isinstance(result, Exception):
                    results.append(False)
                else:
                    results.append(result)
        
        return results
    
    async def bulk_unpin_hashes(self, hashes: List[str], batch_size: int = 20) -> List[bool]:
        """Bulk unpin hashes from IPFS"""
        results = []
        
        for i in range(0, len(hashes), batch_size):
            batch = hashes[i:i + batch_size]
            tasks = [self.ipfs_service.unpin_hash(hash) for hash in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in batch_results:
                if isinstance(result, Exception):
                    results.append(False)
                else:
                    results.append(result)
        
        return results

class NFTCollectionService:
    """Service for NFT collection operations"""
    
    def __init__(self, ipfs_service: IPFSService, metadata_service: NFTMetadataService):
        self.ipfs_service = ipfs_service
        self.metadata_service = metadata_service
    
    async def create_collection_metadata(
        self,
        name: str,
        description: str,
        image_url: str,
        external_url: Optional[str] = None,
        seller_fee_basis_points: int = 250,  # 2.5%
        fee_recipient: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create collection metadata"""
        collection_metadata = {
            "name": name,
            "description": description,
            "image": image_url,
            "external_url": external_url,
            "seller_fee_basis_points": seller_fee_basis_points,
            "fee_recipient": fee_recipient,
            "created_at": datetime.utcnow().isoformat(),
            "metadata_version": "1.0"
        }
        
        # Remove None values
        collection_metadata = {k: v for k, v in collection_metadata.items() if v is not None}
        
        return collection_metadata
    
    async def upload_collection_metadata(self, metadata: Dict[str, Any]) -> str:
        """Upload collection metadata to IPFS"""
        return await self.metadata_service.upload_metadata(metadata)
    
    async def create_nft_with_metadata(
        self,
        name: str,
        description: str,
        image_path: str,
        attributes: List[Dict[str, Any]],
        collection_id: Optional[str] = None,
        **kwargs
    ) -> Tuple[str, str]:
        """Create NFT with image and metadata"""
        # Upload image to IPFS
        image_hash = await self.ipfs_service.add_file(image_path, pin=True)
        image_url = self.ipfs_service.get_gateway_url(image_hash)
        
        # Create metadata
        metadata = await self.metadata_service.create_metadata(
            name=name,
            description=description,
            image_url=image_url,
            attributes=attributes,
            **kwargs
        )
        
        # Upload metadata to IPFS
        metadata_hash = await self.metadata_service.upload_metadata(metadata)
        
        return image_hash, metadata_hash
    
    async def batch_create_nfts(
        self,
        nft_batch: List[Dict[str, Any]],
        collection_id: Optional[str] = None
    ) -> List[Tuple[str, str]]:
        """Batch create NFTs"""
        results = []
        
        for nft_data in nft_batch:
            try:
                image_hash, metadata_hash = await self.create_nft_with_metadata(
                    name=nft_data['name'],
                    description=nft_data['description'],
                    image_path=nft_data['image_path'],
                    attributes=nft_data.get('attributes', []),
                    collection_id=collection_id,
                    **nft_data.get('extra_metadata', {})
                )
                results.append((image_hash, metadata_hash))
            except Exception as e:
                print(f"Failed to create NFT {nft_data['name']}: {str(e)}")
                results.append((None, None))
        
        return results

# Factory function to create services
def create_ipfs_services(ipfs_gateway: str = "https://ipfs.io/ipfs/", ipfs_api: str = "http://localhost:5001"):
    """Create IPFS services"""
    ipfs_service = IPFSService(ipfs_gateway, ipfs_api)
    metadata_service = NFTMetadataService(ipfs_service)
    bulk_service = NFTBulkService(ipfs_service, metadata_service)
    collection_service = NFTCollectionService(ipfs_service, metadata_service)
    
    return {
        'ipfs': ipfs_service,
        'metadata': metadata_service,
        'bulk': bulk_service,
        'collection': collection_service
    }