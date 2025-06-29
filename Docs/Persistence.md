Persistence

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# Persistence¶

LangGraph has a built-in persistence layer, implemented through checkpointers. When you compile graph with a checkpointer, the checkpointer saves a checkpoint of the graph state at every super-step. Those checkpoints are saved to a thread, which can be accessed after graph execution. Because threads allow access to graph's state after execution, several powerful capabilities including human-in-the-loop, memory, time travel, and fault-tolerance are all possible. See this how-to guide for an end-to-end example of how to add and use checkpointers with your graph. Below, we'll discuss each of these concepts in more detail.

## Threads¶

A thread is a unique ID or thread identifier assigned to each checkpoint saved by a checkpointer. When invoking graph with a checkpointer, you must specify a thread\_id as part of the configurable portion of the config:

```
{"configurable": {"thread_id": "1"}}
```

## Checkpoints¶

Checkpoint is a snapshot of the graph state saved at each super-step and is represented by StateSnapshot object with the following key properties:

* config: Config associated with this checkpoint.
* metadata: Metadata associated with this checkpoint.
* values: Values of the state channels at this point in time.
* next A tuple of the node names to execute next in the graph.
* tasks: A tuple of PregelTask objects that contain information about next tasks to be executed. If the step was previously attempted, it will include error information. If a graph was interrupted dynamically from within a node, tasks will contain additional data associated with interrupts.

Let's see what checkpoints are saved when a simple graph is invoked as follows:

```
import { StateGraph, START, END, MemorySaver, Annotation } from "@langchain/langgraph"; const GraphAnnotation = Annotation.Root({ foo: Annotation<string> bar: Annotation<string[]>({ reducer: (a, b) => [...a, ...b], default: () => [], }) }); function nodeA(state: typeof GraphAnnotation.State) { return { foo: "a", bar: ["a"] }; } function nodeB(state: typeof GraphAnnotation.State) { return { foo: "b", bar: ["b"] }; } const workflow = new StateGraph(GraphAnnotation); .addNode("nodeA", nodeA) .addNode("nodeB", nodeB) .addEdge(START, "nodeA") .addEdge("nodeA", "nodeB") .addEdge("nodeB", END); const checkpointer = new MemorySaver(); const graph = workflow.compile({ checkpointer }); const config = { configurable: { thread_id: "1" } }; await graph.invoke({ foo: "" }, config);
```

After we run the graph, we expect to see exactly 4 checkpoints:

* empty checkpoint with START as the next node to be executed
* checkpoint with the user input {foo: '', bar: []} and nodeA as the next node to be executed
* checkpoint with the outputs of nodeA {foo: 'a', bar: ['a']} and nodeB as the next node to be executed
* checkpoint with the outputs of nodeB {foo: 'b', bar: ['a', 'b']} and no next nodes to be executed

Note that we bar channel values contain outputs from both nodes as we have a reducer for bar channel.

### Get state¶

When interacting with the saved graph state, you must specify a thread identifier. You can view the latest state of the graph by calling await graph.getState(config). This will return a StateSnapshot object that corresponds to the latest checkpoint associated with the thread ID provided in the config or a checkpoint associated with a checkpoint ID for the thread, if provided.

```
// Get the latest state snapshot const config = { configurable: { thread_id: "1" } }; const state = await graph.getState(config); // Get a state snapshot for a specific checkpoint_id const configWithCheckpoint = { configurable: { thread_id: "1", checkpoint_id: "1ef663ba-28fe-6528-8002-5a559208592c" } }; const stateWithCheckpoint = await graph.getState(configWithCheckpoint);
```

In our example, the output of getState will look like this:

```
{ values: { foo: 'b', bar: ['a', 'b'] }, next: [], config: { configurable: { thread_id: '1', checkpoint_ns: '', checkpoint_id: '1ef663ba-28fe-6528-8002-5a559208592c' } }, metadata: { source: 'loop', writes: { nodeB: { foo: 'b', bar: ['b'] } }, step: 2 }, created_at: '2024-08-29T19:19:38.821749+00:00', parent_config: { configurable: { thread_id: '1', checkpoint_ns: '', checkpoint_id: '1ef663ba-28f9-6ec4-8001-31981c2c39f8' } }, tasks: [] }
```

We can now create the StateGraph with the above nodes. Notice that the graph doesn't have conditional edges for routing! This is because control flow is defined with Command inside nodeA.

```
import { StateGraph } from "@langchain/langgraph"; // NOTE: there are no edges between nodes A, B and C! const graph = new StateGraph(StateAnnotation) .addNode("nodeA", nodeA, { ends: ["nodeB", "nodeC"], }) .addNode("nodeB", nodeB) .addNode("nodeC", nodeC) .addEdge("__start__", "nodeA") .compile();
```

Important

You might have noticed that we add an ends field as an extra param to the node where we use Command. This is necessary for graph compilation and validation, and tells LangGraph that nodeA can navigate to nodeB and nodeC.

```
import * as tslab from "tslab"; const drawableGraph = await graph.getGraphAsync(); const image = await drawableGraph.drawMermaidPng(); const arrayBuffer = await image.arrayBuffer(); await tslab.display.png(new Uint8Array(arrayBuffer));
```

If we run the graph multiple times, we'd see it take different paths (A -> B or A -> C) based on the random choice in node A.

```
await graph.invoke({ foo: "" });
```

```
Called A Called B { foo: 'a|b' }
```

## Navigating to a node in a parent graph¶

Now let's demonstrate how you can navigate from inside a subgraph to a different node in a parent graph. We'll do so by changing node\_a in the above example into a single-node graph that we'll add as a subgraph to our parent graph.

```
// Define the nodes const nodeASubgraph = async (_state: typeof StateAnnotation.State) => { console.log("Called A"); // this is a replacement for a real conditional edge function const goto = Math.random() > .5 ? "nodeB" : "nodeC"; // note how Command allows you to BOTH update the graph state AND route to the next node return new Command({ update: { foo: "a", }, goto, // this tells LangGraph to navigate to node_b or node_c in the parent graph // NOTE: this will navigate to the closest parent graph relative to the subgraph graph: Command.PARENT, }); }; const subgraph = new StateGraph(StateAnnotation) .addNode("nodeA", nodeASubgraph) .addEdge("__start__", "nodeA") .compile(); const parentGraph= new StateGraph(StateAnnotation) .addNode("subgraph", subgraph, { ends: ["nodeB", "nodeC"] }) .addNode("nodeB", nodeB) .addNode("nodeC", nodeC) .addEdge("__start__", "subgraph") .compile(); await parentGraph.invoke({ foo: "" });
```

```
Called A Called C { foo: 'a|c' }
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders