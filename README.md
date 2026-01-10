# 🤖 Advanced RAG Assistant

A robust Retrieval-Augmented Generation (RAG) application built with **Next.js 16**, leveraging **Gemini 2.5 Flash** for intelligent answers and **Pinecone** for high-performance vector search. This project features a full document ingestion pipeline with support for PDF and DOCX files, automated summarization, and detailed observability via Langfuse.

## ✨ Features

- **📄 Multi-format Ingestion**: Upload and index `.pdf`, `.doc`, and `.docx` files effortlessly.
- **🔍 Vector Search**: Powered by **Pinecone** and **OpenAI Embeddings** (`text-embedding-3-small`) for precise context retrieval.
- **🧠 Advanced LLM**: Uses **Google Gemini 2.5 Flash** for generating high-quality, context-aware responses.
- **📊 Observability**: Integrated with **Langfuse** for tracing document ingestion, retrieval quality, and chat performance.
- **☁️ Storage**: **Supabase** handles secure file storage and metadata management.
- **⚡ Modern UI**: A sleek, responsive chat interface built with **Tailwind CSS 4**, **Radix UI**, and **Lucide Icons**.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **AI/ML**: 
  - [Google Generative AI](https://ai.google.dev/) (Gemini 2.5 Flash)
  - [OpenAI](https://openai.com/) (Embeddings)
- **Vector Database**: [Pinecone](https://www.pinecone.io/)
- **Backend/Storage**: [Supabase](https://supabase.com/)
- **Monitoring**: [Langfuse](https://langfuse.com/)
- **Text Extraction**: `unpdf` & `mammoth`

## 🚀 Getting Started

### Prerequisites

You'll need API keys for the following services:
- **Google AI Studio**: For Gemini API key.
- **OpenAI**: For embedding models.
- **Pinecone**: For the vector index.
- **Supabase**: For storage and project credentials.
- **Langfuse**: For observability.

### Environment Setup

Create a `.env.local` file in the root directory and add the following:

```env
# AI Models
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=your_index_name

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Langfuse
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key
LANGFUSE_HOST=your_langfuse_host
```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Guddu-Pandit/RAG-Application.git
   cd rag
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📂 Project Structure

- `app/api/ingest`: Route for processing and indexing documents.
- `app/api/chat`: Route for RAG-based chat logic.
- `lib/rag`: Core retrieval, embedding, and generation logic.
- `lib/gemini`: Gemini-specific implementation.
- `lib/pinecone`: Pinecone client configuration.
- `lib/supabase`: Supabase database and storage clients.
- `lib/langfuse`: Observability and tracing setup.

## 📄 License

This project is licensed under the MIT License.

---

Developed with ❤️ by [Guddu-Pandit](https://github.com/Guddu-Pandit)

