"""RAG Bot Query Service - Handles question answering with context retrieval"""
import os
from typing import Dict, List
from langchain_groq import ChatGroq
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import hashlib
import json

load_dotenv()

app = FastAPI(title="Territory Run RAG Bot")

class QueryRequest(BaseModel):
    question: str
    user_address: str

class QueryResponse(BaseModel):
    answer: str
    context_used: List[str]
    audit_hash: str
    sources: List[str]

class RAGEngine:
    """RAG pipeline for question answering"""
    
    def __init__(self, vector_store_path: str = "./vector_store"):
        self.vector_store_path = vector_store_path
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        
        # Initialize Groq LLM
        self.llm = ChatGroq(
            temperature=0.7,
            model_name="mixtral-8x7b-32768",
            groq_api_key=os.getenv("GROQ_API_KEY")
        )
        
        # Load vector store
        self.load_vector_store()
    
    def load_vector_store(self):
        """Load existing vector store"""
        try:
            self.vector_store = FAISS.load_local(
                self.vector_store_path,
                self.embeddings,
                allow_dangerous_deserialization=True
            )
            print("✅ Vector store loaded successfully")
        except Exception as e:
            print(f"❌ Error loading vector store: {e}")
            self.vector_store = None
    
    def create_prompt(self) -> PromptTemplate:
        """Create custom prompt template"""
        template = """You are a helpful assistant for Territory Run, a location-based running game where users conquer territory by running.

Use the following context to answer the question. If you don't know the answer, say so - don't make up information.

Context:
{context}

Question: {question}

Answer:"""
        
        return PromptTemplate(
            template=template,
            input_variables=["context", "question"]
        )
    
    def query(self, question: str, user_address: str) -> Dict:
        """Process a query and return answer with metadata"""
        if not self.vector_store:
            raise ValueError("Vector store not initialized. Run ingest.py first.")
        
        # Retrieve relevant documents
        retriever = self.vector_store.as_retriever(
            search_kwargs={"k": 5}
        )
        
        # Build QA chain
        qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=retriever,
            return_source_documents=True,
            chain_type_kwargs={"prompt": self.create_prompt()}
        )
        
        # Execute query
        result = qa_chain({"query": question})
        
        # Extract context and sources
        context_used = [
            doc.page_content for doc in result["source_documents"]
        ]
        
        sources = [
            doc.metadata.get("source", "Unknown") 
            for doc in result["source_documents"]
        ]
        
        # Create audit hash
        audit_content = question + result["result"] + user_address
        audit_hash = hashlib.sha256(audit_content.encode()).hexdigest()
        
        return {
            "answer": result["result"],
            "context_used": context_used,
            "audit_hash": f"0x{audit_hash}",
            "sources": list(set(sources))  # Remove duplicates
        }

# Initialize RAG engine
rag_engine = RAGEngine()

@app.get("/")
async def root():
    return {"status": "online", "service": "Territory Run RAG Bot"}

@app.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """Handle RAG query requests"""
    try:
        result = rag_engine.query(request.question, request.user_address)
        return QueryResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "vector_store_loaded": rag_engine.vector_store is not None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
