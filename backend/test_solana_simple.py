"""
Simple test for Solana endpoints
"""

from fastapi import FastAPI
from enhanced_solana_endpoints import router as solana_router

app = FastAPI()
app.include_router(solana_router)

@app.get("/")
async def root():
    return {"message": "Test server with Solana endpoints"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
