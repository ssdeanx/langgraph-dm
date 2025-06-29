How to configure multiple streaming modes at the same time

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to configure multiple streaming modes at the same time¶

This guide covers how to configure multiple streaming modes at the same time.

## Setup¶

First we need to install the packages required

```
npm install @langchain/langgraph @langchain/openai @langchain/core
```

Next, we need to set API keys for OpenAI (the LLM we will use)

```
export OPENAI_API_KEY=your-api-key
```

Optionally, we can set API key for LangSmith tracing, which will give us best-in-class observability.

```
export LANGCHAIN_TRACING_V2="true" export LANGCHAIN_CALLBACKS_BACKGROUND="true" export LANGCHAIN_API_KEY=your-api-key
```

## Define the graph¶

We'll be using a prebuilt ReAct agent for this guide.

```
import { ChatOpenAI } from "@langchain/openai"; import { tool } from '@langchain/core/tools'; import { z } from 'zod'; import { createReactAgent } from "@langchain/langgraph/prebuilt"; const model = new ChatOpenAI({ model: "gpt-4o", }); const getWeather = tool((input) => { if (["sf", "san francisco", "san francisco, ca"].includes(input.location.toLowerCase())) { return "It's 60 degrees and foggy."; } else { return "It's 90 degrees and sunny."; } }, { name: "get_weather", description: "Call to get the current weather.", schema: z.object({ location: z.string().describe("Location to get the weather for."), }) }) const graph = createReactAgent({ llm: model, tools: [getWeather] });
```

## Stream Multiple¶

To get multiple types of streamed chunks, pass an array of values under the streamMode key in the second argument to .stream():

```
let inputs = { messages: [{ role: "user", content: "what's the weather in sf?" }] }; let stream = await graph.stream(inputs, { streamMode: ["updates", "debug"],
}); for await (const chunk of stream) { console.log(`Receiving new event of type: ${chunk[0]}`); console.log(chunk[1]); console.log("\n====\n"); }
```

```
Receiving new event of type: debug { type: 'task', timestamp: '2024-08-30T20:58:58.404Z', step: 1, payload: { id: '768110dd-6004-59f3-8671-6ca699cccd71', name: 'agent', input: { messages: [Array] }, triggers: [ 'start:agent' ], interrupts: [] } } ==== Receiving new event of type: updates { agent: { messages: [ AIMessage { "id": "chatcmpl-A22zqTwumhtW8TMjQ1FxlzCEMBk0R", "content": "", "additional_kwargs": { "tool_calls": [ { "id": "call_HAfilebE1q9E9OQHOlL3JYHP", "type": "function", "function": "[Object]" } ] }, "response_metadata": { "tokenUsage": { "completionTokens": 15, "promptTokens": 59, "totalTokens": 74 }, "finish_reason": "tool_calls", "system_fingerprint": "fp_157b3831f5" }, "tool_calls": [ { "name": "get_weather", "args": { "location": "San Francisco" }, "type": "tool_call", "id": "call_HAfilebE1q9E9OQHOlL3JYHP" } ], "invalid_tool_calls": [], "usage_metadata": { "input_tokens": 59, "output_tokens": 15, "total_tokens": 74 } } ] } } ==== Receiving new event of type: debug { type: 'task_result', timestamp: '2024-08-30T20:58:59.072Z', step: 1, payload: { id: '768110dd-6004-59f3-8671-6ca699cccd71', name: 'agent', result: [ [Array] ] } } ==== Receiving new event of type: debug { type: 'task', timestamp: '2024-08-30T20:58:59.074Z', step: 2, payload: { id: '76459c18-5621-5893-9b93-13bc1db3ba6d', name: 'tools', input: { messages: [Array] }, triggers: [ 'branch:agent:shouldContinue:tools' ], interrupts: [] } } ==== Receiving new event of type: updates { tools: { messages: [ ToolMessage { "content": "It's 60 degrees and foggy.", "name": "get_weather", "additional_kwargs": {}, "response_metadata": {}, "tool_call_id": "call_HAfilebE1q9E9OQHOlL3JYHP" } ] } } ==== Receiving new event of type: debug { type: 'task_result', timestamp: '2024-08-30T20:58:59.076Z', step: 2, payload: { id: '76459c18-5621-5893-9b93-13bc1db3ba6d', name: 'tools', result: [ [Array] ] } } ==== Receiving new event of type: debug { type: 'task', timestamp: '2024-08-30T20:58:59.077Z', step: 3, payload: { id: '565d8a53-1057-5d83-bda8-ba3fada24b70', name: 'agent', input: { messages: [Array] }, triggers: [ 'tools' ], interrupts: [] } } ==== Receiving new event of type: updates { agent: { messages: [ AIMessage { "id": "chatcmpl-A22zrdeobsBzkiES0C6Twh3p7I344", "content": "The weather in San Francisco right now is 60 degrees and foggy.", "additional_kwargs": {}, "response_metadata": { "tokenUsage": { "completionTokens": 16, "promptTokens": 90, "totalTokens": 106 }, "finish_reason": "stop", "system_fingerprint": "fp_157b3831f5" }, "tool_calls": [], "invalid_tool_calls": [], "usage_metadata": { "input_tokens": 90, "output_tokens": 16, "total_tokens": 106 } } ] } } ==== Receiving new event of type: debug { type: 'task_result', timestamp: '2024-08-30T20:58:59.640Z', step: 3, payload: { id: '565d8a53-1057-5d83-bda8-ba3fada24b70', name: 'agent', result: [ [Array] ] } } ====

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders