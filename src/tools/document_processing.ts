import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as fs from "fs/promises";
import * as pdfParse from "pdf-parse";
import * as mammoth from "mammoth";
import * as papaparse from "papaparse";
import { parseStringPromise } from "xml2js";

/**
 * @module DocumentProcessingTools
 * @description A collection of tools for processing various document formats.
 */

/**
 * Parses a PDF file and extracts its text content.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.filePath - The absolute path to the PDF file.
 * @returns {Promise<string>} The extracted text content of the PDF.
 */
export const parsePdfTool = tool(
  async ({ filePath }) => {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse.default(dataBuffer);
      return data.text;
    } catch (error: any) {
      console.error("Error parsing PDF:", error);
      return `Error parsing PDF: ${error.message}`;
    }
  },
  {
    name: "parse_pdf",
    description: "Parses a PDF file and extracts its text content.",
    schema: z.object({
      filePath: z.string().describe("The absolute path to the PDF file."),
    }),
  }
);

/**
 * Converts a DOCX file to plain text.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.filePath - The absolute path to the DOCX file.
 * @returns {Promise<string>} The extracted plain text content of the DOCX.
 */
export const convertDocxToTextTool = tool(
  async ({ filePath }) => {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error: any) {
      console.error("Error converting DOCX to text:", error);
      return `Error converting DOCX to text: ${error.message}`;
    }
  },
  {
    name: "convert_docx_to_text",
    description: "Converts a DOCX file to plain text.",
    schema: z.object({
      filePath: z.string().describe("The absolute path to the DOCX file."),
    }),
  }
);

/**
 * Parses a CSV file and returns its content as a JSON string.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.filePath - The absolute path to the CSV file.
 * @param {string} [input.delimiter] - The character used to delimit fields. Defaults to auto-detection.
 * @param {boolean} [input.skipEmptyLines=false] - Whether to skip empty lines in the CSV file.
 * @param {boolean} [input.dynamicTyping=false] - Whether to convert numbers and booleans to their respective types.
 * @returns {Promise<string>} The parsed CSV content as a JSON string.
 */
export const parseCsvTool = tool(
  async ({ filePath, delimiter, skipEmptyLines = false, dynamicTyping = false }) => {
    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      const result = papaparse.parse(fileContent, {
        header: true,
        delimiter,
        skipEmptyLines,
        dynamicTyping,
      });
      if (result.errors.length > 0) {
        throw new Error(`CSV parsing errors: ${JSON.stringify(result.errors)}`);
      }
      return JSON.stringify(result.data);
    } catch (error: any) {
      console.error("Error parsing CSV:", error);
      return `Error parsing CSV: ${error.message}`;
    }
  },
  {
    name: "parse_csv",
    description: "Parses a CSV file and returns its content as a JSON string.",
    schema: z.object({
      filePath: z.string().describe("The absolute path to the CSV file."),
      delimiter: z.string().optional().describe("The character used to delimit fields. Defaults to auto-detection."),
      skipEmptyLines: z.boolean().optional().describe("Whether to skip empty lines in the CSV file."),
      dynamicTyping: z.boolean().optional().describe("Whether to convert numbers and booleans to their respective types."),
    }),
  }
);

/**
 * Parses an XML file and returns its content as a JSON string.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.filePath - The absolute path to the XML file.
 * @param {string} [input.attrkey='$'] - The key used for attributes.
 * @param {string} [input.charkey='#'] - The key used for text content.
 * @param {boolean} [input.explicitArray=false] - Whether to always put child nodes in an array.
 * @returns {Promise<string>} The parsed XML content as a JSON string.
 */
export const parseXmlTool = tool(
  async ({ filePath, attrkey = '$', charkey = '#', explicitArray = false }) => {
    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      const result = await parseStringPromise(fileContent, {
        attrkey,
        charkey,
        explicitArray,
      });
      return JSON.stringify(result);
    } catch (error: any) {
      console.error("Error parsing XML:", error);
      return `Error parsing XML: ${error.message}`;
    }
  },
  {
    name: "parse_xml",
    description: "Parses an XML file and returns its content as a JSON string.",
    schema: z.object({
      filePath: z.string().describe("The absolute path to the XML file."),
      attrkey: z.string().optional().describe("The key used for attributes."),
      charkey: z.string().optional().describe("The key used for text content."),
      explicitArray: z.boolean().optional().describe("Whether to always put child nodes in an array."),
    }),
  }
);

/**
 * Extracts text content from a general file.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.filePath - The absolute path to the file.
 * @returns {Promise<string>} The extracted text content of the file.
 */
export const extractTextFromFileTool = tool(
  async ({ filePath }) => {
    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      return fileContent;
    } catch (error: any) {
      console.error("Error extracting text from file:", error);
      return `Error extracting text from file: ${error.message}`;
    }
  },
  {
    name: "extract_text_from_file",
    description: "Extracts text content from a general file (e.g., .txt, .js, .json, .md).",
    schema: z.object({
      filePath: z.string().describe("The absolute path to the file."),
    }),
  }
);