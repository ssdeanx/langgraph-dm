How to create a ReAct agent from scratch (Functional API)¶

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to create a ReAct agent from scratch (Functional API)¶

Prerequisites

This guide assumes familiarity with the following:

* Chat Models
* Messages
* Tool Calling
* Entrypoints and Tasks

This guide demonstrates how to implement a ReAct agent using the LangGraph Functional API.

The ReAct agent is a tool-calling agent that operates as follows:

1. Queries are issued to a chat model;
2. If the model generates no tool calls, we return the model response.
3. If the model generates tool calls, we execute the tool calls with available tools, append them as tool messages to our message list, and repeat the process.

This is a simple and versatile set-up that can be extended with memory, human-in-the-loop capabilities, and other features. See the dedicated how-to guides for examples.

## Setup¶

Note

This guide requires @langchain/langgraph>=0.2.42.

First, install the required dependencies for this example:

```
npm install @langchain/langgraph @langchain/openai @langchain/core zod
```

Next, we need to set API keys for OpenAI (the LLM we will use):

```
process.env.OPENAI_API_KEY = "YOUR_API_KEY";
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here

## Create ReAct agent¶

Now that you have installed the required packages and set your environment variables, we can create our agent.

### Define model and tools¶

Let's first define the tools and model we will use for our example. Here we will use a single place-holder tool that gets a description of the weather for a location.

We will use an OpenAI chat model for this example, but any model supporting tool-calling will suffice.

```
import { ChatOpenAI } from "@langchain/openai"; import { tool } from "@langchain/core/tools"; import { z } from "zod"; const model = new ChatOpenAI({ model: "gpt-4o-mini", }); const getWeather = tool(async ({ location }) => { const lowercaseLocation = location.toLowerCase(); if (lowercaseLocation.includes("sf") || lowercaseLocation.includes("san francisco")) { return "It's sunny!"; } else if (lowercaseLocation.includes("boston")) { return "It's rainy!"; } else { return `I am not sure what the weather is in ${location}`;
} }, { name: "getWeather", schema: z.object({ location: z.string().describe("location to get the weather for"), }), description: "Call to get the weather from a specific location." }); const tools = [getWeather];
```

### Define tasks¶

We next define the tasks we will execute. Here there are two different tasks:

1. Call model: We want to query our chat model with a list of messages.
2. Call tool: If our model generates tool calls, we want to execute them.

```
import { type BaseMessageLike, AIMessage, ToolMessage,
} from "@langchain/core/messages"; import { type ToolCall } from "@langchain/core/messages/tool"; import { task } from "@langchain/langgraph"; const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool])); const callModel = task("callModel", async (messages: BaseMessageLike[]) => { const response = await model.bindTools(tools).invoke(messages); return response; }); const callTool = task(
"callTool", async (toolCall: ToolCall): Promise<AIMessage> => { const tool = toolsByName[toolCall.name]; const observation = await tool.invoke(toolCall.args); return new ToolMessage({ content: observation, tool_call_id: toolCall.id }); // Can also pass toolCall directly into the tool to return a ToolMessage // return tool.invoke(toolCall); });
```

### Define entrypoint¶

Our entrypoint will handle the orchestration of these two tasks. As described above, when our callModel task generates tool calls, the callTool task will generate responses for each. We append all messages to a single messages list.

```
import { entrypoint, addMessages } from "@langchain/langgraph"; const agent = entrypoint(
"agent", async (messages: BaseMessageLike[]) => { let currentMessages = messages; let llmResponse = await callModel(currentMessages); while (true) { if (!llmResponse.tool_calls?.length) { break;
} // Execute tools const toolResults = await Promise.all(
llmResponse.tool_calls.map((toolCall) => {
return callTool(toolCall);
}) ); // Append to message list currentMessages = addMessages(currentMessages, [llmResponse, ...toolResults]); // Call model again llmResponse = await callModel(currentMessages);
} return llmResponse;
} );
```

## Usage¶

To use our agent, we invoke it with a messages list. Based on our implementation, these can be LangChain message objects or OpenAI-style objects:

```
import { BaseMessage, isAIMessage } from "@langchain/core/messages"; const prettyPrintMessage = (message: BaseMessage) => { console.log("=".repeat(30), `${message.getType()} message`, "=".repeat(30)); console.log(message.content); if (isAIMessage(message) && message.tool_calls?.length) { console.log(JSON.stringify(message.tool_calls, null, 2));
} } // Usage example const userMessage = { role: "user", content: "What's the weather in san francisco?" }; console.log(userMessage); const stream = await agent.stream([userMessage]); for await (const step of stream) { for (const [taskName, update] of Object.entries(step)) { const message = update as BaseMessage; // Only print task updates if (taskName === "agent") continue; console.log(`\n${taskName}:`); prettyPrintMessage(message);
} }