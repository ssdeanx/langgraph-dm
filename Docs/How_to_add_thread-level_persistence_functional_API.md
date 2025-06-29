How to add thread-level persistence (functional API)

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to add thread-level persistence (functional API)¶

Prerequisites

This guide assumes familiarity with the following:

* Functional API
* Persistence
* Memory
* Chat Models

Many AI applications need memory to share context across multiple interactions on the same thread (e.g., multiple turns of a conversation). In LangGraph functional API, this kind of memory can be added to any entrypoint() workflow using thread-level persistence.

When creating a LangGraph workflow, you can set it up to persist its results by using a checkpointer:

1. Create an instance of a checkpointer:

   ```
   import { MemorySaver } from "@langchain/langgraph"; const checkpointer = new MemorySaver();
   ```
2. Pass checkpointer instance to the entrypoint() wrapper function:

   ```
   import { entrypoint } from "@langchain/langgraph"; const workflow = entrypoint({ name: "workflow", checkpointer, }, async (inputs) => { ... });
   ```
3. Retrieve previous state from the prior execution within the workflow:

   ```
   import { entrypoint, getPreviousState } from "@langchain/langgraph"; const workflow = entrypoint({ name: "workflow", checkpointer, }, async (inputs) => { const previous = getPreviousState(); const result = doSomething(previous, inputs); ... });
   ```
4. Optionally choose which values will be returned from the workflow and which will be saved by the checkpointer as previous:

   ```
   import { entrypoint, getPreviousState } from "@langchain/langgraph"; const workflow = entrypoint({ name: "workflow", checkpointer, }, async (inputs) => { const previous = getPreviousState(); const result = doSomething(previous, inputs); ... return entrypoint.final({ value: result, save: combineState(inputs, result), }); });
   ```

This guide shows how you can add thread-level persistence to your workflow.

Note

If you need memory that is shared across multiple conversations or users (cross-thread persistence), check out this how-to guide).

Note

If you need to add thread-level persistence to a StateGraph, check out this how-to guide.

## Setup¶

Note

This guide requires @langchain/langgraph>=0.2.42.

First, install the required dependencies for this example:

```
npm install @langchain/langgraph @langchain/anthropic @langchain/core zod
```

Next, we need to set API keys for Anthropic (the LLM we will use):

```
process.env.ANTHROPIC_API_KEY = "YOUR_API_KEY";
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here

## Example: simple chatbot with short-term memory¶

We will be using a workflow with a single task that calls a chat model.

Let's first define the model we'll be using:

```
import { ChatAnthropic } from "@langchain/anthropic"; const model = new ChatAnthropic({ model: "claude-3-5-sonnet-latest", });
```

Now we can define our task and workflow. To add in persistence, we need to pass in a Checkpointer to the entrypoint() wrapper function.

```
import type { BaseMessage, BaseMessageLike } from "@langchain/core/messages"; import { addMessages, entrypoint, task, getPreviousState, MemorySaver, } from "@langchain/langgraph"; const callModel = task("callModel", async (messages: BaseMessageLike[]) => { const response = model.invoke(messages); return response; }); const checkpointer = new MemorySaver(); const workflow = entrypoint({ name: "workflow", checkpointer, }, async (inputs: BaseMessageLike[]) => { const previous = getPreviousState<BaseMessage>() ?? []; const messages = addMessages(previous, inputs); const response = await callModel(messages); return entrypoint.final({ value: response, save: addMessages(messages, response), }); });
```

If we try to use this workflow, the context of the conversation will be persisted across interactions.

Note

If you're using LangGraph Cloud or LangGraph Studio, you don't need to pass checkpointer to the entrypoint wrapper, since it's done automatically.

Here's how this works in practice:

```
const config = { configurable: { thread_id: "1" }, streamMode: "values" as const, }; const inputMessage = { role: "user", content: "hi! I'm bob" }; const stream = await workflow.stream( [inputMessage], config, ); for await (const chunk of stream) { console.log("=".repeat(30), `${chunk.getType()} message`, "=".repeat(30)); console.log(chunk.content); }
```

```
============================== ai message ============================== Hi Bob! I'm Claude. Nice to meet you! How can I help you today?
```

You can always resume previous threads:

```
const followupStream = await workflow.stream( [{ role: "user", content: "what's my name?" }], config, ); for await (const chunk of followupStream) { console.log("=".repeat(30), `${chunk.getType()} message`, "=".repeat(30)); console.log(chunk.content); }
```

```
============================== ai message ============================== Your name is Bob - you just told me that in your first message.
```

If we want to start a new conversation, we can pass in a different thread\_id. Poof! All the memories are gone!

```
const newStream = await workflow.stream( [{ role: "user", content: "what's my name?" }], { configurable: { thread_id: "2", }, streamMode: "values", }, ); for await (const chunk of newStream) { console.log("=".repeat(30), `${chunk.getType()} message`, "=".repeat(30)); console.log(chunk.content); }
```

```
============================== ai message ============================== I don't know your name as we just started chatting. Would you like to introduce yourself?
```

Streaming tokens

If you would like to stream LLM tokens from your chatbot, you can use streamMode: "messages". Check out this how-to guide to learn more.

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders