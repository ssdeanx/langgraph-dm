import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Octokit } from "octokit";
import logger from "../config/logger.js";
import { ToolExecutionError } from "../config/errors.js";


/**
 * Initializes Octokit with a GitHub Personal Access Token (PAT).
 * The PAT should be stored securely in environment variables.
 * @returns {Octokit} An authenticated Octokit instance.
 */
function getOctokitClient(): Octokit {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken || githubToken.trim() === "") {
      throw new Error("GITHUB_TOKEN environment variable is not set or is empty.");
    }
    return new Octokit({
      auth: githubToken,
    });
  } catch (error) {
    logger.error("Failed to initialize Octokit client", { error: error instanceof Error ? error.message : "Unknown error" });
    // Re-throw as a ToolExecutionError for consistent error handling
    throw new ToolExecutionError(
      `Octokit client initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "octokit_initialization",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * @module GitHubTools
 * @description A collection of tools for interacting with the GitHub API.
 */

/**
 * Lists repositories for a given user or organization.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.type - The type of account ('user' or 'org').
 * @param {string} input.username - The username or organization name.
 * @returns {Promise<string>} A JSON string of repository names and their descriptions.
 */
export const listRepositoriesTool = tool(
  async ({ type, username = "ssdeanx" }) => {
    const octokit = getOctokitClient();
    try {
      let repos;
      if (type === "user") {
        const { data } = await octokit.rest.repos.listForUser({
          username,
        });
        repos = data;
      } else if (type === "org") {
        const { data } = await octokit.rest.repos.listForOrg({
          org: username,
        });
        repos = data;
      } else {
        throw new Error("Invalid type. Must be 'user' or 'org'.");
      }
      return JSON.stringify(
        repos.map((repo) => ({ name: repo.name, description: repo.description, url: repo.html_url }))
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error listing repositories", { error: errorMessage });
      throw new ToolExecutionError(
        `Failed to list repositories: ${errorMessage}`,
        "list_github_repositories",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "list_repositories",
    description: "Lists repositories for a given user or organization. Defaults to the 'ssdeanx' user.",
    schema: z.object({
      type: z.enum(["user", "org"]).describe("The type of account ('user' or 'org')."),
      username: z.string().optional().describe("The username or organization name. Defaults to 'ssdeanx'."),
    }),
  }
);

/**
 * Retrieves the content of a specific file from a GitHub repository.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.owner - The owner of the repository.
 * @param {string} input.repo - The name of the repository.
 * @param {string} input.path - The path to the file within the repository.
 * @param {string} [input.ref] - The name of the commit/branch/tag. Default: the repository’s default branch.
 * @returns {Promise<string>} The content of the file as a string.
 */
export const getFileContentTool = tool(
  async ({ owner = "ssdeanx", repo, path, ref }) => {
    const octokit = getOctokitClient();
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if (Array.isArray(data)) {
        return "Path is a directory, not a file.";
      }

      if ("content" in data && data.content) {
        return Buffer.from(data.content, "base64").toString("utf-8");
      } else {
        return "File content not found.";
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error getting file content", { owner, repo, path, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to get file content: ${errorMessage}`,
        "get_github_file_content",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "get_file_content",
    description: "Retrieves the content of a specific file from a GitHub repository. Defaults to the 'ssdeanx' owner.",
    schema: z.object({
      owner: z.string().optional().describe("The owner of the repository. Defaults to 'ssdeanx'."),
      repo: z.string().describe("The name of the repository."),
      path: z.string().describe("The path to the file within the repository."),
      ref: z.string().optional().describe("The name of the commit/branch/tag. Default: the repository’s default branch."),
    }),
  }
);

/**
 * Creates a new issue in a GitHub repository.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.owner - The owner of the repository.
 * @param {string} input.repo - The name of the repository.
 * @param {string} input.title - The title of the issue.
 * @param {string} [input.body] - The body content of the issue.
 * @returns {Promise<string>} A success message with the issue URL or an error message.
 */
export const createIssueTool = tool(
  async ({ owner = "ssdeanx", repo, title, body, labels, assignees }) => {
    const octokit = getOctokitClient();
    try {
      const { data } = await octokit.rest.issues.create({
        owner,
        repo,
        title,
        body,
        labels: labels,
        assignees: assignees
      });
      return `Issue created successfully: ${data.html_url}`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error creating issue", { owner, repo, title, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to create issue: ${errorMessage}`,
        "create_github_issue",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "create_github_issue",
    description: "Creates a new issue in a GitHub repository, optionally with labels and assignees. Defaults to the 'ssdeanx' owner.",
    schema: z.object({
      owner: z.string().optional().describe("The owner of the repository. Defaults to 'ssdeanx'."),
      repo: z.string().describe("The name of the repository."),
      title: z.string().describe("The title of the issue."),
      body: z.string().optional().describe("The body content of the issue."),
      labels: z.array(z.string()).optional().describe("An array of labels to add to the issue."),
      assignees: z.array(z.string()).optional().describe("An array of GitHub usernames to assign to the issue."),
    }),
  }
);

/**
 * Creates a new repository for the authenticated user.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.name - The name of the repository.
 * @param {string} [input.description] - A short description of the repository.
 * @param {boolean} [input.private=false] - Whether the repository is private.
 * @returns {Promise<string>} A success message with the repository URL or an error message.
 */
export const createRepositoryTool = tool(
  async ({ name, description, private: isPrivate = false }) => {
    const octokit = getOctokitClient();
    try {
      const { data } = await octokit.rest.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
      });
      return `Repository created successfully: ${data.html_url}`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error creating repository", { name, description, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to create repository: ${errorMessage}`,
        "create_github_repository",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "create_repository",
    description: "Creates a new repository for the authenticated user.",
    schema: z.object({
      name: z.string().describe("The name of the repository."),
      description: z.string().optional().describe("A short description of the repository."),
      private: z.boolean().optional().describe("Whether the repository is private."),
    }),
  }
);

/**
 * Deletes a repository.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.owner - The owner of the repository.
 * @param {string} input.repo - The name of the repository.
 * @returns {Promise<string>} A success message or an error message.
 */
export const deleteRepositoryTool = tool(
  async ({ owner = "ssdeanx", repo }) => {
    const octokit = getOctokitClient();
    try {
      await octokit.rest.repos.delete({
        owner,
        repo,
      });
      return `Repository ${owner}/${repo} deleted successfully.`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error deleting repository", { owner, repo, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to delete repository: ${errorMessage}`,
        "delete_github_repository",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "delete_repository",
    description: "Deletes a repository. Use with extreme caution! Defaults to the 'ssdeanx' owner.",
    schema: z.object({
      owner: z.string().optional().describe("The owner of the repository. Defaults to 'ssdeanx'."),
      repo: z.string().describe("The name of the repository."),
    }),
  }
);

/**
 * Creates a new pull request.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.owner - The owner of the repository.
 * @param {string} input.repo - The name of the repository.
 * @param {string} input.title - The title of the pull request.
 * @param {string} input.head - The name of the branch where your changes are implemented.
 * @param {string} input.base - The name of the branch you want to merge your changes into.
 * @param {string} [input.body] - The body of the pull request.
 * @returns {Promise<string>} A success message with the PR URL or an error message.
 */
export const createPullRequestTool = tool(
  async ({ owner = "ssdeanx", repo, title, head, base, body }) => {
    const octokit = getOctokitClient();
    try {
      const { data } = await octokit.rest.pulls.create({
        owner,
        repo,
        title,
        head,
        base,
        body,
      });
      return `Pull request created successfully: ${data.html_url}`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error creating pull request", { owner, repo, title, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to create pull request: ${errorMessage}`,
        "create_pull_request",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "create_pull_request",
    description: "Creates a new pull request. Defaults to the 'ssdeanx' owner.",
    schema: z.object({
      owner: z.string().optional().describe("The owner of the repository. Defaults to 'ssdeanx'."),
      repo: z.string().describe("The name of the repository."),
      title: z.string().describe("The title of the pull request."),
      head: z.string().describe("The name of the branch where your changes are implemented."),
      base: z.string().describe("The name of the branch you want to merge your changes into."),
      body: z.string().optional().describe("The body of the pull request."),
    }),
  }
);

/**
 * Merges a pull request.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.owner - The owner of the repository.
 * @param {string} input.repo - The name of the repository.
 * @param {number} input.pull_number - The number of the pull request to merge.
 * @returns {Promise<string>} A success message or an error message.
 */
export const mergePullRequestTool = tool(
  async ({ owner = "ssdeanx", repo, pull_number }) => {
    const octokit = getOctokitClient();
    try {
      const { data } = await octokit.rest.pulls.merge({
        owner,
        repo,
        pull_number,
      });
      return `Pull request ${pull_number} merged successfully: ${data.sha}`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error merging pull request", { owner, repo, pull_number, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to merge pull request: ${errorMessage}`,
        "merge_pull_request",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "merge_pull_request",
    description: "Merges a pull request. Defaults to the 'ssdeanx' owner.",
    schema: z.object({
      owner: z.string().optional().describe("The owner of the repository. Defaults to 'ssdeanx'."),
      repo: z.string().describe("The name of the repository."),
      pull_number: z.number().int().describe("The number of the pull request to merge."),
    }),
  }
);

/**
 * Lists pull requests for a repository.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.owner - The owner of the repository.
 * @param {string} input.repo - The name of the repository.
 * @param {string} [input.state='open'] - The state of the pull requests ('open', 'closed', 'all').
 * @returns {Promise<string>} A JSON string of pull request details.
 */
export const listPullRequestsTool = tool(
  async ({ owner = "ssdeanx", repo, state = 'open' }) => {
    const octokit = getOctokitClient();
    try {
      const { data } = await octokit.rest.pulls.list({
        owner,
        repo,
        state,
      });
      return JSON.stringify(
        data.map((pr) => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          url: pr.html_url,
          head: pr.head.ref,
          base: pr.base.ref,
        }))
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error listing pull requests", { owner, repo, state, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to list pull requests: ${errorMessage}`,
        "list_pull_requests",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "list_pull_requests",
    description: "Lists pull requests for a repository. Defaults to the 'ssdeanx' owner.",
    schema: z.object({
      owner: z.string().optional().describe("The owner of the repository. Defaults to 'ssdeanx'."),
      repo: z.string().describe("The name of the repository."),
      state: z.enum(['open', 'closed', 'all']).optional().describe("The state of the pull requests ('open', 'closed', 'all')."),
    }),
  }
);

/**
 * Adds a comment to an issue.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.owner - The owner of the repository.
 * @param {string} input.repo - The name of the repository.
 * @param {number} input.issue_number - The number of the issue.
 * @param {string} input.body - The body of the comment.
 * @returns {Promise<string>} A success message with the comment URL or an error message.
 */
export const addIssueCommentTool = tool(
  async ({ owner = "ssdeanx", repo, issue_number, body }) => {
    const octokit = getOctokitClient();
    try {
      const { data } = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number,
        body,
      });
      return `Comment added to issue ${issue_number}: ${data.html_url}`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error adding issue comment", { owner, repo, issue_number, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to add issue comment: ${errorMessage}`,
        "add_issue_comment",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "add_issue_comment",
    description: "Adds a comment to an issue. Defaults to the 'ssdeanx' owner.",
    schema: z.object({
      owner: z.string().optional().describe("The owner of the repository. Defaults to 'ssdeanx'."),
      repo: z.string().describe("The name of the repository."),
      issue_number: z.number().int().describe("The number of the issue."),
      body: z.string().describe("The body of the comment."),
    }),
  }
);

/**
 * Lists issues for a repository.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.owner - The owner of the repository.
 * @param {string} input.repo - The name of the repository.
 * @param {string} [input.state='open'] - The state of the issues ('open', 'closed', ''all'').
 * @returns {Promise<string>} A JSON string of issue details.
 */
export const listIssuesTool = tool(
  async ({ owner = "ssdeanx", repo, state = 'open' }) => {
    const octokit = getOctokitClient();
    try {
      const { data } = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state,
      });
      return JSON.stringify(
        data.map((issue) => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          url: issue.html_url,
        }))
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error listing issues", { owner, repo, state, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to list issues: ${errorMessage}`,
        "list_issues",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "list_issues",
    description: "Lists issues for a repository. Defaults to the 'ssdeanx' owner.",
    schema: z.object({
      owner: z.string().optional().describe("The owner of the repository. Defaults to 'ssdeanx'."),
      repo: z.string().describe("The name of the repository."),
      state: z.enum(['open', 'closed', 'all']).optional().describe("The state of the issues ('open', 'closed', 'all')."),
    }),
  }
);

/**
 * Updates an existing issue.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.owner - The owner of the repository.
 * @param {string} input.repo - The name of the repository.
 * @param {number} input.issue_number - The number of the issue to update.
 * @param {string} [input.title] - The new title of the issue.
 * @param {string} [input.body] - The new body content of the issue.
 * @param {string} [input.state] - The new state of the issue ('open' or 'closed').
 * @returns {Promise<string>} A success message with the issue URL or an error message.
 */
export const updateIssueTool = tool(
  async ({ owner = "ssdeanx", repo, issue_number, title, body, state }) => {
    const octokit = getOctokitClient();
    try {
      const { data } = await octokit.rest.issues.update({
        owner,
        repo,
        issue_number,
        title,
        body,
        state,
      });
      return `Issue ${issue_number} updated successfully: ${data.html_url}`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error updating issue", { owner, repo, issue_number, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to update issue: ${errorMessage}`,
        "update_issue",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "update_issue",
    description: "Updates an existing issue. Defaults to the 'ssdeanx' owner.",
    schema: z.object({
      owner: z.string().optional().describe("The owner of the repository. Defaults to 'ssdeanx'."),
      repo: z.string().describe("The name of the repository."),
      issue_number: z.number().int().describe("The number of the issue to update."),
      title: z.string().optional().describe("The new title of the issue."),
      body: z.string().optional().describe("The new body content of the issue."),
      state: z.enum(['open', 'closed']).optional().describe("The new state of the issue ('open' or 'closed')."),
    }),
  }
);

/**
 * Lists commits for a repository or branch.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.owner - The owner of the repository.
 * @param {string} input.repo - The name of the repository.
 * @param {string} [input.sha] - SHA or name of the branch to list commits from.
 * @returns {Promise<string>} A JSON string of commit details.
 */
export const listCommitsTool = tool(
  async ({ owner = "ssdeanx", repo, sha }) => {
    const octokit = getOctokitClient();
    try {
      const { data } = await octokit.rest.repos.listCommits({
        owner,
        repo,
        sha,
      });
      return JSON.stringify(
        data.map((commit) => ({
          sha: commit.sha,
          author: commit.commit.author?.name,
          message: commit.commit.message,
          date: commit.commit.author?.date,
        }))
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error listing commits", { owner, repo, sha, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to list commits: ${errorMessage}`,
        "list_commits",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "list_commits",
    description: "Lists commits for a repository or branch. Defaults to the 'ssdeanx' owner.",
    schema: z.object({
      owner: z.string().optional().describe("The owner of the repository. Defaults to 'ssdeanx'."),
      repo: z.string().describe("The name of the repository."),
      sha: z.string().optional().describe("SHA or name of the branch to list commits from."),
    }),
  }
);

/**
 * Gets the file tree of a repository.
 * @function
 * @param {object} input - The input object.
 * @param {string} input.owner - The owner of the repository.
 * @param {string} input.repo - The name of the repository.
 * @param {string} [input.tree_sha] - The SHA of the tree to get. Default: the repository’s default branch tree.
 * @param {boolean} [input.recursive=false] - Whether to return a recursive tree.
 * @returns {Promise<string>} A JSON string of the file tree.
 */
export const getFileTreeTool = tool(
  async ({ owner = "ssdeanx", repo, branch, recursive = false }) => {
    const octokit = getOctokitClient();
    try {
      // If no branch is specified, get the default branch name first.
      const branchName = branch || (await octokit.rest.repos.get({ owner, repo })).data.default_branch;
      
      // Then get the commit SHA for the head of that branch.
      const { data: branchData } = await octokit.rest.repos.getBranch({
        owner,
        repo,
        branch: branchName,
      });
      const tree_sha = branchData.commit.sha;

      const { data } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha,
        recursive: recursive ? "true" : "false",
      });
      return JSON.stringify(
        data.tree.map((item) => ({
          path: item.path,
          type: item.type,
          size: item.size,
        }))
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Error getting file tree", { owner, repo, branch, error: errorMessage });
      throw new ToolExecutionError(
        `Failed to get file tree: ${errorMessage}`,
        "get_file_tree",
        error instanceof Error ? error : undefined
      );
    }
  },
  {
    name: "get_file_tree",
    description: "Gets the file tree for a specific branch in a repository. Defaults to the 'ssdeanx' owner.",
    schema: z.object({
      owner: z.string().optional().describe("The owner of the repository. Defaults to 'ssdeanx'."),
      repo: z.string().describe("The name of the repository."),
      branch: z.string().optional().describe("The name of the branch. If not provided, the repository's default branch is used."),
      recursive: z.boolean().optional().describe("Whether to return a recursive tree. Defaults to false."),
    }),
  }
);
