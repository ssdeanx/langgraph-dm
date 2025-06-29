How to transform inputs and outputs of a subgraph

It's possible that your subgraph state is completely independent from the parent graph state, i.e. there are no overlapping channels (keys) between the two. For example, you might have a supervisor agent that needs to produce a report with a help of multiple ReAct agents. ReAct agent subgraphs might keep track of a list of messages whereas the supervisor only needs user input and final report in its state, and doesn't need to keep track of messages.

In such cases you need to transform the inputs to the subgraph before calling it and then transform its outputs before returning. This guide shows how to do that.

## Setup¶

First, let's install the required packages

```
npm install @langchain/langgraph @langchain/core
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here.

## Define graph and subgraphs¶

Let's define 3 graphs: - a parent graph - a child subgraph that will be called by the parent graph - a grandchild subgraph that will be called by the child graph

### Define grandchild¶

```
import { StateGraph, START, Annotation } from "@langchain/langgraph"; const GrandChildAnnotation = Annotation.Root({ myGrandchildKey: Annotation<string>, }) const grandchild1 = (state: typeof GrandChildAnnotation.State) => { // NOTE: child or parent keys will not be accessible here return { myGrandchildKey: state.myGrandchildKey + ", how are you" } } const grandchild = new StateGraph(GrandChildAnnotation) .addNode("grandchild1", grandchild1) .addEdge(START, "grandchild1") const grandchildGraph = grandchild.compile();
```

```
await grandchildGraph.invoke({ myGrandchildKey: "hi Bob" })
```

```
{ myGrandchildKey: 'hi Bob, how are you' }
```

### Define child¶

```
import { StateGraph, START, Annotation } from "@langchain/langgraph"; const ChildAnnotation = Annotation.Root({ myChildKey: Annotation<string>, }); const callGrandchildGraph = async (state: typeof ChildAnnotation.State) => { // NOTE: parent or grandchild keys won't be accessible here // we're transforming the state from the child state channels (`myChildKey`) // to the grandchild state channels (`myGrandchildKey`) const grandchildGraphInput = { myGrandchildKey: state.myChildKey }; // we're transforming the state from the grandchild state channels (`myGrandchildKey`) // back to the child state channels (`myChildKey`) const grandchildGraphOutput = await grandchildGraph.invoke(grandchildGraphInput); return { myChildKey: grandchildGraphOutput.myGrandchildKey + " today?" }; }; const child = new StateGraph(ChildAnnotation) // NOTE: we're passing a function here instead of just compiled graph (`childGraph`) .addNode("child1", callGrandchildGraph) .addEdge(START, "child1"); const childGraph = child.compile();
```

```
await childGraph.invoke({ myChildKey: "hi Bob" })
```

```
{ myChildKey: 'hi Bob, how are you today?' }
```

Note

We're wrapping the grandchildGraph invocation in a separate function (callGrandchildGraph) that transforms the input state before calling the grandchild graph and then transforms the output of grandchild graph back to child graph state. If you just pass grandchildGraph directly to .addNode without the transformations, LangGraph will raise an error as there are no shared state channels (keys) between child and grandchild states.

Note that child and grandchild subgraphs have their own, independent state that is not shared with the parent graph.

### Define parent¶

```
import { StateGraph, START, END, Annotation } from "@langchain/langgraph"; const ParentAnnotation = Annotation.Root({ myKey: Annotation<string>, }); const parent1 = (state: typeof ParentAnnotation.State) => { // NOTE: child or grandchild keys won't be accessible here return { myKey: "hi " + state.myKey }; }; const parent2 = (state: typeof ParentAnnotation.State) => { return { myKey: state.myKey + " bye!" }; }; const callChildGraph = async (state: typeof ParentAnnotation.State) => { // we're transforming the state from the parent state channels (`myKey`) // to the child state channels (`myChildKey`) const childGraphInput = { myChildKey: state.myKey }; // we're transforming the state from the child state channels (`myChildKey`) // back to the parent state channels (`myKey`) const childGraphOutput = await childGraph.invoke(childGraphInput); return { myKey: childGraphOutput.myChildKey }; }; const parent = new StateGraph(ParentAnnotation) .addNode("parent1", parent1) // NOTE: we're passing a function here instead of just a compiled graph (`childGraph`) .addNode("child", callChildGraph) .addNode("parent2", parent2) .addEdge(START, "parent1") .addEdge("parent1", "child") .addEdge("child", "parent2") .addEdge("parent2", END); const parentGraph = parent.compile();
```

Note

We're wrapping the childGraph invocation in a separate function (callChildGraph) that transforms the input state before calling the child graph and then transforms the output of the child graph back to parent graph state. If you just pass childGraph directly to .addNode without the transformations, LangGraph will raise an error as there are no shared state channels (keys) between parent and child states.

Let's run the parent graph and make sure it correctly calls both the child and grandchild subgraphs:

```
await parentGraph.invoke({ myKey: "Bob" })
```

```
{ myKey: 'hi Bob, how are you today? bye!' }
```

Perfect! The parent graph correctly calls both the child and grandchild subgraphs (which we know since the ", how are you" and "today?" are added to our original "myKey" state value).

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders