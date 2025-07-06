---
glob: "**/*.ts"
description: "Langgraph Agents Guidelines"
---
# Agents Guidelines

## Agent Responsibilities

* **Supervisor:** Acts as the central orchestrator (`src/agent/supervisor.ts`), directing the flow between specialized agents based on the current state and user intent. It should be robust in decision-making and error recovery.
* **Specialized Agents:** Each agent (e.g., `reactAgent`, `research_agent`, `documentation_agent`) should have a clearly defined purpose and set of tools. They should focus on their specific domain, update the `AgentState` with their results, and return control to the supervisor upon completion or if an unhandled error occurs.
* **Chat Agent (`chatNode`):** Provides general conversational responses and acts as a fallback for queries not requiring specialized agent intervention.
* **Tool-Calling Agent (ReAct):** Uses an LLM to decide the control flow, selecting and using various tools, retaining memory, and planning multi-step actions.

## Agent Development Principles

* **Modularity:** Each agent should be a self-contained unit, with its own logic and potentially its own set of tools. This facilitates reusability and easier debugging.
* **State Management:** Agents must correctly interact with and update the `AgentState` to ensure continuity and accurate context passing throughout the graph. Use `Annotation` and reducers for precise state modifications.
* **Tool Integration:** Agents should seamlessly integrate and utilize the available tools (`src/tools/*`) to perform their tasks. Ensure proper input validation and error handling when calling tools. Consider `ToolNode` for simplified tool execution.
* **Error Handling:** Implement agent-specific error handling to gracefully manage failures and report back to the supervisor or user.
* **Logging:** Use the `winston` logger (`src/config/logger.ts`) for tracing agent execution, decisions, and tool calls.
* **Control Flow:** Agents can return `Command` objects to combine state updates and dynamic routing (e.g., handoffs between agents).
* **Human-in-the-Loop:** Design agents to support human intervention for approvals, state editing, or input collection using LangGraph's `interrupt()` function.

## Agent Architectures

* **Router:** LLM selects a single path from options.
* **Tool-Calling Agent (ReAct):** Combines tool usage, memory, and planning for multi-step decision-making.
* **Multi-Agent Systems:** Break down complex problems into smaller, independent agents collaborating via networks, supervisors, or hierarchical structures. Handoffs are crucial for communication.

## Agent Type Definitions (`src/agent/state.ts`)

* The `AgentType` enum defines the various types of agents supported in the system, enabling clear categorization and routing within the `StateGraph`.
* When adding new agent types, ensure they are properly defined in `AgentType` and integrated into the `StateGraph` in `src/agent/graph.ts`.
