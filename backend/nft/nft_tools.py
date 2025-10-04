"""
Advanced NFT Tools for Soladia Marketplace
Implements minting, metadata management, IPFS integration, and NFT utilities
"""

import json
import base64
import hashlib
import asyncio
import aiohttp
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class NFTStandard(Enum):
    """NFT standards supported"""
    METADATA = "metadata"
    CANDY_MACHINE = "candy_machine"
    METAPLEX = "metaplex"
    CUSTOM = "custom"

class MetadataFormat(Enum):
    """Metadata formats"""
    JSON = "json"
    YAML = "yaml"
    XML = "xml"

@dataclass
class NFTMetadata:
    """NFT metadata structure"""
    name: str
    description: str
    image: str
    external_url: Optional[str] = None
    attributes: List[Dict[str, Any]] = None
    properties: Dict[str, Any] = None
    collection: Optional[Dict[str, Any]] = None
    seller_fee_basis_points: int = 0
    symbol: Optional[str] = None
    background_color: Optional[str] = None
    animation_url: Optional[str] = None
    youtube_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

@dataclass
class IPFSUpload:
    """IPFS upload result"""
    hash: str
    size: int
    url: str
    pin_status: str
    timestamp: str

@dataclass
class NFTCreation:
    """NFT creation result"""
    mint_address: str
    metadata_uri: str
    transaction_signature: str
    status: str
    created_at: str

class IPFSService:
    """IPFS service for storing NFT metadata and assets"""
    
    def __init__(self, gateway_url: str = "https://ipfs.io/ipfs/"):
        self.gateway_url = gateway_url
        self.pinata_api_key = None
        self.pinata_secret_key = None
    
    async def upload_file(self, file_path: str, file_content: bytes) -> IPFSUpload:
        """Upload a file to IPFS"""
        try:
            # In a real implementation, this would use Pinata or another IPFS service
            # For now, we'll simulate the upload
            
            # Generate a mock hash
            file_hash = hashlib.sha256(file_content).hexdigest()[:46]  # IPFS hash length
            
            upload_result = IPFSUpload(
                hash=file_hash,
                size=len(file_content),
                url=f"{self.gateway_url}{file_hash}",
                pin_status="pinned",
                timestamp=datetime.now(timezone.utc).isoformat()
            )
            
            logger.info(f"File uploaded to IPFS: {upload_result.hash}")
            return upload_result
            
        except Exception as e:
            logger.error(f"IPFS upload failed: {str(e)}")
            raise Exception(f"Failed to upload file to IPFS: {str(e)}")
    
    async def upload_json(self, data: Dict[str, Any]) -> IPFSUpload:
        """Upload JSON data to IPFS"""
        try:
            json_content = json.dumps(data, indent=2).encode('utf-8')
            return await self.upload_file("metadata.json", json_content)
        except Exception as e:
            logger.error(f"JSON upload to IPFS failed: {str(e)}")
            raise Exception(f"Failed to upload JSON to IPFS: {str(e)}")
    
    async def get_file(self, hash: str) -> bytes:
        """Get file content from IPFS"""
        try:
            # In a real implementation, this would fetch from IPFS
            # For now, return mock data
            return b"Mock file content from IPFS"
        except Exception as e:
            logger.error(f"Failed to get file from IPFS: {str(e)}")
            raise Exception(f"Failed to get file from IPFS: {str(e)}")
    
    async def pin_file(self, hash: str) -> bool:
        """Pin a file to IPFS"""
        try:
            # In a real implementation, this would pin the file
            logger.info(f"File pinned to IPFS: {hash}")
            return True
        except Exception as e:
            logger.error(f"Failed to pin file: {str(e)}")
            return False

class NFTMetadataService:
    """Service for managing NFT metadata"""
    
    def __init__(self, ipfs_service: IPFSService):
        self.ipfs_service = ipfs_service
        self.metadata_cache = {}
    
    def create_metadata(
        self,
        name: str,
        description: str,
        image_url: str,
        attributes: List[Dict[str, Any]] = None,
        collection: Dict[str, Any] = None,
        **kwargs
    ) -> NFTMetadata:
        """Create NFT metadata"""
        try:
            metadata = NFTMetadata(
                name=name,
                description=description,
                image=image_url,
                attributes=attributes or [],
                collection=collection,
                created_at=datetime.now(timezone.utc).isoformat(),
                **kwargs
            )
            
            logger.info(f"Metadata created for NFT: {name}")
            return metadata
            
        except Exception as e:
            logger.error(f"Failed to create metadata: {str(e)}")
            raise Exception(f"Failed to create metadata: {str(e)}")
    
    async def upload_metadata(self, metadata: NFTMetadata) -> str:
        """Upload metadata to IPFS and return URI"""
        try:
            # Convert metadata to dict
            metadata_dict = asdict(metadata)
            
            # Upload to IPFS
            upload_result = await self.ipfs_service.upload_json(metadata_dict)
            
            # Cache the metadata
            self.metadata_cache[upload_result.hash] = metadata_dict
            
            logger.info(f"Metadata uploaded to IPFS: {upload_result.url}")
            return upload_result.url
            
        except Exception as e:
            logger.error(f"Failed to upload metadata: {str(e)}")
            raise Exception(f"Failed to upload metadata: {str(e)}")
    
    async def get_metadata(self, uri: str) -> NFTMetadata:
        """Get metadata from URI"""
        try:
            # Extract hash from URI
            if uri.startswith("ipfs://"):
                hash = uri.replace("ipfs://", "")
            elif uri.startswith("https://ipfs.io/ipfs/"):
                hash = uri.replace("https://ipfs.io/ipfs/", "")
            else:
                hash = uri
            
            # Check cache first
            if hash in self.metadata_cache:
                metadata_dict = self.metadata_cache[hash]
            else:
                # Fetch from IPFS
                content = await self.ipfs_service.get_file(hash)
                metadata_dict = json.loads(content.decode('utf-8'))
                self.metadata_cache[hash] = metadata_dict
            
            # Convert to NFTMetadata object
            metadata = NFTMetadata(**metadata_dict)
            
            logger.info(f"Metadata retrieved: {metadata.name}")
            return metadata
            
        except Exception as e:
            logger.error(f"Failed to get metadata: {str(e)}")
            raise Exception(f"Failed to get metadata: {str(e)}")
    
    def validate_metadata(self, metadata: NFTMetadata) -> Tuple[bool, List[str]]:
        """Validate NFT metadata"""
        errors = []
        
        # Required fields
        if not metadata.name or not metadata.name.strip():
            errors.append("Name is required")
        
        if not metadata.description or not metadata.description.strip():
            errors.append("Description is required")
        
        if not metadata.image or not metadata.image.strip():
            errors.append("Image URL is required")
        
        # Validate attributes
        if metadata.attributes:
            for i, attr in enumerate(metadata.attributes):
                if not isinstance(attr, dict):
                    errors.append(f"Attribute {i} must be a dictionary")
                elif "trait_type" not in attr or "value" not in attr:
                    errors.append(f"Attribute {i} must have 'trait_type' and 'value'")
        
        # Validate collection
        if metadata.collection:
            if "name" not in metadata.collection:
                errors.append("Collection must have a name")
        
        return len(errors) == 0, errors

class NFTMintingService:
    """Service for minting NFTs on Solana"""
    
    def __init__(self, rpc_client, ipfs_service: IPFSService, metadata_service: NFTMetadataService):
        self.rpc_client = rpc_client
        self.ipfs_service = ipfs_service
        self.metadata_service = metadata_service
        self.mint_program_id = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        self.metadata_program_id = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    
    async def mint_nft(
        self,
        creator_wallet: str,
        metadata: NFTMetadata,
        collection_mint: Optional[str] = None,
        royalty_percentage: float = 0.0
    ) -> NFTCreation:
        """Mint a new NFT"""
        try:
            # Validate metadata
            is_valid, errors = self.metadata_service.validate_metadata(metadata)
            if not is_valid:
                raise Exception(f"Invalid metadata: {', '.join(errors)}")
            
            # Upload metadata to IPFS
            metadata_uri = await self.metadata_service.upload_metadata(metadata)
            
            # Create mint account
            mint_address = await self._create_mint_account()
            
            # Create metadata account
            metadata_account = await self._create_metadata_account(
                mint_address, metadata_uri, creator_wallet, collection_mint, royalty_percentage
            )
            
            # Create master edition (for unique NFTs)
            master_edition = await self._create_master_edition(mint_address, creator_wallet)
            
            # Simulate transaction
            transaction_signature = f"mint_{mint_address[:8]}_{int(datetime.now().timestamp())}"
            
            nft_creation = NFTCreation(
                mint_address=mint_address,
                metadata_uri=metadata_uri,
                transaction_signature=transaction_signature,
                status="confirmed",
                created_at=datetime.now(timezone.utc).isoformat()
            )
            
            logger.info(f"NFT minted successfully: {mint_address}")
            return nft_creation
            
        except Exception as e:
            logger.error(f"Failed to mint NFT: {str(e)}")
            raise Exception(f"Failed to mint NFT: {str(e)}")
    
    async def batch_mint_nfts(
        self,
        creator_wallet: str,
        metadata_list: List[NFTMetadata],
        collection_mint: Optional[str] = None,
        royalty_percentage: float = 0.0
    ) -> List[NFTCreation]:
        """Mint multiple NFTs in a batch"""
        try:
            results = []
            
            for i, metadata in enumerate(metadata_list):
                try:
                    # Add batch index to name if not unique
                    if len(metadata_list) > 1:
                        metadata.name = f"{metadata.name} #{i+1}"
                    
                    result = await self.mint_nft(
                        creator_wallet, metadata, collection_mint, royalty_percentage
                    )
                    results.append(result)
                    
                    # Add delay between mints to avoid rate limiting
                    if i < len(metadata_list) - 1:
                        await asyncio.sleep(1)
                        
                except Exception as e:
                    logger.error(f"Failed to mint NFT {i+1}: {str(e)}")
                    # Continue with other NFTs
                    continue
            
            logger.info(f"Batch minting completed: {len(results)}/{len(metadata_list)} successful")
            return results
            
        except Exception as e:
            logger.error(f"Batch minting failed: {str(e)}")
            raise Exception(f"Batch minting failed: {str(e)}")
    
    async def _create_mint_account(self) -> str:
        """Create a new mint account"""
        # In a real implementation, this would create an actual mint account
        # For now, return a mock address
        return f"mint_{hashlib.sha256(str(datetime.now()).encode()).hexdigest()[:32]}"
    
    async def _create_metadata_account(
        self,
        mint_address: str,
        metadata_uri: str,
        creator_wallet: str,
        collection_mint: Optional[str],
        royalty_percentage: float
    ) -> str:
        """Create metadata account"""
        # In a real implementation, this would create the metadata account
        return f"metadata_{mint_address}"
    
    async def _create_master_edition(self, mint_address: str, creator_wallet: str) -> str:
        """Create master edition account"""
        # In a real implementation, this would create the master edition
        return f"edition_{mint_address}"

class NFTCollectionService:
    """Service for managing NFT collections"""
    
    def __init__(self, minting_service: NFTMintingService, metadata_service: NFTMetadataService):
        self.minting_service = minting_service
        self.metadata_service = metadata_service
    
    async def create_collection(
        self,
        name: str,
        description: str,
        image_url: str,
        creator_wallet: str,
        max_supply: Optional[int] = None,
        royalty_percentage: float = 5.0
    ) -> Dict[str, Any]:
        """Create a new NFT collection"""
        try:
            # Create collection metadata
            collection_metadata = NFTMetadata(
                name=name,
                description=description,
                image=image_url,
                symbol=name.upper().replace(" ", ""),
                seller_fee_basis_points=int(royalty_percentage * 100),
                collection={
                    "name": name,
                    "family": name
                }
            )
            
            # Mint collection NFT
            collection_nft = await self.minting_service.mint_nft(
                creator_wallet, collection_metadata, royalty_percentage=royalty_percentage
            )
            
            collection_info = {
                "collection_mint": collection_nft.mint_address,
                "name": name,
                "description": description,
                "image_url": image_url,
                "max_supply": max_supply,
                "royalty_percentage": royalty_percentage,
                "created_at": collection_nft.created_at,
                "creator": creator_wallet
            }
            
            logger.info(f"Collection created: {name} ({collection_nft.mint_address})")
            return collection_info
            
        except Exception as e:
            logger.error(f"Failed to create collection: {str(e)}")
            raise Exception(f"Failed to create collection: {str(e)}")
    
    async def add_to_collection(
        self,
        collection_mint: str,
        nft_metadata: NFTMetadata,
        creator_wallet: str
    ) -> NFTCreation:
        """Add an NFT to an existing collection"""
        try:
            # Set collection information in metadata
            nft_metadata.collection = {
                "name": "Collection Name",  # In real implementation, get from collection
                "family": "Collection Family"
            }
            
            # Mint NFT with collection reference
            nft_creation = await self.minting_service.mint_nft(
                creator_wallet, nft_metadata, collection_mint
            )
            
            logger.info(f"NFT added to collection: {nft_creation.mint_address}")
            return nft_creation
            
        except Exception as e:
            logger.error(f"Failed to add NFT to collection: {str(e)}")
            raise Exception(f"Failed to add NFT to collection: {str(e)}")

class NFTUtilityService:
    """Utility service for NFT operations"""
    
    def __init__(self, ipfs_service: IPFSService, metadata_service: NFTMetadataService):
        self.ipfs_service = ipfs_service
        self.metadata_service = metadata_service
    
    async def generate_attributes(
        self,
        trait_types: List[str],
        trait_values: List[List[str]],
        weights: Optional[List[List[float]]] = None
    ) -> List[Dict[str, Any]]:
        """Generate random attributes for NFT"""
        try:
            import random
            
            attributes = []
            
            for i, trait_type in enumerate(trait_types):
                if i < len(trait_values):
                    values = trait_values[i]
                    value_weights = weights[i] if weights and i < len(weights) else None
                    
                    if value_weights and len(value_weights) == len(values):
                        # Weighted random selection
                        selected_value = random.choices(values, weights=value_weights)[0]
                    else:
                        # Uniform random selection
                        selected_value = random.choice(values)
                    
                    attributes.append({
                        "trait_type": trait_type,
                        "value": selected_value
                    })
            
            logger.info(f"Generated {len(attributes)} attributes")
            return attributes
            
        except Exception as e:
            logger.error(f"Failed to generate attributes: {str(e)}")
            raise Exception(f"Failed to generate attributes: {str(e)}")
    
    async def validate_image_url(self, image_url: str) -> Tuple[bool, str]:
        """Validate if image URL is accessible"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.head(image_url) as response:
                    if response.status == 200:
                        content_type = response.headers.get('content-type', '')
                        if content_type.startswith('image/'):
                            return True, "Valid image URL"
                        else:
                            return False, "URL does not point to an image"
                    else:
                        return False, f"HTTP {response.status}: Image not accessible"
        except Exception as e:
            return False, f"Error validating image: {str(e)}"
    
    async def calculate_rarity_score(self, attributes: List[Dict[str, Any]]) -> float:
        """Calculate rarity score for NFT attributes"""
        try:
            # In a real implementation, this would calculate based on trait rarity
            # For now, return a mock score
            base_score = 1.0
            
            for attr in attributes:
                trait_type = attr.get("trait_type", "")
                value = attr.get("value", "")
                
                # Mock rarity calculation
                if trait_type.lower() == "rarity":
                    if value.lower() == "legendary":
                        base_score *= 10
                    elif value.lower() == "epic":
                        base_score *= 5
                    elif value.lower() == "rare":
                        base_score *= 2
                    elif value.lower() == "common":
                        base_score *= 1
            
            return round(base_score, 2)
            
        except Exception as e:
            logger.error(f"Failed to calculate rarity score: {str(e)}")
            return 1.0
    
    def format_metadata_for_standard(
        self,
        metadata: NFTMetadata,
        standard: NFTStandard
    ) -> Dict[str, Any]:
        """Format metadata for specific NFT standard"""
        try:
            base_metadata = asdict(metadata)
            
            if standard == NFTStandard.METAPLEX:
                # Add Metaplex-specific fields
                base_metadata["properties"] = {
                    "files": [{"uri": metadata.image, "type": "image/png"}],
                    "category": "image",
                    "creators": [{"address": "creator_address", "verified": True, "share": 100}]
                }
            
            elif standard == NFTStandard.CANDY_MACHINE:
                # Add Candy Machine-specific fields
                base_metadata["symbol"] = metadata.symbol or "NFT"
                base_metadata["seller_fee_basis_points"] = metadata.seller_fee_basis_points
            
            return base_metadata
            
        except Exception as e:
            logger.error(f"Failed to format metadata: {str(e)}")
            raise Exception(f"Failed to format metadata: {str(e)}")

# Factory function to create NFT tools service
def create_nft_tools_service(rpc_client) -> Tuple[IPFSService, NFTMetadataService, NFTMintingService, NFTCollectionService, NFTUtilityService]:
    """Create and configure all NFT tools services"""
    ipfs_service = IPFSService()
    metadata_service = NFTMetadataService(ipfs_service)
    minting_service = NFTMintingService(rpc_client, ipfs_service, metadata_service)
    collection_service = NFTCollectionService(minting_service, metadata_service)
    utility_service = NFTUtilityService(ipfs_service, metadata_service)
    
    return ipfs_service, metadata_service, minting_service, collection_service, utility_service
