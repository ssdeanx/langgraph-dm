How to view and update past graph state

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to view and update past graph state

Prerequisites

This guide assumes familiarity with the following concepts:

* Time Travel
* Breakpoints
* LangGraph Glossary

Once you start checkpointing your graphs, you can easily get or update the state of the agent at any point in time. This permits a few things:

1. You can surface a state during an interrupt to a user to let them accept an action.
2. You can rewind the graph to reproduce or avoid issues.
3. You can modify the state to embed your agent into a larger system, or to let the user better control its actions.

The key methods used for this functionality are:

* getState: fetch the values from the target config
* updateState: apply the given values to the target state

Note: this requires passing in a checkpointer.

<!-- Example:

```
TODO ... ``` --> This works for <a href="/langgraphjs/reference/classes/langgraph.StateGraph.html">StateGraph</a> and all its subclasses, such as <a href="/langgraphjs/reference/classes/langgraph.MessageGraph.html">MessageGraph</a>. Below is an example. <div class="admonition tip"> <p class="admonition-title">Note</p> <p> In this how-to, we will create our agent from scratch to be transparent (but verbose). You can accomplish similar functionality using the <code>createReactAgent(model, tools=tool, checkpointer=checkpointer)</code> (<a href="/langgraphjs/reference/functions/langgraph_prebuilt.createReactAgent.html">API doc</a>) constructor. This may be more appropriate if you are used to LangChain's <a href="https://js.langchain.com/docs/how_to/agent_executor">AgentExecutor</a> class. </p> </div> ## Setup This guide will use OpenAI's GPT-4o model. We will optionally set our API key for [LangSmith tracing](https://smith.langchain.com/), which will give us best-in-class observability. ```typescript // process.env.OPENAI_API_KEY = "sk_..."; // Optional, add tracing in LangSmith // process.env.LANGCHAIN_API_KEY = "ls__..."; process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "true"; process.env.LANGCHAIN_TRACING_V2 = "true"; process.env.LANGCHAIN_PROJECT = "Time Travel: LangGraphJS";
```

```
Time Travel: LangGraphJS
```

## Define the state

The state is the interface for all of the nodes in our graph.

```
import { Annotation } from "@langchain/langgraph"; import { BaseMessage } from "@langchain/core/messages"; const StateAnnotation = Annotation.Root({ messages: Annotation<BaseMessage[]>({ reducer: (x, y) => x.concat(y), }), });
```

## Set up the tools

We will first define the tools we want to use. For this simple example, we will use create a placeholder search engine. However, it is really easy to create your own tools - see documentation here on how to do that.

```
import { tool } from "@langchain/core/tools"; import { z } from "zod"; const searchTool = tool(async (_) => { // This is a placeholder for the actual implementation return "Cold, with a low of 13 °C"; }, { name: "search", description: "Use to surf the web, fetch current information, check the weather, and retrieve other information.", schema: z.object({ query: z.string().describe("The query to use in your search."), }), }); await searchTool.invoke({ query: "What's the weather like?" }); const tools = [searchTool];
```

We can now wrap these tools in a simple ToolNodee agent. Between interactions you can get and update state.

```
let config = { configurable: { thread_id: "conversation-num-1" } }; let inputs = { messages: [{ role: "user", content: "Hi I'm Jo." }] } as any; for await ( const { messages } of await graph.stream(inputs, { ...config, streamMode: "values", }) ) { let msg = messages[messages?.length - 1]; if (msg?.content) { console.log(msg.content); } else if (msg?.tool_calls?.length > 0) { console.log(msg.tool_calls); } else { console.log(msg); } console.log("-----\n"); }
```

```
Hi I'm Jo. -----
Hello, Jo! How can I assist you today? -----
```

See LangSmith example run here https://smith.langchain.com/public/b3feb09b-bcd2-4ad5-ad1d-414106148448/r

Here you can see the "agent" node ran, and then our edge returned __end__ so the graph stopped execution there.

Let's check the current graph state.

```
let checkpoint = await graph.getState(config); checkpoint.values;
```

```
{ messages: [ { role: 'user', content: "Hi I'm Jo." }, AIMessage { "id": "chatcmpl-A3FGf3k3QQo9q0QjT6Oc5h1XplkHr", "content": "Hello, Jo! How can I assist you today?", "additional_kwargs": {}, "response_metadata": { "tokenUsage": { "completionTokens": 12, "promptTokens": 68, "totalTokens": 80 }, "finish_reason": "stop", "system_fingerprint": "fp_fde2829a40" }, "tool_calls": [], "invalid_tool_calls": [] } ] }
```

The current state is the two messages we've seen above, 1. the HumanMessage we sent in, 2. the AIMessage we got back from the model.

The next values are empty since the graph has terminated (transitioned to the __end__).

```
checkpoint.next;
```

```
[]
```

## Let's get it to execute a tool

When we call the graph again, it will create a checkpoint after each internal execution step. Let's get it to run a tool, then look at the checkpoint.

```
inputs = { messages: [{ role: "user", content: "What's the weather like in SF currently?" }] } as any; for await ( const { messages } of await graph.stream(inputs, { ...config, streamMode: "values", }) ) { let msg = messages[messages?.length - 1]; if (msg?.content) { console.log(msg.content); } else if (msg?.tool_calls?.length > 0) { console.log(msg.tool_calls); } else { console.log(msg); } console.log("-----\n"); }
```

```
What's the weather like in SF currently? -----
``````output [ { name: 'search', args: { query: 'current weather in San Francisco' }, type: 'tool_call', id: 'call_ZtmtDOyEXDCnXDgowlit5dSd' } ] -----
Cold, with a low of 13 °C -----
The current weather in San Francisco is cold, with a low of 13°C. -----
```

See the trace of the above execution here: https://smith.langchain.com/public/0ef426fd-0da1-4c02-a50b-64ae1e68338e/r We can see it planned the tool execution (ie the "agent" node), then "should_continue" edge returned "continue" so we proceeded to "action" node, which executed the tool, and then "agent" node emitted the final response, which made "should_continue" edge return "end". Let's see how we can have more control over this.

### Pause before tools

If you notice below, we now will add interruptBefore=["action"] - this means that before any actions are taken we pause. This is a great moment to allow the user to correct and update the state! This is very useful when you want to have a human-in-the-loop to validate (and potentially change) the action to take.

```
memory = new MemorySaver(); const graphWithInterrupt = workflow.compile({ checkpointer: memory, interruptBefore: ["tools"], }); inputs = { messages: [{ role: "user", content: "What's the weather like in SF currently?" }] } as any; for await ( const { messages } of await graphWithInterrupt.stream(inputs, { ...config, streamMode: "values", }) ) { let msg = messages[messages?.length - 1]; if (msg?.content) { console.log(msg.content); } else if (msg?.tool_calls?.length > 0) { console.log(msg.tool_calls); } else { console.log(msg); } console.log("-----\n"); }
```

```
What's the weather like in SF currently? -----
[ { name: 'search', args: { query: 'current weather in San Francisco' }, type: 'tool_call', id: 'call_OsKnTv2psf879eeJ9vx5GeoY' } ] -----
```

## Get State

You can fetch the latest graph checkpoint using getState(config).

```
let snapshot = await graphWithInterrupt.getState(config); snapshot.next;
```

```
[ 'tools' ]
```

## Resume

You can resume by running the graph with a null input. The checkpoint is loaded, and with no new inputs, it will execute as if no interrupt had occurred.

```
for await ( const { messages } of await graphWithInterrupt.stream(null, { ...snapshot.config, streamMode: "values", }) ) { let msg = messages[messages?.length - 1]; if (msg?.content) { console.log(msg.content); } else if (msg?.tool_calls?.length > 0) { console.log(msg.tool_calls); } else { console.log(msg); } console.log("-----\n"); }
```

```
Cold, with a low of 13 °C -----
Currently, it is cold in San Francisco, with a temperature around 13°C (55°F). -----
```

## Check full history

Let's browse the history of this thread, from newest to oldest.

```
let toReplay; const states = await graphWithInterrupt.getStateHistory(config); for await (const state of states) { console.log(state); console.log("--"); if (state.values?.messages?.length === 2) { toReplay = state; } } if (!toReplay) { throw new Error("No state to replay"); }
```

```
{ values: { messages: [ [Object], AIMessage { "id": "chatcmpl-A3FGhKzOZs0GYZ2yalNOCQZyPgbcp", "content": "", "additional_kwargs": { "tool_calls": [ { "id": "call_OsKnTv2psf879eeJ9vx5GeoY", "type": "function", "function": "[Object]" } ] }, "response_metadata": { "tokenUsage": { "completionTokens": 17, "promptTokens": 72, "totalTokens": 89 }, "finish_reason": "tool_calls", "system_fingerprint": "fp_fde2829a40" }, "tool_calls": [ { "name": "search", "args": { "query": "current weather in San Francisco" }, "type": "tool_call", "id": "call_OsKnTv2psf879eeJ9vx5GeoY" } ], "invalid_tool_calls": [] }, ToolMessage { "content": "Cold, with a low of 13 °C", "name": "search", "additional_kwargs": {}, "response_metadata": {}, "tool_call_id": "call_OsKnTv2psf879eeJ9vx5GeoY" }, AIMessage { "id": "chatcmpl-A3FGiYripPKtQLnAK1H3hWLSXQfOD", "content": "Currently, it is cold in San Francisco, with a temperature around 13°C (55°F).", "additional_kwargs": {}, "response_metadata": { "tokenUsage": { "completionTokens": 21, "promptTokens": 105, "totalTokens": 126 }, "finish_reason": "stop", "system_fingerprint": "fp_fde2829a40" }, "tool_calls": [], "invalid_tool_calls": [] } ] }, next: [], tasks: [], metadata: { source: 'loop', writes: { agent: [Object] }, step: 3 }, config: { configurable: { thread_id: 'conversation-num-1', checkpoint_ns: '', checkpoint_id: '1ef69ab6-9c3a-6bd1-8003-d7f030ff72b2' } }, createdAt: '2024-09-03T04:17:20.653Z', parentConfig: { configurable: { thread_id: 'conversation-num-1', checkpoint_ns: '', checkpoint_id: '1ef69ab6-9516-6200-8002-43d2c6dc603f' } } } -----
{ values: { messages: [ [Object], AIMessage { "id": "chatcmpl-A3FGhKzOZs0GYZ2yalNOCQZyPgbcp", "content": "", "additional_kwargs": { "tool_calls": [ { "id": "call_OsKnTv2psf879eeJ9vx5GeoY", "type": "function", "function": "[Object]" } ] }, "response_metadata": { "tokenUsage": { "completionTokens": 17, "promptTokens": 72, "totalTokens": 89 }, "finish_reason": "tool_calls", "system_fingerprint": "fp_fde2829a40" }, "tool_calls": [ { "name": "search", "args": { "query": "current weather in San Francisco" }, "type": "tool_call", "id": "call_OsKnTv2psf879eeJ9vx5GeoY" } ], "invalid_tool_calls": [] } ] }, next: [ 'agent' ], tasks: [ { id: '612efffa-3b16-530f-8a39-fd01c31e7b8b', name: 'agent', interrupts: [] } ], metadata: { source: 'loop', writes: { tools: [Object] }, step: 2 }, config: { configurable: { thread_id: 'conversation-num-1', checkpoint_ns: '', checkpoint_id: '1ef69ab6-9516-6200-8002-43d2c6dc603f' } }, createdAt: '2024-09-03T04:17:19.904Z', parentConfig: { configurable: { thread_id: 'conversation-num-1', checkpoint_ns: '', checkpoint_id: '1ef69ab6-9455-6410-8001-1c78a97f63e6' } } } -----
{ values: { messages: [ [Object], AIMessage { "id": "chatcmpl-A3FGhKzOZs0GYZ2yalNOCQZyPgbcp", "content": "", "additional_kwargs": { "tool_calls": [ { "id": "call_OsKnTv2psf879eeJ9vx5GeoY", "type": "function", "function": "[Object]" } ] }, "response_metadata": { "tokenUsage": { "completionTokens": 17, "promptTokens": 72, "totalTokens": 89 }, "finish_reason": "tool_calls", "system_fingerprint": "fp_fde2829a40" }, "tool_calls": [ { "name": "search", "args": { "query": "current weather in San Francisco" }, "type": "tool_call", "id": "call_OsKnTv2psf879eeJ9vx5GeoY" } ], "invalid_tool_calls": [] } ] }, next: [ 'tools' ], tasks: [ { id: '767116b0-55b6-5af4-8f74-ce45fb6e31ed', name: 'tools', interrupts: [] } ], metadata: { source: 'loop', writes: { agent: [Object] }, step: 1 }, config: { configurable: { thread_id: 'conversation-num-1', checkpoint_ns: '', checkpoint_id: '1ef69ab6-9455-6410-8001-1c78a97f63e6' } }, createdAt: '2024-09-03T04:17:19.825Z', parentConfig: { configurable: { thread_id: 'conversation-num-1', checkpoint_ns: '', checkpoint_id: '1ef69ab6-8c4b-6261-8000-c51e5807fbcd' } } } -----
{ values: { messages: [ [Object] ] }, next: [ 'agent' ], tasks: [ { id: '5b0ed7d1-1bb7-5d78-b4fc-7a8ed40e7291', name: 'agent', interrupts: [] } ], metadata: { source: 'loop', writes: null, step: 0 }, config: { configurable: { thread_id: 'conversation-num-1', checkpoint_ns: '', checkpoint_id: '1ef69ab6-8c4b-6261-8000-c51e5807fbcd' } }, createdAt: '2024-09-03T04:17:18.982Z', parentConfig: { configurable: { thread_id: 'conversation-num-1', checkpoint_ns: '', checkpoint_id: '1ef69ab6-8c4b-6260-ffff-6ec582916c42' } } } -----
{ values: {}, next: [ '__start__' ], tasks: [ { id: 'a4250d5c-d025-5da1-b588-cae2b3f4a8c7', name: '__start__', interrupts: [] } ], metadata: { source: 'input', writes: { messages: [Array] }, step: -1 }, config: { configurable: { thread_id: 'conversation-num-1', checkpoint_ns: '', checkpoint_id: '1ef69ab6-8c4b-6260-ffff-6ec582916c42' } }, createdAt: '2024-09-03T04:17:18.982Z', parentConfig: undefined } ---
```

## Replay a past state

To replay from this place we just need to pass its config back to the agent.

```
for await ( const { messages } of await graphWithInterrupt.stream(null, { ...toReplay.config, streamMode: "values", }) ) { let msg = messages[messages?.length - 1]; if (msg?.content) { console.log(msg.content); } else if (msg?.tool_calls?.length > 0) { console.log(msg.tool_calls); } else { console.log(msg); } console.log("-----\n"); }
```

```
Cold, with a low of 13 °C -----
The current weather in San Francisco is cold, with a low of 13°C. -----
```

## Branch off a past state

Using LangGraph's checkpointing, you can do more than just replay past states. You can branch off previous locations to let the agent explore alternate trajectories or to let a user "version control" changes in a workflow.

#### First, update a previous checkpoint

Updating the state will create a new snapshot by applying the update to the previous checkpoint. Let's add a tool message to simulate calling the tool.

```
const tool_calls = toReplay.values.messages[toReplay.values.messages.length - 1].tool_calls; const branchConfig = await graphWithInterrupt.updateState( toReplay.config, { messages: [ { role: "tool", content: "It's sunny out, with a high of 38 °C.", tool_call_id: tool_calls[0].id }, ], }, // Updates are applied "as if" they were coming from a node. By default, // the updates will come from the last node to run. In our case, we want to treat // this update as if it came from the tools node, so that the next node to run will be // the agent. "tools", ); const branchState = await graphWithInterrupt.getState(branchConfig); console.log(branchState.values); console.log(branchState.next);
```

```
{ messages: [ { role: 'user', content: "What's the weather like in SF currently?" }, AIMessage { "id": "chatcmpl-A3FGhKzOZs0GYZ2yalNOCQZyPgbcp", "content": "", "additional_kwargs": { "tool_calls": [ { "id": "call_OsKnTv2psf879eeJ9vx5GeoY", "type": "function", "function": "[Object]" } ] }, "response_metadata": { "tokenUsage": { "completionTokens": 17, "promptTokens": 72, "totalTokens": 89 }, "finish_reason": "tool_calls", "system_fingerprint": "fp_fde2829a40" }, "tool_calls": [ { "name": "search", "args": { "query": "current weather in San Francisco" }, "type": "tool_call", "id": "call_OsKnTv2psf879eeJ9vx5GeoY" } ], "invalid_tool_calls": [] }, { role: 'tool', content: "It's sunny out, with a high of 38 °C.", tool_call_id: 'call_OsKnTv2psf879eeJ9vx5GeoY' } ] }
[ 'agent' ]
```

#### Now you can run from this branch

Just use the updated config (containing the new checkpoint ID). The trajectory will follow the new branch.

```
for await ( const { messages } of await graphWithInterrupt.stream(null, { ...branchConfig, streamMode: "values", }) ) { let msg = messages[messages?.length - 1]; if (msg?.content) { console.log(msg.content); } else if (msg?.tool_calls?.length > 0) { console.log(msg.tool_calls); } else { console.log(msg); } console.log("-----\n"); }
```

```
The current weather in San Francisco is sunny, with a high of 38°C. -----
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders