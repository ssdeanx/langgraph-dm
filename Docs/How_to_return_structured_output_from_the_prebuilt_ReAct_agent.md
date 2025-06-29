How to return structured output from the prebuilt ReAct agent

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to return structured output from the prebuilt ReAct agent¶

Prerequisites

* Agent Architectures
* Chat Models
* Tools
* Structured Output

To return structured output from the prebuilt ReAct agent you can provide a responseFormat parameter with the desired output schema to createReactAgent:

```
import { z } from "zod"; import { createReactAgent } from "@langchain/langgraph/prebuilt"; const responseFormat = z.object({ // Respond to the user in this format mySpecialOutput: z.string(), }) const graph = createReactAgent({ llm: llm, tools: tools, // specify the schema for the structured output using `responseFormat` parameter responseFormat: responseFormat })
```

The agent will return the output in the format specified by the responseFormat schema by making an additional LLM call at the end of the conversation, once there are no more tool calls to be made. You can read this guide to learn about an alternate way - treating the structured output as another tool - to achieve structured output from the agent.

## Setup¶

First, we need to install the required packages.

```
yarn add @langchain/langgraph @langchain/openai @langchain/core zod
```

This guide will use OpenAI's GPT-4o model. We will optionally set our API key for LangSmith tracing, which will give us best-in-class observability.

```
// process.env.OPENAI_API_KEY = "sk_..."; // Optional, add tracing in LangSmith // process.env.LANGSMITH_API_KEY = "ls__..." process.env.LANGSMITH_TRACING = "true"; process.env.LANGSMITH_PROJECT = "ReAct Agent with system prompt: LangGraphJS";
```

## Code¶

```
import { ChatOpenAI } from "@langchain/openai"; import { createReactAgent } from "@langchain/langgraph/prebuilt"; import { tool } from "@langchain/core/tools"; import { z } from "zod"; const weatherTool = tool( async (input): Promise<string> => { if (input.city === "nyc") { return "It might be cloudy in nyc"; } else if (input.city === "sf") { return "It's always sunny in sf"; } else { throw new Error("Unknown city"); } }, { name: "get_weather", description: "Use this to get weather information.", schema: z.object({ city: z.enum(["nyc", "sf"]).describe("The city to get weather for"), }), } ); const WeatherResponseSchema = z.object({ conditions: z.string().describe("Weather conditions"), }); const tools = [weatherTool]; const agent = createReactAgent({ llm: new ChatOpenAI({ model: "gpt-4o", temperature: 0 }), tools: tools, responseFormat: WeatherResponseSchema, });
```

## Usage¶

Let's now test our agent:

```
const response = await agent.invoke({ messages: [ { role: "user", content: "What's the weather in NYC?", }, ], })
```

You can see that the agent output contains a structuredResponse key with the structured output conforming to the specified WeatherResponse schema, in addition to the message history under messages key

```
response.structuredResponse
```

```
{ conditions: 'cloudy' }
```

### Customizing system prompt¶

You might need to further customize the second LLM call for the structured output generation and provide a system prompt. To do so, you can pass an object with the keys prompt, schema to the responseFormat parameter:

```
const agent = createReactAgent({ llm: new ChatOpenAI({ model: "gpt-4o", temperature: 0 }), tools: tools, responseFormat: { prompt: "Always return capitalized weather conditions", schema: WeatherResponseSchema, } }); const response = await agent.invoke({ messages: [ { role: "user", content: "What's the weather in NYC?", }, ], })
```

You can verify that the structured response now contains a capitalized value:

```
response.structuredResponse
```

```
{ conditions: 'Cloudy' }
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders