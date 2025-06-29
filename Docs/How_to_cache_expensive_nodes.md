How to cache expensive nodes

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to cache expensive nodes¶

Prerequisites

This guide assumes familiarity with the following:

* Graphs
* Nodes

Node caching is useful in cases where you want to avoid repeating operations, like when doing something expensive (either in terms of time or cost). LangGraph lets you add individualized caching policies to nodes in a graph.

To configure a cache policy, pass the cachePolicy parameter to the addNode method. In the following example, we specify a cache policy with a time to live (TTL) of 120 seconds and default key serialization function. Then, to enable node-level caching for a graph, set the cache argument when compiling the graph. The example below uses InMemoryCache to set up a graph with in-memory cache.

```
import { StateGraph, Annotation, START } from "@langchain/langgraph"; import { InMemoryCache } from "@langchain/langgraph-checkpoint"; const StateAnnotation = Annotation.Root({ items: Annotation<string[]>({ default: () => [], reducer: (acc, item) => [...acc, ...item], }), }); const cache = new InMemoryCache(); const graph = new StateGraph(StateAnnotation) .addNode( "node", async () => { // Simulate an expensive operation await new Promise((resolve) => setTimeout(resolve, 3000)); return { items: ["Hello, how are you?"] }; }, { cachePolicy: { ttl: 120 } } ) .addEdge(START, "node") .compile({ cache });
```

The initial run will take 3 seconds since the cache is empty. Subsequent runs with the same input will be cached and yielded immediately.

```
console.time("First run"); await graph.invoke({ items: ["Hello!"] }); console.timeEnd("First run"); console.time("Second run"); await graph.invoke({ items: ["Hello!"] }); console.timeEnd("Second run");
```

```
First run: 3.006s Second run: 4.148ms
```

You can also pass a custom key serialization function to the cachePolicy parameter. This can be used to skip certain fields from the serialization, such as message IDs, which may be random with each run.

```
import { StateGraph, MessagesAnnotation, START } from "@langchain/langgraph"; import { InMemoryCache } from "@langchain/langgraph-checkpoint"; import { BaseMessage } from "@langchain/core/messages"; const cache = new InMemoryCache(); const graph = new StateGraph(MessagesAnnotation) .addNode( "node", async () => { await new Promise((resolve) => setTimeout(resolve, 3000)); return { messages: [{ type: "ai", content: "Hello, how are you?" }] }; }, { cachePolicy: { ttl: 120, keyFunc([{ messages }]: [{ messages: BaseMessage[] }]) { // Cache based on the content and relative position of the messages return JSON.stringify(messages.map((m, idx) => [idx, m.content])); }, }, } ) .addEdge(START, "node") .compile({ cache });
```

```
// First run will take 3 seconds console.time("First run"); await graph.invoke({ messages: [{ type: "human", content: "Hello!" }] }); console.timeEnd("First run"); // Second run will be cached and yield immediately console.time("Second run"); await graph.invoke({ messages: [{ type: "human", content: "Hello!" }] }); console.timeEnd("Second run");
```

```
First run: 3.004s Second run: 2.012ms
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders