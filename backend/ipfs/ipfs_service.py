"""
IPFS Service for Soladia Marketplace
Handles file upload, pinning, and metadata management
"""

import asyncio
import aiohttp
import json
import hashlib
import mimetypes
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from pathlib import Path
import logging
from PIL import Image
import io

logger = logging.getLogger(__name__)

@dataclass
class IPFSFile:
    """IPFS file metadata"""
    hash: str
    size: int
    name: str
    mime_type: str
    pin_status: str
    created_at: str
    url: str

@dataclass
class IPFSUploadResult:
    """IPFS upload result"""
    success: bool
    file: Optional[IPFSFile] = None
    error: Optional[str] = None

class IPFSService:
    """IPFS service for file management"""
    
    def __init__(self, 
                 ipfs_gateway: str = "https://ipfs.io/ipfs/",
                 pinata_api_key: Optional[str] = None,
                 pinata_secret_key: Optional[str] = None):
        self.ipfs_gateway = ipfs_gateway
        self.pinata_api_key = pinata_api_key
        self.pinata_secret_key = pinata_secret_key
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        await self.connect()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
        
    async def connect(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        )
        
    async def close(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()
            
    async def upload_file(self, 
                         file_path: str, 
                         metadata: Optional[Dict[str, Any]] = None) -> IPFSUploadResult:
        """Upload file to IPFS"""
        try:
            if not self.session:
                await self.connect()
                
            # Read file
            with open(file_path, 'rb') as f:
                file_data = f.read()
                
            # Get file info
            file_name = Path(file_path).name
            file_size = len(file_data)
            mime_type, _ = mimetypes.guess_type(file_path)
            
            # Upload to IPFS
            if self.pinata_api_key and self.pinata_secret_key:
                result = await self._upload_to_pinata(file_data, file_name, metadata)
            else:
                result = await self._upload_to_local_ipfs(file_data, file_name, metadata)
                
            if result.success:
                ipfs_file = IPFSFile(
                    hash=result.file.hash,
                    size=file_size,
                    name=file_name,
                    mime_type=mime_type or 'application/octet-stream',
                    pin_status='pinned',
                    created_at=result.file.created_at,
                    url=f"{self.ipfs_gateway}{result.file.hash}"
                )
                
                return IPFSUploadResult(
                    success=True,
                    file=ipfs_file
                )
            else:
                return IPFSUploadResult(
                    success=False,
                    error=result.error
                )
                
        except Exception as e:
            logger.error(f"Failed to upload file {file_path}: {str(e)}")
            return IPFSUploadResult(
                success=False,
                error=str(e)
            )
            
    async def upload_bytes(self, 
                          data: bytes, 
                          file_name: str,
                          metadata: Optional[Dict[str, Any]] = None) -> IPFSUploadResult:
        """Upload bytes data to IPFS"""
        try:
            if not self.session:
                await self.connect()
                
            # Upload to IPFS
            if self.pinata_api_key and self.pinata_secret_key:
                result = await self._upload_to_pinata(data, file_name, metadata)
            else:
                result = await self._upload_to_local_ipfs(data, file_name, metadata)
                
            if result.success:
                mime_type, _ = mimetypes.guess_type(file_name)
                
                ipfs_file = IPFSFile(
                    hash=result.file.hash,
                    size=len(data),
                    name=file_name,
                    mime_type=mime_type or 'application/octet-stream',
                    pin_status='pinned',
                    created_at=result.file.created_at,
                    url=f"{self.ipfs_gateway}{result.file.hash}"
                )
                
                return IPFSUploadResult(
                    success=True,
                    file=ipfs_file
                )
            else:
                return IPFSUploadResult(
                    success=False,
                    error=result.error
                )
                
        except Exception as e:
            logger.error(f"Failed to upload bytes data: {str(e)}")
            return IPFSUploadResult(
                success=False,
                error=str(e)
            )
            
    async def upload_nft_metadata(self, 
                                 name: str,
                                 description: str,
                                 image_url: str,
                                 attributes: List[Dict[str, Any]],
                                 external_url: Optional[str] = None) -> IPFSUploadResult:
        """Upload NFT metadata to IPFS"""
        try:
            metadata = {
                "name": name,
                "description": description,
                "image": image_url,
                "attributes": attributes,
                "external_url": external_url,
                "animation_url": None,
                "background_color": None,
                "youtube_url": None
            }
            
            # Convert to JSON
            metadata_json = json.dumps(metadata, indent=2)
            metadata_bytes = metadata_json.encode('utf-8')
            
            # Upload metadata
            return await self.upload_bytes(
                metadata_bytes,
                f"{name}_metadata.json",
                {"type": "nft_metadata"}
            )
            
        except Exception as e:
            logger.error(f"Failed to upload NFT metadata: {str(e)}")
            return IPFSUploadResult(
                success=False,
                error=str(e)
            )
            
    async def upload_image_with_variants(self, 
                                       image_path: str,
                                       variants: List[Tuple[int, int]] = None) -> Dict[str, IPFSUploadResult]:
        """Upload image with multiple size variants"""
        if variants is None:
            variants = [(300, 300), (600, 600), (1200, 1200)]
            
        results = {}
        
        try:
            # Load original image
            with Image.open(image_path) as img:
                original_format = img.format
                
                # Upload original
                original_result = await self.upload_file(image_path)
                if original_result.success:
                    results['original'] = original_result
                
                # Create and upload variants
                for width, height in variants:
                    try:
                        # Resize image
                        resized_img = img.resize((width, height), Image.Resampling.LANCZOS)
                        
                        # Convert to bytes
                        img_bytes = io.BytesIO()
                        resized_img.save(img_bytes, format=original_format or 'PNG')
                        img_bytes.seek(0)
                        
                        # Upload variant
                        variant_name = f"{Path(image_path).stem}_{width}x{height}.{original_format.lower()}"
                        variant_result = await self.upload_bytes(
                            img_bytes.getvalue(),
                            variant_name,
                            {"type": "image_variant", "size": f"{width}x{height}"}
                        )
                        
                        if variant_result.success:
                            results[f"{width}x{height}"] = variant_result
                            
                    except Exception as e:
                        logger.error(f"Failed to create variant {width}x{height}: {str(e)}")
                        
        except Exception as e:
            logger.error(f"Failed to upload image variants: {str(e)}")
            
        return results
        
    async def pin_file(self, ipfs_hash: str) -> bool:
        """Pin file to IPFS"""
        try:
            if not self.session:
                await self.connect()
                
            if self.pinata_api_key and self.pinata_secret_key:
                return await self._pin_to_pinata(ipfs_hash)
            else:
                return await self._pin_to_local_ipfs(ipfs_hash)
                
        except Exception as e:
            logger.error(f"Failed to pin file {ipfs_hash}: {str(e)}")
            return False
            
    async def unpin_file(self, ipfs_hash: str) -> bool:
        """Unpin file from IPFS"""
        try:
            if not self.session:
                await self.connect()
                
            if self.pinata_api_key and self.pinata_secret_key:
                return await self._unpin_from_pinata(ipfs_hash)
            else:
                return await self._unpin_from_local_ipfs(ipfs_hash)
                
        except Exception as e:
            logger.error(f"Failed to unpin file {ipfs_hash}: {str(e)}")
            return False
            
    async def get_file_info(self, ipfs_hash: str) -> Optional[IPFSFile]:
        """Get file information from IPFS"""
        try:
            if not self.session:
                await self.connect()
                
            if self.pinata_api_key and self.pinata_secret_key:
                return await self._get_file_info_from_pinata(ipfs_hash)
            else:
                return await self._get_file_info_from_local_ipfs(ipfs_hash)
                
        except Exception as e:
            logger.error(f"Failed to get file info {ipfs_hash}: {str(e)}")
            return None
            
    async def validate_metadata(self, metadata: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate NFT metadata"""
        errors = []
        
        # Required fields
        required_fields = ['name', 'description', 'image']
        for field in required_fields:
            if field not in metadata or not metadata[field]:
                errors.append(f"Missing required field: {field}")
                
        # Validate name
        if 'name' in metadata:
            if len(metadata['name']) > 100:
                errors.append("Name too long (max 100 characters)")
                
        # Validate description
        if 'description' in metadata:
            if len(metadata['description']) > 1000:
                errors.append("Description too long (max 1000 characters)")
                
        # Validate image URL
        if 'image' in metadata:
            image_url = metadata['image']
            if not image_url.startswith(('http://', 'https://', 'ipfs://')):
                errors.append("Invalid image URL format")
                
        # Validate attributes
        if 'attributes' in metadata:
            attributes = metadata['attributes']
            if not isinstance(attributes, list):
                errors.append("Attributes must be a list")
            else:
                for i, attr in enumerate(attributes):
                    if not isinstance(attr, dict):
                        errors.append(f"Attribute {i} must be an object")
                    elif 'trait_type' not in attr or 'value' not in attr:
                        errors.append(f"Attribute {i} missing trait_type or value")
                        
        return len(errors) == 0, errors
        
    async def _upload_to_pinata(self, 
                               data: bytes, 
                               file_name: str,
                               metadata: Optional[Dict[str, Any]] = None) -> IPFSUploadResult:
        """Upload to Pinata IPFS service"""
        try:
            # Prepare form data
            form_data = aiohttp.FormData()
            form_data.add_field('file', data, filename=file_name)
            
            if metadata:
                form_data.add_field('pinataMetadata', json.dumps({
                    'name': file_name,
                    'keyvalues': metadata
                }))
                
            # Upload to Pinata
            headers = {
                'pinata_api_key': self.pinata_api_key,
                'pinata_secret_api_key': self.pinata_secret_key
            }
            
            async with self.session.post(
                'https://api.pinata.cloud/pinning/pinFileToIPFS',
                data=form_data,
                headers=headers
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    
                    ipfs_file = IPFSFile(
                        hash=result['IpfsHash'],
                        size=result['PinSize'],
                        name=file_name,
                        mime_type='application/octet-stream',
                        pin_status='pinned',
                        created_at=result['Timestamp'],
                        url=f"{self.ipfs_gateway}{result['IpfsHash']}"
                    )
                    
                    return IPFSUploadResult(success=True, file=ipfs_file)
                else:
                    error_text = await response.text()
                    return IPFSUploadResult(
                        success=False,
                        error=f"Pinata upload failed: {response.status} - {error_text}"
                    )
                    
        except Exception as e:
            return IPFSUploadResult(
                success=False,
                error=f"Pinata upload error: {str(e)}"
            )
            
    async def _upload_to_local_ipfs(self, 
                                   data: bytes, 
                                   file_name: str,
                                   metadata: Optional[Dict[str, Any]] = None) -> IPFSUploadResult:
        """Upload to local IPFS node"""
        try:
            # This would require a local IPFS node running
            # For now, return a mock result
            return IPFSUploadResult(
                success=False,
                error="Local IPFS node not configured"
            )
            
        except Exception as e:
            return IPFSUploadResult(
                success=False,
                error=f"Local IPFS upload error: {str(e)}"
            )
            
    async def _pin_to_pinata(self, ipfs_hash: str) -> bool:
        """Pin file to Pinata"""
        try:
            headers = {
                'pinata_api_key': self.pinata_api_key,
                'pinata_secret_api_key': self.pinata_secret_key,
                'Content-Type': 'application/json'
            }
            
            data = {
                'hashToPin': ipfs_hash
            }
            
            async with self.session.post(
                'https://api.pinata.cloud/pinning/pinByHash',
                json=data,
                headers=headers
            ) as response:
                return response.status == 200
                
        except Exception as e:
            logger.error(f"Failed to pin to Pinata: {str(e)}")
            return False
            
    async def _unpin_from_pinata(self, ipfs_hash: str) -> bool:
        """Unpin file from Pinata"""
        try:
            headers = {
                'pinata_api_key': self.pinata_api_key,
                'pinata_secret_api_key': self.pinata_secret_key
            }
            
            async with self.session.delete(
                f'https://api.pinata.cloud/pinning/unpin/{ipfs_hash}',
                headers=headers
            ) as response:
                return response.status == 200
                
        except Exception as e:
            logger.error(f"Failed to unpin from Pinata: {str(e)}")
            return False
            
    async def _get_file_info_from_pinata(self, ipfs_hash: str) -> Optional[IPFSFile]:
        """Get file info from Pinata"""
        try:
            headers = {
                'pinata_api_key': self.pinata_api_key,
                'pinata_secret_api_key': self.pinata_secret_key
            }
            
            async with self.session.get(
                f'https://api.pinata.cloud/data/pinList?hashContains={ipfs_hash}',
                headers=headers
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    if result['rows']:
                        pin_info = result['rows'][0]
                        
                        return IPFSFile(
                            hash=pin_info['ipfs_pin_hash'],
                            size=pin_info['size'],
                            name=pin_info['metadata']['name'],
                            mime_type=pin_info['mime_type'],
                            pin_status='pinned',
                            created_at=pin_info['date_pinned'],
                            url=f"{self.ipfs_gateway}{pin_info['ipfs_pin_hash']}"
                        )
                        
        except Exception as e:
            logger.error(f"Failed to get file info from Pinata: {str(e)}")
            
        return None
        
    async def _pin_to_local_ipfs(self, ipfs_hash: str) -> bool:
        """Pin file to local IPFS node"""
        # Implementation for local IPFS node
        return False
        
    async def _unpin_from_local_ipfs(self, ipfs_hash: str) -> bool:
        """Unpin file from local IPFS node"""
        # Implementation for local IPFS node
        return False
        
    async def _get_file_info_from_local_ipfs(self, ipfs_hash: str) -> Optional[IPFSFile]:
        """Get file info from local IPFS node"""
        # Implementation for local IPFS node
        return None

# Create singleton instance
ipfs_service = IPFSService()


