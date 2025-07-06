import { AIMessage } from "@langchain/core/messages";
import { model } from "../config/googleProvider.js";
import { AgentAnnotation } from "./state.js";
import { tools } from "../tools/index.js";
import { memory } from "../memory/index.js";
import { RunnableConfig } from "@langchain/core/runnables";
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
export async function researchCollectNode(state: typeof AgentAnnotation.State): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("Research collect node processing", { query: state.query });

  try {
    // Use Tavily and Exa tools from registry
    const tavilyResults = tools.tavilyTool ? await tools.tavilyTool.invoke({ query: state.query }) : "";
    const exaResults = tools.exaSearchTool ? await tools.exaSearchTool.invoke({ query: state.query }) : "";

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
      messages: [new AIMessage(`Collected research data for: ${state.query}`)],
      next: "summarize"
    };
  } catch (error) {
    logger.error("Research collect error", { error: error instanceof Error ? error.message : 'Unknown error' });
    throw new ToolExecutionError(
      `Failed to collect research data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      "research_collect",
      error instanceof Error ? error : undefined
    );
  }
}

export async function researchSummarizeNode(state: typeof AgentAnnotation.State, config: RunnableConfig): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("Research summarize node processing", { dataCount: state.research_data.length });

  try {
    const combinedData = state.research_data.join("\n\n");
    const prompt = config.configurable?.research_prompt ?? `Summarize the following research data for the query: "${state.query}"\n\nData:\n${combinedData}`;

    const response = await model.invoke([{
      role: "user",
      content: prompt
    }]);

    const summary = response.content as string;

    return {
      summary,
      messages: [new AIMessage(`Research summary completed for: ${state.query}`)],
      next: "report"
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

export async function researchReportNode(state: typeof AgentAnnotation.State, config: RunnableConfig): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("Research report node processing", { query: state.query });

  try {
    const prompt = config.configurable?.research_prompt ?? `Create a comprehensive research report based on the following summary for query: "${state.query}"\n\nSummary:\n${state.summary}\n\nFormat as a structured report with sections.`;
    const response = await model.invoke([{
      role: "user",
      content: prompt
    }]);

    const report = response.content as string;

    return {
      report,
      messages: [new AIMessage(`Research report completed:\n\n${report}`)],
      next: "supervisor"
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
