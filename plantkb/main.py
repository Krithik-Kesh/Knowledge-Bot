import os
import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from plantkb.retrieval.llm_feed import answer

app = FastAPI()

# Shared secret for proxy authentication (set via env var or default for testing)
SHARED_SECRET = os.environ.get("SHARED_SECRET", "test-secret-key-change-in-production")

origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:8001",  # Local proxy for testing
]

#enable cors to not access out API
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_shared_secret(request: Request):
    """Verify that the request has the correct shared secret."""
    secret = request.headers.get("X-Shared-Secret")
    if secret != SHARED_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


class AskRequest(BaseModel):
    question: str
    promptStyle: str = "concise"
    plantCode: str = "ASH"


@app.post("/api/ask")
def ask_question(request: Request, data: AskRequest):
    return {"response": answer(data.question, promptStyle=data.promptStyle, plantCode=data.plantCode)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
