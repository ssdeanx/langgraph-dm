
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { model } from "../config/googleProvider.js";
import { AgentAnnotation } from "./state.js";
import { chatHistory } from "../memory/chat_history.js";
import { storage } from "../memory/storage.js";
import { tools } from "../tools/index.js";
import logger from "../config/logger.js";

export async function reactAgent(state: typeof AgentAnnotation.State): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("React agent processing", {
    messageCount: state.messages.length,
    sessionId: state.sessionId
  });

  const lastMessage = state.messages[state.messages.length - 1];
  const userContent = lastMessage?.content as string || state.userInput;

  // Save user message to state (memory placeholder)
  const userMessage = new HumanMessage(userContent);

  try {
    const response = await model.invoke([userMessage], { tools });

    // Save assistant response to history
    await chatHistory.addMessage(response);

    return {
      messages: [response],
      sender: "assistant"
    };

  } catch (error) {
    logger.error("React agent error", { error: error instanceof Error ? error.message : 'Unknown error' });
    return {
      messages: [new AIMessage("I encountered an error processing your request.")],
      sender: "assistant"
    };
  }
}

