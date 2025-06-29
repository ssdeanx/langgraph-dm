import { TavilySearch } from '@langchain/tavily';
import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import dotenv from 'dotenv';

dotenv.config();

/**
 * @module TavilyTools
 * @description A collection of tools for performing advanced web searches using Tavily.
 */

/**
 * Initializes and exports the Tavily search tool with enhanced capabilities.
 * This tool allows the agent to perform web searches with fine-grained control over search parameters.
 * @function
 * @param {object} input - The input object for the search query.
 * @param {string} input.query - The search query string.
 * @param {('basic' | 'advanced')} [input.search_depth='basic'] - The depth of the search. 'basic' for quick results, 'advanced' for more comprehensive results.
 * @param {boolean} [input.include_answer=false] - Whether to include a concise answer to the query.
 * @param {boolean} [input.include_images=false] - Whether to include images in the search results.
 * @param {boolean} [input.include_raw_content=false] - Whether to include the raw HTML content of the search results.
 * @param {number} [input.max_results=5] - The maximum number of search results to return.
 * @param {number} [input.min_results] - The minimum number of search results to return.
 * @param {string[]} [input.exclude_domains] - A list of domains to exclude from the search results.
 * @param {string[]} [input.include_domains] - A list of domains to include in the search results.
 * @param {string} [input.start_date] - The start date for filtering results (YYYY-MM-DD).
 * @param {string} [input.end_date] - The end date for filtering results (YYYY-MM-DD).
 * @param {boolean} [input.unfilter=false] - Whether to unfilter the search results (e.g., remove duplicates).
 * @param {boolean} [input.follow_links=false] - Whether to follow links in the search results.
 * @param {string} [input.context] - Additional context for the search query.
 * @returns {Promise<string>} A JSON string of search results.
 */
export const tavilyTool = tool(
  async (input: {
    query: string;
    searchDepth?: 'basic' | 'advanced';
    includeAnswer?: boolean;
    includeImages?: boolean;
    includeRawContent?: boolean;
    maxResults?: number;
    minResults?: number;
    excludeDomains?: string[];
    includeDomains?: string[];
    startDate?: string;
    endDate?: string;
    unfilter?: boolean;
    followLinks?: boolean;
    context?: string;
  }) => {
    const tavily = new TavilySearch();

    try {
      const results = await tavily.invoke({
        query: input.query,
        searchDepth: input.searchDepth,
        includeAnswer: input.includeAnswer,
        includeImages: input.includeImages,
        includeRawContent: input.includeRawContent,
        maxResults: input.maxResults, // Pass maxResults here if supported
        minResults: input.minResults,
        excludeDomains: input.excludeDomains,
        includeDomains: input.includeDomains,
        startDate: input.startDate,
        endDate: input.endDate,
        unfilter: input.unfilter,
        followLinks: input.followLinks,
        context: input.context,
      });
      return JSON.stringify(results);
    } catch (error: any) {
      console.error("Error performing Tavily search:", error);
      return `Error performing Tavily search: ${error.message}`;
    }
  },
  {
    name: "tavily_search",
    description: "Performs advanced web searches using Tavily. Useful for general knowledge, current events, and detailed information retrieval.",
    schema: z.object({
      query: z.string().describe("The search query string."),
      searchDepth: z.enum(['basic', 'advanced']).optional().describe("The depth of the search. 'basic' for quick results, 'advanced' for more comprehensive results."),
      includeAnswer: z.boolean().optional().describe("Whether to include a concise answer to the query."),
      includeImages: z.boolean().optional().describe("Whether to include images in the search results."),
      includeRawContent: z.boolean().optional().describe("Whether to include the raw HTML content of the search results."),
      maxResults: z.number().int().min(1).optional().describe("The maximum number of search results to return."),
      minResults: z.number().int().min(1).optional().describe("The minimum number of search results to return."),
      excludeDomains: z.array(z.string()).optional().describe("A list of domains to exclude from the search results."),
      includeDomains: z.array(z.string()).optional().describe("A list of domains to include in the search results."),
      startDate: z.string().optional().describe("The start date for filtering results (YYYY-MM-DD)."),
      endDate: z.string().optional().describe("The end date for filtering results (YYYY-MM-DD)."),
      unfilter: z.boolean().optional().describe("Whether to unfilter the search results (e.g., remove duplicates)."),
      followLinks: z.boolean().optional().describe("Whether to follow links in the search results."),
      context: z.string().optional().describe("Additional context for the search query."),
    }),
  }
);

