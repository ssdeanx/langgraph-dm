import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ExaSearchResults } from "@langchain/exa";

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
    const exa = new ExaSearchResults({
      apiKey: process.env.EXA_API_KEY,
    });
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
