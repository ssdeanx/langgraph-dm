import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import mammoth from "mammoth";
import * as papaparse from "papaparse";
import { parseStringPromise } from "xml2js";
import logger from "../config/logger.js";
import { ToolExecutionError } from "../config/errors.js";
import TurndownService from "turndown";
import * as yaml from "js-yaml";

/**
 * @module DocumentProcessingTools
 * @description A collection of tools for processing various document formats.
 */

const DATA_DIR = path.resolve("C:/Users/dm/Documents/langgraph/data");

/**
 * Ensures that the directory for a given file path exists. Creates it if it doesn't.
 * @param filePath The full path to the file.
 */
async function ensureDirectoryExists(filePath: string): Promise<void> {
  const dirPath = path.dirname(filePath);
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code !== 'EEXIST') {
      logger.error(`Failed to create directory ${dirPath}: ${error.message}`);
      throw new ToolExecutionError(`Failed to create directory for file: ${dirPath}`, "ensure_directory_exists", error);
    }
  }
}

/**
 * Validates and resolves a file path to ensure it is within the secure DATA_DIR.
 * Prevents path traversal attacks.
 * @param unsafeFilePath The user-provided file path.
 * @returns The resolved, secure absolute file path.
 * @throws {Error} If the path is outside of the DATA_DIR.
 */
function validateFilePath(unsafeFilePath: string): string {
  const resolvedPath = path.resolve(DATA_DIR, unsafeFilePath);

  if (!resolvedPath.startsWith(DATA_DIR)) {
    throw new Error(`Security violation: Path traversal detected. Attempted to access a file outside of the designated data directory.`);
  }
  return resolvedPath;
}

export const convertDocxToTextTool = tool(
  async ({ filePath }) => {
    const validatedFilePath = validateFilePath(filePath);
    logger.info("Converting DOCX to text", { filePath: validatedFilePath });
    try {
      const result = await mammoth.extractRawText({ path: validatedFilePath });
      logger.info("DOCX converted successfully", { filePath: validatedFilePath, textLength: result.value.length });
      return result.value;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error converting DOCX to text", { filePath: validatedFilePath, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to convert DOCX: ${errorMessage}`,
        "convert_docx_to_text",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "convert_docx_to_text",
    description: "Converts a DOCX file to plain text. File path must be within the data directory.",
    schema: z.object({
      filePath: z.string().describe("The path to the DOCX file within the data directory (e.g., 'my_document.docx' or 'subfolder/another.docx')."),
    }),
  }
);

export const parseCsvTool = tool(
  async ({ filePath, delimiter, skipEmptyLines = false, dynamicTyping = false }) => {
    const validatedFilePath = validateFilePath(filePath);
    logger.info("Parsing CSV file", { filePath: validatedFilePath, delimiter, skipEmptyLines, dynamicTyping });
    try {
      const fileContent = await fs.readFile(validatedFilePath, "utf-8");
      const result = papaparse.parse(fileContent, {
        header: true,
        delimiter,
        skipEmptyLines,
        dynamicTyping,
      });
      if (result.errors.length > 0) {
        throw new Error(`CSV parsing errors: ${JSON.stringify(result.errors)}`);
      }
      logger.info("CSV parsed successfully", { filePath: validatedFilePath, rowCount: result.data.length });
      return JSON.stringify(result.data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error parsing CSV", { filePath: validatedFilePath, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to parse CSV: ${errorMessage}`,
        "parse_csv",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "parse_csv",
    description: "Parses a CSV file and returns its content as a JSON string. File path must be within the data directory.",
    schema: z.object({
      filePath: z.string().describe("The path to the CSV file within the data directory."),
      delimiter: z.string().optional().describe("The character used to delimit fields. Defaults to auto-detection."),
      skipEmptyLines: z.boolean().optional().describe("Whether to skip empty lines in the CSV file."),
      dynamicTyping: z.boolean().optional().describe("Whether to convert numbers and booleans to their respective types."),
    }),
  }
);

export const parseXmlTool = tool(
  async ({ filePath, attrkey = '$', charkey = '#', explicitArray = false }) => {
    const validatedFilePath = validateFilePath(filePath);
    logger.info("Parsing XML file", { filePath: validatedFilePath, attrkey, charkey, explicitArray });
    try {
      const fileContent = await fs.readFile(validatedFilePath, "utf-8");
      const result = await parseStringPromise(fileContent, {
        attrkey,
        charkey,
        explicitArray,
      });
      logger.info("XML parsed successfully", { filePath: validatedFilePath });
      return JSON.stringify(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error parsing XML", { filePath: validatedFilePath, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to parse XML: ${errorMessage}`,
        "parse_xml",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "parse_xml",
    description: "Parses an XML file and returns its content as a JSON string. File path must be within the data directory.",
    schema: z.object({
      filePath: z.string().describe("The path to the XML file within the data directory."),
      attrkey: z.string().optional().describe("The key used for attributes."),
      charkey: z.string().optional().describe("The key used for text content."),
      explicitArray: z.boolean().optional().describe("Whether to always put child nodes in an array."),
    }),
  }
);

export const extractTextFromFileTool = tool(
  async ({ filePath }) => {
    const validatedFilePath = validateFilePath(filePath);
    logger.info("Extracting text from file", { filePath: validatedFilePath });
    try {
      const fileContent = await fs.readFile(validatedFilePath, "utf-8");
      logger.info("Text extracted successfully", { filePath: validatedFilePath, contentLength: fileContent.length });
      return fileContent;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error extracting text from file", { filePath: validatedFilePath, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to extract text from file: ${errorMessage}`,
        "extract_text_from_file",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "extract_text_from_file",
    description: "Extracts text content from a general file (e.g., .txt, .js, .json, .md). File path must be within the data directory.",
    schema: z.object({
      filePath: z.string().describe("The path to the file within the data directory."),
    }),
  }
);

export const convertTextToMarkdownTool = tool(
  async ({ content, filePath }) => {
    const validatedFilePath = validateFilePath(filePath);
    await ensureDirectoryExists(validatedFilePath);
    logger.info("Saving text as Markdown file", { filePath: validatedFilePath, contentLength: content.length });
    try {
      // The AI agent is responsible for generating the Markdown formatted string.
      // This tool's responsibility is to save that string to a .md file.
      await fs.writeFile(validatedFilePath, content, "utf-8");
      logger.info("Text content successfully saved as Markdown file", { filePath: validatedFilePath });
      return `Text content successfully saved as Markdown file at ${validatedFilePath}.`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error saving text as Markdown", { filePath: validatedFilePath, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to save text as Markdown: ${errorMessage}`,
        "convert_text_to_markdown",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "convert_text_to_markdown",
    description: "Saves a string of text content to a file with a .md extension. The agent must provide the Markdown formatted text.",
    schema: z.object({
      content: z.string().describe("The Markdown-formatted text content to save."),
      filePath: z.string().describe("The path where the Markdown file should be saved within the data directory (e.g., 'output.md')."),
    }),
  }
);

export const convertJsonToCsvTool = tool(
  async ({ jsonContent, filePath }) => {
    const validatedFilePath = validateFilePath(filePath);
    await ensureDirectoryExists(validatedFilePath);
    logger.info("Converting JSON to CSV", { filePath: validatedFilePath });
    try {
      const jsonData = JSON.parse(jsonContent);
      if (!Array.isArray(jsonData)) {
        throw new Error("Input must be a JSON string representing an array of objects.");
      }
      const csvContent = papaparse.unparse(jsonData);
      await fs.writeFile(validatedFilePath, csvContent, "utf-8");
      logger.info("JSON content successfully converted and saved as CSV file", { filePath: validatedFilePath });
      return `JSON content successfully converted and saved as CSV file at ${validatedFilePath}.`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error converting JSON to CSV", { filePath: validatedFilePath, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to convert JSON to CSV: ${errorMessage}`,
        "convert_json_to_csv",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "convert_json_to_csv",
    description: "Converts a JSON string (array of objects) into a CSV file and saves it.",
    schema: z.object({
      jsonContent: z.string().describe("A JSON string representing an array of objects to be converted to CSV."),
      filePath: z.string().describe("The path where the CSV file should be saved within the data directory (e.g., 'output.csv')."),
    }),
  }
);

export const convertTextToXmlTool = tool(
  async ({ content, filePath }) => {
    const validatedFilePath = validateFilePath(filePath);
    await ensureDirectoryExists(validatedFilePath);
    logger.info("Converting text to XML", { filePath: validatedFilePath, contentLength: content.length });
    try {
      // Assuming content is a valid XML string or will be formatted as such by the LLM
      await fs.writeFile(validatedFilePath, content, "utf-8");
      logger.info("Text content successfully saved as XML file", { filePath: validatedFilePath });
      return `Text content successfully saved as XML file at ${validatedFilePath}.`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error converting text to XML", { filePath: validatedFilePath, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to convert text to XML: ${errorMessage}`,
        "convert_text_to_xml",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "convert_text_to_xml",
    description: "Converts plain text content to an XML file. File path must be within the data directory.",
    schema: z.object({
      content: z.string().describe("The text content to convert (should be valid XML or intended for XML)."),
      filePath: z.string().describe("The path where the XML file should be saved within the data directory (e.g., 'output.xml')."),
    }),
  }
);

export const parseYamlTool = tool(
  async ({ yamlContent, filePath }) => {
    let contentToParse: string;
    logger.info("Parsing YAML content", { filePath });
    try {
      if (filePath) {
        const validatedFilePath = validateFilePath(filePath);
        contentToParse = await fs.readFile(validatedFilePath, "utf-8");
      } else if (yamlContent) {
        contentToParse = yamlContent;
      } else {
        throw new Error("Either 'yamlContent' or 'filePath' must be provided.");
      }

      const parsedData = yaml.load(contentToParse);
      logger.info("YAML content parsed successfully", { filePath });
      return JSON.stringify(parsedData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Error parsing YAML", { filePath, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to parse YAML: ${errorMessage}`,
        "parse_yaml",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "parse_yaml",
    description: "Parses YAML content from a string or a file into a JSON string. Provide either yamlContent or filePath.",
    schema: z.object({
      yamlContent: z.string().optional().describe("The YAML content as a string."),
      filePath: z.string().optional().describe("The path to the YAML file within the data directory."),
    }),
  }
);

export const convertHtmlToMarkdownTool = tool(
  async ({ htmlContent }) => {
    logger.info("Converting HTML to Markdown");
    try {
      const turndownService = new TurndownService();
      const markdown = turndownService.turndown(htmlContent);
      logger.info("HTML converted to Markdown successfully");
      return markdown;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Error converting HTML to Markdown", { error: errorMessage });
      throw new ToolExecutionError(
        `Failed to convert HTML to Markdown: ${errorMessage}`,
        "convert_html_to_markdown",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "convert_html_to_markdown",
    description: "Converts a string of HTML content into clean Markdown.",
    schema: z.object({
      htmlContent: z.string().describe("The HTML content to convert."),
    }),
  }
);

export const convertTextToJsonTool = tool(
  async ({ content, filePath }) => {
    const validatedFilePath = validateFilePath(filePath);
    await ensureDirectoryExists(validatedFilePath);
    logger.info("Converting text to JSON", { filePath: validatedFilePath, contentLength: content.length });
    try {
      // Assuming content is a valid JSON string or will be formatted as such by the LLM
      // Optional: Add JSON validation here if needed
      JSON.parse(content); // Basic validation
      await fs.writeFile(validatedFilePath, content, "utf-8");
      logger.info("Text content successfully saved as JSON file", { filePath: validatedFilePath });
      return `Text content successfully saved as JSON file at ${validatedFilePath}.`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error converting text to JSON", { filePath: validatedFilePath, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to convert text to JSON: ${errorMessage}`,
        "convert_text_to_json",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "convert_text_to_json",
    description: "Converts plain text content to a JSON file. File path must be within the data directory.",
    schema: z.object({
      content: z.string().describe("The text content to convert (should be valid JSON or intended for JSON)."),
      filePath: z.string().describe("The path where the JSON file should be saved within the data directory (e.g., 'output.json')."),
    }),
  }
);
