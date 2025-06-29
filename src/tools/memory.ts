import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { inMemoryStore } from "../memory/in_memory_store.js";
import { v4 as uuidv4 } from "uuid";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

/**
 * @module MemoryTools
 * @description A collection of tools for interacting with the in-memory semantic search store.
 */

/**
 * Stores a piece of information in the agent's long-term memory.
 * The namespace is automatically derived from the user_id in the RunnableConfig.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.key - A unique key for the memory within the namespace.
 * @param {string} input.value - The content of the memory to store.
 * @param {LangGraphRunnableConfig} config - The RunnableConfig containing the user_id.
 * @returns {Promise<string>} A confirmation message.
 */
export const putMemoryTool = tool(
  async ({ key, value }, config: LangGraphRunnableConfig) => {
    const userId = config.configurable?.user_id || "default_user";
    try {
      await inMemoryStore.put([userId], key, { text: value });
      return `Memory stored successfully for user ${userId} with key ${key}.`;
    } catch (error: any) {
      console.error("Error storing memory:", error);
      return `Error storing memory: ${error.message}`;
    }
  },
  {
    name: "put_memory",
    description: "Stores a piece of information in the agent's long-term memory. Use this to remember user preferences or facts.",
    schema: z.object({
      key: z.string().describe("A unique key for the memory within the namespace."),
      value: z.string().describe("The content of the memory to store."),
    }),
  }
);

/**
 * Searches the agent's long-term memory using a natural language query.
 * The namespace is automatically derived from the user_id in the RunnableConfig.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.query - The natural language query for semantic search.
 * @param {number} [input.limit=3] - The maximum number of results to return.
 * @param {LangGraphRunnableConfig} config - The RunnableConfig containing the user_id.
 * @returns {Promise<string>} A JSON string of semantically similar memories.
 */
export const searchMemoryTool = tool(
  async ({ query, limit = 3 }, config: LangGraphRunnableConfig) => {
    const userId = config.configurable?.user_id || "default_user";
    try {
      const memories = await inMemoryStore.search([userId], { query, limit });
      return JSON.stringify(memories.map(mem => ({ value: mem.value.text, score: mem.score })));
    } catch (error: any) {
      console.error("Error searching memory:", error);
      return `Error searching memory: ${error.message}`;
    }
  },
  {
    name: "search_memory",
    description: "Searches the agent's long-term memory using a natural language query for semantically similar information.",
    schema: z.object({
      query: z.string().describe("The natural language query for semantic search."),
      limit: z.number().int().min(1).optional().describe("The maximum number of results to return."),
    }),
  }
);