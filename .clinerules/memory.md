---
glob: "**/*.ts"
description: "Langgraph Memory Management Guidelines"
---
# Memory Management Guidelines

## Purpose of Memory

Memory in AI applications allows agents to process, store, and effectively recall information from past interactions, enabling learning and adaptation to user preferences.

* **Short-term Memory (Thread-scoped):** Persists conversational turns (`messages`) within a single session for context and continuity. Managed as part of the agent's state.
* **Long-term Memory (Cross-thread):** Retains information across different conversations or users. Stored in custom namespaces via the `Store` interface.
* **Checkpointing:** Saves snapshots of the graph state at every "super-step" for continuity, debugging, and fault tolerance.

## Implementation Details (`src/memory/`)

* **MongoDB Integration:** MongoDB is the primary backend for memory persistence, including chat history, vector stores, and checkpoints.
* **`MongoDBSaver` (`@langchain/langgraph-checkpoint-mongodb`):** Used for LangGraph checkpointing, ensuring graph state can be saved and reloaded.
* **`MongoDBStore`:** Provides a generic key-value store interface over MongoDB for various data types, supporting long-term memory.
* **`MongoDBChatMessageHistory`:** Manages the storage and retrieval of chat messages in MongoDB.
* **`MongoDBAtlasVectorSearch`:** Integrates with MongoDB Atlas Vector Search for efficient semantic search over embeddings. Uses Google embeddings.

## Best Practices for Memory

* **Session Management:** Ensure unique `sessionId`s are used for different conversations to maintain isolated contexts.
* **Environment Variables:** `MONGODB_ATLAS_URI` must be set for database connection.
* **Vector Indexing:** Ensure vector search indexes are properly created and maintained for efficient vector lookups (e.g., `vector_index` in `src/memory/storage.ts`). Note that Google embeddings are typically 768 dimensions.
* **Data Consistency:** Be mindful of data consistency when updating and retrieving memory components.
* **Scalability:** Consider the implications of memory storage on scalability for large-scale deployments.
* **Managing Conversation History:** Implement strategies to manage long conversation histories (e.g., trimming, summarizing) to prevent context window overflow and reduce costs. The `MessagesAnnotation` with `messagesStateReducer` is crucial for handling message updates and deletions.
* **Memory Store Usage:** Use the `Store` interface for cross-thread persistence. Define clear namespaces and keys for organizing memories. Implement semantic search for natural language retrieval.
* **Writing Memories:** Decide whether to write memories "on the hot path" (real-time, potentially impacting latency) or "in the background" (as a separate task).
* **Memory Representation:** Consider how memories are presented to the LLM (e.g., as updated instructions, few-shot examples) to optimize its performance.
