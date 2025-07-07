import { AIMessage } from "@langchain/core/messages";
import { model } from "../config/googleProvider.js";
import { ResearchAnnotation } from "./research_state.js"; // Import ResearchAnnotation
import { tools } from "../tools/index.js";
import { memory } from "../memory/index.js";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { createCheckpointSaver } from "../memory/storage.js";
import logger from "../config/logger.js";
import { ToolExecutionError, AgentError } from "../config/errors.js";

// Async factory to create the checkpoint saver for persistent memory
const checkpointSaverPromise = createCheckpointSaver();

/**
 * These functions handle the processing, summarizing, and reporting of research data collected from
 * various tools and sources.
 * @param state - The `state` parameter in each of the functions represents the current state of the
 * research process. It contains information such as the query being researched, any collected data,
 * summaries, reports, and messages related to the research task. The state is used to track the
 * progress of the research workflow and pass relevant
 * @returns Each of the three functions `researchCollectNode`, `researchSummarizeNode`, and
 * `researchReportNode` returns a promise that resolves to a partial state object of type
 * `ResearchAnnotation.State`. The partial state object contains specific properties based on the
 * processing done in each function:
 */
export async function researchCollectNode(state: typeof ResearchAnnotation.State, config: LangGraphRunnableConfig): Promise<Partial<typeof ResearchAnnotation.State>> {
  logger.info("Research collect node processing", { query: state.query });
  config.writer?.(new AIMessage("Collecting research data...")); // Custom streaming update

  const MAX_RETRIES = 3;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      // Use Tavily and Exa tools from registry
      const tavilyResults = tools.tavilyTool ? await tools.tavilyTool.invoke({ query: state.query }) : "";
      config.writer?.(new AIMessage("Tavily search complete.")); // Custom streaming update
      const exaResults = tools.exaSearchTool ? await tools.exaSearchTool.invoke({ query: state.query }) : "";
      config.writer?.(new AIMessage("Exa search complete.")); // Custom streaming update

    // Example: Use web scraping or document processing if needed
    // const webData = await tools.extractTextFromUrlTool.invoke({ url: someUrl });

    // Store research data in vectorstore (semantic memory)
    if (memory.createVectorStore) {
      const vectorstore = await memory.createVectorStore();
      await vectorstore.addDocuments([
        new (await import("@langchain/core/documents")).Document({
          pageContent: tavilyResults,
          metadata: { source: "tavily", query: state.query }
        }),
        new (await import("@langchain/core/documents")).Document({
          pageContent: exaResults,
          metadata: { source: "exa", query: state.query }
        })
      ]);
    }


    // Also persist research data in checkpointSaver (persistent workflow state)
    const checkpointSaver = await checkpointSaverPromise;
    const researchData = [
      `Tavily Results: ${tavilyResults}`,
      `Exa Results: ${exaResults}`
    ];
    // Use a valid thread id (fall back to query or 'default')
    const threadId = state.query || "default";
    try {
      await checkpointSaver.put(
        { configurable: { thread_id: threadId, checkpoint_ns: "research_agent" } },
        {
          v: 1,
          id: `${threadId}-${Date.now()}`,
          ts: new Date().toISOString(),
          channel_values: { research_data: researchData },
          channel_versions: {},
          versions_seen: {},
          pending_sends: [],
        },
        { source: "update", step: 0, writes: null, parents: {} }
      );
    } catch {
      throw new AgentError("Failed to persist research data checkpoint", "CHECKPOINT_ERROR");
    }

    return {
      research_data: researchData,
      messages: [new AIMessage(`Collected research data for: ${state.query}`)]
    };
    } catch (error) {
      retries++;
      logger.error(`Research collect error (Attempt ${retries}/${MAX_RETRIES}):`, { error: error instanceof Error ? error.message : 'Unknown error' });
      if (retries < MAX_RETRIES) {
        config.writer?.(new AIMessage(`Retrying research collection... (Attempt ${retries + 1}/${MAX_RETRIES})`));
        await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
      } else {
        throw new ToolExecutionError(
          `Failed to collect research data after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          "research_collect",
          error instanceof Error ? error : undefined
        );
      }
    }
  }
  throw new Error("Unexpected error: researchCollectNode should have returned or thrown an error by now.");
}

export async function researchSummarizeNode(state: typeof ResearchAnnotation.State, config: LangGraphRunnableConfig): Promise<Partial<typeof ResearchAnnotation.State>> {
  logger.info("Research summarize node processing", { dataCount: state.research_data.length });
  config.writer?.(new AIMessage("Summarizing research data...")); // Custom streaming update

  try {
    const combinedData = state.research_data.join("\n\n");
    const prompt = config.configurable?.research_prompt ?? `Summarize the following research data for the query: "${state.query}"\n\nData:\n${combinedData}`;

    const response = await model.invoke([{
      role: "user",
      content: prompt
    }]);

    const summary = response.content as string;
    config.writer?.(new AIMessage("Research summary complete.")); // Custom streaming update

    return {
      summary,
      messages: [new AIMessage(`Research summary completed for: ${state.query}`)]
    };
  } catch (error) {
    logger.error("Research summarize error", { error: error instanceof Error ? error.message : 'Unknown error' });
    throw new ToolExecutionError(
      `Failed to summarize research: ${error instanceof Error ? error.message : 'Unknown error'}`,
      "research_summarize",
      error instanceof Error ? error : undefined
    );
  }
}

export async function researchReportNode(state: typeof ResearchAnnotation.State, config: LangGraphRunnableConfig): Promise<Partial<typeof ResearchAnnotation.State>> {
  logger.info("Research report node processing", { query: state.query });
  config.writer?.(new AIMessage("Generating research report...")); // Custom streaming update

  try {
    const prompt = config.configurable?.research_prompt ?? `Create a comprehensive research report based on the following summary for query: "${state.query}"\n\nSummary:\n${state.summary}\n\nFormat as a structured report with sections.`;
    const response = await model.invoke([{
      role: "user",
      content: prompt
    }]);

    const report = response.content as string;
    config.writer?.(new AIMessage("Research report complete.")); // Custom streaming update

    return {
      report,
      messages: [new AIMessage(`Research report completed:\n\n${report}`)]
    };
  } catch (error) {
    logger.error("Research report error", { error: error instanceof Error ? error.message : 'Unknown error' });
    throw new ToolExecutionError(
      `Failed to generate research report: ${error instanceof Error ? error.message : 'Unknown error'}`,
      "research_report",
      error instanceof Error ? error : undefined
    );
  }
}
