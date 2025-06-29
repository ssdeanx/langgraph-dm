Memory

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# Memory¶

## What is Memory?¶

Memory in AI applications refers to the ability to process, store, and effectively recall information from past interactions. With memory, your agents can learn from feedback and adapt to users' preferences. This guide is divided into two sections based on the scope of memory recall: short-term memory and long-term memory.

Short-term memory, or thread-scoped memory, can be recalled at any time from within a single conversational thread with a user. LangGraph manages short-term memory as a part of your agent's state. State is persisted to a database using a checkpointer so the thread can be resumed at any time. Short-term memory updates when the graph is invoked or a step is completed, and the State is read at the start of each step.

Long-term memory is shared across conversational threads. It can be recalled at any time and in any thread. Memories are scoped to any custom namespace, not just within a single thread ID. LangGraph provides stores (reference doc) to let you save and recall long-term memories.

Both are important to understand and implement for your application.

## Short-term memory¶

Short-term memory lets your application remember previous interactions within a single thread or conversation. A thread organizes multiple interactions in a session, similar to the way email groups messages in a single conversation.

LangGraph manages short-term memory as part of the agent's state, persisted via thread-scoped checkpoints. This state can normally include the conversation history along with other stateful data, such as uploaded files, retrieved documents, or generated artifacts. By storing these in the graph's state, the bot can access the full context for a given conversation while maintaining separation between different threads.

Since conversation history is the most common form of representing short-term memory, in the next section, we will cover techniques for managing conversation history when the list of messages becomes long. If you want to stick to the high-level concepts, continue on to the long-term memory section.

### Managing long conversation history¶

Long conversations pose a challenge to today's LLMs. The full history may not even fit inside an LLM's context window, resulting in an irrecoverable error. Even if your LLM technically supports the full context length, most LLMs still perform poorly over long contexts. They get "distracted" by stale or off-topic content, all while suffering from slower response times and higher costs.

Managing short-term memory is an exercise of balancing precision & recall with your application's other performance requirements (latency & cost). As always, it's important to think critically about how you represent information for your LLM and to look at your data. We cover a few common techniques for managing message lists below and hope to provide sufficient context for you to pick the best tradeoffs for your application:

* Editing message lists: How to think about trimming and filtering a list of messages before passing to language model.
* Summarizing past conversations: A common technique to use when you don't just want to filter the list of messages.

### Editing message lists¶

Chat models accept context using messages, which include developer provided instructions (a system message) and user inputs (human messages). In chat applications, messages alternate between human inputs and model responses, resulting in a list of messages that grows longer over time. Because context windows are limited and token-rich message lists can be costly, many applications can benefit from using techniques to manually remove or forget stale information.

The most direct approach is to remove old messages from a list (similar to a least-recently used cache).

The typical technique for deleting content from a list in LangGraph is to return an update from a node telling the system to delete some portion of the list. You get to define what this update looks like, but a common approach would be to let you return an object or dictionary specifying which values to retain.

```
import { Annotation } from "@langchain/langgraph"; const StateAnnotation = Annotation.Root({ myList: Annotation<any[]>({ reducer: ( existing: string[], updates: string[] | { type: string; from: number; to?: number } ) => { if (Array.isArray(updates)) { // Normal case, add to the history return [...existing, ...updates]; } else if (typeof updates === "object" && updates.type === "keep") { // You get to decide what this looks like. // For example, you could simplify and just accept a string "DELETE" // and clear the entire list. return existing.slice(updates.from, updates.to); } // etc. We define how to interpret updates return existing; }, default: () => [], }), }); type State = typeof StateAnnotation.State; function myNode(state: State) { return { // We return an update for the field "myList" saying to // keep only values from index -5 to the end (deleting the rest) myList: { type: "keep", from: -5, to: undefined }, }; }
```

LangGraph will call the "reducer" function any time an update is returned under the key "myList". Within that function, we define what types of updates to accept. Typically, messages will be added to the existing list (the conversation will grow); however, we've also added support to accept a dictionary that lets you "keep" certain parts of the state. This lets you programmatically drop old message context.

Another common approach is to let you return a list of "remove" objects that specify the IDs of all messages to delete. If you're using the LangChain messages and the messagesStateReducer reducer (or MessagesAnnotation, which uses the same underlying functionality) in LangGraph, you can do this using a RemoveMessage.

```
import { RemoveMessage, AIMessage } from "@langchain/core/messages"; import { MessagesAnnotation } from "@langchain/langgraph"; type State = typeof MessagesAnnotation.State; function myNode1(state: State) { // Add an AI message to the `messages` list in the state return { messages: [new AIMessage({ content: "Hi" })] }; } function myNode2(state: State) { // Delete all but the last 2 messages from the `messages` list in the state const deleteMessages = state.messages .slice(0, -2) .map((m) => new RemoveMessage({ id: m.id })); return { messages: deleteMessages }; }
```

In the example above, the MessagesAnnotation allows us to append new messages to the messages state key as shown in myNode1. When it sees a RemoveMessage, it will delete the message with that ID from the list (and the RemoveMessage will then be discarded). For more information on LangChain-specific message handling, check out this how-to on using RemoveMessage.

See this how-to guidefor example usage.

### Summarizing past conversations¶

The problem with trimming or removing messages, as shown above, is that we may lose information from culling of the message queue. Because of this, some applications benefit from a more sophisticated approach of summarizing the message history using a chat model.

Simple prompting and orchestration logic can be used to achieve this. As an example, in LangGraph we can extend the MessagesAnnotation to include a summary key.

```
import { MessagesAnnotation, Annotation } from "@langchain/langgraph"; const MyGraphAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  summary: Annotation<string>,
});
```

Then, we can generate a summary of the chat history, using any existing summary as context for the next summary. This summarizeConversation node can be called after some number of messages have accumulated in the messages state key.

```
import { ChatOpenAI } from "@langchain/openai"; import { HumanMessage, RemoveMessage } from "@langchain/core/messages"; type State = typeof MyGraphAnnotation.State; async function summarizeConversation(state: State) { // First, we get any existing summary const summary = state.summary || ""; // Create our summarization prompt let summaryMessage: string; if (summary) { // A summary already exists summaryMessage = `This is a summary of the conversation to date: ${summary}\n\n` + "Extend the summary by taking into account the new messages above:"; } else { summaryMessage = "Create a summary of the conversation above:"; } // Add prompt to our history const messages = [ ...state.messages, new HumanMessage({ content: summaryMessage }), ]; // Assuming you have a ChatOpenAI model instance const model = new ChatOpenAI(); const response = await model.invoke(messages); // Delete all but the 2 most recent messages const deleteMessages = state.messages .slice(0, -2) .map((m) => new RemoveMessage({ id: m.id })); return { summary: response.content, messages: deleteMessages, }; }
```

See this how-to here for example usage.

### Knowing when to remove messages¶

Most LLMs have a maximum supported context window (denominated in tokens). A simple way to decide when to truncate messages is to count the tokens in the message history and truncate whenever it approaches that limit. Naive truncation is straightforward to implement on your own, though there are a few "gotchas". Some model APIs further restrict the sequence of message types (must start with human message, cannot have consecutive messages of the same type, etc.). If you're using LangChain, you can use the trimMessages utility and specify the number of tokens to keep from the list, as well as the strategy (e.g., keep the last maxTokens) to use for handling the boundary.

Below is an example.

```
import { trimMessages } from "@langchain/core/messages"; import { ChatOpenAI } from "@langchain/openai"; trimMessages(messages, { // Keep the last <= n_count tokens of the messages. strategy: "last", // Remember to adjust based on your model // or else pass a custom token_encoder tokenCounter: new ChatOpenAI({ modelName: "gpt-4" }), // Remember to adjust based on the desired conversation // length maxTokens: 45, // Most chat models expect that chat history starts with either: // (1) a HumanMessage or // (2) a SystemMessage followed by a HumanMessage startOn: "human", // Most chat models expect that chat history ends with either: // (1) a HumanMessage or // (2) a ToolMessage endOn: ["human", "tool"], // Usually, we want to keep the SystemMessage // if it's present in the original history. // The SystemMessage has special instructions for the model. includeSystem: true, });
```

## Long-term memory¶

Long-term memory in LangGraph allows systems to retain information across different conversations or sessions. Unlike short-term memory, which is thread-scoped, long-term memory is saved within custom "namespaces."

LangGraph stores long-term memories as JSON documents in a store (reference doc). Each memory is organized under a custom namespace (similar to a folder) and a distinct key (like a filename). Namespaces often include user or org IDs or other labels that make it easier to organize information. This structure enables hierarchical organization of memories. Cross-namespace searching is then supported through content filters. See the example below for an example.

```
import { InMemoryStore } from "@langchain/langgraph"; // InMemoryStore saves data to an in-memory dictionary. Use a DB-backed store in production use. const store = new InMemoryStore(); const userId = "my-user"; const applicationContext = "chitchat"; const namespace = [userId, applicationContext]; await store.put(namespace, "a-memory", { rules: [ "User likes short, direct language", "User only speaks English & TypeScript", ], "my-key": "my-value", }); // get the "memory" by ID const item = await store.get(namespace, "a-memory"); // list "memories" within this namespace, filtering on content equivalence const items = await store.search(namespace, { filter: { "my-key": "my-value" }, });
```

When adding long-term memory to your agent, it's important to think about how to write memories, how to store and manage memory updates, and how to recall & represent memories for the LLM in your application. These questions are all interdependent: how you want to recall & format memories for the LLM dictates what you should store and how to manage it. Furthermore, each technique has tradeoffs. The right approach for you largely depends on your application's needs. LangGraph aims to give you the low-level primitives to directly control the long-term memory of your application, based on memory Store's.

Long-term memory is far from a solved problem. While it is hard to provide generic advice, we have provided a few reliable patterns below for your consideration as you implement long-term memory.

Do you want to write memories "on the hot path" or "in the background"

Memory can be updated either as part of your primary application logic (e.g. "on the hot path" of the application) or as a background task (as a separate function that generates memories based on the primary application's state). We document some tradeoffs for each approach in the writing memories section below.

Do you want to manage memories as a single profile or as a collection of documents?

We provide two main approaches to managing long-term memory: a single, continuously updated document (referred to as a "profile" or "schema") or a collection of documents. Each method offers its own benefits, depending on the type of information you need to store and how you intend to access it.

Managing memories as a single, continuously updated "profile" or "schema" is useful when there is well-scoped, specific information you want to remember about a user, organization, or other entity (including the agent itself). You can define the schema of the profile ahead of time, and then use an LLM to update this based on interactions. Querying the "memory" is easy since it's a simple GET operation on a JSON document. We explain this in more detail in remember a profile. This technique can provide higher precision (on known information use cases) at the expense of lower recall (since you have to anticipate and model your domain, and updates to the doc tend to delete or rewrite away old information at a greater frequency).

Managing long-term memory as a collection of documents, on the other hand, lets you store an unbounded amount of information. This technique is useful when you want to repeatedly extract & remember items over a long time horizon but can be more complicated to query and manage over time. Similar to the "profile" memory, you still define schema(s) for each memory. Rather than overwriting a single document, you instead will insert new ones (and potentially update or re-contextualize existing ones in the process). We explain this approach in more detail in "managing a collection of memories".

Do you want to present memories to your agent as updated instructions or as few-shot examples?

Memories are typically provided to the LLM as a part of the system prompt. Some common ways to "frame" memories for the LLM include providing raw information as "memories from previous interactions with user A", as system instructions or rules, or as few-shot examples.

Framing memories as "learning rules or instructions" typically means dedicating a portion of the system prompt to instructions the LLM can manage itself. After each conversation, you can prompt the LLM to evaluate its performance and update the instructions to better handle this type of task in the future. This approach allows the system to dynamically update and improve its own behavior, potentially leading to better performance on various tasks. This is particularly useful for tasks where the instructions are challenging to specify a priori.

Meta-prompting uses past information to refine prompts. For instance, a Tweet generator employs meta-prompting to enhance its paper summarization prompt for Twitter. You could implement this using LangGraph's memory store to save updated instructions in a shared namespace. In this case, we will namespace the memories as "agent_instructions" and key the memory based on the agent.

```
import { BaseStore } from "@langchain/langgraph/store"; import { State } from "@langchain/langgraph"; import { ChatOpenAI } from "@langchain/openai"; // Node that *uses* the instructions const callModel = async (state: State, store: BaseStore) => { const namespace = ["agent_instructions"]; const instructions = await store.get(namespace, "agent_a"); // Application logic const prompt = promptTemplate.format({ instructions: instructions[0].value.instructions, }); // ... rest of the logic }; // Node that updates instructions const updateInstructions = async (state: State, store: BaseStore) => { const namespace = ["instructions"]; const currentInstructions = await store.search(namespace); // Memory logic const prompt = promptTemplate.format({ instructions: currentInstructions[0].value.instructions, conversation: state.messages, }); const llm = new ChatOpenAI(); const output = await llm.invoke(prompt); const newInstructions = output.content; // Assuming the LLM returns the new instructions await store.put(["agent_instructions"], "agent_a", { instructions: newInstructions, }); // ... rest of the logic };
```

#### Few-shot examples¶

Sometimes it's easier to "show" than "tell." LLMs learn well from examples. Few-shot learning lets you "program" your LLM by updating the prompt with input-output examples to illustrate the intended behavior. While various best-practices can be used to generate few-shot examples, often the challenge lies in selecting the most relevant examples based on user input.

Note that the memory store is just one way to store data as few-shot examples. If you want to have more developer involvement, or tie few-shots more closely to your evaluation harness, you can also use a LangSmith Dataset to store your data. Then dynamic few-shot example selectors can be used out-of-the box to achieve this same goal. LangSmith will index the dataset for you and enable retrieval of few shot examples that are most relevant to the user input based upon keyword similarity (using a BM25-like algorithm for keyword based similarity).

See this how-to video for example usage of dynamic few-shot example selection in LangSmith. Also, see this blog post showcasing few-shot prompting to improve tool calling performance and this blog post using few-shot example to align an LLMs to human preferences.

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders