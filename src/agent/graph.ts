import { StateGraph, START, END, MemorySaver, Annotation } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { model } from "../config/googleProvider.js";
import { supervisor } from "./supervisor.js";
import { AgentAnnotation } from "./state.js";
import logger from "../config/logger.js";
import { ModelInvocationError, handleGlobalError } from "../config/errors.js";
import { researchCollectNode, researchSummarizeNode, researchReportNode } from "./research_agent.js"; // Import research agent for potential routing
import { draftDocumentationNode, finalizeDocumentationNode } from "./documentation_agent.js"; // Import documentation agent
// Import react agent for potential routing
import { reactAgent } from "./react_agent.js"; // Import react agent for potential routing

const ConfigSchema = Annotation.Root({
  supervisor_prompt: Annotation<string>,
  research_prompt: Annotation<string>,
  documentation_prompt: Annotation<string>,
  model_name: Annotation<string>,
});

// Helper function to handle model invocation with error handling
async function safeModelInvoke(content: string, config: RunnableConfig): Promise<string> {
  const modelToUse = config.configurable?.model_name ?? "gemini-2.5-pro";
  try {
    const response = await model.invoke([{ role: "user", content }]);
    return response.content as string;
  } catch (error) {
    throw new ModelInvocationError(
      `Failed to invoke Google model: ${error instanceof Error ? error.message : 'Unknown error'}`,
      modelToUse,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * The above functions handle the conversation flow in a chatbot, with the chatNode responding as a
 * helpful AI assistant and the entryNode processing initial user input.
 * @param state - The `state` parameter in the functions `chatNode` and `entryNode` represents the
 * current state of the conversation or interaction with the user. It contains information such as the
 * messages exchanged so far, the user input, and the session ID to track the conversation context.
 * @returns In the `chatNode` function, a new HumanMessage response is being generated based on the
 * user's input or a default message if no input is provided. This response is then returned along with
 * the sender being set as "assistant".
 */
async function chatNode(state: typeof AgentAnnotation.State, config: RunnableConfig): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("Chat node processing", {
    messageCount: state.messages.length,
    sessionId: state.sessionId
  });

  try {
    const lastMessage = state.messages[state.messages.length - 1];
    const userContent = lastMessage?.content as string || state.userInput || "Hello!";

    const response = await safeModelInvoke(
      `You are a helpful AI assistant. Please respond to the user's message: "${userContent}"`,
      config
    );

    return {
      messages: [new HumanMessage(response)],
      sender: "assistant",
    };
  } catch (error) {
    handleGlobalError(error);
    return {
      messages: [new HumanMessage("I apologize, but I encountered an error processing your request.")],
      sender: "assistant",
    };
  }
}

// Entry node - processes initial user input
async function entryNode(state: typeof AgentAnnotation.State): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("Entry node processing", {
    userInput: state.userInput,
    sessionId: state.sessionId
  });

  return {
    messages: state.userInput ? [new HumanMessage(state.userInput)] : state.messages,
    sender: "user",
  };
}


/**
 * The function `routeMessages` determines the next step in a chatbot conversation based on the state
 * provided.
 * @param state - The `state` parameter in the `routeMessages` function represents the current state of
 * the conversation in the chatbot. It contains information such as the next action to take
 * (`state.next`) and the messages exchanged so far (`state.messages`).
 * @returns The `routeMessages` function is returning a string value based on the logic provided in the
 * function. The returned string indicates the next node or agent to route the messages to in the
 * chatbot conversation workflow. The possible return values are:
 * - "react" if the next state is "react"
 * - "research_collect" if the next state is "research_collect"
 * - "research_summarize"
 */
function routeMessages(state: typeof AgentAnnotation.State): string {
  logger.debug("Routing messages", {
    next: state.next,
    messageCount: state.messages.length
  });

  // Simple routing logic - for now just go to chat or end
  if (state.next === "FINISH" || state.next === "END") {
    return END;
  }
  if (state.next === "react") {
    // If supervisor decision is to route to react agent, we can handle that here
    return "react";
  }
  if (state.next === "research_collect") {
    // If supervisor decision is to route to research collect agent
    return "research_collect";
  }
  if (state.next === "research_summarize") {
    // If supervisor decision is to route to research summarize agent
    return "research_summarize";
  }
  if (state.next === "research_report") {
    // If supervisor decision is to route to research report agent
    return "research_report";
  }
  if (state.next === "documentation") {
    // If supervisor decision is to route to documentation agent
    return "documentation";
  }
  // For now, all agent types route to chat node
  return "chat";
}

/* The code snippet you provided is defining the workflow for a chatbot conversation using a StateGraph
from the "@langchain/langgraph" library. Here's a breakdown of what the workflow setup is doing: */
const workflow = new StateGraph(AgentAnnotation, ConfigSchema)
  .addNode("entry", entryNode)
  .addNode("supervisor", supervisor)
  // Add react agent node if needed
  .addNode("react", reactAgent)
  // Add research agent node if needed
  .addNode("research_collect", researchCollectNode)
  .addNode("research_summarize", researchSummarizeNode)
  .addNode("research_report", researchReportNode)
  // Add documentation agent nodes
  .addNode("draft_documentation", draftDocumentationNode)
  .addNode("finalize_documentation", finalizeDocumentationNode)
  // Add chat node for general conversation
  .addNode("chat", chatNode)
  .addEdge(START, "entry")
  .addEdge("entry", "supervisor")
  .addConditionalEdges("supervisor", routeMessages, {
    chat: "chat",
    react: "react",
    research_collect: "research_collect",
    research_summarize: "research_summarize",
    research_report: "research_report",
    documentation: "draft_documentation",
    [END]: END,
  })
  .addEdge("chat", END)
  .addEdge("react", "supervisor")
  .addEdge("research_collect", "research_summarize")
  .addEdge("research_summarize", "research_report")
  .addEdge("research_report", "supervisor")
  .addEdge("draft_documentation", "finalize_documentation")
  .addEdge("finalize_documentation", "supervisor");

// Compile the graph
export const graph = workflow.compile({
  // Add checkpointer for persistence if needed
  checkpointer: new MemorySaver(),
});

// Export helper functions for testing
export { chatNode, entryNode, routeMessages };
