import { StateGraph, START, END, MemorySaver, Annotation } from "@langchain/langgraph";
import { HumanMessage, BaseMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { model } from "../config/googleProvider.js";
import { supervisor } from "./supervisor.js";
import { AgentAnnotation } from "./state.js";
import logger from "../config/logger.js";
import { ModelInvocationError, handleGlobalError } from "../config/errors.js";
import { reactAgent } from "./react_agent.js";
// Explicitly import nodes from the specified agent files
import { researchCollectNode, researchSummarizeNode, researchReportNode } from "./research_agent.js";
import { retrieveNode, generateRagResponseNode } from "./rag_agent.js";
import { draftDocumentationNode, finalizeDocumentationNode } from "./documentation_agent.js";
import { dataAgentNode } from "./data_agent.js"; // Import the data agent node

interface GraphConfigurable {
  supervisor_prompt?: string;
  research_prompt?: string; // Re-introduced for research agent
  documentation_prompt?: string; // Re-introduced for documentation agent
  rag_prompt?: string; // Added RAG prompt
  model_name?: string;
}

const ConfigSchema = Annotation.Root({
  supervisor_prompt: Annotation<string>,
  research_prompt: Annotation<string>,
  documentation_prompt: Annotation<string>,
  rag_prompt: Annotation<string>, // Added RAG prompt
  model_name: Annotation<string>,
});

/**
 * Helper function to safely invoke the Google model with error handling.
 * @param content The content to send to the model.
 * @param config The runnable configuration, including configurable model parameters.
 * @returns A promise that resolves to the model's response content.
 * @throws {ModelInvocationError} If the model invocation fails.
 */
async function safeModelInvoke(content: string, config: RunnableConfig<GraphConfigurable>): Promise<string> {
  const modelToUse = config.configurable?.model_name ?? "gemini-2.5-flash";
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
 * Handles the general conversational flow, responding to user messages.
 * @param state The current state of the agent, containing messages and user input.
 * @param config The runnable configuration.
 * @returns A partial state update with the AI's response and sender.
 */
async function chatNode(state: typeof AgentAnnotation.State, config: RunnableConfig): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("Chat node processing", {
    messageCount: state.messages.length,
    sessionId: state.sessionId
  });

  try {
    // Explicitly using BaseMessage for linter satisfaction
    const currentMessages: BaseMessage[] = state.messages;
    const lastMessage = currentMessages[currentMessages.length - 1];
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

/**
 * Processes initial user input and sets up the conversation state.
 * @param state The current state of the agent.
 * @returns A partial state update with the user's message and sender.
 */
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


function routeMessages(state: typeof AgentAnnotation.State): string {
  const { next } = state;
  logger.debug("Routing messages", { next, messageCount: state.messages.length });

  if (next === "FINISH" || next === "END") {
    return END;
  }
  if (next === "react") {
    return "react";
  }
  if (next === "rag") {
    return "rag_retrieve";
  }
  if (next === "research") {
    return "research_collect";
  }
  if (next === "documentation") {
    return "documentation_draft";
  }
  if (next === "data") {
    return "data_agent";
  }
  if (next === "conversational") {
    return "chat";
  }
  return "chat"; // Default fallback
}

const workflow = new StateGraph(AgentAnnotation, ConfigSchema)
  .addNode("entry", entryNode)
  .addNode("supervisor", supervisor)
  .addNode("chat", chatNode)
  .addNode("react", reactAgent)
  // Adding all nodes from specified agents directly
  .addNode("research_collect", researchCollectNode)
  .addNode("research_summarize", researchSummarizeNode)
  .addNode("research_report", researchReportNode)
  .addNode("rag_retrieve", retrieveNode)
  .addNode("rag_generate", generateRagResponseNode)
  .addNode("documentation_draft", draftDocumentationNode)
  .addNode("documentation_finalize", finalizeDocumentationNode)
  .addNode("data_agent", dataAgentNode) // Add data agent node
  .addEdge(START, "entry")
  .addEdge("entry", "supervisor")
  .addConditionalEdges("supervisor", routeMessages, {
    chat: "chat",
    react: "react",
    rag_retrieve: "rag_retrieve",
    research_collect: "research_collect",
    documentation_draft: "documentation_draft",
    data_agent: "data_agent",
    [END]: END,
  })
  .addEdge("chat", END)
  .addEdge("react", "supervisor") // After react agent, return to supervisor for next decision
  // Edges for Research workflow
  .addEdge("research_collect", "research_summarize")
  .addEdge("research_summarize", "research_report")
  .addEdge("research_report", "supervisor") // After research workflow, return to supervisor
  // Edges for RAG workflow
  .addEdge("rag_retrieve", "rag_generate")
  .addEdge("rag_generate", "supervisor") // After RAG workflow, return to supervisor
  // Edges for Documentation workflow
  .addEdge("documentation_draft", "documentation_finalize")
  .addEdge("documentation_finalize", "supervisor") // After documentation workflow, return to supervisor
  // Edge for Data workflow
  .addEdge("data_agent", "supervisor"); // After data agent, return to supervisor

export const graph = workflow.compile({
  checkpointer: new MemorySaver(),
});

export { chatNode, entryNode, routeMessages };
