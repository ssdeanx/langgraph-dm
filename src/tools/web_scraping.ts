import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as cheerio from "cheerio";
import { CheerioCrawler, RequestQueue } from "crawlee";
import "dotenv/config";
import logger from "../config/logger.js";
import { ToolExecutionError } from "../config/errors.js";
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
    logger.info("Extracting text from URL", { url });
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const html = await response.text();
      const $ = cheerio.load(html);
      const text = $("body").text();
      logger.info("Text extracted successfully", { url, textLength: text.length });
      return text;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error extracting text from URL", { url, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to extract text from URL: ${errorMessage}`,
        "extract_text_from_url",
        error instanceof Error ? error : undefined
      );
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
    logger.info("Extracting HTML from URL", { url });
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const html = await response.text();
      logger.info("HTML extracted successfully", { url, htmlLength: html.length });
      return html;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error extracting HTML from URL", { url, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to extract HTML from URL: ${errorMessage}`,
        "extract_html_from_url",
        error instanceof Error ? error : undefined
      );
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
    logger.info("Extracting elements by selector", { selector, htmlLength: html.length });
    try {
      const $ = cheerio.load(html);
      const elements: string[] = [];
      $(selector).each((_i, elem) => {
        elements.push($(elem).text());
      });
      logger.info("Elements extracted successfully", { selector, elementCount: elements.length });
      return elements;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error extracting elements by selector", { selector, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to extract elements by selector: ${errorMessage}`,
        "extract_elements_by_selector",
        error instanceof Error ? error : undefined
      );
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
  async ({ startUrl, maxRequests = 20 }) => {
    logger.info("Starting website crawl", { startUrl, maxRequests });
    const crawledData: { url: string; text: string }[] = [];
    const requestQueue = await RequestQueue.open();
    await requestQueue.addRequest({ url: startUrl });

    const crawler = new CheerioCrawler({
      requestQueue,
      maxRequestsPerCrawl: maxRequests,
      maxRequestsPerMinute: 60,
      maxConcurrency: 5,
      async requestHandler({ request, $ }) {
        logger.debug(`Processing ${request.url}...`);
        const text = $("body").text();
        crawledData.push({ url: request.url, text });
      },
      async failedRequestHandler({ request }, error) {
        logger.warn(`Request ${request.url} failed.`, { url: request.url, error: error.message });
      },
    });

    try {
      await crawler.run();
      logger.info("Web crawl completed", { startUrl, pagesFound: crawledData.length });
      return JSON.stringify(crawledData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error during web crawl", { startUrl, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to crawl web pages: ${errorMessage}`,
        "crawl_web",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "crawl_website",
    description: "Performs a web crawl starting from a given URL and collects text content from a limited number of pages.",
    schema: z.object({
      startUrl: z.string().url().describe("The starting URL for the crawl."),
      maxRequests: z.number().int().min(1).optional().describe("Maximum number of pages to crawl. Defaults to 20."),
    }),
  }
);
