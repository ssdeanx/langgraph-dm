
import { model } from "../config/googleProvider.js";
import { AgentAnnotation, AgentType } from "./state.js";
import { memory } from "../memory/index.js";
import { RunnableConfig } from "@langchain/core/runnables";
import { createCheckpointSaver } from "../memory/storage.js";
import logger from "../config/logger.js";
import { AgentError } from "../config/errors.js";
// Async factory to create the checkpoint saver for persistent memory
const checkpointSaverPromise = createCheckpointSaver();



/**
 * The `supervisor` function determines which agent to call next based on the user's request and
 * provides a fallback routing logic if needed.
 * @param state - The `state` parameter in the `supervisor` function represents the current state of
 * the conversation or interaction with the user. It includes information such as the messages
 * exchanged, session ID, and user input. The function uses this state to make decisions on which agent
 * to call next based on the user's
 * @returns The `supervisor` function returns an object with the key `next` that specifies the next
 * agent to call based on the user's request. The value of `next` can be one of the following:
 * - A specific agent type from the `ALL_AGENT_TYPES` array.
 * - "FINISH" if the task is complete.
 * - A fallback agent choice based on keywords if the user request does
 */
const ALL_AGENT_TYPES: AgentType[] = ["react", "rag", "conversational", "research", "documentation", "data"];

const supervisorPrompt = `You are a supervisor who needs to decide which agent to call next based on the user's request.

Available agents and their capabilities:
- react: General problem-solving with tools (calculator, web search, GitHub, etc.)
- rag: Document retrieval and question answering
- research: Deep research using web search and document analysis
- documentation: Create documentation from research reports
- conversational: General chat and conversation
- data: A powerful agent for data-centric tasks. Use for:
    - **Processing Data**: Can parse, read, and convert various data formats like JSON, CSV, XML, and YAML, whether from user input, files, or web content.
    - **Document Handling**: Can extract text from DOCX files and convert HTML to clean Markdown.
    - **Web Content**: Can extract text or raw HTML from URLs and perform web crawls.
    - **Code & Repositories**: Can perform a full suite of Git and GitHub operations, including cloning, reading files, diffing, and managing issues.

Rules:
1. If the request involves handling files, structured data (JSON, CSV, etc.), or converting between formats (like HTML to MD) -> "data"
2. If the user asks to perform any Git or GitHub operation (clone, list repos, create issue, diff, etc.) -> "data"
3. For general web research or finding information -> "research"
4. To create documentation from a report -> "documentation"
5. For math or simple calculations -> "react"
6. For retrieval-augmented generation (RAG) over a known document set -> "rag"
7. If the user is just chatting or asking a general question -> "conversational"
8. If the task is clearly finished -> "FINISH"

Respond with ONLY the agent name or "FINISH".

User Request: {input}`;

export async function supervisor(state: typeof AgentAnnotation.State, config: RunnableConfig): Promise<Partial<typeof AgentAnnotation.State>> {
  // Persist supervisor routing decision in checkpointSaver and memory
  const checkpointSaver = await checkpointSaverPromise;
  logger.info("Supervisor routing request", {
    messageCount: state.messages.length,
    sessionId: state.sessionId
  });

  const lastMessage = state.messages[state.messages.length - 1];
  const userContent = lastMessage?.content as string || state.userInput || "Hello";
  const prompt = config.configurable?.supervisor_prompt ?? supervisorPrompt;
  try {
    const response = await model.invoke([{
      role: "user",
      content: prompt.replace("{input}", userContent)
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
    } else if (input.includes("github") || input.includes("repository") || input.includes("repo") || input.includes("clone") || input.includes("commit") || input.includes("branch") || input.includes("diff") || input.includes("issue") || input.includes("pull request") || input.includes("file tree") || input.includes("file content") || input.includes("in-memory") || input.includes("document") || input.includes("csv") || input.includes("xml") || input.includes("docx") || input.includes("parse")) {
      // Direct to data agent for specific data/repo/document operations
      return { next: "data" };
    } else if (input.includes("documentation") || input.includes("docs")) {
      return { next: "documentation" };
    } else if (input.includes("rag")) { // Explicit RAG requests
      return { next: "rag" };
    }
    // Default to conversational for general chat or unhandled cases
    return { next: "conversational" };
  } catch (error) {
    logger.error("Supervisor error", { error: error instanceof Error ? error.message : 'Unknown error' });
    return { next: "conversational" }; // Safe fallback
  }
}
