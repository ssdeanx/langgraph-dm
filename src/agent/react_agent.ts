import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { model } from "../config/googleProvider.js";
import { AgentAnnotation } from "./state.js";
import { MongoDBChatMessageHistory } from "../memory/chat_history.js";
import { MongoDBStore } from "../memory/storage.js";
import { tavilyTool } from "../tools/tavily.js";
import { evaluateExpressionTool, addNumbersTool } from "../tools/calculator.js";
import { listRepositoriesTool, getFileContentTool } from "../tools/github.js";
import logger from "../config/logger.js";
import { MongoClient } from "mongodb";

const tools = [tavilyTool, evaluateExpressionTool, addNumbersTool, listRepositoriesTool, getFileContentTool];

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set.`);
  }
  return value;
}

export async function reactAgent(state: typeof AgentAnnotation.State): Promise<Partial<typeof AgentAnnotation.State>> {
  logger.info("React agent processing", { 
    messageCount: state.messages.length,
    sessionId: state.sessionId 
  });

  const sessionId = state.sessionId || "default";
  
  // Initialize MongoDB connection and memory systems
  const mongoUri = getEnvVar("MONGODB_ATLAS_URI");
  const client = new MongoClient(mongoUri);
  await client.connect();
  
  const db = client.db("langgraph");
  const chatCollection = db.collection("chat_history");
  const storeCollection = db.collection("agent_store");

  const chatHistory = new MongoDBChatMessageHistory({
    collection: chatCollection,
    sessionId
  });

  const store = new MongoDBStore({
    collection: storeCollection,
    namespace: `react_agent_${sessionId}`
  });

  // Load previous context
  const previousMessages = await chatHistory.getMessages();
  logger.debug("Loaded chat history", { 
    sessionId,
    messageCount: previousMessages.length 
  });

  const lastMessage = state.messages[state.messages.length - 1];
  const userContent = lastMessage?.content as string || state.userInput || "Hello";

  // Save user message to state (memory placeholder)
  const userMessage = new HumanMessage(userContent);

  try {
    let responseMessage: AIMessage;

    // Check if user wants to use tools
    if (userContent.toLowerCase().includes("search")) {
      const result = await tavilyTool.invoke({ query: userContent });
      responseMessage = new AIMessage(`Search results: ${result}`);
    } else if (userContent.toLowerCase().includes("calculate") || userContent.toLowerCase().includes("math")) {
      const result = await evaluateExpressionTool.invoke({ expression: userContent });
      responseMessage = new AIMessage(`Calculation result: ${result}`);
    } else if (userContent.toLowerCase().includes("github") || userContent.toLowerCase().includes("repository")) {
      responseMessage = new AIMessage("I can help with GitHub operations. Please specify what you'd like to do.");
    } else {
      // Default: use model for general conversation
      const response = await model.invoke([{
        role: "user",
        content: `You are a helpful assistant with access to tools. Respond to: ${userContent}`
      }]);
      responseMessage = new AIMessage(response.content as string);
    }

    // Save assistant response to history
    await chatHistory.addMessage(responseMessage);

    return {
      messages: [responseMessage],
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
