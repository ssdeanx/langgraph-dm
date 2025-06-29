How to stream custom data

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to stream custom data¶

Prerequisites

This guide assumes familiarity with the following:

* Streaming
* streamEvents API
* Chat Models
* Tools

The most common use case for streaming from inside a node is to stream LLM tokens, but you may also want to stream custom data.

For example, if you have a long-running tool call, you can dispatch custom events between the steps and use these custom events to monitor progress. You could also surface these custom events to an end user of your application to show them how the current task is progressing.

You can do so in two ways:

* using your graph's .stream method with streamMode: "custom"
* emitting custom events using dispatchCustomEvents with streamEvents.

Below we'll see how to use both APIs.

## Setup¶

First, let's install our required packages:

```
npm install @langchain/langgraph @langchain/core
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here.

## Stream custom data using .stream¶

Compatibility

This section requires @langchain/langgraph>=0.2.20. For help upgrading, see this guide.

### Define the graph¶

```
import { StateGraph, MessagesAnnotation, LangGraphRunnableConfig, } from "@langchain/langgraph"; const myNode = async ( _state: typeof MessagesAnnotation.State, config: LangGraphRunnableConfig ) => { const chunks = [ "Four", "score", "and", "seven", "years", "ago", "our", "fathers", "...", ]; for (const chunk of chunks) { // write the chunk to be streamed using streamMode=custom // Only populated if one of the passed stream modes is "custom". config.writer?.(chunk); } return { messages: [{ role: "assistant", content: chunks.join(" "), }], }; }; const graph = new StateGraph(MessagesAnnotation) .addNode("model", myNode) .addEdge("__start__", "model") .compile();
```

### Stream content¶

```
const inputs = [{ role: "user", content: "What are you thinking about?", }]; const stream = await graph.stream( { messages: inputs }, { streamMode: "custom" } ); for await (const chunk of stream) { console.log(chunk); }
```

```
Four score and seven years ago our fathers ...
```

You will likely need to use multiple streaming modes as you will want access to both the custom data and the state updates.

```
const streamMultiple = await graph.stream( { messages: inputs }, { streamMode: ["custom", "updates"] } ); for await (const chunk of streamMultiple) { console.log(chunk); }
```

```
[ 'custom', 'Four' ] [ 'custom', 'score' ] [ 'custom', 'and' ] [ 'custom', 'seven' ] [ 'custom', 'years' ] [ 'custom', 'ago' ] [ 'custom', 'our' ] [ 'custom', 'fathers' ] [ 'custom', '...' ] [ 'updates', { model: { messages: [Array] } } ]
```

## Stream custom data using .streamEvents¶

If you are already using graph's .streamEvents method in your workflow, you can also stream custom data by emitting custom events using dispatchCustomEvents

### Define the graph¶

```
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch"; const graphNode = async (_state: typeof MessagesAnnotation.State) => { const chunks = [ "Four", "score", "and", "seven", "years", "ago", "our", "fathers", "...", ]; for (const chunk of chunks) { await dispatchCustomEvent("my_custom_event", { chunk }); } return { messages: [{ role: "assistant", content: chunks.join(" "), }], }; }; const graphWithDispatch = new StateGraph(MessagesAnnotation) .addNode("model", graphNode) .addEdge("__start__", "model") .compile();
```

### Stream content¶

```
const eventStream = await graphWithDispatch.streamEvents( { messages: [{ role: "user", content: "What are you thinking about?", }] }, { version: "v2", }, ); for await (const { event, name, data } of eventStream) { if (event === "on_custom_event" && name === "my_custom_event") { console.log(`${data.chunk}|`); } }
```

```
Four| score| and| seven| years| ago| our| fathers| ...|
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders