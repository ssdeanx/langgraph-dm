
import { model } from "../config/googleProvider.js";
import { createCheckpointSaver } from "../memory/storage.js";
import logger from "../config/logger.js";
import { AgentError } from "../config/errors.js";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

// Import all tools for the React agent
import {
  evaluateExpressionTool,
  addNumbersTool,
  subtractNumbersTool,
  multiplyNumbersTool,
  divideNumbersTool,
  powerTool,
  sqrtTool,
  sinTool,
  cosTool,
  tanTool,
  logTool,
  absTool,
  roundTool,
  floorTool,
  ceilTool,
} from "../tools/calculator.js";

import {
  convertDocxToTextTool,
  parseCsvTool,
  parseXmlTool,
  extractTextFromFileTool,
  convertTextToMarkdownTool,
  convertJsonToCsvTool,
  convertTextToXmlTool,
  parseYamlTool,
  convertHtmlToMarkdownTool,
  convertTextToJsonTool,
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
  diffInMemoryFilesTool,
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
  getFileTreeTool,
} from "../tools/github.js";

import {
  extractTextFromUrlTool,
  extractHtmlFromUrlTool,
  extractElementsBySelectorTool,
  crawlWebsiteTool,
} from "../tools/web_scraping.js";

// Consolidate all tools available to the React agent as an array
const reactAgentTools: any[] = [
  // Calculator Tools
  evaluateExpressionTool,
  addNumbersTool,
  subtractNumbersTool,
  multiplyNumbersTool,
  divideNumbersTool,
  powerTool,
  sqrtTool,
  sinTool,
  cosTool,
  tanTool,
  logTool,
  absTool,
  roundTool,
  floorTool,
  ceilTool,

  // Document Processing Tools
  convertDocxToTextTool,
  parseCsvTool,
  parseXmlTool,
  extractTextFromFileTool,
  convertTextToMarkdownTool,
  convertJsonToCsvTool,
  convertTextToXmlTool,
  parseYamlTool,
  convertHtmlToMarkdownTool,
  convertTextToJsonTool,

  // Local Git Tools
  cloneRepositoryTool,
  readInMemoryFileTool,
  listInMemoryFilesTool,
  getInMemoryFileStatsTool,
  commitInMemoryChangesTool,
  getInMemoryLogTool,
  checkoutInMemoryBranchTool,
  createInMemoryBranchTool,
  diffInMemoryFilesTool,

  // GitHub Tools
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
  crawlWebsiteTool,
];

// Canonical LangGraph.js ReAct agent using your configured model, tools, system prompt, and persistent memory
let checkpointSaver;
try {
  checkpointSaver = await createCheckpointSaver();
  logger.info("CheckpointSaver initialized for reactAgent");
} catch (err) {
  logger.error("Failed to initialize checkpointSaver for reactAgent", { error: err });
  throw new AgentError("Failed to initialize checkpointSaver", "CHECKPOINT_INIT_ERROR");
}

// Canonical LangGraph.js ReAct agent node using createReactAgent
export const reactAgent = createReactAgent({
  llm: model,
  tools: reactAgentTools,
//  memory,
  checkpointSaver,
});
