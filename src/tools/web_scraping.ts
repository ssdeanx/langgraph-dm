import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as cheerio from "cheerio";
import { CheerioCrawler, RequestQueue } from "crawlee";

/**
 * @module WebScrapingTools
 * @description A collection of tools for web scraping and content extraction.
 */

/**
 * Fetches content from a URL and extracts all visible text using Cheerio.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.url - The URL to fetch and parse.
 * @returns {Promise<string>} The extracted text content from the URL.
 */
export const extractTextFromUrlTool = tool(
  async ({ url }) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const html = await response.text();
      const $ = cheerio.load(html);
      return $("body").text();
    } catch (error: any) {
      console.error("Error extracting text from URL:", error);
      return `Error extracting text from URL: ${error.message}`;
    }
  },
  {
    name: "extract_text_from_url",
    description: "Fetches content from a URL and extracts all visible text.",
    schema: z.object({
      url: z.string().url().describe("The URL to fetch and extract text from."),
    }),
  }
);

/**
 * Fetches content from a URL and returns the raw HTML.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.url - The URL to fetch.
 * @returns {Promise<string>} The raw HTML content from the URL.
 */
export const extractHtmlFromUrlTool = tool(
  async ({ url }) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error: any) {
      console.error("Error extracting HTML from URL:", error);
      return `Error extracting HTML from URL: ${error.message}`;
    }
  },
  {
    name: "extract_html_from_url",
    description: "Fetches content from a URL and returns the raw HTML.",
    schema: z.object({
      url: z.string().url().describe("The URL to fetch."),
    }),
  }
);

/**
 * Extracts elements from HTML content using a CSS selector.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.html - The HTML content to parse.
 * @param {string} input.selector - The CSS selector to use for extraction.
 * @returns {Promise<string[]>} An array of extracted element texts.
 */
export const extractElementsBySelectorTool = tool(
  async ({ html, selector }) => {
    try {
      const $ = cheerio.load(html);
      const elements: string[] = [];
      $(selector).each((_i, elem) => {
        elements.push($(elem).text());
      });
      return elements;
    } catch (error: any) {
      console.error("Error extracting elements by selector:", error);
      return `Error extracting elements by selector: ${error.message}`;
    }
  },
  {
    name: "extract_elements_by_selector",
    description: "Extracts elements from HTML content using a CSS selector.",
    schema: z.object({
      html: z.string().describe("The HTML content to parse."),
      selector: z.string().describe("The CSS selector to use for extraction."),
    }),
  }
);

/**
 * Performs a web crawl starting from a given URL and collects text content.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.startUrl - The starting URL for the crawl.
 * @param {number} [input.maxRequests=10] - Maximum number of pages to crawl. Defaults to 10.
 * @param {number} [input.maxDepth=1] - Maximum depth of the crawl. Defaults to 1.
 * @returns {Promise<string>} A JSON string containing the crawled URLs and their extracted text content.
 */
export const crawlWebsiteTool = tool(
  async ({ startUrl, maxRequests = 10, maxDepth = 1 }) => {
    const crawledData: { url: string; text: string }[] = [];
    const requestQueue = await RequestQueue.open();
    await requestQueue.addRequest({ url: startUrl });

    const crawler = new CheerioCrawler({
      requestQueue,
      maxRequestsPerCrawl: maxRequests,
      maxRequestsPerMinute: 60, // Limit to 60 requests per minute to be polite
      maxConcurrency: 5, // Limit concurrent requests
      async requestHandler({ request, $ }) {
        // Enforce maxDepth manually
        if ((request as any).depth !== undefined && (request as any).depth > maxDepth) {
          return;
        }
        console.log(`Processing ${request.url}...`);
        const text = $("body").text();
        crawledData.push({ url: request.url, text });
      },
      async failedRequestHandler({ request }) {
        console.error(`Request ${request.url} failed.`);
      },
    });

    try {
      await crawler.run();
      return JSON.stringify(crawledData);
    } catch (error: any) {
      console.error("Error during web crawl:", error);
      return `Error during web crawl: ${error.message}`;
    }
  },
  {
    name: "crawl_website",
    description: "Performs a web crawl starting from a given URL and collects text content from pages.",
    schema: z.object({
      startUrl: z.string().url().describe("The starting URL for the crawl."),
      maxRequests: z.number().int().min(1).optional().describe("Maximum number of pages to crawl. Defaults to 10."),
      maxDepth: z.number().int().min(0).optional().describe("Maximum depth of the crawl. Defaults to 1."),
    }),
  }
);
