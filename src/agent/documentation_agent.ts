import { AIMessage } from "@langchain/core/messages";
import { model } from "../config/googleProvider.js";
import { AgentAnnotation } from "./state.js";
import logger from "../config/logger.js";
import { ToolExecutionError } from "../config/errors.js";
import { RunnableConfig } from "@langchain/core/runnables";

export async function draftDocumentationNode(state: typeof AgentAnnotation.State, config: RunnableConfig): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("Drafting documentation from report", { query: state.query });

  try {
    const prompt = config.configurable?.documentation_prompt ?? `Based on the following report, draft technical documentation.

Report:
${state.report}

Draft the documentation in a clear, concise, and structured format. Use markdown for formatting.`;
    const response = await model.invoke([{
      role: "user",
      content: prompt
    }]);

    const documentation = response.content as string;

    return {
      documentation,
      messages: [new AIMessage(`Drafted documentation for: ${state.query}`)],
      next: "finalize_documentation"
    };
  } catch (error) {
    logger.error("Documentation draft error", { error: error instanceof Error ? error.message : 'Unknown error' });
    throw new ToolExecutionError(
      `Failed to draft documentation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      "draft_documentation",
      error instanceof Error ? error : undefined
    );
  }
}

export async function finalizeDocumentationNode(state: typeof AgentAnnotation.State, config: RunnableConfig): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("Finalizing documentation", { query: state.query });

  try {
    const prompt = config.configurable?.documentation_prompt ?? `Review and finalize the following documentation draft. Ensure it is accurate, complete, and easy to understand.

Draft:
${state.documentation}

Finalize the documentation, making any necessary corrections or improvements.`;
    const response = await model.invoke([{
      role: "user",
      content: prompt
    }]);

    const documentation = response.content as string;

    return {
      documentation,
      messages: [new AIMessage(`Finalized documentation for: ${state.query}`)],
      next: "supervisor"
    };
  } catch (error) {
    logger.error("Documentation finalization error", { error: error instanceof Error ? error.message : 'Unknown error' });
    throw new ToolExecutionError(
      `Failed to finalize documentation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      "finalize_documentation",
      error instanceof Error ? error : undefined
    );
  }
}
