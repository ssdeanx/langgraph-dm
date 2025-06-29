How to add node retry policies

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to add node retry policies¶

There are many use cases where you may wish for your node to have a custom retry policy. Some examples of when you may wish to do this is if you are calling an API, querying a database, or calling an LLM, etc.

In order to configure the retry policy, you have to pass the retryPolicy parameter to the addNode function. The retryPolicy parameter takes in a RetryPolicy named tuple object. Below we instantiate a RetryPolicy object with the default parameters:

```
import { RetryPolicy } from "@langchain/langgraph" const retryPolicy: RetryPolicy = {};
```

If you want more information on what each of the parameters does, be sure to read the reference.

## Passing a retry policy to a node¶

Lastly, we can pass RetryPolicy objects when we call the addNode function. In the example below we pass two different retry policies to each of our nodes:

```
import Database from "better-sqlite3" import { ChatAnthropic } from "@langchain/anthropic" import { MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph" import { AIMessage } from "@langchain/core/messages" // Create an in-memory database const db: typeof Database.prototype = new Database(':memory:'); const model = new ChatAnthropic({ model: "claude-3-5-sonnet-20240620" }); const callModel = async ( state: typeof MessagesAnnotation.State) => { const response = await model.invoke(state.messages); return { messages: [response] }; } const queryDatabase = async (state: typeof MessagesAnnotation.State) => { const queryResult: string = JSON.stringify(db.prepare("SELECT * FROM Artist LIMIT 10;").all()); return { messages: [new AIMessage({content: "queryResult"})]}; }; const workflow = new StateGraph(MessagesAnnotation) // Define the two nodes we will cycle between .addNode("call_model", callModel, { retryPolicy: {maxAttempts: 5}}) .addNode("query_database", queryDatabase, { retryPolicy: { retryOn: (e: any): boolean => { if (e instanceof Database.SqliteError) { // Retry on "SQLITE_BUSY" error return e.code === 'SQLITE_BUSY'; } return false; // Don't retry on other errors }}}) .addEdge(START, "call_model") .addEdge("call_model", "query_database") .addEdge("query_database", END); const graph = workflow.compile();
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders