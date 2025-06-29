import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Octokit } from "octokit";

/**
 * Initializes Octokit with a GitHub Personal Access Token (PAT).
 * The PAT should be stored securely in environment variables.
 * @returns {Octokit} An authenticated Octokit instance.
 */
function getOctokitClient(): Octokit {
  const githubPat = process.env.GITHUB_PAT;
  if (!githubPat) {
    throw new Error("GITHUB_PAT environment variable is not set.");
  }
  return new Octokit({
    auth: githubPat,
  });
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
  async ({ type, username }) => {
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
    } catch (error: any) {
      console.error("Error listing repositories:", error);
      return `Error listing repositories: ${error.message}`;
    }
  },
  {
    name: "list_repositories",
    description: "Lists repositories for a given user or organization.",
    schema: z.object({
      type: z.enum(["user", "org"]).describe("The type of account ('user' or 'org')."),
      username: z.string().describe("The username or organization name."),
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
  async ({ owner, repo, path, ref }) => {
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
    } catch (error: any) {
      console.error("Error getting file content:", error);
      return `Error getting file content: ${error.message}`;
    }
  },
  {
    name: "get_file_content",
    description: "Retrieves the content of a specific file from a GitHub repository.",
    schema: z.object({
      owner: z.string().describe("The owner of the repository."),
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
  async ({ owner, repo, title, body }) => {
    const octokit = getOctokitClient();
    try {
      const { data } = await octokit.rest.issues.create({
        owner,
        repo,
        title,
        body,
      });
      return `Issue created successfully: ${data.html_url}`;
    } catch (error: any) {
      console.error("Error creating issue:", error);
      return `Error creating issue: ${error.message}`;
    }
  },
  {
    name: "create_github_issue",
    description: "Creates a new issue in a GitHub repository.",
    schema: z.object({
      owner: z.string().describe("The owner of the repository."),
      repo: z.string().describe("The name of the repository."),
      title: z.string().describe("The title of the issue."),
      body: z.string().optional().describe("The body content of the issue."),
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
    } catch (error: any) {
      console.error("Error creating repository:", error);
      return `Error creating repository: ${error.message}`;
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
  async ({ owner, repo }) => {
    const octokit = getOctokitClient();
    try {
      await octokit.rest.repos.delete({
        owner,
        repo,
      });
      return `Repository ${owner}/${repo} deleted successfully.`;
    } catch (error: any) {
      console.error("Error deleting repository:", error);
      return `Error deleting repository: ${error.message}`;
    }
  },
  {
    name: "delete_repository",
    description: "Deletes a repository. Use with extreme caution!",
    schema: z.object({
      owner: z.string().describe("The owner of the repository."),
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
  async ({ owner, repo, title, head, base, body }) => {
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
    } catch (error: any) {
      console.error("Error creating pull request:", error);
      return `Error creating pull request: ${error.message}`;
    }
  },
  {
    name: "create_pull_request",
    description: "Creates a new pull request.",
    schema: z.object({
      owner: z.string().describe("The owner of the repository."),
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
  async ({ owner, repo, pull_number }) => {
    const octokit = getOctokitClient();
    try {
      const { data } = await octokit.rest.pulls.merge({
        owner,
        repo,
        pull_number,
      });
      return `Pull request ${pull_number} merged successfully: ${data.sha}`;
    } catch (error: any) {
      console.error("Error merging pull request:", error);
      return `Error merging pull request: ${error.message}`;
    }
  },
  {
    name: "merge_pull_request",
    description: "Merges a pull request.",
    schema: z.object({
      owner: z.string().describe("The owner of the repository."),
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
  async ({ owner, repo, state = 'open' }) => {
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
    } catch (error: any) {
      console.error("Error listing pull requests:", error);
      return `Error listing pull requests: ${error.message}`;
    }
  },
  {
    name: "list_pull_requests",
    description: "Lists pull requests for a repository.",
    schema: z.object({
      owner: z.string().describe("The owner of the repository."),
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
  async ({ owner, repo, issue_number, body }) => {
    const octokit = getOctokitClient();
    try {
      const { data } = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number,
        body,
      });
      return `Comment added to issue ${issue_number}: ${data.html_url}`;
    } catch (error: any) {
      console.error("Error adding issue comment:", error);
      return `Error adding issue comment: ${error.message}`;
    }
  },
  {
    name: "add_issue_comment",
    description: "Adds a comment to an issue.",
    schema: z.object({
      owner: z.string().describe("The owner of the repository."),
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
  async ({ owner, repo, state = 'open' }) => {
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
    } catch (error: any) {
      console.error("Error listing issues:", error);
      return `Error listing issues: ${error.message}`;
    }
  },
  {
    name: "list_issues",
    description: "Lists issues for a repository.",
    schema: z.object({
      owner: z.string().describe("The owner of the repository."),
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
  async ({ owner, repo, issue_number, title, body, state }) => {
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
    } catch (error: any) {
      console.error("Error updating issue:", error);
      return `Error updating issue: ${error.message}`;
    }
  },
  {
    name: "update_issue",
    description: "Updates an existing issue.",
    schema: z.object({
      owner: z.string().describe("The owner of the repository."),
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
  async ({ owner, repo, sha }) => {
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
    } catch (error: any) {
      console.error("Error listing commits:", error);
      return `Error listing commits: ${error.message}`;
    }
  },
  {
    name: "list_commits",
    description: "Lists commits for a repository or branch.",
    schema: z.object({
      owner: z.string().describe("The owner of the repository."),
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
  async ({ owner, repo, tree_sha, recursive = false }) => {
    const octokit = getOctokitClient();
    try {
      const { data } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: tree_sha || (await octokit.rest.repos.get({ owner, repo })).data.default_branch,
        recursive: recursive ? "true" : "false",
      });
      return JSON.stringify(
        data.tree.map((item) => ({
          path: item.path,
          type: item.type,
          size: item.size,
        }))
      );
    } catch (error: any) {
      console.error("Error getting file tree:", error);
      return `Error getting file tree: ${error.message}`;
    }
  },
  {
    name: "get_file_tree",
    description: "Gets the file tree of a repository.",
    schema: z.object({
      owner: z.string().describe("The owner of the repository."),
      repo: z.string().describe("The name of the repository."),
      tree_sha: z.string().optional().describe("The SHA of the tree to get. Default: the repository’s default branch tree."),
      recursive: z.boolean().optional().describe("Whether to return a recursive tree."),
    }),
  }
);