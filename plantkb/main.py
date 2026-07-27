import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from plantkb.retrieval.llm_feed import answer

app = FastAPI()

origins = [
    "http://localhost:5173",  # Vite dev server
]

#enable cors to not access out API
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


class AskRequest(BaseModel):
    question: str


@app.post("/api/ask")
def ask_question(request: AskRequest):
    return {"response": answer(request.question)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
