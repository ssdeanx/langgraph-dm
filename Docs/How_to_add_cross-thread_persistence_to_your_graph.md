How to add cross-thread persistence to your graph

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to add cross-thread persistence to your graph¶

Prerequisites

This guide assumes familiarity with the following:

* Persistence
* Memory
* Chat Models

In the previous guide you learned how to persist graph state across multiple interactions on a single thread. LangGraph.js also allows you to persist data across multiple threads. For instance, you can store information about users (their names or preferences) in a shared memory and reuse them in the new conversational threads.

In this guide, we will show how to construct and use a graph that has a shared memory implemented using the Store interface.

Note

Support for the Store API that is used in this guide was added in LangGraph.js v0.2.10.

## Setup¶

First, let's install the required packages and set our API keys.

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here.

```
// process.env.OPENAI_API_KEY = "sk_..."; // Optional, add tracing in LangSmith // process.env.LANGCHAIN_API_KEY = "lsv2__..."; // process.env.ANTHROPIC_API_KEY = "your api key"; // process.env.LANGCHAIN_TRACING_V2 = "true"; // process.env.LANGCHAIN_PROJECT = "Cross-thread persistence: LangGraphJS";
```

## Define store¶

In this example we will create a graph that will be able to retrieve information about a user's preferences. We will do so by defining an InMemoryStore - an object that can store data in memory and query that data. We will then pass the store object when compiling the graph. This allows each node in the graph to access the store: when you define node functions, you can define store keyword argument, and LangGraph will automatically pass the store object you compiled the graph with.

When storing objects using the Store interface you define two things:

* the namespace for the object, a tuple (similar to directories)
* the object key (similar to filenames)

In our example, we'll be using ("memories", <userId>) as namespace and random UUID as key for each new memory.

Importantly, to determine the user, we will be passing userId via the config keyword argument of the node function.

Let's first define an InMemoryStore which is already populated with some memories about the users.

```
import { InMemoryStore } from "@langchain/langgraph"; const inMemoryStore = new InMemoryStore();
```

## Create graph¶

```
import { v4 as uuidv4 } from "uuid"; import { ChatAnthropic } from "@langchain/anthropic"; import { BaseMessage } from "@langchain/core/messages"; import { Annotation, StateGraph, START, MemorySaver, LangGraphRunnableConfig, messagesStateReducer, } from "@langchain/langgraph"; const StateAnnotation = Annotation.Root({ messages: Annotation<BaseMessage[]>({ reducer: messagesStateReducer, default: () => [], }), }); const model = new ChatAnthropic({ modelName: "claude-3-5-sonnet-20240620" }); // NOTE: we're passing the Store param to the node -- // this is the Store we compile the graph with const callModel = async ( state: typeof StateAnnotation.State, config: LangGraphRunnableConfig ): Promise<{ messages: any }> => { const store = config.store; if (!store) { if (!store) { throw new Error("store is required when compiling the graph"); } } if (!config.configurable?.userId) { throw new Error("userId is required in the config"); } const namespace = ["memories", config.configurable?.userId]; const memories = await store.search(namespace);
const info = memories.map((d) => d.value.data).join("\n"); const systemMsg = `You are a helpful assistant talking to the user. User info: ${info}`; // Store new memories if the user asks the model to remember const lastMessage = state.messages[state.messages.length - 1]; if (
typeof lastMessage.content === "string" && lastMessage.content.toLowerCase().includes("remember")
) {
await store.put(namespace, uuidv4(), { data: lastMessage.content }); } const response = await model.invoke([
{ type: "system", content: systemMsg }, ...state.messages,
]); return { messages: [response] }; }; const builder = new StateGraph(StateAnnotation)
.addNode("call_model", callModel)
.addEdge(START, "call_model"); // NOTE: we're passing the store object here when compiling the graph const graph = builder.compile({ checkpointer: new MemorySaver(), store: inMemoryStore, }); // If you're using LangGraph Cloud or LangGraph Studio, you don't need to pass the store or checkpointer when compiling the graph, since it's done automatically.
```

Note

If you're using LangGraph Cloud or LangGraph Studio, you don't need to pass store when compiling the graph, since it's done automatically.

## Run the graph!¶

Now let's specify a user ID in the config and tell the model our name:

```
let config = { configurable: { thread_id: "1", userId: "1", }, }; let inputs = { messages: [{ role: "user", content: "Hi! Remember: my name is Bob" }], }; let stream = await graph.stream(inputs, { ...config, streamMode: "values", }); for await (const chunk of stream) { console.log(chunk); }
```

```
{ call_model: { messages: [
AIMessage { "id": "msg_01U4xHvf4REPSCGWzpLeh1qJ", "content": "Hi Bob! Nice to meet you. I'll remember that your name is Bob. How can I help you today?", "additional_kwargs": { "id": "msg_01U4xHvf4REPSCGWzpLeh1qJ", "type": "message", "role": "assistant", "model": "claude-3-5-sonnet-20241022", "stop_reason": "end_turn", "stop_sequence": null, "usage": { "input_tokens": 28, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "output_tokens": 27 } }, "response_metadata": { "id": "msg_01U4xHvf4REPSCGWzpLeh1qJ", "model": "claude-3-5-sonnet-20241022", "stop_reason": "end_turn", "stop_sequence": null, "usage": { "input_tokens": 28, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "output_tokens": 27 }, "type": "message", "role": "assistant" }, "tool_calls": [], "invalid_tool_calls": [], "usage_metadata": { "input_tokens": 28, "output_tokens": 27, "total_tokens": 55, "input_token_details": { "cache_creation": 0, "cache_read": 0 } } } ] } }
```

Now let's ask the model what our name is:

```
let config2 = { configurable: { thread_id: "2", userId: "1", }, }; let inputs2 = { messages: [{ role: "user", content: "what is my name?" }], }; let stream2 = await graph.stream(inputs2, { ...config2, streamMode: "values", }); for await (const chunk of stream2) { console.log(chunk); }
```

```
{ call_model: { messages: [
AIMessage { "id": "msg_01LB4YapkFawBUbpiu3oeWbF", "content": "Your name is Bob.", "additional_kwargs": { "id": "msg_01LB4YapkFawBUbpiu3oeWbF", "type": "message", "role": "assistant", "model": "claude-3-5-sonnet-20241022", "stop_reason": "end_turn", "stop_sequence": null, "usage": { "input_tokens": 28, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "output_tokens": 8 } }, "response_metadata": { "id": "msg_01LB4YapkFawBUbpiu3oeWbF", "model": "claude-3-5-sonnet-20241022", "stop_reason": "end_turn", "stop_sequence": null, "usage": { "input_tokens": 28, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "output_tokens": 8 }, "type": "message", "role": "assistant" }, "tool_calls": [], "invalid_tool_calls": [], "usage_metadata": { "input_tokens": 28, "output_tokens": 8, "total_tokens": 36, "input_token_details": { "cache_creation": 0, "cache_read": 0 } } } ] } }
```

We can now inspect our in-memory store and verify that we have in fact saved the memories for the user:

```
const memories = await inMemoryStore.search(["memories", "1"]); for (const memory of memories) { console.log(memory.value); }
```

```
{ data: 'Username is Bob' }
```

Let's now run the workflow for another user to verify that the memories about the first user are self contained:

```
let config3 = { configurable: { thread_id: "3", userId: "2", }, }; let inputs3 = { messages: [{ role: "user", content: "what is my name?" }], }; let stream3 = await graph.stream(inputs3, { ...config3, streamMode: "values", }); for await (const chunk of stream3) { console.log(chunk); }
```

```
{ call_model: { messages: [
AIMessage { "id": "msg_01KK7CweVY4ZdHxU5bPa4skv", "content": "I don't have any information about your name. While I aim to be helpful, I can only know what you directly tell me during our conversation.", "additional_kwargs": { "id": "msg_01KK7CweVY4ZdHxU5bPa4skv", "type": "message", "role": "assistant", "model": "claude-3-5-sonnet-20241022", "stop_reason": "end_turn", "stop_sequence": null, "usage": { "input_tokens": 25, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "output_tokens": 33 } }, "response_metadata": { "id": "msg_01KK7CweVY4ZdHxU5bPa4skv", "model": "claude-3-5-sonnet-20241022", "stop_reason": "end_turn", "stop_sequence": null, "usage": { "input_tokens": 25, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "output_tokens": 33 }, "type": "message", "role": "assistant" }, "tool_calls": [], "invalid_tool_calls": [], "usage_metadata": { "input_tokens": 25, "output_tokens": 33, "total_tokens": 58, "input_token_details": { "cache_creation": 0, "cache_read": 0 } } } ] } }
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders