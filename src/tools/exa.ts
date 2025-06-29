import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ExaSearchResults } from "@langchain/exa";
import "dotenv/config";
import { ToolExecutionError } from "../config/errors.js";
/**
 * Utility function for environment variable access
 */
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set.`);
  }
  return value;
}

/**
 * @module ExaTools
 * @description A collection of tools for performing web searches using Exa.
 */

/**
 * Initializes and exports the Exa search tool.
 * @function
 * @param {object} input - The input object for the search query.
 * @param {string} input.query - The search query string.
 * @returns {Promise<string>} A JSON string of search results.
 */
export const exaSearchTool = tool(
  async ({ query }) => {
    // Ensure the API key is set
    getEnvVar("EXA_API_KEY");
    // Instantiate ExaSearchResults without apiKey argument
    const exa = new ExaSearchResults();
    try {
      const results = await exa.invoke(query);
      return JSON.stringify(results);
    } catch (error: any) {
      console.error("Error performing Exa search:", error);
      return `Error performing Exa search: ${error.message}`;
    }
  },
  {
    name: "exa_search",
    description: "Performs web searches using Exa. Useful for general knowledge, current events, and detailed information retrieval.",
    schema: z.object({
      query: z.string().describe("The search query string."),
    }),
  }
);

