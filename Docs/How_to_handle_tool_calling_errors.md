How to handle tool calling errors

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to handle tool calling errors¶

LLMs aren't perfect at calling tools. The model may try to call a tool that doesn't exist or fail to return arguments that match the requested schema. Strategies like keeping schemas simple, reducing the number of tools you pass at once, and having good names and descriptions can help mitigate this risk, but aren't foolproof.

This guide covers some ways to build error handling into your graphs to mitigate these failure modes.

Compatibility

This guide requires @langchain/langgraph>=0.0.28, @langchain/anthropic>=0.2.6, and @langchain/core>=0.2.17. For help upgrading, see this guide.

## Using the prebuilt ToolNode¶

To start, define a mock weather tool that has some hidden restrictions on input queries:

```
$ npm install @langchain/langgraph @langchain/anthropic @langchain/core
```

```
import { z } from "zod"; import { tool } from "@langchain/core/tools"; const getWeather = tool(async ({ location }) => { if (location === "SAN FRANCISCO") { return "It's 60 degrees and foggy"; } else if (location.toLowerCase() === "san francisco") { throw new Error("Input queries must be all capitals"); } else { throw new Error("Invalid input."); } }, { name: "get_weather", description: "Call to get the current weather", schema: z.object({ location: z.string(), }), });
```

Next, set up a graph implementation of the ReAct agent. This agent takes some query as input, then repeatedly call tools until it has enough information to resolve the query. We'll use the prebuilt ToolNode to execute called tools, and a small, fast model powered by Anthropic:

```
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph"; import { ToolNode } from "@langchain/langgraph/prebuilt"; import { ChatAnthropic } from "@langchain/anthropic"; import { BaseMessage, isAIMessage } from "@langchain/core/messages"; const toolNode = new ToolNode([getWeather]); const modelWithTools = new ChatAnthropic({ model: "claude-3-haiku-20240307", temperature: 0, }).bindTools([getWeather]); const shouldContinue = async (state: typeof MessagesAnnotation.State) => { const { messages } = state; const lastMessage = messages[messages.length - 1]; if (isAIMessage(lastMessage) && lastMessage.tool_calls?.length) { return "tools"; } return "__end__"; } const callModel = async (state: typeof MessagesAnnotation.State) => { const { messages } = state; const response = await modelWithTools.invoke(messages); return { messages: [response] }; } const app = new StateGraph(MessagesAnnotation) .addNode("agent", callModel) .addNode("tools", toolNode) .addEdge("__start__", "agent") .addEdge("tools", "agent") .addConditionalEdges("agent", shouldContinue, { // Explicitly list possible destinations so that // we can automatically draw the graph below. tools: "tools", __end__: "__end__", }) .compile();
```

```
import * as tslab from "tslab"; const graph = app.getGraph(); const image = await graph.drawMermaidPng(); const arrayBuffer = await image.arrayBuffer(); await tslab.display.png(new Uint8Array(arrayBuffer));
```

When you try to call the tool, you can see that the model calls the tool with a bad input, causing the tool to throw an error. The prebuilt ToolNode that executes the tool has some built-in error handling that captures the error and passes it back to the model so that it can try again:

```
const response = await app.invoke({ messages: [ { role: "user", content: "what is the weather in san francisco?"},
 ] }); for (const message of response.messages) { // Anthropic returns tool calls in content as well as in `AIMessage.tool_calls` const content = JSON.stringify(message.content, null, 2); console.log(`${message._getType().toUpperCase()}: ${content}`); }
```

```
HUMAN: "what is the weather in san francisco?" AI: [ { "type": "text", "text": "Okay, let's check the weather in San Francisco:" }, { "type": "tool_use", "id": "toolu_015dywEMjSJsjkgP91VDbm52", "name": "get_weather", "input": { "location": "San Francisco" } } ] TOOL: "Error: Input queries must be all capitals\n Please fix your mistakes." AI: [ { "type": "text", "text": "Apologies, let me try that again with the location in all capital letters:" }, { "type": "tool_use", "id": "toolu_01Qw6t7p9UGk8aHQh7qtLJZT", "name": "get_weather", "input": { "location": "SAN FRANCISCO" } } ] TOOL: "It's 60 degrees and foggy" AI: "The weather in San Francisco is 60 degrees and foggy."
```

## Custom strategies¶

This is a fine default in many cases, but there are cases where custom fallbacks may be better.

For example, the below tool requires as input a list of elements of a specific length - tricky for a small model! We'll also intentionally avoid pluralizing topic to trick the model into thinking it should pass a string:

```
import { StringOutputParser } from "@langchain/core/output_parsers"; const getElements = tool(async ({ topic, num_elements }) => { if (num_elements !== 3) { throw new Error("num_elements must be 3"); } return `Here are 3 elements about ${topic}: element1, element2, element3`; }, { name: "get_elements", description: "Call to get a list of elements about a topic", schema: z.object({ topic: z.string(), num_elements: z.number(), }), }); const modelWithToolsAndParser = new ChatAnthropic({ model: "claude-3-haiku-20240307", temperature: 0, }).bindTools([getElements]).pipe(new StringOutputParser());
```

We can then define a custom tool node that handles errors by returning a message to the LLM:

```
import { ToolMessage } from "@langchain/core/messages"; const customToolNode = async (state: typeof MessagesAnnotation.State) => { const { messages } = state; const lastMessage = messages[messages.length - 1]; try { return { messages: [await toolNode.invoke(lastMessage)] }; } catch (e) { return { messages: [new ToolMessage({ content: e.message, name: lastMessage.tool_calls[0].name, tool_call_id: lastMessage.tool_calls[0].id, })] }; } };
```

We can then use this custom tool node in our graph:

```
const appWithCustomToolNode = new StateGraph(MessagesAnnotation) .addNode("agent", callModel) .addNode("tools", customToolNode) .addEdge("__start__", "agent") .addEdge("tools", "agent") .addConditionalEdges("agent", shouldContinue, { tools: "tools", __end__: "__end__", }) .compile();
```

```
const response2 = await appWithCustomToolNode.invoke({ messages: [ { role: "user", content: "what are 3 elements about cats?"}, ] }); for (const message of response2.messages) { const content = JSON.stringify(message.content, null, 2); console.log(`${message._getType().toUpperCase()}: ${content}`); }
```

```
HUMAN: "what are 3 elements about cats?" AI: [ { "type": "text", "text": "Okay, I can help you with that. I'll find 3 elements about cats." }, { "type": "tool_use", "id": "toolu_015dywEMjSJsjkgP91VDbm52", "name": "get_elements", "input": { "topic": "cats", "num_elements": 3 } } ] TOOL: "num_elements must be 3" AI: "I apologize, it seems I made a mistake. I'm having trouble retrieving the elements about cats. Could you please rephrase your request or ask about something else?"
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders