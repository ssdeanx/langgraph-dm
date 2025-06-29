
import { InMemoryStore } from "@langchain/langgraph";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

/**
 * Initializes an in-memory store with semantic search capabilities.
 * Uses GoogleGenerativeAIEmbeddings for creating vector embeddings.
 * @type {InMemoryStore}
 */
export const inMemoryStore = new InMemoryStore({
  index: {
    embeddings: new GoogleGenerativeAIEmbeddings(),
    dims: 768, // Dimension for GoogleGenerativeAIEmbeddings
  },
});
