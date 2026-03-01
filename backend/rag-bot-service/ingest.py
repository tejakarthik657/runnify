"""RAG Bot Ingestion Service - Processes and embeds documents into vector store"""
import os
from typing import List
from langchain_community.document_loaders import TextLoader, UnstructuredMarkdownLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_groq import ChatGroq
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from dotenv import load_dotenv
import hashlib
import json

load_dotenv()

class DocumentIngestion:
    """Handles document loading, chunking, and vector storage"""
    
    def __init__(self, vector_store_path: str = "./vector_store"):
        self.vector_store_path = vector_store_path
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            length_function=len,
        )
    
    def load_documents(self, file_paths: List[str]) -> List:
        """Load documents from various formats"""
        documents = []
        
        for path in file_paths:
            if path.endswith('.md'):
                loader = UnstructuredMarkdownLoader(path)
            else:
                loader = TextLoader(path)
            
            docs = loader.load()
            documents.extend(docs)
        
        return documents
    
    def chunk_documents(self, documents: List) -> List:
        """Split documents into chunks"""
        return self.text_splitter.split_documents(documents)
    
    def create_vector_store(self, chunks: List):
        """Create FAISS vector store from chunks"""
        vector_store = FAISS.from_documents(chunks, self.embeddings)
        vector_store.save_local(self.vector_store_path)
        return vector_store
    
    def ingest_directory(self, directory: str):
        """Ingest all documents from a directory"""
        file_paths = [
            os.path.join(directory, f) 
            for f in os.listdir(directory) 
            if f.endswith(('.txt', '.md'))
        ]
        
        print(f"Loading {len(file_paths)} documents...")
        documents = self.load_documents(file_paths)
        
        print(f"Chunking documents...")
        chunks = self.chunk_documents(documents)
        
        print(f"Creating vector store with {len(chunks)} chunks...")
        vector_store = self.create_vector_store(chunks)
        
        # Create audit hash
        content = ''.join([chunk.page_content for chunk in chunks])
        audit_hash = hashlib.sha256(content.encode()).hexdigest()
        
        # Save metadata
        metadata = {
            "total_documents": len(documents),
            "total_chunks": len(chunks),
            "audit_hash": f"0x{audit_hash}",
            "file_paths": file_paths
        }
        
        with open(f"{self.vector_store_path}/metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"✅ Ingestion complete! Audit hash: 0x{audit_hash}")
        return metadata

if __name__ == "__main__":
    ingestion = DocumentIngestion()
    
    # Example: Ingest documentation
    docs_dir = "../../documentation"
    if os.path.exists(docs_dir):
        ingestion.ingest_directory(docs_dir)
    else:
        print(f"Directory {docs_dir} not found. Please add documents to ingest.")
