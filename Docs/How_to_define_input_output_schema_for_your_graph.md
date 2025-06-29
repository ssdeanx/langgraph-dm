How to define input/output schema for your graph

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to define input/output schema for your graph¶

By default, StateGraph takes in a single schema and all nodes are expected to communicate with that schema. However, it is also possible to define explicit input and output schemas for a graph. This is helpful if you want to draw a distinction between input and output keys.

In this notebook we'll walk through an example of this. At a high level, in order to do this you simply have to pass in separate Annotation.Root({}) objets as { input: Annotation.Root({}), output: Annotation.Root({}) } when defining the graph. Let's see an example below!

```
import { Annotation, StateGraph } from "@langchain/langgraph"; const InputAnnotation = Annotation.Root({ question: Annotation<string>, }); const OutputAnnotation = Annotation.Root({ answer: Annotation<string>, }); const answerNode = (_state: typeof InputAnnotation.State) => { return { answer: "bye" }; }; const graph = new StateGraph({ input: InputAnnotation, output: OutputAnnotation, }) .addNode("answerNode", answerNode) .addEdge("__start__", "answerNode") .compile(); await graph.invoke({ question: "hi", });
```

```
{ answer: 'bye' }
```

Notice that the output of invoke only includes the output schema.

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders