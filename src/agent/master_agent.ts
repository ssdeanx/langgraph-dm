 import { model } from "../config/googleProvider.js";
import { AgentAnnotation } from "./state.js";
import logger from "../config/logger.js";
import { ToolExecutionError } from "../config/errors.js";
import { RunnableConfig } from "@langchain/core/runnables";
import { tools } from "../tools/index.js";
import { AIMessage } from "@langchain/core/messages";

export async function masterAgentNode(state: typeof AgentAnnotation.State, config: RunnableConfig): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("Master agent processing", { query: state.query });

  try {
    // This node will orchestrate calls to other agents and tools
    // For now, it will just log and return.
    // Future: Implement logic to call react, research, documentation agents based on task.
    // Future: Implement logic to use local_git and github tools.

    const response = await model.invoke([{
      role: "user",
      content: `Master agent received input: ${state.userInput || state.query}. What should I do?`
    }]);

    return {
      messages: [new AIMessage(`Master agent received: ${response.content}`)],
      next: "supervisor" // Route back to supervisor or specific agent
    };
  } catch (error) {
    logger.error("Master agent error", { error: error instanceof Error ? error.message : 'Unknown error' });
    throw new ToolExecutionError(
      `Failed in master agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
      "master_agent",
      error instanceof Error ? error : undefined
    );
  }
}
