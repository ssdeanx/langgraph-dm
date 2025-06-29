How to add thread-level persistence to subgraphs

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to add thread-level persistence to subgraphs¶

Prerequisites

This guide assumes familiarity with the following:

* Subgraphs
* Persistence

This guide shows how you can add thread-level persistence to graphs that use subgraphs.

## Setup¶

First, let's install required packages:

```
$ npm install @langchain/langgraph @langchain/core
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here.

## Define the graph with persistence¶

To add persistence to a graph with subgraphs, all you need to do is pass a checkpointer when compiling the parent graph. LangGraph will automatically propagate the checkpointer to the child subgraphs.

Note

You shouldn't provide a checkpointer when compiling a subgraph. Instead, you must define a \*\*single\*\* checkpointer that you pass to parentGraph.compile(), and LangGraph will automatically propagate the checkpointer to the child subgraphs. If you pass the checkpointer to the subgraph.compile(), it will simply be ignored. This also applies when you add a node that invokes the subgraph explicitly.

Let's define a simple graph with a single subgraph node to show how to do this.

```
import { StateGraph, Annotation } from "@langchain/langgraph"; // subgraph const SubgraphStateAnnotation = Annotation.Root({ foo: Annotation<string>, bar: Annotation<string>, }); const subgraphNode1 = async (state: typeof SubgraphStateAnnotation.State) => { return { bar: "bar" }; }; const subgraphNode2 = async (state: typeof SubgraphStateAnnotation.State) => { // note that this node is using a state key ('bar') that is only available in the subgraph // and is sending update on the shared state key ('foo') return { foo: state.foo + state.bar }; }; const subgraph = new StateGraph(SubgraphStateAnnotation) .addNode("subgraphNode1", subgraphNode1) .addNode("subgraphNode2", subgraphNode2) .addEdge("__start__", "subgraphNode1") .addEdge("subgraphNode1", "subgraphNode2") .compile(); // parent graph const StateAnnotation = Annotation.Root({ foo: Annotation<string>, }); const node1 = async (state: typeof StateAnnotation.State) => { return { foo: "hi! " + state.foo, }; }; const builder = new StateGraph(StateAnnotation) .addNode("node1", node1) // note that we're adding the compiled subgraph as a node to the parent graph .addNode("node2", subgraph) .addEdge("__start__", "node1") .addEdge("node1", "node2");
```

We can now compile the graph with an in-memory checkpointer (MemorySaver).

```
import { MemorySaver } from "@langchain/langgraph-checkpoint"; const checkpointer = new MemorySaver(); // You must only pass checkpointer when compiling the parent graph. // LangGraph will automatically propagate the checkpointer to the child subgraphs. const graph = builder.compile({ checkpointer: checkpointer });
```

## Verify persistence works¶

Let's now run the graph and inspect the persisted state for both the parent graph and the subgraph to verify that persistence works. We should expect to see the final execution results for both the parent and subgraph in state.values.

```
const config = { configurable: { thread_id: "1" } };
```

```
const stream = await graph.stream({ foo: "foo" }, { ...config, subgraphs: true, }); for await (const [_source, chunk] of stream) { console.log(chunk); }
```

```
{ node1: { foo: 'hi! foo' } } { subgraphNode1: { bar: 'bar' } } { subgraphNode2: { foo: 'hi! foobar' } } { node2: { foo: 'hi! foobar' } }
```

You can now view the parent graph state by calling graph.get\_state() with the same config that we used to invoke the graph.

```
(await graph.getState(config)).values;
```

```
{ foo: 'hi! foobar' }
```

To view the subgraph state, we need to do two things:

1. Find the most recent config value for the subgraph
2. Use graph.getState() to retrieve that value for the most recent subgraph config.

To find the correct config, we can examine the state history from the parent graph and find the state snapshot before we return results from node2 (the node with subgraph):

```
let stateWithSubgraph; const graphHistories = await graph.getStateHistory(config); for await (const state of graphHistories) { if (state.next[0] === "node2") { stateWithSubgraph = state; break; } }
```

The state snapshot will include the list of tasks to be executed next. When using subgraphs, the tasks will contain the config that we can use to retrieve the subgraph state:

```
const subgraphConfig = stateWithSubgraph.tasks[0].state; console.log(subgraphConfig);
```

```
{ configurable: { thread_id: '1', checkpoint_ns: 'node2:25814e09-45f0-5b70-a5b4-23b869d582c2' } }
```

```
(await graph.getState(subgraphConfig)).values
```

```
{ foo: 'hi! foobar', bar: 'bar' }
```

If you want to learn more about how to modify the subgraph state for human-in-the-loop workflows, check out this how-to guide.

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders