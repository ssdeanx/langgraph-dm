import { AIMessage } from "@langchain/core/messages";
import { model } from "../config/googleProvider.js";
import { DocumentationAnnotation } from "./documentation_state.js"; // Import DocumentationAnnotation
import logger from "../config/logger.js";
import { ToolExecutionError } from "../config/errors.js";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

/**
 * Node to draft documentation based on research data or summary.
 * @param state The current agent state.
 * @param config The runnable config.
 * @returns A partial agent state with the drafted documentation.
 */
export async function draftDocumentationNode(state: typeof DocumentationAnnotation.State, config: LangGraphRunnableConfig): Promise<Partial<typeof DocumentationAnnotation.State>> {
  logger.info("Drafting documentation", { query: state.query });
  config.writer?.(new AIMessage("Drafting documentation...")); // Custom streaming update

  try {
    const contentToDocument = state.query; // Assuming query contains the initial content for documentation
    if (!contentToDocument) {
      throw new Error("No content available to draft documentation.");
    }

    const prompt = config.configurable?.documentation_prompt ?? `
      You are an expert technical writer. Draft comprehensive documentation based on the following content.
      Adhere to a clear, concise, and accurate style. Use markdown for formatting, including headings,
      bullet points, and code blocks where appropriate.

      Content to document:
      ${contentToDocument}
    `;

    const response = await model.invoke([{
      role: "user",
      content: prompt
    }]);

    const drafted_documentation = response.content as string;
    config.writer?.(new AIMessage("Documentation draft complete.")); // Custom streaming update

    return {
      drafted_documentation,
      messages: [new AIMessage(`Drafted documentation for: ${state.query}`)]
    };
  } catch (error) {
    logger.error("Documentation drafting error", { error: error instanceof Error ? error.message : 'Unknown error' });
    throw new ToolExecutionError(
      `Failed to draft documentation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      "draft_documentation",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Node to finalize documentation.
 * @param state The current agent state.
 * @param config The runnable config.
 * @returns A partial agent state with the finalized documentation.
 */
export async function finalizeDocumentationNode(state: typeof DocumentationAnnotation.State, config: LangGraphRunnableConfig): Promise<Partial<typeof DocumentationAnnotation.State>> {
  logger.info("Finalizing documentation", { query: state.query });
  config.writer?.(new AIMessage("Finalizing documentation...")); // Custom streaming update

  try {
    const drafted_documentation = state.drafted_documentation;
    if (!drafted_documentation) {
      throw new Error("No drafted documentation to finalize.");
    }

    const prompt = config.configurable?.documentation_prompt ?? `
      Review and finalize the following drafted documentation. Ensure accuracy, clarity, and adherence
      to technical writing best practices. Make any necessary improvements, corrections, or additions.
      The output should be the complete and final documentation.

      Drafted documentation:
      ${drafted_documentation}
    `;

    const response = await model.invoke([{
      role: "user",
      content: prompt
    }]);

    const final_documentation = response.content as string;
    config.writer?.(new AIMessage("Documentation finalized.")); // Custom streaming update

    // For Human-in-the-Loop, we will signal to the supervisor that human review is needed.
    // The actual interruption mechanism will be handled by the graph/supervisor.
    return {
      final_documentation,
      messages: [new AIMessage(`Finalized documentation:\n\n${final_documentation}`)]
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
