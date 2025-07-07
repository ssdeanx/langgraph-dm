---
glob: "**/*.ts"
description: "Langgraphjs Architecture"
---
# LangGraph.js

## Overview

LangGraph.js is a powerful library for building stateful, multi-actor AI applications with Large Language Models (LLMs). It allows you to model complex agent workflows as graphs, where nodes represent individual steps or agents and edges define the flow of information and control.

## Core Concepts

* **StateGraph:** The primary class for defining graph-based workflows. It manages the shared state that is passed between nodes.
* **Nodes:** Functions or runnable components that perform specific tasks and update the graph's state.
* **Edges:** Define transitions between nodes, which can be unconditional or conditional based on the current state.
* **State:** A shared data structure (`AgentState`) that represents the current context of the application, updated by nodes and passed along edges.
* **Checkpoints:** Snapshots of the graph's state saved at various points, enabling persistence, debugging, and human-in-the-loop interactions.
* **Subgraphs:** The ability to embed one graph as a node within another, promoting modularity and hierarchical design.
* **Command Primitive:** A mechanism for combining state updates and dynamic control flow within a single node.
* **Streaming:** First-class support for streaming intermediate results and LLM tokens, enhancing user experience.
* **Human-in-the-Loop (HIL):** Features like `interrupt()` and breakpoints allow human intervention for approvals, state editing, and dynamic input.

## Key Features

* **Controllability:** Fine-grained control over the application's flow through explicit node and edge definitions.
* **Persistence:** Built-in mechanisms for saving and restoring graph state, supporting long-running conversations and fault tolerance.
* **Modularity:** Encourages breaking down complex problems into smaller, reusable components (nodes and subgraphs).
* **Tool Integration:** Seamlessly integrates with LangChain tools, allowing agents to interact with external systems.
* **Observability:** Integrates with LangSmith for tracing, debugging, and monitoring of LLM applications.

## Development Practices

* **TypeScript:** Strongly typed development for improved code quality and maintainability.
* **Testing:** Encourages comprehensive unit and integration testing of nodes, agents, and overall graph workflows.
* **Error Handling:** Robust error handling for tool calls and model invocations.

## Deployment

LangGraph.js applications can be deployed in various ways, including self-hosted solutions or through the LangGraph Platform (Cloud, BYOC). The LangGraph CLI and SDK provide tools for building, running, and interacting with deployed applications.

## Relevant Files in this Project

* `src/agent/graph.ts`: Defines the main `StateGraph` and its nodes/edges, orchestrating the agent workflow.
* `src/agent/state.ts`: Defines the `AgentState` interface and `AgentAnnotation` for managing the application's state.
* `src/agent/supervisor.ts`: Implements the supervisor agent for routing between specialized agents.
* `src/agent/react_agent.ts`: Implements the ReAct (Reasoning and Acting) agent.
* `src/memory/`: Contains implementations for memory management, including MongoDB integration for checkpoints and vector stores.
* `src/tools/`: Houses various tools used by the agents (e.g., `calculator`, `document_processing`, `exa`, `github`, `local_git`, `tavily`, `web_scraping`).
* `package.json`: Lists LangGraph and LangChain related dependencies.
