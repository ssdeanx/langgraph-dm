import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { model } from "../config/googleProvider.js";
import { supervisor } from "./supervisor.js";
import { AgentAnnotation } from "./state.js";
import logger from "../config/logger.js";
import { ModelInvocationError, handleGlobalError } from "../config/errors.js";

// Helper function to handle model invocation with error handling
async function safeModelInvoke(content: string): Promise<string> {
  try {
    const response = await model.invoke([{ role: "user", content }]);
    return response.content as string;
  } catch (error) {
    throw new ModelInvocationError(
      `Failed to invoke Google model: ${error instanceof Error ? error.message : 'Unknown error'}`,
      "gemini-2.5-pro",
      error instanceof Error ? error : undefined
    );
  }
}

// Main chat node - handles user conversation
async function chatNode(state: typeof AgentAnnotation.State): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("Chat node processing", { 
    messageCount: state.messages.length,
    sessionId: state.sessionId 
  });

  try {
    const lastMessage = state.messages[state.messages.length - 1];
    const userContent = lastMessage?.content as string || state.userInput || "Hello!";
    
    const response = await safeModelInvoke(
      `You are a helpful AI assistant. Please respond to the user's message: "${userContent}"`
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

// Route function - determines next step based on supervisor decision
function routeMessages(state: typeof AgentAnnotation.State): string {
  logger.debug("Routing messages", { 
    next: state.next,
    messageCount: state.messages.length 
  });

  // Simple routing logic - for now just go to chat or end
  if (state.next === "FINISH" || state.next === "END") {
    return END;
  }
  
  // For now, all agent types route to chat node
  return "chat";
}

// Create the state graph
const workflow = new StateGraph(AgentAnnotation)
  .addNode("entry", entryNode)
  .addNode("supervisor", supervisor)
  .addNode("chat", chatNode)
  .addEdge(START, "entry")
  .addEdge("entry", "supervisor")
  .addConditionalEdges("supervisor", routeMessages, {
    chat: "chat",
    [END]: END,
  })
  .addEdge("chat", END);

// Compile the graph
export const graph = workflow.compile({
  // Add checkpointer for persistence if needed
  // checkpointer: new MemorySaver(),
});

// Export helper functions for testing
export { chatNode, entryNode, routeMessages };
