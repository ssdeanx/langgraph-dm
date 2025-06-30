
import { model } from "../config/googleProvider.js";
import { tools } from "../tools/index.js";
//import { memory } from "../memory/index.js";
import { createCheckpointSaver } from "../memory/storage.js";
import logger from "../config/logger.js";
import { AgentError } from "../config/errors.js";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

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
  tools: Array.isArray(tools) ? tools : Object.values(tools),
//  memory,
  checkpointSaver,
});