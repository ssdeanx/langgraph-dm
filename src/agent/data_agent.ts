import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { model } from "../config/googleProvider.js";
import { AgentAnnotation } from "./state.js";
import logger from "../config/logger.js";
import { ToolExecutionError } from "../config/errors.js";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { z } from "zod"; // Import zod

// Import individual tools for the data agent
import {
  convertDocxToTextTool,
  parseCsvTool,
  parseXmlTool,
  extractTextFromFileTool
} from "../tools/document_processing.js";
import {
  cloneRepositoryTool,
  readInMemoryFileTool,
  listInMemoryFilesTool,
  getInMemoryFileStatsTool,
  commitInMemoryChangesTool,
  getInMemoryLogTool,
  checkoutInMemoryBranchTool,
  createInMemoryBranchTool,
  diffInMemoryFilesTool
} from "../tools/local_git.js";
import {
  listRepositoriesTool,
  getFileContentTool,
  createIssueTool,
  createRepositoryTool,
  deleteRepositoryTool,
  createPullRequestTool,
  mergePullRequestTool,
  listPullRequestsTool,
  addIssueCommentTool,
  listIssuesTool,
  updateIssueTool,
  listCommitsTool,
  getFileTreeTool
} from "../tools/github.js";
import {
  extractTextFromUrlTool,
  extractHtmlFromUrlTool,
  extractElementsBySelectorTool,
  crawlWebsiteTool,
} from "../tools/web_scraping.js";
import {
  parseYamlTool,
  convertHtmlToMarkdownTool,
  convertJsonToCsvTool,
  convertTextToMarkdownTool,
  convertTextToXmlTool,
  convertTextToJsonTool
} from "../tools/document_processing.js";

// Consolidate all tools available to the data agent as an array of Tool instances
// Use 'any[]' to accommodate the more specific DynamicStructuredTool type
const dataAgentTools: any[] = [
  convertDocxToTextTool,
  parseCsvTool,
  parseXmlTool,
  parseYamlTool,
  convertHtmlToMarkdownTool,
  convertJsonToCsvTool,
  convertTextToMarkdownTool,
  convertTextToXmlTool,
  convertTextToJsonTool,
  extractTextFromFileTool,
  cloneRepositoryTool,
  readInMemoryFileTool,
  listInMemoryFilesTool,
  getInMemoryFileStatsTool,
  commitInMemoryChangesTool,
  getInMemoryLogTool,
  checkoutInMemoryBranchTool,
  createInMemoryBranchTool,
  diffInMemoryFilesTool,
  listRepositoriesTool,
  getFileContentTool,
  createIssueTool,
  createRepositoryTool,
  deleteRepositoryTool,
  createPullRequestTool,
  mergePullRequestTool,
  listPullRequestsTool,
  addIssueCommentTool,
  listIssuesTool,
  updateIssueTool,
  listCommitsTool,
  getFileTreeTool,
  // Web Scraping Tools
  extractTextFromUrlTool,
  extractHtmlFromUrlTool,
  extractElementsBySelectorTool,
  crawlWebsiteTool
];

/**
 * Node for the Data Agent.
 * This agent is responsible for processing various data types, interacting with local Git repositories,
 * and performing GitHub operations using specialized tools. It uses an LLM to select and execute tools.
 * @param state The current agent state.
 * @param config The runnable config.
 * @returns A partial agent state with the result of the data operation.
 */
export async function dataAgentNode(state: typeof AgentAnnotation.State, config: LangGraphRunnableConfig): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("Data agent processing", { query: state.query });
  config.writer?.(new AIMessage("Data agent is processing your request..."));

  try {
    const query = state.query;
    if (!query) {
      throw new Error("No query provided for the data agent.");
    }

    const lastMessage = state.messages[state.messages.length - 1];
    const userContent = lastMessage?.content as string || query;

    // Use the tool-calling LLM to decide which tool to use, passing tools directly to invoke
    const response = await model.invoke([new HumanMessage(userContent)], {
      tools: dataAgentTools,
    });

    let toolResult: string | object | undefined;
    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolCall = response.tool_calls[0]; // Assuming one tool call per turn for simplicity

      // Find the tool by name from the explicitly defined dataAgentTools array
      const selectedTool = dataAgentTools.find(t => t.name === toolCall.name);
      if (selectedTool) {
        try {
          // Validate the arguments against the tool's Zod schema before invocation
          const validatedArgs = selectedTool.schema.parse(toolCall.args);
          logger.info(`Data agent calling tool: ${toolCall.name} with validated args:`, validatedArgs);
          config.writer?.(new AIMessage(`Data agent calling ${toolCall.name}...`));
          toolResult = await selectedTool.invoke(validatedArgs);
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            toolResult = `Error: Invalid arguments for tool '${toolCall.name}'. Details: ${JSON.stringify(validationError.errors)}`;
            logger.error(toolResult, { tool: toolCall.name, args: toolCall.args });
          } else {
            throw validationError; // Re-throw other errors
          }
        }
      } else {
        toolResult = `Error: Tool '${toolCall.name}' not found or not callable.`;
        logger.error(toolResult);
      }
    } else {
      // If no tool call, the LLM might be trying to respond directly
      toolResult = response.content;
    }

    config.writer?.(new AIMessage("Data agent processing complete."));

    const summary = `Data agent processed the request. Tool result: ${typeof toolResult === 'string' ? toolResult.substring(0, 100) : JSON.stringify(toolResult).substring(0, 100)}...`;

    return {
      data_output: toolResult,
      data_summary: summary,
      messages: [new AIMessage(`Data Agent Result: ${summary}`)],
    };
  } catch (error) {
    logger.error("Data agent error", { error: error instanceof Error ? error.message : 'Unknown error' });
    throw new ToolExecutionError(
      `Failed in data agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
      "data_agent",
      error instanceof Error ? error : undefined
    );
  }
}
