# CHANGELOG

> **Format:**
>
> - Uses Keep a Changelog principles, with AI/agent-specific tags and context.
> - Each entry includes: version, date, highlights, agentic/AI features, state/memory changes, and solo dev notes.
> - Semantic versioning (e.g., 0.1.0 for first public dev release).

---

## [0.3.0] - 2025-07-07

### [Added]

- **Document Processing Tools:**
  - `convertJsonToCsvTool`: Converts JSON (array of objects) to CSV.
  - `parseYamlTool`: Parses YAML content from string or file to JSON.
  - `convertHtmlToMarkdownTool`: Converts HTML content to clean Markdown.
- **Calculator Tools:** All calculator tools (`evaluateExpressionTool`, `addNumbersTool`, `subtractNumbersTool`, `multiplyNumbersTool`, `divideNumbersTool`, `powerTool`, `sqrtTool`, `sinTool`, `cosTool`, `tanTool`, `logTool`, `absTool`, `roundTool`, `floorTool`, `ceilTool`) integrated into the `react` agent.
- **Data Agent State:** Added `data_summary` and `data_output` fields to `AgentState` for dedicated data agent results.

### [Changed]

- **`document_processing.ts`:**
  - Refactored `validateFilePath` and `ensureDirectoryExists` for improved security and cross-platform compatibility using Node.js `path` module.
  - `convertTextToMarkdownTool`: Clarified description; no longer uses `marked` for conversion but saves pre-formatted Markdown.
  - `convertTextToCsvTool` removed, replaced by `convertJsonToCsvTool`.
  - `convertMarkdownToHtmlTool` removed, replaced by `convertHtmlToMarkdownTool`.
- **`local_git.ts`:**
  - Converted all filesystem operations to use promise-based `fsPromises`.
  - `listInMemoryFilesTool`: Refined recursive listing logic and schema.
  - `diffInMemoryFilesTool`: Replaced with a robust implementation using `diff` library for standard patch output.
- **`github.ts`:**
  - `getOctokitClient`: Hardened with explicit token validation and `ToolExecutionError` handling.
  - `getFileTreeTool`: Optimized to efficiently retrieve file trees by directly using branch name and commit SHA.
  - All GitHub tools: `owner` parameter now optional, defaulting to `ssdeanx`.
- **`web_scraping.ts`:**
  - `extractHtmlFromUrlTool`: Standardized error handling to use `logger` and `ToolExecutionError`.
  - `crawlWebsiteTool`: Removed `maxDepth` parameter (relying on `maxRequests` for crawl limits) and improved error logging in `failedRequestHandler`.
- **`data_agent.ts`:**
  - Changed `dataAgentTools` array typing to `any[]` for compatibility with `DynamicStructuredTool`.
  - `dataAgentNode`: Now stores results in `data_output` and `data_summary` state fields.
  - Implemented Zod schema validation for tool arguments before invocation, ensuring runtime type safety.
- **`supervisor.ts`:**
  - Prompt updated to accurately describe `data` agent capabilities, including HTML-to-Markdown conversion and web crawling.
  - Default GitHub owner (`ssdeanx`) mentioned in the prompt's rules.
- **`react_agent.ts`:**
  - Removed problematic `../tools/index.js` import.
  - Explicitly imports and consolidates all relevant tools (calculator, document processing, local git, github, web scraping) into `reactAgentTools`.
- **`graph.ts`:**
  - `routeMessages` function fixed to correctly map `data` agent type to `data_agent` node.
  - Conditional edges from supervisor now correctly map agent types to specific node names.

### [Fixed]

- Resolved all persistent TypeScript errors related to tool schema incompatibility across `data_agent.ts`, `local_git.ts`, and `react_agent.ts`.
- Fixed a syntax error in `graph.ts` (`routeMessages` function duplicate code).
- Corrected logging parameter in `github.ts` `getFileTreeTool`.

### [AI/Agent]

- **Data Agent:** Significantly enhanced with new tools for diverse data processing, web content handling, and comprehensive Git/GitHub operations, all with robust runtime validation.
- **React Agent:** Now a more versatile general-purpose agent with access to a wide array of tools, including full calculator functionality.
- **Supervisor:** Improved routing intelligence due to updated prompt reflecting granular agent capabilities, ensuring more accurate task delegation.
- **Overall System Robustness:** Enhanced state management and inter-agent communication, making the entire multi-agent system more stable and reliable.

---

## [0.2.0] - 2025-07-06

### [Fixed]

- Resolved `UnreachableNodeError` by correctly wiring the `react` and `research` agents into the main graph.
- Addressed a state mismatch by unifying the agent state (`AgentState` and `AgentAnnotation`) to include research-related fields, allowing all agents to operate on a single, consistent state schema.
- Corrected a routing inconsistency where the supervisor would route to `"research"` instead of the correct starting node, `"research_collect"`.

### [Added]

- Fully integrated the multi-step research agent (`research_collect` -> `research_summarize` -> `research_report`) into the supervisor's routing logic.

### [AI/Agent]

- The supervisor can now correctly delegate tasks to the research agent, which will execute its multi-step process and return the result to the supervisor.

---

## [0.1.0] – 2025-06-27

### 🚀 Initial Release

#### Highlights

- **LangGraph.js** agent framework with modular, extensible state.
- **Google Gemini (Generative AI)** integration for advanced LLM responses.
- **Stateful agent**: tracks messages, user profile, conversation ID, tool results, retrieved docs, step, and errors.
- **Solo Dev**: Designed for rapid solo iteration, with clear separation of agent logic and state.

#### Agentic/AI Features

- Multi-turn conversation memory.
- Error tracking and step counter for workflow transparency.
- Hooks for tool use and document retrieval (RAG-ready).
- User profile and conversation context fields for future personalization.

#### State/Memory

- StateAnnotation extended for: `userProfile`, `conversationId`, `retrievedDocs`, `step`, `toolResults`, `errors`.

#### Dev Notes

- Follows 2025 best practices: modular, testable, and ready for multi-agent or RAG expansion.
- Next: Add real tool integrations, retrieval, and advanced routing.

---

**Tip:**
For each future release, add sections for: `[Added]`, `[Changed]`, `[Fixed]`, `[Deprecated]`, `[Removed]`, `[Security]`, and `[AI/Agent]` (for new agentic capabilities or memory/state changes).
