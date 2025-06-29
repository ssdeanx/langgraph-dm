---
trigger: manual
---

# Graph Rules

These rules govern the construction and management of graph workflows within the LangGraph project. The purpose is to ensure that graphs are structured correctly, maintain logical flow, and adhere to best practices for conversational agent interactions.

## Rule 1: Mandatory Entry Node
- **Description**: All graph workflows must include an entry node to process initial user input. This node is responsible for initializing the conversation state and ensuring that user input is captured correctly.
- **Rationale**: The entry node sets the foundation for the conversation flow, as seen in 'src/agent/graph.ts' where the 'entryNode' function processes the initial user input into the state.
- **Enforcement**: During graph design or updates, verify that an 'entry' node is defined and connected to the START point.

## Rule 2: Conditional Routing Logic
- **Description**: Graphs must implement conditional routing logic to determine the next node based on the state or supervisor decisions. This ensures dynamic conversation flow.
- **Rationale**: In 'src/agent/graph.ts', the 'routeMessages' function uses state.next to decide whether to proceed to a chat node or end the conversation, demonstrating the importance of conditional edges.
- **Enforcement**: Ensure that conditional edges are defined for supervisor nodes to route to appropriate nodes or END.

## Rule 3: Node Error Handling
- **Description**: Each node in the graph must include error handling to manage model invocation failures or unexpected issues during processing.
- **Rationale**: Error handling is critical for robustness, as shown in 'src/agent/graph.ts' where 'safeModelInvoke' and 'handleGlobalError' are used to catch and manage errors during model calls.
- **Enforcement**: Include try-catch blocks or error handling mechanisms in node implementations.

## Rule 4: Logging for Node Transitions
- **Description**: Log transitions between nodes to track the flow of conversation and aid in debugging graph execution.
- **Rationale**: Logging is implemented in 'src/agent/graph.ts' for chat and entry nodes to monitor processing, which is essential for understanding graph behavior.
- **Enforcement**: Add logging statements at the start and end of each node's processing logic.

## Rule 5: Termination Conditions
- **Description**: Define clear termination conditions within the graph to prevent infinite loops and ensure conversations can conclude appropriately.
- **Rationale**: The 'routeMessages' function in 'src/agent/graph.ts' checks for 'FINISH' or 'END' to route to END, providing a clear exit path.
- **Enforcement**: Verify that routing logic includes checks for termination signals or states.

These rules are designed to maintain the integrity and efficiency of graph-based workflows in LangGraph, ensuring that conversational agents operate smoothly and reliably. Review these during graph design and updates to ensure compliance.
