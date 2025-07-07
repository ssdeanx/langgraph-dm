import { AIMessage } from "@langchain/core/messages";
import { model } from "../config/googleProvider.js";
import { RagAnnotation } from "./rag_state.js"; // Import RagAnnotation
import logger from "../config/logger.js";
import { ToolExecutionError } from "../config/errors.js";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { createVectorStore } from "../memory/storage.js";

/**
 * Node to retrieve relevant documents from the vector store based on the query.
 * @param state The current agent state.
 * @param config The runnable config.
 * @returns A partial agent state with the retrieved documents.
 */
export async function retrieveNode(state: typeof RagAnnotation.State, config: LangGraphRunnableConfig): Promise<Partial<typeof RagAnnotation.State>> {
  logger.info("Retrieving documents for RAG", { query: state.query });
  config.writer?.(new AIMessage("Retrieving relevant documents..."));

  try {
    if (!state.query) {
      throw new Error("No query provided for document retrieval.");
    }

    const vectorstore = await createVectorStore();
    const retrievedDocs = await vectorstore.similaritySearch(state.query, 5); // Retrieve top 5 documents

    const documentContent = retrievedDocs.map(doc => doc.pageContent).join("\n\n");

    return {
      retrieved_documents: [documentContent],
      messages: [new AIMessage(`Retrieved documents for: ${state.query}`)]
    };
  } catch (error) {
    logger.error("Document retrieval error", { error: error instanceof Error ? error.message : 'Unknown error' });
    throw new ToolExecutionError(
      `Failed to retrieve documents for RAG: ${error instanceof Error ? error.message : 'Unknown error'}`,
      "retrieve_documents",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Node to generate a response based on retrieved documents and the query.
 * @param state The current agent state.
 * @param config The runnable config.
 * @returns A partial agent state with the generated response.
 */
export async function generateRagResponseNode(state: typeof RagAnnotation.State, config: LangGraphRunnableConfig): Promise<Partial<typeof RagAnnotation.State>> {
  logger.info("Generating RAG response", { query: state.query });
  config.writer?.(new AIMessage("Generating response based on documents..."));

  try {
    const context = state.retrieved_documents?.join("\n\n") || "";
    if (!context) {
      throw new Error("No context provided from retrieved documents.");
    }

    const prompt = config.configurable?.rag_prompt ?? `
      Based on the following context, answer the user's query. If you cannot answer based on the provided context, state that you don't have enough information.

      Context:
      ${context}

      Query:
      ${state.query}
    `;

    const response = await model.invoke([{
      role: "user",
      content: prompt
    }]);

    const finalAnswer = response.content as string;

    return {
      generated_answer: finalAnswer,
      messages: [new AIMessage(`RAG response: ${finalAnswer}`)]
    };
  } catch (error) {
    logger.error("RAG response generation error", { error: error instanceof Error ? error.message : 'Unknown error' });
    throw new ToolExecutionError(
      `Failed to generate RAG response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      "generate_rag_response",
      error instanceof Error ? error : undefined
    );
  }
}
