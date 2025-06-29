How to stream LLM tokens (without LangChain models)

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to stream LLM tokens (without LangChain models)¶

In this guide, we will stream tokens from the language model powering an agent without using LangChain chat models. We'll be using the OpenAI client library directly in a ReAct agent as an example.

## Setup¶

To get started, install the openai and langgraph packages separately:

```
$ npm install openai @langchain/langgraph @langchain/core
```

Compatibility

This guide requires @langchain/core>=0.2.19, and if you are using LangSmith, langsmith>=0.1.39. For help upgrading, see this guide.

You'll also need to make sure you have your OpenAI key set as process.env.OPENAI\_API\_KEY.

## Defining a model and a tool schema¶

First, initialize the OpenAI SDK and define a tool schema for the model to populate using OpenAI's format:

```
import OpenAI from "openai"; const openaiClient = new OpenAI({}); const toolSchema: OpenAI.ChatCompletionTool = { type: "function", function: { name: "get_items", description: "Use this tool to look up which items are in the given place.", parameters: { type: "object", properties: { place: { type: "string", }, }, required: ["place"], } } };
```

## Calling the model¶

Now, define a method for a LangGraph node that will call the model. It will handle formatting tool calls to and from the model, as well as streaming via custom callback events.

If you are using LangSmith, you can also wrap the OpenAI client for the same nice tracing you'd get with a LangChain chat model.

Here's what that looks like:

```
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch"; import { wrapOpenAI } from "langsmith/wrappers/openai"; import { Annotation } from "@langchain/langgraph"; const StateAnnotation = Annotation.Root({ messages: Annotation<OpenAI.ChatCompletionMessageParam[]>({ reducer: (x, y) => x.concat(y), }), }); // If using LangSmith, use "wrapOpenAI" on the whole client or // "traceable" to wrap a single method for nicer tracing: // https://docs.smith.langchain.com/how_to_guides/tracing/annotate_code const wrappedClient = wrapOpenAI(openaiClient); const callModel = async (state: typeof StateAnnotation.State) => { const { messages } = state; const stream = await wrappedClient.chat.completions.create({ messages, model: "gpt-4o-mini", tools: [toolSchema], stream: true, }); let responseContent = ""; let role: string = "assistant"; let toolCallId: string | undefined; let toolCallName: string | undefined; let toolCallArgs = ""; for await (const chunk of stream) { const delta = chunk.choices[0].delta; if (delta.role !== undefined) { role = delta.role; } if (delta.content) { responseContent += delta.content; await dispatchCustomEvent("streamed_token", { content: delta.content, }); } if (delta.tool_calls !== undefined && delta.tool_calls.length > 0) { // note: for simplicity we're only handling a single tool call here const toolCall = delta.tool_calls[0]; if (toolCall.function?.name !== undefined) { toolCallName = toolCall.function.name; } if (toolCall.id !== undefined) { toolCallId = toolCall.id; } await dispatchCustomEvent("streamed_tool_call_chunk", toolCall); toolCallArgs += toolCall.function?.arguments ?? ""; } } let finalToolCalls; if (toolCallName !== undefined && toolCallId !== undefined) { finalToolCalls = [{ id: toolCallId, function: { name: toolCallName, arguments: toolCallArgs }, type: "function" as const, }]; } const responseMessage = { role: role as any, content: responseContent, tool_calls: finalToolCalls, }; return { messages: [responseMessage] }; }
```

Note that you can't call this method outside of a LangGraph node since dispatchCustomEvent will fail if it is called outside the proper context.

## Define tools and a tool-calling node¶

Next, set up the actual tool function and the node that will call it when the model populates a tool call:

```
const getItems = async ({ place }: { place: string }) => { if (place.toLowerCase().includes("bed")) { // For under the bed return "socks, shoes and dust bunnies"; } else if (place.toLowerCase().includes("shelf")) { // For 'shelf' return "books, pencils and pictures"; } else { // if the agent decides to ask about a different place return "cat snacks"; } }; const callTools = async (state: typeof StateAnnotation.State) => { const { messages } = state; const mostRecentMessage = messages[messages.length - 1]; const toolCalls = (mostRecentMessage as OpenAI.ChatCompletionAssistantMessageParam).tool_calls; if (toolCalls === undefined || toolCalls.length === 0) { throw new Error("No tool calls passed to node."); } const toolNameMap = { get_items: getItems, }; const functionName = toolCalls[0].function.name; const functionArguments = JSON.parse(toolCalls[0].function.arguments); const response = await toolNameMap[functionName](functionArguments); const toolMessage = { tool_call_id: toolCalls[0].id, role: "tool" as const, content: response, }; return { messages: [toolMessage] }; };
```

## Define the graph¶

Now, define the graph. It will have two nodes:

1. The agent: responsible for deciding what (if any) actions to take.
2. A function to invoke tools: if the agent decides to take an action, this node will then execute that action.

We will also need to define some edges. Some of these edges may be conditional. The reason they are conditional is that based on the output of a node, one of several paths may be taken. The path that is taken is not known until that node is run (the LLM decides).

1. Conditional Edge: after the agent is called, we should either: a. If the agent said to take an action, then the function to invoke tools should be called\ b. If the agent said that it was finished, then it should finish
2. Normal Edge: after the tools are invoked, it should always go back to the agent to decide what to do next

```
import { StateGraph, END } from "@langchain/langgraph"; import { AIMessage } from "@langchain/core/messages"; const routeMessage = (state: typeof StateAnnotation.State) => { const { messages } = state; const lastMessage = messages[messages.length - 1] as AIMessage; // If no tools are called, we can finish (respond to the user) if (!lastMessage?.tool_calls?.length) { return END; } // Otherwise if there is, we continue and call the tools return "tools"; }; const workflow = new StateGraph(StateAnnotation) .addNode("agent", callModel) .addNode("tools", callTools) .addEdge("__start__", "agent") .addConditionalEdges("agent", routeMessage) .addEdge("tools", "agent"); const graph = workflow.compile();
```

## Use it!¶

We can now interact with the agent. Between interactions you can get and update state.

```
let inputs = { messages: [{ role: "user", content: "what's under the bed?" }] }; for await ( const chunk of await graph.stream(inputs, { streamMode: "stream_tokens", }) ) { console.log(chunk); }
```

```
{ agent: '' } { agent: 'Under' } { agent: ' the' } { agent: ' bed' } { agent: ' you' } { agent: ' might' } { agent: ' find' } { agent: ' socks' } { agent: ',' } { agent: ' shoes' } { agent: ' and' } { agent: ' dust' } { agent: ' bunnies.' } { agent: '' }
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders