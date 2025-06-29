import { tool } from "@langchain/core/tools";
import { z } from "zod";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node/index.js";
import { createFsFromVolume, Volume } from "memfs";

const vol = new Volume();
const fs = createFsFromVolume(vol); // Keep 'fs' for synchronous operations like readFileSync
const fsPromises = fs.promises; // Access the promise-based API

const dir = "/";

/**
 * @module LocalGitTools
 * @description A collection of tools for performing Git operations on an in-memory file system.
 */

/**
 * Clones a Git repository into the in-memory file system.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.repoUrl - The URL of the repository to clone.
 * @param {string} [input.branch] - The specific branch to clone. Defaults to the default branch.
 * @returns {Promise<string>} A success message or an error message.
 */
export const cloneRepositoryTool = tool(
  async ({ repoUrl, branch }) => {
    try {
      await git.clone({
        fs,
        http,
        dir,
        url: repoUrl,
        ref: branch,
        singleBranch: !!branch,
      });
      return `Repository ${repoUrl} cloned successfully into in-memory file system.`;
    } catch (error: any) {
      console.error("Error cloning repository:", error);
      return `Error cloning repository: ${error.message}`;
    }
  },
  {
    name: "clone_repository",
    description:
      "Clones a Git repository into an in-memory file system for analysis.",
    schema: z.object({
      repoUrl: z.string().describe("The URL of the repository to clone."),
      branch: z.string().optional().describe("The specific branch to clone."),
    }),
  }
);

/**
 * Reads the content of a file from the in-memory file system.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.filePath - The path to the file within the in-memory file system (e.g., '/README.md').
 * @returns {Promise<string>} The content of the file as a string.
 */
export const readInMemoryFileTool = tool(
  async ({ filePath }) => {
    try {
      // memfs readFileSync returns a Buffer, so convert to string
      const content = fs.readFileSync(filePath, "utf-8");
      return content as string;
    } catch (error: any) {
      console.error("Error reading in-memory file:", error);
      return `Error reading in-memory file: ${error.message}`;
    }
  },
  {
    name: "read_in_memory_file",
    description:
      "Reads the content of a file from the in-memory cloned repository.",
    schema: z.object({
      filePath: z
        .string()
        .describe(
          "The path to the file within the in-memory cloned repository (e.g., '/README.md')."
        ),
    }),
  }
);

/**
 * Lists files and directories within the in-memory file system.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.path - The path to the directory to list (e.g., '/').
 * @returns {Promise<string>} A JSON string of file and directory names.
 */
export const listInMemoryFilesTool = tool(
  async ({ path }) => {
    try {
      const files = await fsPromises.readdir(path) as string[];
      return JSON.stringify(files);
    } catch (error: any) {
      console.error("Error listing in-memory files:", error);
      return `Error listing in-memory files: ${error.message}`;
    }
  },
  {
    name: "list_in_memory_files",
    description:
      "Lists files and directories within the in-memory cloned repository.",
    schema: z.object({
      path: z
        .string()
        .describe("The path to the directory to list (e.g., '/')."),
    }),
  }
);

/**
 * Gets file statistics from the in-memory file system.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.filePath - The path to the file within the in-memory file system.
 * @returns {Promise<string>} A JSON string of file statistics.
 */
export const getInMemoryFileStatsTool = tool(
  async ({ filePath }) => {
    try {
      const stats = await fsPromises.stat(filePath);
      return JSON.stringify({
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        // Add more stats as needed
      });
    } catch (error: any) {
      console.error("Error getting in-memory file stats:", error);
      return `Error getting in-memory file stats: ${error.message}`;
    }
  },
  {
    name: "get_in_memory_file_stats",
    description:
      "Gets file statistics (size, type, etc.) from the in-memory cloned repository.",
    schema: z.object({
      filePath: z
        .string()
        .describe("The path to the file within the in-memory file system."),
    }),
  }
);

/**
 * Commits changes to the in-memory Git repository.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.message - The commit message.
 * @returns {Promise<string>} A success message or an error message.
 */
export const commitInMemoryChangesTool = tool(
  async ({ message }) => {
    try {
      const sha = await git.commit({
        fs,
        dir,
        message,
        author: {
          name: "LangGraph Agent",
          email: "agent@example.com",
        },
      });
      return `Changes committed to in-memory repository: ${sha}`;
    } catch (error: any) {
      console.error("Error committing in-memory changes:", error);
      return `Error committing in-memory changes: ${error.message}`;
    }
  },
  {
    name: "commit_in_memory_changes",
    description: "Commits changes to the in-memory Git repository.",
    schema: z.object({
      message: z.string().describe("The commit message."),
    }),
  }
);

/**
 * Gets the commit log of the in-memory Git repository.
 * @function
 * @param {object} input - The input object.
 * @param {number} [input.depth=10] - The maximum number of log entries to return.
 * @returns {Promise<string>} A JSON string of commit log entries.
 */
export const getInMemoryLogTool = tool(
  async ({ depth = 10 }) => {
    try {
      const log = await git.log({
        fs,
        dir,
        depth,
      });
      return JSON.stringify(log);
    } catch (error: any) {
      console.error("Error getting in-memory log:", error);
      return `Error getting in-memory log: ${error.message}`;
    }
  },
  {
    name: "get_in_memory_log",
    description: "Gets the commit log of the in-memory Git repository.",
    schema: z.object({
      depth: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe("The maximum number of log entries to return."),
    }),
  }
);

/**
 * Checks out a specific branch in the in-memory Git repository.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.branchName - The name of the branch to checkout.
 * @returns {Promise<string>} A success message or an error message.
 */
export const checkoutInMemoryBranchTool = tool(
  async ({ branchName }) => {
    try {
      await git.checkout({
        fs,
        dir,
        ref: branchName,
      });
      return `Checked out branch: ${branchName}.`;
    } catch (error: any) {
      console.error("Error checking out in-memory branch:", error);
      return `Error checking out in-memory branch: ${error.message}`;
    }
  },
  {
    name: "checkout_in_memory_branch",
    description:
      "Checks out a specific branch in the in-memory Git repository.",
    schema: z.object({
      branchName: z.string().describe("The name of the branch to checkout."),
    }),
  }
);

/**
 * Creates a new branch in the in-memory Git repository.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.branchName - The name of the new branch.
 * @returns {Promise<string>} A success message or an error message.
 */
export const createInMemoryBranchTool = tool(
  async ({ branchName }) => {
    try {
      await git.branch({
        fs,
        dir,
        ref: branchName,
      });
      return `Created new branch: ${branchName}.`;
    } catch (error: any) {
      console.error("Error creating in-memory branch:", error);
      return `Error creating in-memory branch: ${error.message}`;
    }
  },
  {
    name: "create_in_memory_branch",
    description: "Creates a new branch in the in-memory Git repository.",
    schema: z.object({
      branchName: z.string().describe("The name of the new branch."),
    }),
  }
);

/**
 * Compares two files in the in-memory file system and returns the diff.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.filePath1 - The path to the first file.
 * @param {string} input.filePath2 - The path to the second file.
 * @returns {Promise<string>} The diff between the two files or an error message.
 */
export const diffInMemoryFilesTool = tool(
  async ({ filePath1, filePath2 }) => {
    try {
      const content1 = fs.readFileSync(filePath1, "utf-8").toString();
      const content2 = fs.readFileSync(filePath2, "utf-8").toString();

      // A simple diff implementation (can be replaced with a more robust diffing library)
      const diff = `--- a/${filePath1}\n+++ b/${filePath2}\n`;
      const lines1 = content1.split('\n');
      const lines2 = content2.split('\n');

      let diffContent = "";
      for (let i = 0; i < Math.max(lines1.length, lines2.length); i++) {
        const line1 = lines1[i] || "";
        const line2 = lines2[i] || "";

        if (line1 !== line2) {
          if (line1 !== "") diffContent += `- ${line1}\n`;
          if (line2 !== "") diffContent += `+ ${line2}\n`;
        } else {
          diffContent += `  ${line1}\n`;
        }
      }

      return diff + diffContent;
    } catch (error: any) {
      console.error("Error diffing in-memory files:", error);
      return `Error diffing in-memory files: ${error.message}`;
    }
  },
  {
    name: "diff_in_memory_files",
    description:
      "Compares two files in the in-memory file system and returns the diff.",
    schema: z.object({
      filePath1: z.string().describe("The path to the first file."),
      filePath2: z.string().describe("The path to the second file."),
    }),
  }
);
