How to define graph state

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to define graph state¶

This how to guide will cover different ways to define the state of your graph.

## Prerequisites¶

* State conceptual guide - Conceptual guide on defining the state of your graph.
* Building graphs - This how-to assumes you have a basic understanding of how to build graphs.

## Setup¶

This guide requires installing the @langchain/langgraph, and @langchain/core packages:

```
npm install @langchain/langgraph @langchain/core
```

## Getting started¶

The Annotation function is the recommended way to define your graph state for new StateGraph graphs. The Annotation.Root function is used to create the top-level state object, where each field represents a channel in the graph.

Here's an example of how to define a simple graph state with one channel called messages:

```
import { BaseMessage } from "@langchain/core/messages"; import { Annotation } from "@langchain/langgraph"; const GraphAnnotation = Annotation.Root({ // Define a 'messages' channel to store an array of BaseMessage objects messages: Annotation<BaseMessage[]>({ // Reducer function: Combines the current state with new messages reducer: (currentState, updateValue) => currentState.concat(updateValue), // Default function: Initialize the channel with an empty array default: () => [], }) });
```

Each channel can optionally have reducer and default functions: - The reducer function defines how new values are combined with the existing state. - The default function provides an initial value for the channel.

For more information on reducers, see the reducers conceptual guide

```
const QuestionAnswerAnnotation = Annotation.Root({ question: Annotation<string>, answer: Annotation<string>, });
```

Above, all we're doing is defining the channels, and then passing the un-instantiated Annotation function as the value. It is important to note we always pass in the TypeScript type of each channel as the first generics argument to Annotation. Doing this ensures our graph state is type safe, and we can get the proper types when defining our nodes. Below shows how you can extract the typings from the Annotation function:

```
type QuestionAnswerAnnotationType = typeof QuestionAnswerAnnotation.State;
```

This is equivalent to the following type:

```
type QuestionAnswerAnnotationType = { question: string; answer: string; }
```

Finally, instantiating your graph using the annotations is as simple as passing the annotation to the StateGraph constructor:

```
import { StateGraph } from "@langchain/langgraph"; const workflow = new StateGraph(MergedAnnotation);
```

## State channels¶

The Annotation function is a convenience wrapper around the low level implementation of how states are defined in LangGraph. Defining state using the channels object (which is what Annotation is a wrapper of) is still possible, although not recommended for most cases. The below example shows how to implement a graph using this pattern:

```
import { StateGraph } from "@langchain/langgraph"; interface WorkflowChannelsState { messages: BaseMessage[]; question: string; answer: string; } const workflowWithChannels = new StateGraph<WorkflowChannelsState>({ channels: { messages: { reducer: (currentState, updateValue) => currentState.concat(updateValue), default: () => [], }, question: null, answer: null, } });
```

Above, we set the value of question and answer to null, as it does not contain a default value. To set a default value, the channel should be implemented how the messages key is, with the default factory returning the default value. The reducer function is optional, and can be added to the channel object if needed.

## Using Zod¶

If you want to add runtime validation to your state, you can use Zod instead of the Annotation function for state definition. You can also pass in your custom reducer and default factories as well by importing @langchain/langgraph/zod, which will extend Zod with LangGraph specific methods.

```
import "@langchain/langgraph/zod"; import { z } from "zod"; const AgentState = z.object({ messages: z .array(z.string()) .default(() => []) .langgraph.reducer( (a, b) => a.concat(Array.isArray(b) ? b : [b]), z.union([z.string(), z.array(z.string())]) ), question: z.string(), answer: z.string().min(1), }); const graph = new StateGraph(AgentState);
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders