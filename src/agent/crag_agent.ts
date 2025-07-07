import { StateGraph, END } from "@langchain/langgraph";
import { HumanMessage, AIMessage, BaseMessage, MessageContent } from "@langchain/core/messages";
import { AgentAnnotation } from "./state.js";
import { tavilyTool } from "../tools/tavily.js";
import { exaSearchTool } from "../tools/exa.js";
import { crawlWebsiteTool } from "../tools/web_scraping.js"; // Removed extractTextFromUrlTool
import { handleGlobalError, ModelInvocationError } from "../config/errors.js";
import logger from "../config/logger.js";
import { model } from "../config/googleProvider.js";
import { RunnableConfig } from "@langchain/core/runnables";

// Helper function to convert MessageContent to string
function messageContentToString(content: MessageContent): string {
  if (typeof content === 'string') {
    return content;
  }
  // For complex content (e.g., array of text/image parts), stringify it.
  // This might need more sophisticated handling based on exact content types.
  return JSON.stringify(content);
}

// Helper function to invoke LLM with error handling
async function safeModelInvoke(messages: BaseMessage[], config: RunnableConfig): Promise<AIMessage> {
  try {
    const response = await model.invoke(messages);
    if (!(response instanceof AIMessage)) {
      throw new Error("Expected an AIMessage response from the model.");
    }
    return response;
  } catch (error) {
    throw new ModelInvocationError(
      `Failed to invoke model for CRAG: ${error instanceof Error ? error.message : 'Unknown error'}`,
      config.configurable?.model_name ?? "gemini-2.5-flash",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Node: Initial Retrieval
 * Fetches initial documents based on the user's query using Tavily or Exa.
 */
async function initialRetrievalNode(state: typeof AgentAnnotation.State, config: RunnableConfig): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("CRAG: Initial Retrieval Node", { query: state.query, model_name: config.configurable?.model_name });
  try {
    const lastMessageContent = state.messages[state.messages.length - 1].content;
    const rawQuery: string = messageContentToString(lastMessageContent);

    if (!rawQuery) {
      return {
        messages: [new HumanMessage("CRAG: No query found for initial retrieval.")],
        next: END,
      };
    }

    const isUrl = (urlStr: string): boolean => {
      try {
        new URL(urlStr);
        return true;
      } catch {
        return false;
      }
    };

    const retrievedContent: string[] = [];
    let searchResults: string | undefined;

    if (isUrl(rawQuery)) {
      logger.info("CRAG: Direct URL input detected, crawling website.", { url: rawQuery });
      try {
        // Use crawlWebsiteTool for direct URL queries
        const crawledPageResults = await crawlWebsiteTool.invoke({ startUrl: rawQuery, maxRequests: 1, maxDepth: 0 });
        const parsedCrawlPageResults = JSON.parse(crawledPageResults);
        if (Array.isArray(parsedCrawlPageResults) && parsedCrawlPageResults.length > 0) {
          const item = parsedCrawlPageResults[0];
          if (typeof item === 'object' && item !== null && 'url' in item && 'text' in item) {
            retrievedContent.push(`Content from ${item.url}:\n${(item.text as string).substring(0, 500)}...`);
          }
        }
      } catch (urlError) {
        logger.error("Error during direct URL crawl", { url: rawQuery, error: urlError });
        retrievedContent.push(`Failed to crawl ${rawQuery}: ${urlError instanceof Error ? urlError.message : String(urlError)}`);
      }
    } else {
      // Perform web search if not a direct URL
      const query: string = rawQuery;
      if (process.env.TAVILY_API_KEY) {
        searchResults = await tavilyTool.invoke({ query });
        logger.debug("Tavily search results", { results: searchResults.length });
      } else if (process.env.EXA_API_KEY) {
        searchResults = await exaSearchTool.invoke({ query });
        logger.debug("Exa search results", { results: searchResults.length });
      } else {
        throw new Error("No search API key found (TAVILY_API_KEY or EXA_API_KEY).");
      }

      // Extract text from URLs found in search results using crawlWebsiteTool
      try {
        const parsedResults = JSON.parse(searchResults);
        if (Array.isArray(parsedResults.results)) {
          for (const res of parsedResults.results) {
            if (res.url && isUrl(res.url)) {
              try {
                // Use crawlWebsiteTool for individual URLs found in search results
                const crawledPageResults = await crawlWebsiteTool.invoke({ startUrl: res.url, maxRequests: 1, maxDepth: 0 });
                const parsedCrawlPageResults = JSON.parse(crawledPageResults);
                if (Array.isArray(parsedCrawlPageResults) && parsedCrawlPageResults.length > 0) {
                  const item = parsedCrawlPageResults[0];
                  if (typeof item === 'object' && item !== null && 'url' in item && 'text' in item) {
                    retrievedContent.push(`Content from ${item.url}:\n${(item.text as string).substring(0, 500)}...`);
                  }
                }
              } catch (urlCrawlError) {
                logger.warn(`Failed to crawl URL from search results ${res.url}`, { error: urlCrawlError });
              }
            }
          }
        }
      } catch (parseError) {
        logger.warn("Failed to parse search results as JSON, treating as plain text.", { error: parseError });
        retrievedContent.push(searchResults);
      }
    }

    return {
      retrieved_documents: retrievedContent,
      next: "critique_retrieval", // Move to critique step
    };
  } catch (error) {
    handleGlobalError(error);
    return {
      messages: [new HumanMessage("CRAG: Failed during initial retrieval.")],
      next: END, // End flow on error
    };
  }
}

/**
 * Node: Critique Retrieval
 * Critiques the retrieved documents for relevance and accuracy.
 */
async function critiqueRetrievalNode(state: typeof AgentAnnotation.State, config: RunnableConfig): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("CRAG: Critique Retrieval Node", { model_name: config.configurable?.model_name }); // Use config
  try {
    const query: string = messageContentToString(state.messages[state.messages.length - 1].content);
    const documents = state.retrieved_documents?.join("\n\n") || "No documents retrieved.";

    const critiquePrompt = `Given the original query: "${query}" and the following retrieved documents:\n\n${documents}\n\nCritique the documents for relevance and accuracy. State if the documents are sufficient to answer the query, or if further refinement (e.g., query rewriting, more search) is needed. Provide a clear reason.`;

    const critiqueResponse = await safeModelInvoke([new HumanMessage({ content: critiquePrompt })], config);
    const critiqueResult: string = messageContentToString(critiqueResponse.content);

    let nextStep: string;
    // Simple heuristic for decision: if critique mentions "sufficient" or "accurate", proceed to answer, else rewrite.
    if (critiqueResult.toLowerCase().includes("sufficient") || critiqueResult.toLowerCase().includes("accurate")) {
      nextStep = "generate_answer";
    } else {
      nextStep = "rewrite_query";
    }

    return {
      critique_result: critiqueResult,
      next: nextStep,
    };
  } catch (error) {
    handleGlobalError(error);
    return {
      messages: [new HumanMessage("CRAG: Failed during critique retrieval.")],
      next: END,
    };
  }
}

/**
 * Node: Rewrite Query
 * Rewrites the query based on critique results to improve retrieval.
 */
async function rewriteQueryNode(state: typeof AgentAnnotation.State, config: RunnableConfig): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("CRAG: Rewrite Query Node", { model_name: config.configurable?.model_name }); // Use config
  try {
    const originalQuery: string = messageContentToString(state.messages[state.messages.length - 1].content);
    const critique: string = state.critique_result || "No specific critique provided.";

    const rewritePrompt = `Given the original query: "${originalQuery}" and the critique: "${critique}", please rewrite the query to improve search results. Provide only the new query.`;

    const rewrittenQueryResponse = await safeModelInvoke([new HumanMessage({ content: rewritePrompt })], config);
    const rewrittenQuery: string = messageContentToString(rewrittenQueryResponse.content);

    return {
      rewritten_query: rewrittenQuery,
      next: "initial_retrieval", // Loop back to retrieval with new query
      query: rewrittenQuery, // Update the query in state for next retrieval
    };
  } catch (error) {
    handleGlobalError(error);
    return {
      messages: [new HumanMessage("CRAG: Failed during query rewrite.")],
      next: END,
    };
  }
}

/**
 * Node: Generate Answer
 * Generates a final answer based on the query and retrieved documents.
 */
async function generateAnswerNode(state: typeof AgentAnnotation.State, config: RunnableConfig): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("CRAG: Generate Answer Node", { model_name: config.configurable?.model_name }); // Use config
  try {
    const query: string = messageContentToString(state.messages[state.messages.length - 1].content);
    const documents = state.retrieved_documents?.join("\n\n") || "No documents available.";

    const answerPrompt = `Given the query: "${query}" and the following documents:\n\n${documents}\n\nProvide a comprehensive answer.`;

    const answerResponse = await safeModelInvoke([new HumanMessage({ content: answerPrompt })], config);
    const finalAnswer: string = messageContentToString(answerResponse.content);

    return {
      final_answer: finalAnswer,
      messages: [new HumanMessage(finalAnswer)], // Add final answer to messages
      next: END, // Task completed
    };
  } catch (error) {
    handleGlobalError(error);
    return {
      messages: [new HumanMessage("CRAG: Failed during answer generation.")],
      next: END,
    };
  }
}

// Define the CRAG workflow as a StateGraph

const cragWorkflow = new StateGraph(AgentAnnotation)
  .addNode("initial_retrieval", initialRetrievalNode)
  .addNode("critique_retrieval", critiqueRetrievalNode)
  .addNode("rewrite_query", rewriteQueryNode)
  .addNode("generate_answer", generateAnswerNode)
  .addEdge("initial_retrieval", "critique_retrieval")
  .addConditionalEdges("critique_retrieval", (state: typeof AgentAnnotation.State) => state.next || END, {
    "rewrite_query": "rewrite_query",
    "generate_answer": "generate_answer",
    [END]: END,
  })
  .addEdge("rewrite_query", "initial_retrieval") // Loop back to initial retrieval with rewritten query
  .addEdge("generate_answer", END); // End after generating answer

export const cragAgentWorkflow = cragWorkflow.compile();
