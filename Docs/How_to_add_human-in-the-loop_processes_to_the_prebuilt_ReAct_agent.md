How to add human-in-the-loop processes to the prebuilt ReAct agent

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to add human-in-the-loop processes to the prebuilt ReAct agent¶

This tutorial will show how to add human-in-the-loop processes to the prebuilt ReAct agent. Please see this tutorial for how to get started with the prebuilt ReAct agent

You can add a breakpoint before tools are called by passing interruptBefore: ["tools"] to createReactAgent. Note that you need to be using a checkpointer for this to work.

## Setup¶

First, we need to install the required packages.

```
yarn add @langchain/langgraph @langchain/openai @langchain/core
```

This guide will use OpenAI's GPT-4o model. We will optionally set our API key for LangSmith tracing, which will give us best-in-class observability.

```
// process.env.OPENAI_API_KEY = "sk_..."; // Optional, add tracing in LangSmith // process.env.LANGCHAIN_API_KEY = "ls__..." // process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "true"; process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "true"; process.env.LANGCHAIN_TRACING_V2 = "true"; process.env.LANGCHAIN_PROJECT = "ReAct Agent with human-in-the-loop: LangGraphJS";
```

```
ReAct Agent with human-in-the-loop: LangGraphJS
```

## Code¶

Now we can use the prebuilt createReactAgent function to setup our agent with human-in-the-loop interactions:

```
import { ChatOpenAI } from "@langchain/openai"; import { tool } from '@langchain/core/tools'; import { z } from 'zod'; import { createReactAgent } from "@langchain/langgraph/prebuilt"; import { MemorySaver } from "@langchain/langgraph"; const model = new ChatOpenAI({ model: "gpt-4o", }); const getWeather = tool((input) => { if (['sf', 'san francisco'].includes(input.location.toLowerCase())) { return 'It\'s always sunny in sf'; } else if (['nyc', 'new york city'].includes(input.location.toLowerCase())) { return 'It might be cloudy in nyc'; } else { throw new Error("Unknown Location"); } }, { name: 'get_weather', description: 'Call to get the current weather in a given location.', schema: z.object({ location: z.string().describe("Location to get the weather for."), }) }) // Here we only save in-memory const memory = new MemorySaver(); const agent = createReactAgent({ llm: model, tools: [getWeather], interruptBefore: ["tools"], checkpointSaver: memory });
```

## Usage¶

```
let inputs = { messages: [{ role: "user", content: "what is the weather in SF california?" }] }; let config = { configurable: { thread_id: "1" } }; let stream = await agent.stream(inputs, { ...config, streamMode: "values", }); for await ( const { messages } of stream ) { let msg = messages[messages?.length - 1]; if (msg?.content) { console.log(msg.content); } if (msg?.tool_calls?.length > 0) { console.log(msg.tool_calls); } console.log("-----\n"); } 
```

```
what is the weather in SF california? ----- [ { name: 'get_weather', args: { location: 'SF, California' }, type: 'tool_call', id: 'call_AWgaSjqaYVQN73kL0H4BNn1Q' } ] -----
```

We can verify that our graph stopped at the right place:

```
const state = await agent.getState(config) console.log(state.next)
```

```
[ 'tools' ]
```

Now we can either approve or edit the tool call before proceeding to the next node. If we wanted to approve the tool call, we would simply continue streaming the graph with null input. If we wanted to edit the tool call we need to update the state to have the correct tool call, and then after the update has been applied we can continue.

We can try resuming and we will see an error arise:

```
stream = await agent.stream(null, { ...config, streamMode: "values", }); for await ( const { messages } of stream ) { let msg = messages[messages?.length - 1]; if (msg?.content) { console.log(msg.content); } if (msg?.tool_calls?.length > 0) { console.log(msg.tool_calls); } console.log("-----\n"); } 
```

```
Error: Unknown Location Please fix your mistakes. ----- [ { name: 'get_weather', args: { location: 'San Francisco, California' }, type: 'tool_call', id: 'call_MfIPKpRDXRL4LcHm1BxwcSTk' } ] -----
```

This error arose because our tool argument of "SF, California" is not a location our tool recognizes.

Let's show how we would edit the tool call to search for "San Francisco" instead of "SF, California" - since our tool as written treats "San Francisco, CA" as an unknown location. We will update the state and then resume streaming the graph and should see no errors arise. Note that the reducer we use for our messages channel will replace a messaege only if a message with the exact same ID is used. For that reason we can do new AiMessage(...) and instead have to directly modify the last message from the messages channel, making sure not to edit its ID.

```
// First, lets get the current state const currentState = await agent.getState(config); // Let's now get the last message in the state // This is the one with the tool calls that we want to update let lastMessage = currentState.values.messages[currentState.values.messages.length - 1]; // Now let's update the tool call to have the correct location lastMessage.tool_calls[0].args.location = "San Francisco"; // Now let's update the state await agent.updateState(config, { messages: [lastMessage] }); // Now let's resume the stream stream = await agent.stream(null, { ...config, streamMode: "values", }); for await ( const { messages } of stream ) { let msg = messages[messages?.length - 1]; if (msg?.content) { console.log(msg.content); } if (msg?.tool_calls?.length > 0) { console.log(msg.tool_calls); } console.log("-----\n"); } 
```

```
It's always sunny in sf -----
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders