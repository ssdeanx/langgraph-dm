
import { model } from "../config/googleProvider.js";
import { AgentAnnotation, AgentType } from "./state.js";
import { memory } from "../memory/index.js";
import { createCheckpointSaver } from "../memory/storage.js";
import logger from "../config/logger.js";
import { AgentError } from "../config/errors.js";
// Async factory to create the checkpoint saver for persistent memory
const checkpointSaverPromise = createCheckpointSaver();

const ALL_AGENT_TYPES: AgentType[] = ["react", "rag", "conversational", "research", "rewoo", "plan_execute", "self_rag", "crag", "collaboration", "research_team", "document_writing_team", "reflection"];

const supervisorPrompt = `You are a supervisor who needs to decide which agent to call next based on the user's request.

Available agents and their capabilities:
- react: General problem-solving with tools (calculator, web search, GitHub, etc.)
- rag: Document retrieval and question answering
- research: Deep research using web search and document analysis
- conversational: General chat and conversation
- plan_execute: Complex multi-step task planning and execution
- collaboration: Multi-agent coordination tasks

Rules:
1. If user asks about math/calculations -> "react"
2. If user asks to search web/research -> "research"
3. If user asks about GitHub/code -> "react"
4. If user asks about documents/files -> "rag"
5. If user asks for complex planning -> "plan_execute"
6. If just chatting -> "conversational"
7. If task is complete -> "FINISH"

Respond with ONLY the agent name or "FINISH".

User Request: {input}`;

export async function supervisor(state: typeof AgentAnnotation.State): Promise<Partial<typeof AgentAnnotation.State>> {
  // Persist supervisor routing decision in checkpointSaver and memory
  const checkpointSaver = await checkpointSaverPromise;
  logger.info("Supervisor routing request", {
    messageCount: state.messages.length,
    sessionId: state.sessionId
  });

  const lastMessage = state.messages[state.messages.length - 1];
  const userContent = lastMessage?.content as string || state.userInput || "Hello";
  try {
    const response = await model.invoke([{
      role: "user",
      content: supervisorPrompt.replace("{input}", userContent)
    }]);
    const responseText = response.content as string;
    const agentChoice = responseText.trim().toLowerCase();
    logger.debug("Supervisor decision", { userContent, agentChoice });

    // Write to vectorstore memory (semantic log)
    if (memory.createVectorStore) {
      const vectorstore = await memory.createVectorStore();
      await vectorstore.addDocuments([
        new (await import("@langchain/core/documents")).Document({
          pageContent: `Supervisor routed to: ${agentChoice} for input: ${userContent}`,
          metadata: { agent_choice: agentChoice, user_input: userContent }
        })
      ]);
      logger.info("Supervisor memory write complete");
    }

    // Persist supervisor routing decision in checkpointSaver
    const threadId = state.sessionId || "default";
    try {
      await checkpointSaver.put(
        { configurable: { thread_id: threadId, checkpoint_ns: "supervisor" } },
        {
          v: 1,
          id: `${threadId}-${Date.now()}`,
          ts: new Date().toISOString(),
          channel_values: { agent_choice: agentChoice, user_input: userContent },
          channel_versions: {},
          versions_seen: {},
          pending_sends: [],
        },
        { source: "update", step: 0, writes: null, parents: {} }
      );
      logger.info("Supervisor checkpointSaver write complete");
    } catch {
      throw new AgentError("Failed to persist supervisor checkpoint", "CHECKPOINT_ERROR");
    }

    // Map response to valid choices
    if (agentChoice.includes("finish") || agentChoice === "finish") {
      return { next: "FINISH" };
    }
    // Validate agent choice
    if (ALL_AGENT_TYPES.includes(agentChoice as AgentType)) {
      return { next: agentChoice };
    }
    // Fallback routing logic based on keywords
    const input = userContent.toLowerCase();
    if (input.includes("math") || input.includes("calculate") || input.includes("compute")) {
      return { next: "react" };
    } else if (input.includes("search") || input.includes("research") || input.includes("find")) {
      return { next: "research" };
    } else if (input.includes("github") || input.includes("code") || input.includes("repository")) {
      return { next: "react" };
    } else if (input.includes("document") || input.includes("file") || input.includes("pdf")) {
      return { next: "rag" };
    } else if (input.includes("plan") || input.includes("steps") || input.includes("strategy")) {
      return { next: "plan_execute" };
    }
    // Default to conversational for general chat
    return { next: "conversational" };
  } catch (error) {
    logger.error("Supervisor error", { error: error instanceof Error ? error.message : 'Unknown error' });
    return { next: "conversational" }; // Safe fallback
  }
}
