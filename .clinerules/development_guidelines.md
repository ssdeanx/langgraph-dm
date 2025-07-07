---
glob: "**/*.ts"
description: "Langgraph Development Guidelines"
---

# Development Guidelines

## Coding Standards

* **Language:** TypeScript. Adhere to strict type-checking and leverage TypeScript's features for robust code.
* **Formatting:** Use Prettier (`prettier`) for consistent code formatting across the project. Ensure consistent indentation (likely 2 spaces), line endings, and brace style as configured in `eslint.config.ts`.
* **Linting:** Follow ESLint (`eslint`) rules defined in `eslint.config.ts`. Address all linting warnings and errors before committing code. Use `npm run lint` and `npm run format:check`.
* **Naming Conventions:** Adhere to conventional naming (camelCase for variables/functions, PascalCase for classes/interfaces) as enforced by ESLint.
* **Modularity:** Keep functions, modules, and especially agent nodes, small and focused on a single responsibility. This promotes reusability and easier debugging.

## Best Practices

* **Error Handling:** Implement robust error handling, particularly for external tool calls and API interactions. Utilize custom error classes (e.g., `ToolExecutionError`, `ModelInvocationError`) and centralized error handling (e.g., `handleGlobalError` in `src/config/errors.ts`).
* **Logging:** Utilize the `winston` logger (`src/config/logger.ts`) for consistent and informative logging across the application. Use appropriate log levels (`debug`, `info`, `error`) for different environments.
* **Asynchronous Operations:** Use `async/await` for all asynchronous operations to maintain readability and manage control flow effectively.
* **Configuration Management:** Manage sensitive information and API keys using environment variables (e.g., `MONGODB_ATLAS_URI`, `GOOGLE_API_KEY`, `EXA_API_KEY`, `GITHUB_TOKEN`) via `.env` files for local development. Ensure proper environment variable setup (e.g., `process.env[name]`).
* **Tool Usage:** Ensure proper schema validation for tool inputs using `zod`. Design tools to be idempotent where possible.
* **Graph Design:** Follow LangGraph's principles: nodes do the work, edges define the flow. Use `StateGraph` for complex state management.
* **State Management:** Pay close attention to how state is passed and modified between nodes, leveraging `Annotation` and reducer functions for clear, predictable updates.
* **Dependency Management:** Manage dependencies using `npm` and ensure `@langchain/core` is resolved to a single version to prevent conflicts.

## Tooling and Environment

* **IDE:** VS Code is the recommended development environment.
* **Package Manager:** npm.
* **Testing Framework:** Jest (`jest`) for unit and integration tests.
* **Build System:** TypeScript compiler (`tsc`) for transpilation (`npm run build`).
* **Version Control:** Git. Follow a clear branching strategy (e.g., `main` for stable code, feature branches for new development).
* **LangSmith:** Integrate LangSmith for best-in-class observability, debugging, testing, and monitoring of LLM applications. Set `LANGSMITH_API_KEY`, `LANGCHAIN_TRACING_V2`, and `LANGCHAIN_CALLBACKS_BACKGROUND` environment variables.

## Collaboration and Workflow

* **Version Control:** Utilize Git for all code changes. Adhere to a branching model that supports collaborative development and code reviews.
* **Code Reviews:** All significant code changes must undergo a thorough code review process to ensure quality, adherence to standards, and identification of potential issues.
* **Task Management:** Consider using a `cline_todo.md` file (as suggested in `.clinerules` best practices) to track tasks and subtasks within the project, ensuring clear summaries, timestamps, and status updates.

## Testing Philosophy

* **Unit Tests:** Write comprehensive unit tests for individual functions, modules, and especially for agent logic and tool implementations.
* **Integration Tests:** Develop integration tests to verify the interactions between different agents and external services within the LangGraph workflow.
* **Test Commands:** Use `npm run test` for unit tests, `npm run test:int` for integration tests, and `npm run test:all` for running all tests and linting checks.
* **Test-Driven Development (TDD):** Encourage a TDD approach where tests are written before the corresponding code to guide development and ensure testability.
