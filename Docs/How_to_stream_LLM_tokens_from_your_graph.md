How to stream LLM tokens from your graph

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to stream LLM tokens from your graph¶

In this example, we will stream tokens from the language model powering an agent. We will use a ReAct agent as an example.

Note

If you are using a version of @langchain/core < 0.2.3, when calling chat models or LLMs you need to call await model.stream() within your nodes to get token-by-token streaming events, and aggregate final outputs if needed to update the graph state. In later versions of @langchain/core, this occurs automatically, and you can call await model.invoke(). For more on how to upgrade @langchain/core, check out the instructions here.

This how-to guide closely follows the others in this directory, showing how to incorporate the functionality into a prototypical agent in LangGraph.

Streaming Support

Token streaming is supported by many, but not all chat models. Check to see if your LLM integration supports token streaming here (doc). Note that some integrations may support general token streaming but lack support for streaming tool calls.

Note

In this how-to, we will create our agent from scratch to be transparent (but verbose). You can accomplish similar functionality using the createReactAgent({ llm, tools }) (API doc) constructor. This may be more appropriate if you are used to LangChain's AgentExecutor class.

## Setup¶

This guide will use OpenAI's GPT-4o model. We will optionally set our API key for LangSmith tracing, which will give us best-in-class observability.

```
// process.env.OPENAI_API_KEY = "sk_..."; // Optional, add tracing in LangSmith // process.env.LANGCHAIN_API_KEY = "ls__..."; // process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "true"; // process.env.LANGCHAIN_TRACING = "true"; // process.env.LANGCHAIN_PROJECT = "Stream Tokens: LangGraphJS";
```

## Define the state¶

The state is the interface for all of the nodes in our graph.

```
import { Annotation } from "@langchain/langgraph"; import type { BaseMessageLike } from "@langchain/core/messages"; const StateAnnotation = Annotation.Root({ messages: Annotation<BaseMessageLike[]>({ reducer: (x, y) => x.concat(y), }), });
```

## Set up the tools¶

First define the tools you want to use. For this simple example, we'll create a placeholder search engine, but see the documentation here on how to create your own custom tools.

```
import { tool } from "@langchain/core/tools"; import { z } from "zod"; const searchTool = tool((_) => { // This is a placeholder for the actual implementation return "Cold, with a low of 3°C"; }, { name: "search", description: "Use to surf the web, fetch current information, check the weather, and retrieve other information.", schema: z.object({ query: z.string().describe("The query to use in your search."), }), }); await searchTool.invoke({ query: "What's the weather like?" }); const tools = [searchTool];
```

We can now wrap these tools in a prebuilt ToolNode. This object will actually run the tools (functions) whenever they are invoked by our LLM.

```
import { ToolNode } from "@langchain/langgraph/prebuilt"; const toolNode = new ToolNode(tools);
```

## Set up the model¶

Now load the chat model.

1. It should work with messages. We will represent all agent state in the form of messages, so it needs to be able to work well with them.
2. It should work with tool calling, meaning it can return function arguments in its response.

Note

These model requirements are not general requirements for using LangGraph - they are just requirements for this one example.

```
import { ChatOpenAI } from "@langchain/openai"; const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0, });
```

After you've done this, we should make sure the model knows that it has these tools available to call. We can do this by calling bindTools.

```
const boundModel = model.bindTools(tools);
```

## Define the graph¶

We can now put it all together.

```
import { StateGraph, END } from "@langchain/langgraph"; import { AIMessage } from "@langchain/core/messages"; const routeMessage = (state: typeof StateAnnotation.State) => { const { messages } = state; const lastMessage = messages[messages.length - 1] as AIMessage; // If no tools are called, we can finish (respond to the user) if (!lastMessage?.tool_calls?.length) { return END; } // Otherwise if there is, we continue and call the tools return "tools"; }; const callModel = async ( state: typeof StateAnnotation.State, ) => { // For versions of @langchain/core < 0.2.3, you must call `.stream()` // and aggregate the message from chunks instead of calling `.invoke()`. const { messages } = state; const responseMessage = await boundModel.invoke(messages); return { messages: [responseMessage] }; }; const workflow = new StateGraph(StateAnnotation) .addNode("agent", callModel) .addNode("tools", toolNode) .addEdge("__start__", "agent") .addConditionalEdges("agent", routeMessage) .addEdge("tools", "agent"); const graph = workflow.compile();
```

## Stream tokens¶

We can now interact with the agent. Between interactions you can get and update state.

```
let inputs = { messages: [{ role: "user", content: "what's the weather in sf" }] }; for await ( const chunk of await graph.stream(inputs, { streamMode: "stream_tokens", }) ) { console.log(chunk); }
```

```
{ agent: '' } { agent: 'The' } { agent: ' weather' } { agent: ' in' } { agent: ' San' } { agent: ' Francisco' } { agent: ' is' } { agent: ' cold' } { agent: ',' } { agent: ' with' } { agent: ' a' } { agent: ' low' } { agent: ' of' } { agent: ' 3' } { agent: '°C.' } { agent: '' }
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders