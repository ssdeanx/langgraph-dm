Breakpoints

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# Breakpoints¶

Breakpoints pause graph execution at specific points and enable stepping through execution step by step. Breakpoints are powered by LangGraph's persistence layer, which saves the state after each graph step. Breakpoints can also be used to enable human-in-the-loop workflows, though we recommend using the interrupt function for this purpose.

## Requirements¶

To use breakpoints, you will need to:

1. Specify a checkpointer to save the graph state after each step.
2. Set breakpoints to specify where execution should pause.
3. Run the graph with a thread ID to pause execution at the breakpoint.
4. Resume execution using invoke/stream (see The Command primitive).

## Setting breakpoints¶

There are two places where you can set breakpoints:

1. Before or after a node executes by setting breakpoints at compile time or run time. We call these static breakpoints.
2. Inside a node using the NodeInterrupt error.

### Static breakpoints¶

Static breakpoints are triggered either before or after a node executes. You can set static breakpoints by specifying interruptBefore and interruptAfter at "compile" time or run time.

```
const graph = graphBuilder.compile({ interruptBefore: ["nodeA"], interruptAfter: ["nodeB", "nodeC"], checkpointer: ..., // Specify a checkpointer }); const threadConfig = { configurable: { thread_id: "someThread" } }; // Run the graph until the breakpoint await graph.invoke(inputs, threadConfig); // Optionally update the graph state based on user input await graph.updateState(update, threadConfig); // Resume the graph await graph.invoke(null, threadConfig);
```

```
await graph.invoke( inputs, { configurable: { thread_id: "someThread" }, interruptBefore: ["nodeA"], interruptAfter: ["nodeB", "nodeC"] } ); const threadConfig = { configurable: { thread_id: "someThread" } }; // Run the graph until the breakpoint await graph.invoke(inputs, threadConfig); // Optionally update the graph state based on user input await graph.updateState(update, threadConfig); // Resume the graph await graph.invoke(null, threadConfig);
```

Note

You cannot set static breakpoints at runtime for sub-graphs.

If you have a sub-graph, you must set the breakpoints at compilation time.

Static breakpoints can be especially useful for debugging if you want to step through the graph execution one node at a time or if you want to pause the graph execution at specific nodes.

### NodeInterrupt error¶

We recommend that you use the interrupt function instead of the NodeInterrupt error if you're trying to implement human-in-the-loop workflows. The interrupt function is easier to use and more flexible.

## Additional Resources 📚¶

* Conceptual Guide: Persistence: Read the persistence guide for more context about persistence.
* Conceptual Guide: Human-in-the-loop: Read the human-in-the-loop guide for more context on integrating human feedback into LangGraph applications using breakpoints.
* How to View and Update Past Graph State: Step-by-step instructions for working with graph state that demonstrate the replay and fork actions.

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders