"""
Proxy app that simulates the Databricks App behavior.
Forwards requests to the backend with the shared secret attached.
Set BACKEND_URL env var to point to your backend (e.g., http://192.168.x.x:8000)
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
from pydantic import BaseModel

app = FastAPI()

# Configuration
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
SHARED_SECRET = os.environ.get("SHARED_SECRET", "test-secret-key-change-in-production")

# Allow requests from localhost (browser would be from Databricks in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    question: str


@app.post("/api/ask")
async def proxy_ask(request: AskRequest):
    """Forward the request to the local backend with shared secret."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BACKEND_URL}/api/ask",
            json=request.model_dump(),
            headers={"X-Shared-Secret": SHARED_SECRET},
            timeout=120,
        )
    return JSONResponse(status_code=response.status_code, content=response.json())


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    print(f"Proxy running on http://0.0.0.0:8000")
    print(f"Forwarding requests to: {BACKEND_URL}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
