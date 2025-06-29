How to view and update state in subgraphs

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to view and update state in subgraphs¶

Prerequisites

This guide assumes familiarity with the following:

* Subgraphs
* Human-in-the-loop
* State

Once you add persistence, you can view and update the state of the subgraph at any point in time. This enables human-in-the-loop interaction patterns such as:

* You can surface a state during an interrupt to a user to let them accept an action.
* You can rewind the subgraph to reproduce or avoid issues.
* You can modify the state to let the user better control its actions.

This guide shows how you can do this.

## Setup¶

First we need to install required packages:

```
npm install @langchain/langgraph @langchain/core @langchain/openai
```

Next, we need to set API keys for OpenAI (the provider we'll use for this guide):

```
// process.env.OPENAI_API_KEY = "YOUR_API_KEY";
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here.

## Define subgraph¶

First, let's set up our subgraph. For this, we will create a simple graph that can get the weather for a specific city. We will compile this graph with a breakpoint before the weather\_node:

```
import { z } from "zod"; import { tool } from "@langchain/core/tools"; import { ChatOpenAI } from "@langchain/openai"; import { StateGraph, MessagesAnnotation, Annotation } from "@langchain/langgraph"; const getWeather = tool(async ({ city }) => { return `It's sunny in ${city}`; }, { name: "get_weather", description: "Get the weather for a specific city", schema: z.object({ city: z.string().describe("A city name") }) }); const rawModel = new ChatOpenAI({ model: "gpt-4o-mini" }); const model = rawModel.withStructuredOutput(getWeather); // Extend the base MessagesAnnotation state with another field const SubGraphAnnotation = Annotation.Root({ ...MessagesAnnotation.spec, city: Annotation<string>, }); const modelNode = async (state: typeof SubGraphAnnotation.State) => { const result = await model.invoke(state.messages); return { city: result.city }; }; const weatherNode = async (state: typeof SubGraphAnnotation.State) => { const result = await getWeather.invoke({ city: state.city }); return { messages: [ { role: "assistant", content: result, } ] }; }; const subgraph = new StateGraph(SubGraphAnnotation) .addNode("modelNode", modelNode) .addNode("weatherNode", weatherNode) .addEdge("__start__", "modelNode") .addEdge("modelNode", "weatherNode") .addEdge("weatherNode", "__end__") .compile({ interruptBefore: ["weatherNode"] });
```

## Define parent graph¶

We can now setup the overall graph. This graph will first route to the subgraph if it needs to get the weather, otherwise it will route to a normal LLM.

```
import { MemorySaver } from "@langchain/langgraph"; const memory = new MemorySaver(); const RouterStateAnnotation = Annotation.Root({ ...MessagesAnnotation.spec, route: Annotation<"weather" | "other">, }); const routerModel = rawModel.withStructuredOutput( z.object({ route: z.enum(["weather", "other"]).describe("A step that should execute next to based on the currnet input") }), { name: "router" } ); const routerNode = async (state: typeof RouterStateAnnotation.State) => { const systemMessage = { role: "system", content: "Classify the incoming query as either about weather or not.", }; const messages = [systemMessage, ...state.messages] const { route } = await routerModel.invoke(messages); return { route }; } const normalLLMNode = async (state: typeof RouterStateAnnotation.State) => { const responseMessage = await rawModel.invoke(state.messages); return { messages: [responseMessage] }; }; const routeAfterPrediction = async (state: typeof RouterStateAnnotation.State) => { if (state.route === "weather") { return "weatherGraph"; } else { return "normalLLMNode"; } }; const graph = new StateGraph(RouterStateAnnotation) .addNode("routerNode", routerNode) .addNode("normalLLMNode", normalLLMNode) .addNode("weatherGraph", subgraph) .addEdge("__start__", "routerNode") .addConditionalEdges("routerNode", routeAfterPrediction) .addEdge("normalLLMNode", "__end__") .addEdge("weatherGraph", "__end__") .compile({ checkpointer: memory });
```

Here's a diagram of the graph we just created:

Let's test this out with a normal query to make sure it works as intended!

```
const config = { configurable: { thread_id: "1" } }; const inputs = { messages: [{ role: "user", content: "hi!" }] }; const stream = await graph.stream(inputs, { ...config, streamMode: "updates" }); for await (const update of stream) { console.log(update); }
```

```
{ routerNode: { route: 'other' } } { normalLLMNode: { messages: [ AIMessage { "id": "chatcmpl-ABtbbiB5N3Uue85UNrFUjw5KhGaud", "content": "Hello! How can I assist you today?", "additional_kwargs": {}, "response_metadata": { "tokenUsage": { "completionTokens": 9, "promptTokens": 9, "totalTokens": 18 }, "finish_reason": "stop", "system_fingerprint": "fp_f85bea6784" }, "tool_calls": [], "invalid_tool_calls": [], "usage_metadata": { "input_tokens": 9, "output_tokens": 9, "total_tokens": 18 } } ] } }
```

Great! We didn't ask about the weather, so we got a normal response from the LLM.

## Resuming from breakpoints¶

Let's now look at what happens with breakpoints. Let's invoke it with a query that should get routed to the weather subgraph where we have the interrupt node.

```
const config2 = { configurable: { thread_id: "2" } }; const streamWithBreakpoint = await graph.stream({ messages: [{ role: "user", content: "what's the weather in sf" }] }, { ...config2, streamMode: "updates" }); for await (const update of streamWithBreakpoint) { console.log(update); }
```

```
{ routerNode: { route: 'weather' } }
```

Note that the graph stream doesn't include subgraph events. If we want to stream subgraph events, we can pass subgraphs: True in our config and get back subgraph events like so:

```
const streamWithSubgraphs = await graph.stream({ messages: [{ role: "user", content: "what's the weather in sf" }] }, { configurable: { thread_id: "3" }, streamMode: "updates", subgraphs: true }); for await (const update of streamWithSubgraphs) { console.log(update); }
```

```
[ [], { routerNode: { route: 'weather' } } ] [ [ 'weatherGraph:ec67e50f-d29c-5dee-8a80-08723a937de0' ], { modelNode: { city: 'San Francisco' } } ]
```

This time, we see the format of the streamed updates has changed. It's now a tuple where the first item is a nested array with information about the subgraph and the second is the actual state update. If we get the state now, we can see that it's paused on weatherGraph as expected:

```
const state = await graph.getState({ configurable: { thread_id: "3" } }) state.next
```

```
[ 'weatherGraph' ]
```

If we look at the pending tasks for our current state, we can see that we have one task named weatherGraph, which corresponds to the subgraph task.

```
JSON.stringify(state.tasks, null, 2);
```

```
[ { "id": "ec67e50f-d29c-5dee-8a80-08723a937de0", "name": "weatherGraph", "path": [ "__pregel_pull", "weatherGraph" ], "interrupts": [], "state": { "configurable": { "thread_id": "3", "checkpoint_ns": "weatherGraph:ec67e50f-d29c-5dee-8a80-08723a937de0" } } } ]
```

However since we got the state using the config of the parent graph, we don't have access to the subgraph state. If you look at the state value of the task above you will note that it is simply the configuration of the parent graph. If we want to actually populate the subgraph state, we can pass in subgraphs: True to the second parameter of getState like so:

```
const stateWithSubgraphs = await graph.getState({ configurable: { thread_id: "3" } }, { subgraphs: true }) JSON.stringify(stateWithSubgraphs.tasks, null, 2)
```

```
[ { "id": "ec67e50f-d29c-5dee-8a80-08723a937de0", "name": "weatherGraph", "path": [ "__pregel_pull", "weatherGraph" ], "interrupts": [], "state": { "values": { "messages": [ { "lc": 1, "type": "constructor", "id": [ "langchain_core", "messages", "HumanMessage" ], "kwargs": { "content": "what's the weather in sf", "additional_kwargs": {}, "response_metadata": {}, "id": "094b6752-6bea-4b43-b837-c6b0bb6a4c44" } } ], "city": "San Francisco" }, "next": [ "weatherNode" ], "tasks": [ { "id": "2f2f8b8f-6a99-5225-8ff2-b6c49c3e9caf", "name": "weatherNode", "path": [ "__pregel_pull", "weatherNode" ], "interrupts": [] } ], "metadata": { "source": "loop", "writes": { "modelNode": { "city": "San Francisco" } }, "step": 1, "parents": { "": "1ef7c6ba-3d36-65e0-8001-adc1f8841274" } }, "config": { "configurable": { "thread_id": "3", "checkpoint_id": "1ef7c6ba-4503-6700-8001-61e828d1c772", "checkpoint_ns": "weatherGraph:ec67e50f-d29c-5dee-8a80-08723a937de0", "checkpoint_map": { "": "1ef7c6ba-3d36-65e0-8001-adc1f8841274", "weatherGraph:ec67e50f-d29c-5dee-8a80-08723a937de0": "1ef7c6ba-4503-6700-8001-61e828d1c772" } } }, "createdAt": "2024-09-27T00:58:43.184Z", "parentConfig": { "configurable": { "thread_id": "3", "checkpoint_ns": "weatherGraph:ec67e50f-d29c-5dee-8a80-08723a937de0", "checkpoint_id": "1ef7c6ba-3d3b-6400-8000-fe27ae37c785" } } } } ]
```

Now we have access to the subgraph state!

To resume execution, we can just invoke the outer graph as normal:

```
const resumedStream = await graph.stream(null, { configurable: { thread_id: "3" }, streamMode: "values", subgraphs: true, }); for await (const update of resumedStream) { console.log(update); }
```

```
[ [], { messages: [ HumanMessage { "id": "094b6752-6bea-4b43-b837-c6b0bb6a4c44", "content": "what's the weather in sf", "additional_kwargs": {}, "response_metadata": {} } ], route: 'weather' } ] [ [ 'weatherGraph:ec67e50f-d29c-5dee-8a80-08723a937de0' ], { messages: [ HumanMessage { "id": "094b6752-6bea-4b43-b837-c6b0bb6a4c44", "content": "what's the weather in sf", "additional_kwargs": {}, "response_metadata": {} } ], city: 'San Francisco' } ] [ [ 'weatherGraph:ec67e50f-d29c-5dee-8a80-08723a937de0' ], { messages: [ HumanMessage { "id": "094b6752-6bea-4b43-b837-c6b0bb6a4c44", "content": "what's the weather in sf", "additional_kwargs": {}, "response_metadata": {} }, AIMessage { "id": "55d7a03f-876a-4887-9418-027321e747c7", "content": "It's sunny in San Francisco", "additional_kwargs": {}, "response_metadata": {}, "tool_calls": [], "invalid_tool_calls": [] } ], city: 'San Francisco' } ] [ [], { messages: [ HumanMessage { "id": "094b6752-6bea-4b43-b837-c6b0bb6a4c44", "content": "what's the weather in sf", "additional_kwargs": {}, "response_metadata": {} }, AIMessage { "id": "55d7a03f-876a-4887-9418-027321e747c7", "content": "It's sunny in San Francisco", "additional_kwargs": {}, "response_metadata": {}, "tool_calls": [], "invalid_tool_calls": [] } ], route: 'weather' } ]
```

### Resuming from specific subgraph node¶

In the example above, we were replaying from the outer graph - which automatically replayed the subgraph from whatever state it was in previously (paused before the weatherNode in our case), but it is also possible to replay from inside a subgraph. In order to do so, we need to get the configuration from the exact subgraph state that we want to replay from.

We can do this by exploring the state history of the subgraph, and selecting the state before modelNode - which we can do by filtering on the .next parameter.

To get the state history of the subgraph, we need to first pass in the parent graph state before the subgraph:

```
let parentGraphStateBeforeSubgraph; const histories = await graph.getStateHistory({ configurable: { thread_id: "3" } }); for await (const historyEntry of histories) { if (historyEntry.next[0] === "weatherGraph") { parentGraphStateBeforeSubgraph = historyEntry; } }
```

```
let subgraphStateBeforeModelNode; const subgraphHistories = await graph.getStateHistory(parentGraphStateBeforeSubgraph.tasks[0].state); for await (const subgraphHistoryEntry of subgraphHistories) { if (subgraphHistoryEntry.next[0] === "modelNode") { subgraphStateBeforeModelNode = subgraphHistoryEntry; } } console.log(subgraphStateBeforeModelNode);
```

```
{ values: { messages: [ HumanMessage { "id": "094b6752-6bea-4b43-b837-c6b0bb6a4c44", "content": "what's the weather in sf", "additional_kwargs": {}, "response_metadata": {} } ], city: 'San Francisco' }, next: [ 'modelNode' ], tasks: [ { id: '6d0d44fd-279b-56b0-8160-8f4929f9bfe6', name: 'modelNode', path: [Array], interrupts: [], state: undefined } ], metadata: { source: 'loop', writes: null, step: 0, parents: { '': '1ef7c6ba-3d36-65e0-8001-adc1f8841274' } }, config: { configurable: { thread_id: '3', checkpoint_ns: 'weatherGraph:ec67e50f-d29c-5dee-8a80-08723a937de0', checkpoint_id: '1ef7c6ba-3d3b-6400-8000-fe27ae37c785', checkpoint_map: [Object] } }, createdAt: '2024-09-27T00:58:42.368Z', parentConfig: { configurable: { thread_id: '3', checkpoint_ns: 'weatherGraph:ec67e50f-d29c-5dee-8a80-08723a937de0', checkpoint_id: '1ef7c6ba-3d38-6cf1-ffff-b3912beb00b9' } } }
```

This pattern can be extended no matter how many levels deep.

We can confirm that we have gotten the correct state by comparing the .next parameter of the subgraphStateBeforeModelNode.

```
subgraphStateBeforeModelNode.next;
```

```
[ 'modelNode' ]
```

Perfect! We have gotten the correct state snaphshot, and we can now resume from the modelNode inside of our subgraph:

```
const resumeSubgraphStream = await graph.stream(null, { ...subgraphStateBeforeModelNode.config, streamMode: "updates", subgraphs: true }); for await (const value of resumeSubgraphStream) { console.log(value); }
```

```
[ [ 'weatherGraph:ec67e50f-d29c-5dee-8a80-08723a937de0' ], { modelNode: { city: 'San Francisco' } } ]
```

We can see that it reruns the modelNode and breaks right before the weatherNode as expected.

This subsection has shown how you can replay from any node, no matter how deeply nested it is inside your graph - a powerful tool for testing how deterministic your agent is.

## Modifying state¶

### Update the state of a subgraph¶

What if we want to modify the state of a subgraph? We can do this similarly to how we update the state of normal graphs. We just need to ensure we pass the config of the subgraph to updateState. Let's run our graph as before:

```
const graphStream = await graph.stream({ messages: [{ role: "user", content: "what's the weather in sf" }], }, { configurable: { thread_id: "4", } }); for await (const update of graphStream) { console.log(update); }
```

```
{ routerNode: { route: 'weather' } }
```

```
const outerGraphState = await graph.getState({ configurable: { thread_id: "4", } }, { subgraphs: true }) console.log(outerGraphState.tasks[0].state);
```

```
{ values: { messages: [ HumanMessage { "id": "07ed1a38-13a9-4ec2-bc88-c4f6b713ec85", "content": "what's the weather in sf", "additional_kwargs": {}, "response_metadata": {} } ], city: 'San Francisco' }, next: [ 'weatherNode' ], tasks: [ { id: 'eabfbb82-6cf4-5ecd-932e-ed994ea44f23', name: 'weatherNode', path: [Array], interrupts: [], state: undefined } ], metadata: { source: 'loop', writes: { modelNode: [Object] }, step: 1, parents: { '': '1ef7c6ba-563f-60f0-8001-4fce0e78ef56' } }, config: { configurable: { thread_id: '4', checkpoint_id: '1ef7c6ba-5c71-6f90-8001-04f60f3c8173', checkpoint_ns: 'weatherGraph:8d8c9278-bd2a-566a-b9e1-e72286634681', checkpoint_map: [Object] } }, createdAt: '2024-09-27T00:58:45.641Z', parentConfig: { configurable: { thread_id: '4', checkpoint_ns: 'weatherGraph:8d8c9278-bd2a-566a-b9e1-e72286634681', checkpoint_id: '1ef7c6ba-5641-6800-8000-96bcde048fa6' } } }
```

In order to update the state of the inner graph, we need to pass the config for the inner graph, which we can get by accessing calling state.tasks[0].state.config - since we interrupted inside the subgraph, the state of the task is just the state of the subgraph.

```
import type { StateSnapshot } from "@langchain/langgraph"; await graph.updateState((outerGraphState.tasks[0].state as StateSnapshot).config, { city: "la" });
```

```
{ configurable: { thread_id: '4', checkpoint_ns: 'weatherGraph:8d8c9278-bd2a-566a-b9e1-e72286634681', checkpoint_id: '1ef7c6ba-5de0-62f0-8002-3618a75d1fce', checkpoint_map: { '': '1ef7c6ba-563f-60f0-8001-4fce0e78ef56', 'weatherGraph:8d8c9278-bd2a-566a-b9e1-e72286634681': '1ef7c6ba-5de0-62f0-8002-3618a75d1fce' } } }
```

We can now resume streaming the outer graph (which will resume the subgraph!) and check that we updated our search to use LA instead of SF.

```
const resumedStreamWithUpdatedState = await graph.stream(null, { configurable: { thread_id: "4", }, streamMode: "updates", subgraphs: true, }) for await (const update of resumedStreamWithUpdatedState) { console.log(JSON.stringify(update, null, 2)); }
```

```
[ [ "weatherGraph:8d8c9278-bd2a-566a-b9e1-e72286634681" ], { "weatherNode": { "messages": [ { "role": "assistant", "content": "It's sunny in la" } ] } } ] [ [], { "weatherGraph": { "messages": [ { "lc": 1, "type": "constructor", "id": [ "langchain_core", "messages", "HumanMessage" ], "kwargs": { "content": "what's the weather in sf", "additional_kwargs": {}, "response_metadata": {} } }, { "lc": 1, "type": "constructor", "id": [ "langchain_core", "messages", "AIMessage" ], "kwargs": { "content": "It's sunny in la", "tool_calls": [], "invalid_tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "id": "94c29f6c-38b3-420f-a9fb-bd85548f0c03" } } ] } } ]
```

Fantastic! The AI responded with "It's sunny in LA!" as we expected.

### Acting as a subgraph node¶

Instead of editing the state before weatherNode in the weatherGraph subgraph, another way we could update the state is by acting as the weatherNode ourselves. We can do this by passing the subgraph config along with a node name passed as a third positional argument, which allows us to update the state as if we are the node we specify.

We will set an interrupt before the weatherNode and then using the update state function as the weatherNode, the graph itself never calls weatherNode directly but instead we decide what the output of weatherNode should be.

```
const streamWithAsNode = await graph.stream({ messages: [{ role: "user", content: "what's the weather in sf", }] }, { configurable: { thread_id: "14", } }); for await (const update of streamWithAsNode) { console.log(update); } // Graph execution should stop before the weather node console.log("interrupted!"); const interruptedState = await graph.getState({ configurable: { thread_id: "14", } }, { subgraphs: true }); console.log(interruptedState); // We update the state by passing in the message we want returned from the weather node // and make sure to pass `"weatherNode"` to signify that we want to act as this node. await graph.updateState((interruptedState.tasks[0].state as StateSnapshot).config, { messages: [{ "role": "assistant", "content": "rainy" }] }, "weatherNode"); const resumedStreamWithAsNode = await graph.stream(null, { configurable: { thread_id: "14", }, streamMode: "updates", subgraphs: true, }); for await (const update of resumedStreamWithAsNode) { console.log(update); } console.log(await graph.getState({ configurable: { thread_id: "14", } }, { subgraphs: true }));
```

```
{ routerNode: { route: 'weather' } } interrupted! { values: { messages: [ HumanMessage { "id": "90e9ff28-5b13-4e10-819a-31999efe303c", "content": "What's the weather in sf", "additional_kwargs": {}, "response_metadata": {} } ], route: 'weather' }, next: [ 'weatherGraph' ], tasks: [ { id: 'f421fca8-de9e-5683-87ab-6ea9bb8d6275', name: 'weatherGraph', path: [Array], interrupts: [], state: [Object] } ], metadata: { source: 'loop', writes: { routerNode: [Object] }, step: 1, parents: {} }, config: { configurable: { thread_id: '14', checkpoint_id: '1ef7c6ba-63ac-68f1-8001-5f7ada5f98e8', checkpoint_ns: '' } }, createdAt: '2024-09-27T00:58:46.399Z', parentConfig: { configurable: { thread_id: '14', checkpoint_ns: '', checkpoint_id: '1ef7c6ba-5f20-6020-8000-1ff649773a32' } } } [ [], { weatherGraph: { messages: [Array] } } ] { values: { messages: [ HumanMessage { "id": "90e9ff28-5b13-4e10-819a-31999efe303c", "content": "What's the weather in sf", "additional_kwargs": {}, "response_metadata": {} }, AIMessage { "id": "af761e6d-9f6a-4467-9a3c-489bed3fbad7", "content": "rainy", "additional_kwargs": {}, "response_metadata": {}, "tool_calls": [], "invalid_tool_calls": [] } ], route: 'weather' }, next: [], tasks: [], metadata: { source: 'loop', writes: { weatherGraph: [Object] }, step: 2, parents: {} }, config: { configurable: { thread_id: '14', checkpoint_id: '1ef7c6ba-69e6-6cc0-8002-1751fc5bdd8f', checkpoint_ns: '' } }, createdAt: '2024-09-27T00:58:47.052Z', parentConfig: { configurable: { thread_id: '14', checkpoint_ns: '', checkpoint_id: '1ef7c6ba-63ac-68f1-8001-5f7ada5f98e8' } } }
```

Perfect! The agent responded with the message we passed in ourselves, and identified the weather in SF as rainy instead of sunny.

### Acting as the entire subgraph¶

Lastly, we could also update the graph just acting as the entire subgraph. This is similar to the case above but instead of acting as just the weatherNode we are acting as the entire weatherGraph subgraph. This is done by passing in the normal graph config as well as the asNode argument, where we specify the we are acting as the entire subgraph node.

```
const entireSubgraphExampleStream = await graph.stream({ messages: [ { role: "user", content: "what's the weather in sf" } ], }, { configurable: { thread_id: "8", }, streamMode: "updates", subgraphs: true, }); for await (const update of entireSubgraphExampleStream) { console.log(update); } // Graph execution should stop before the weather node console.log("interrupted!"); // We update the state by passing in the message we want returned from the weather graph. // Note that we don't need to pass in the subgraph config, since we aren't updating the state inside the subgraph await graph.updateState({ configurable: { thread_id: "8", } }, { messages: [{ role: "assistant", content: "rainy" }] }, "weatherGraph"); const resumedEntireSubgraphExampleStream = await graph.stream(null, { configurable: { thread_id: "8", }, streamMode: "updates", }); for await (const update of resumedEntireSubgraphExampleStream) { console.log(update); } const currentStateAfterUpdate = await graph.getState({ configurable: { thread_id: "8", } }); console.log(currentStateAfterUpdate.values.messages);
```

```
[ [], { routerNode: { route: 'weather' } } ] [ [ 'weatherGraph:db9c3bb2-5d27-5dae-a724-a8d702b33e86' ], { modelNode: { city: 'San Francisco' } } ] interrupted! [ HumanMessage { "id": "001282b0-ca2e-443f-b6ee-8cb16c81bf59", "content": "what's the weather in sf", "additional_kwargs": {}, "response_metadata": {} }, AIMessage { "id": "4b5d49cf-0f87-4ee8-b96f-eaa8716b9e9c", "content": "rainy", "additional_kwargs": {}, "response_metadata": {}, "tool_calls": [], "invalid_tool_calls": [] } ]
```

Again, the agent responded with "rainy" as we expected.

## Double nested subgraphs¶

This same functionality continues to work no matter the level of nesting. Here is an example of doing the same things with a double nested subgraph (although any level of nesting will work). We add another router on top of our already defined graphs.

First, let's recreate the graph we've been using above. This time we will compile it with no checkpointer, since it itself will be a subgraph!

```
const parentGraph = new StateGraph(RouterStateAnnotation) .addNode("routerNode", routerNode) .addNode("normalLLMNode", normalLLMNode) .addNode("weatherGraph", subgraph) .addEdge("__start__", "routerNode") .addConditionalEdges("routerNode", routeAfterPrediction) .addEdge("normalLLMNode", "__end__") .addEdge("weatherGraph", "__end__") .compile();
```

Now let's declare a "grandparent" graph that uses this graph as a subgraph:

```
const checkpointer = new MemorySaver(); const GrandfatherStateAnnotation = Annotation.Root({ ...MessagesAnnotation.spec, toContinue: Annotation<boolean>, }); const grandparentRouterNode = async (_state: typeof GrandfatherStateAnnotation.State) => { // Dummy logic that will always continue return { toContinue: true }; }; const grandparentConditionalEdge = async (state: typeof GrandfatherStateAnnotation.State) => { if (state.toContinue) { return "parentGraph"; } else { return "__end__"; } }; const grandparentGraph = new StateGraph(GrandfatherStateAnnotation) .addNode("routerNode", grandparentRouterNode) .addNode("parentGraph", parentGraph) .addEdge("__start__", "routerNode") .addConditionalEdges("routerNode", grandparentConditionalEdge) .addEdge("parentGraph", "__end__") .compile({ checkpointer });
```

Here's a diagram showing what this looks like:

If we run until the interrupt, we can now see that there are snapshots of the state of all three graphs

```
const grandparentConfig = { configurable: { thread_id: "123" }, }; const grandparentGraphStream = await grandparentGraph.stream({ messages: [{ role: "user", content: "what's the weather in SF" }], }, { ...grandparentConfig, streamMode: "updates", subgraphs: true }); for await (const update of grandparentGraphStream) { console.log(update); }
```

```
[ [], { routerNode: { toContinue: true } } ] [ [ 'parentGraph:095bb8a9-77d3-5a0c-9a23-e1390dcf36bc' ], { routerNode: { route: 'weather' } } ] [ [ 'parentGraph:095bb8a9-77d3-5a0c-9a23-e1390dcf36bc', 'weatherGraph:b1da376c-25a5-5aae-82da-4ff579f05d43' ], { modelNode: { city: 'San Francisco' } } ]
```

```
const grandparentGraphState = await grandparentGraph.getState( grandparentConfig, { subgraphs: true } ); const parentGraphState = grandparentGraphState.tasks[0].state as StateSnapshot; const subgraphState = parentGraphState.tasks[0].state as StateSnapshot; console.log("Grandparent State:"); console.log(grandparentGraphState.values); console.log("---------------"); console.log("Parent Graph State:"); console.log(parentGraphState.values); console.log("---------------"); console.log("Subgraph State:"); console.log(subgraphState.values);
```

```
Grandparent State: { messages: [ HumanMessage { "id": "5788e436-a756-4ff5-899a-82117a5c59c7", "content": "what's the weather in SF", "additional_kwargs": {}, "response_metadata": {} } ], toContinue: true } --------------- Parent Graph State: { messages: [ HumanMessage { "id": "5788e436-a756-4ff5-899a-82117a5c59c7", "content": "what's the weather in SF", "additional_kwargs": {}, "response_metadata": {} } ], route: 'weather' } --------------- Subgraph State: { messages: [ HumanMessage { "id": "5788e436-a756-4ff5-899a-82117a5c59c7", "content": "what's the weather in SF", "additional_kwargs": {}, "response_metadata": {} } ], city: 'San Francisco' }
```

We can now continue, acting as the node three levels down

```
await grandparentGraph.updateState(subgraphState.config, { messages: [{ role: "assistant", content: "rainy" }] }, "weatherNode"); const updatedGrandparentGraphStream = await grandparentGraph.stream(null, { ...grandparentConfig, streamMode: "updates", subgraphs: true, }); for await (const update of updatedGrandparentGraphStream) { console.log(update); } console.log((await grandparentGraph.getState(grandparentConfig)).values.messages)
```

```
[ [ 'parentGraph:095bb8a9-77d3-5a0c-9a23-e1390dcf36bc' ], { weatherGraph: { messages: [Array] } } ] [ [], { parentGraph: { messages: [Array] } } ] [ HumanMessage { "id": "5788e436-a756-4ff5-899a-82117a5c59c7", "content": "what's the weather in SF", "additional_kwargs": {}, "response_metadata": {} }, AIMessage { "id": "1c161973-9a9d-414d-b631-56791d85e2fb", "content": "rainy", "additional_kwargs": {}, "response_metadata": {}, "tool_calls": [], "invalid_tool_calls": [] } ]
```

As in the cases above, we can see that the AI responds with "rainy" as we expect.

We can explore the state history to see how the state of the grandparent graph was updated at each step.

```
const grandparentStateHistories = await grandparentGraph.getStateHistory(grandparentConfig); for await (const state of grandparentStateHistories) { console.log(state); console.log("-----"); }
```

```
{ values: { messages: [ HumanMessage { "id": "5788e436-a756-4ff5-899a-82117a5c59c7", "content": "what's the weather in SF", "additional_kwargs": {}, "response_metadata": {} }, AIMessage { "id": "1c161973-9a9d-414d-b631-56791d85e2fb", "content": "rainy", "additional_kwargs": {}, "response_metadata": {}, "tool_calls": [], "invalid_tool_calls": [] } ], toContinue: true }, next: [], tasks: [], metadata: { source: 'loop', writes: { parentGraph: [Object] }, step: 2, parents: {} }, config: { configurable: { thread_id: '123', checkpoint_ns: '', checkpoint_id: '1ef7c6ba-8560-67d0-8002-2e2cedd7de18' } }, createdAt: '2024-09-27T00:58:49.933Z', parentConfig: { configurable: { thread_id: '123', checkpoint_ns: '', checkpoint_id: '1ef7c6ba-7977-62c0-8001-13e89cb2bbab' } } } ----- { values: { messages: [ HumanMessage { "id": "5788e436-a756-4ff5-899a-82117a5c59c7", "content": "what's the weather in SF", "additional_kwargs": {}, "response_metadata": {} } ], toContinue: true }, next: [ 'parentGraph' ], tasks: [ { id: '095bb8a9-77d3-5a0c-9a23-e1390dcf36bc', name: 'parentGraph', path: [Array], interrupts: [], state: [Object] } ], metadata: { source: 'loop', writes: { routerNode: [Object] }, step: 1, parents: {} }, config: { configurable: { thread_id: '123', checkpoint_ns: '', checkpoint_id: '1ef7c6ba-7977-62c0-8001-13e89cb2bbab' } }, createdAt: '2024-09-27T00:58:48.684Z', parentConfig: { configurable: { thread_id: '123', checkpoint_ns: '', checkpoint_id: '1ef7c6ba-7972-64a0-8000-243575e3244f' } } } ----- { values: { messages: [ HumanMessage { "id": "5788e436-a756-4ff5-899a-82117a5c59c7", "content": "what's the weather in SF", "additional_kwargs": {}, "response_metadata": {} } ] }, next: [ 'routerNode' ], tasks: [ { id: '00ed334c-47b5-5693-92b4-a5b83373e2a0', name: 'routerNode', path: [Array], interrupts: [], state: undefined } ], metadata: { source: 'loop', writes: null, step: 0 }, config: { configurable: { thread_id: '123', checkpoint_ns: '', checkpoint_id: '1ef7c6ba-7972-64a0-8000-243575e3244f' } }, createdAt: '2024-09-27T00:58:48.682Z', parentConfig: { configurable: { thread_id: '123', checkpoint_ns: '', checkpoint_id: '1ef7c6ba-796f-6d90-ffff-25ed0eb5bb38' } } } ----- { values: {}, next: [ '__start__' ], tasks: [ { id: 'ea62628e-881d-558d-bafc-e8b6a734e8aa', name: '__start__', path: [Array], interrupts: [], state: undefined } ], metadata: { source: 'input', writes: { __start__: [Object] }, step: -1 }, config: { configurable: { thread_id: '123', checkpoint_ns: '', checkpoint_id: '1ef7c6ba-796f-6d90-ffff-25ed0eb5bb38' } }, createdAt: '2024-09-27T00:58:48.681Z', parentConfig: undefined } -----
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders