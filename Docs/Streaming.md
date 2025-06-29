Streaming

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# Streaming¶

LangGraph is built with first class support for streaming. There are several different ways to stream back outputs from a graph run

## Streaming graph outputs (.stream)¶

.stream is an async method for streaming back outputs from a graph run. There are several different modes you can specify when calling these methods (e.g. `await graph.stream(..., { ...config, streamMode: "values" })):

* "values": This streams the full value of the state after each node is called.
* "updates": This streams the updates to the state after each node is called.
* "custom": This streams custom data from inside your graph nodes.
* "messages": This streams LLM tokens and metadata for the graph node where LLM is invoked.
* "debug": This streams as much information as possible throughout the execution of the graph.

The below visualization shows the difference between the values and updates modes:

## Streaming LLM tokens and events (.streamEvents)¶

In addition, you can use the streamEvents method to stream back events that happen inside nodes. This is useful for streaming tokens of LLM calls.

This is a standard method on all LangChain objects. This means that as the graph is executed, certain events are emitted along the way and can be seen if you run the graph using .streamEvents.

All events have (among other things) event, name, and data fields. What do these mean?

* event: This is the type of event that is being emitted. You can find a detailed table of all callback events and triggers here.
* name: This is the name of event.
* data: This is the data associated with the event.

What types of things cause events to be emitted?

* each node (runnable) emits on\_chain\_start when it starts execution, on\_chain\_stream during the node execution and on\_chain\_end when the node finishes. Node events will have the node name in the event's name field
* the graph will emit on\_chain\_start in the beginning of the graph execution, on\_chain\_stream after each node execution and on\_chain\_end when the graph finishes. Graph events will have the LangGraph in the event's name field
* Any writes to state channels (i.e. anytime you update the value of one of your state keys) will emit on\_chain\_start and on\_chain\_end events

Additionally, any events that are created inside your nodes (LLM events, tool events, manually emitted events, etc.) will also be visible in the output of .streamEvents.

To make this more concrete and to see what this looks like, let's see what events are returned when we run a simple graph:

```
import { ChatOpenAI } from "@langchain/openai"; import { StateGraph, MessagesAnnotation } from "langgraph"; const model = new ChatOpenAI({ model: "gpt-4-turbo-preview" }); function callModel(state: typeof MessagesAnnotation.State) { const response = model.invoke(state.messages); return { messages: response }; } const workflow = new StateGraph(MessagesAnnotation) .addNode("callModel", callModel) .addEdge("start", "callModel") .addEdge("callModel", "end"); const app = workflow.compile(); const inputs = [{ role: "user", content: "hi!" }]; for await (const event of app.streamEvents( { messages: inputs }, { version: "v2" } )) { const kind = event.event; console.log(`${kind}: ${event.name}`); }
```

```
on_chain_start: LangGraph on_chain_start: __start__ on_chain_end: __start__ on_chain_start: callModel on_chat_model_start: ChatOpenAI on_chat_model_stream: ChatOpenAI on_chat_model_stream: ChatOpenAI on_chat_model_stream: ChatOpenAI on_chat_model_stream: ChatOpenAI on_chat_model_stream: ChatOpenAI on_chat_model_stream: ChatOpenAI on_chat_model_stream: ChatOpenAI on_chat_model_stream: ChatOpenAI on_chat_model_stream: ChatOpenAI on_chat_model_end: ChatOpenAI on_chain_start: ChannelWrite<callModel,messages> on_chain_end: ChannelWrite<callModel,messages> on_chain_stream: callModel on_chain_end: callModel on_chain_stream: LangGraph on_chain_end: LangGraph
```

We start with the overall graph start (on\_chain\_start: LangGraph). We then write to the \_\_start\_\_ node (this is special node to handle input). We then start the callModel node (on\_chain\_start: callModel). We then start the chat model invocation (on\_chat\_model\_start: ChatOpenAI), stream back token by token (on\_chat\_model\_stream: ChatOpenAI) and then finish the chat model (on\_chat\_model\_end: ChatOpenAI). From there, we write the results back to the channel (ChannelWrite<callModel,messages>) and then finish the callModel node and then the graph as a whole.

This should hopefully give you a good sense of what events are emitted in a simple graph. But what data do these events contain? Each type of event contains data in a different format. Let's take a look at the on\_chat\_model\_stream event. This event contains a chunk of the LLM's response. We can use this to stream the LLM's response to the user.

```
const inputs = [{ role: "user", content: "hi!" }]; for await (const event of app.streamEvents( { messages: inputs }, { version: "v2" } )) { if (event.event === "on_chat_model_stream") { process.stdout.write(event.data.chunk.content); } }
```

```
Hello! How can I assist you today?
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders