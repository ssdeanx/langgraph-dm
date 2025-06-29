How to add runtime configuration to your graph

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to add runtime configuration to your graph¶

Once you've created an app in LangGraph, you likely will want to permit configuration at runtime.

For instance, you may want to let the LLM or prompt be selected dynamically, configure a user's user\_id to enforce row-level security, etc.

In LangGraph, configuration and other "out-of-band" communication is done via the RunnableConfig, which is always the second positional arg when invoking your application.

Below, we walk through an example of letting you configure a user ID and pick which model to use.

## Setup¶

This guide will use Anthropic's Claude 3 Haiku and OpenAI's GPT-4o model. We will optionally set our API key for LangSmith tracing, which will give us best-in-class observability.

```
// process.env.OPENAI_API_KEY = "sk_..."; // Optional, add tracing in LangSmith // process.env.LANGCHAIN_API_KEY = "ls__..."; // process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "true"; process.env.LANGCHAIN_TRACING_V2 = "true"; process.env.LANGCHAIN_PROJECT = "Configuration: LangGraphJS";
```

```
Configuration: LangGraphJS
```

## Define the graph¶

We will create an exceedingly simple message graph for this example.

```
import { BaseMessage } from "@langchain/core/messages"; import { ChatOpenAI } from "@langchain/openai"; import { ChatAnthropic } from "@langchain/anthropic"; import { ChatPromptTemplate } from "@langchain/core/prompts"; import { RunnableConfig } from "@langchain/core/runnables"; import { END, START, StateGraph, Annotation, } from "@langchain/langgraph"; const AgentState = Annotation.Root({ messages: Annotation<BaseMessage[]>({ reducer: (x, y) => x.concat(y), }), userInfo: Annotation<string | undefined>({ reducer: (x, y) => { return y ? y : x ? x : "N/A"; }, default: () => "N/A", }) }); const promptTemplate = ChatPromptTemplate.fromMessages([ ["system", "You are a helpful assistant.\n\n## User Info:\n{userInfo}"], ["placeholder", "{messages}"], ]); const callModel = async ( state: typeof AgentState.State, config?: RunnableConfig, ) => { const { messages, userInfo } = state; const modelName = config?.configurable?.model; const model = modelName === "claude" ? new ChatAnthropic({ model: "claude-3-haiku-20240307" }) : new ChatOpenAI({ model: "gpt-4o" }); const chain = promptTemplate.pipe(model); const response = await chain.invoke( { messages, userInfo, }, config, ); return { messages: [response] }; }; const fetchUserInformation = async ( _: typeof AgentState.State, config?: RunnableConfig, ) => { const userDB = { user1: { name: "John Doe", email: "jod@langchain.ai", phone: "+1234567890", }, user2: { name: "Jane Doe", email: "jad@langchain.ai", phone: "+0987654321", }, }; const userId = config?.configurable?.user; if (userId) { const user = userDB[userId as keyof typeof userDB]; if (user) { return { userInfo: `Name: ${user.name}\nEmail: ${user.email}\nPhone: ${user.phone}`, }; } } return { userInfo: "N/A" }; }; const workflow = new StateGraph(AgentState) .addNode("fetchUserInfo", fetchUserInformation) .addNode("agent", callModel) .addEdge(START, "fetchUserInfo") .addEdge("fetchUserInfo", "agent") .addEdge("agent", END); const graph = workflow.compile();
```

## Call with config¶

```
import { HumanMessage } from "@langchain/core/messages"; const config = { configurable: { model: "openai", user: "user1", }, }; const inputs = { messages: [new HumanMessage("Could you remind me of my email??")], }; for await ( const { messages } of await graph.stream(inputs, { ...config, streamMode: "values", }) ) { let msg = messages[messages?.length - 1]; if (msg?.content) { console.log(msg.content); } else if (msg?.tool_calls?.length > 0) { console.log(msg.tool_calls); } else { console.log(msg); } console.log("-----\n"); }
```

```
Could you remind me of my email?? ----- Could you remind me of my email?? ----- Your email is jod@langchain.ai. -----
```

## Change the config¶

Now let's try the same input with a different user.

```
const config2 = { configurable: { model: "openai", user: "user2", }, }; const inputs2 = { messages: [new HumanMessage("Could you remind me of my email??")], }; for await ( const { messages } of await graph.stream(inputs2, { ...config2, streamMode: "values", }) ) { let msg = messages[messages?.length - 1]; if (msg?.content) { console.log(msg.content); } else if (msg?.tool_calls?.length > 0) { console.log(msg.tool_calls); } else { console.log(msg); } console.log("-----\n"); }
```

```
Could you remind me of my email?? ----- Could you remind me of my email?? ----- Your email address is jad@langchain.ai. -----
```

Check out the LangSmith Trace (link) for this run to "see what the LLM sees".

## Config schema¶

You can also pass an annotation defining the shape of config.configurable into your graph. This will currently only expose type information on the compiled graph, and will not filter out keys:

```
import { MessagesAnnotation } from "@langchain/langgraph"; const ConfigurableAnnotation = Annotation.Root({ expectedField: Annotation<string>, }); const printNode = async ( state: typeof MessagesAnnotation.State, config: RunnableConfig<typeof ConfigurableAnnotation.State> ) => { console.log("Expected", config.configurable?.expectedField); // @ts-expect-error This type will be present even though is not in the typing console.log("Unexpected", config.configurable?.unexpectedField); return {}; }; const graphWithConfigSchema = new StateGraph(MessagesAnnotation, ConfigurableAnnotation) .addNode("printNode", printNode) .addEdge(START, "printNode") .compile(); const result = await graphWithConfigSchema.invoke({ messages: [{ role: "user", content: "Echo!"} ] }, { configurable: { expectedField: "I am expected", unexpectedField: "I am unexpected but present" } });
```

```
Expected I am expected Unexpected I am unexpected but present
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders