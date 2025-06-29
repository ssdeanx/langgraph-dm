How to add multi-turn conversation in a multi-agent application (functional API)

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to add multi-turn conversation in a multi-agent application (functional API)¶

Prerequisites

This guide assumes familiarity with the following:

* Multi-agent systems
* Human-in-the-loop
* Functional API
* Command
* LangGraph Glossary

In this how-to guide, we’ll build an application that allows an end-user to engage in a multi-turn conversation with one or more agents. We'll create a node that uses an interrupt to collect user input and routes back to the active agent.

The agents will be implemented as tasks in a workflow that executes agent steps and determines the next action:

1. Wait for user input to continue the conversation, or
2. Route to another agent (or back to itself, such as in a loop) via a handoff.

Note

This guide requires @langchain/langgraph>=0.2.42 and @langchain/core>=0.3.36.

## Setup¶

First, install the required dependencies for this example:

```
npm install @langchain/langgraph @langchain/anthropic @langchain/core uuid zod
```

Next, we need to set API keys for Anthropic (the LLM we will use):

```
process.env.ANTHROPIC_API_KEY = "YOUR_API_KEY";
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here

In this example we will build a team of travel assistant agents that can communicate with each other.

We will create 2 agents:

* travelAdvisor: can help with travel destination recommendations. Can ask hotelAdvisor for help.
* hotelAdvisor: can help with hotel recommendations. Can ask travelAdvisor for help.

This is a fully-connected network - every agent can talk to any other agent.

First, let's create some of the tools that the agents will be using:

```
import { tool } from "@langchain/core/tools"; import { z } from "zod"; // Tool for getting travel recommendations const getTravelRecommendations = tool(async () => { const destinations = ["aruba", "turks and caicos"]; return destinations[Math.floor(Math.random() * destinations.length)]; }, { name: "getTravelRecommendations", description: "Get recommendation for travel destinations", schema: z.object({}), }); // Tool for getting hotel recommendations const getHotelRecommendations = tool(async (input: { location: "aruba" | "turks and caicos" }) => { const recommendations = { "aruba": [ "The Ritz-Carlton, Aruba (Palm Beach)", "Bucuti & Tara Beach Resort (Eagle Beach)" ], "turks and caicos": ["Grace Bay Club", "COMO Parrot Cay"] }; return recommendations[input.location]; }, { name: "getHotelRecommendations", description: "Get hotel recommendations for a given destination.", schema: z.object({ location: z.enum(["aruba", "turks and caicos"]) }), }); // Define a tool to signal intent to hand off to a different agent // Note: this is not using Command(goto) syntax for navigating to different agents: // `workflow()` below handles the handoffs explicitly const transferToHotelAdvisor = tool(async () => { return "Successfully transferred to hotel advisor"; }, { name: "transferToHotelAdvisor", description: "Ask hotel advisor agent for help.", schema: z.object({}), // Hint to our agent implementation that it should stop // immediately after invoking this tool returnDirect: true, }); const transferToTravelAdvisor = tool(async () => { return "Successfully transferred to travel advisor"; }, { name: "transferToTravelAdvisor", description: "Ask travel advisor agent for help.", schema: z.object({}), // Hint to our agent implementation that it should stop // immediately after invoking this tool returnDirect: true, });
```

Transfer tools

You might have noticed that we're using tool(... { returnDirect: true }) in the transfer tools. This is done so that individual agents (e.g., travelAdvisor) can exit the ReAct loop early once these tools are called without calling the model a final time to process the result of the tool call. This is the desired behavior, as we want to detect when the agent calls this tool and hand control off immediately to a different agent.

NOTE: This is meant to work with the prebuilt createReactAgent - if you are building a custom agent, make sure to manually add logic for handling early exit for tools that are marked with returnDirect.

Now let's define our agent tasks and combine them into a single multi-agent network workflow:

```
import { AIMessage, type BaseMessageLike } from "@langchain/core/messages"; import { ChatAnthropic } from "@langchain/anthropic"; import { createReactAgent } from "@langchain/langgraph/prebuilt"; import { addMessages, entrypoint, task, } from "@langchain/langgraph"; const model = new ChatAnthropic({ model: "claude-3-5-sonnet-latest", }); const travelAdvisorTools = [ getTravelRecommendations, transferToHotelAdvisor, ]; // Define travel advisor ReAct agent const travelAdvisor = createReactAgent({ llm: model, tools: travelAdvisorTools, stateModifier: [ "You are a general travel expert that can recommend travel destinations (e.g. countries, cities, etc).", "If you need hotel recommendations, ask 'hotel_advisor' for help.", "You MUST include human-readable response before transferring to another agent.", ].join(" "), }); // You can also add additional logic like changing the input to the agent / output from the agent, etc. // NOTE: we're invoking the ReAct agent with the full history of messages in the state const callTravelAdvisor = task("callTravelAdvisor", async (messages: BaseMessageLike[]) => { const response = await travelAdvisor.invoke({ messages }); return response.messages; }); const hotelAdvisorTools = [ getHotelRecommendations, transferToTravelAdvisor, ]; // Define hotel advisor ReAct agent const hotelAdvisor = createReactAgent({ llm: model, tools: hotelAdvisorTools, stateModifier: [ "You are a hotel expert that can provide hotel recommendations for a given destination.", "If you need help picking travel destinations, ask 'travel_advisor' for help.", "You MUST include a human-readable response before transferring to another agent." ].join(" "), }); // Add task for hotel advisor const callHotelAdvisor = task("callHotelAdvisor", async (messages: BaseMessageLike[]) => { const response = await hotelAdvisor.invoke({ messages }); return response.messages; }); const networkGraph = entrypoint( "networkGraph", async (messages: BaseMessageLike[]) => { // Converts inputs to LangChain messages as a side-effect let currentMessages = addMessages([], messages); let callActiveAgent = callTravelAdvisor; while (true) { const agentMessages = await callActiveAgent(currentMessages); currentMessages = addMessages(currentMessages, agentMessages); // Find the last AI message // If one of the handoff tools is called, the last message returned // by the agent will be a ToolMessages because we set them to have // "returnDirect: true". This means that the last AIMessage will // have tool calls. // Otherwise, the last returned message will be an AIMessage with // no tool calls, which means we are ready for new input. const reversedMessages = [...agentMessages].reverse(); const aiMsgIndex = reversedMessages .findIndex((m): m is AIMessage => m.getType() === "ai"); const aiMsg: AIMessage = reversedMessages[aiMsgIndex]; // We append all messages up to the last AI message to the current messages. // This may include ToolMessages (if the handoff tool was called) const messagesToAdd = reversedMessages.slice(0, aiMsgIndex + 1).reverse(); // Add the agent's responses currentMessages = addMessages(currentMessages, messagesToAdd); if (!aiMsg?.tool_calls?.length) { const userInput = await interrupt("Ready for user input."); if (typeof userInput !== "string") { throw new Error("User input must be a string."); } if (userInput.toLowerCase() === "done") { break; } currentMessages = addMessages(currentMessages, [{ role: "human", content: userInput, }]); continue; } const toolCall = aiMsg.tool_calls.at(-1)!; if (toolCall.name === "transferToHotelAdvisor") { callActiveAgent = callHotelAdvisor; } else if (toolCall.name === "transferToTravelAdvisor") { callActiveAgent = callTravelAdvisor; } else { throw new Error(`Expected transfer tool, got '${toolCall.name}'`); } } return entrypoint.final({ value: agentMessages[agentMessages.length - 1], save: currentMessages, }); });
```

We use a while loop to enable continuous conversation between agents and the user. The loop allows for:

1. Getting agent responses
2. Handling agent-to-agent transfers
3. Collecting user input via interrupts
4. Resuming using special inputs (see Command below)

## Test multi-turn conversation¶

Let's test a multi turn conversation with this application.

```
import { v4 as uuidv4 } from 'uuid'; import { Command } from "@langchain/langgraph"; import { isBaseMessage } from "@langchain/core/messages"; const threadConfig = { configurable: { thread_id: uuidv4() }, streamMode: "updates" as const, }; const inputs = [ // 1st round of conversation [{ role: "user", content: "i wanna go somewhere warm in the caribbean" }], // Since we're using `interrupt`, we'll need to resume using the Command primitive // 2nd round of conversation new Command({ resume: "could you recommend a nice hotel in one of the areas and tell me which area it is." }), // 3rd round of conversation new Command({ resume: "i like the first one. could you recommend something to do near the hotel?" }) ]; const runConversation = async () => { for (const [idx, userInput] of inputs.entries()) { console.log(); console.log(`--- Conversation Turn ${idx + 1} ---`); console.log(); console.log(`User: ${JSON.stringify(userInput, null, 2)}`); console.log(); const stream = await multiTurnGraph.stream( userInput as any, threadConfig, ); for await (const update of stream) { if (update.__metadata__?.cached) { continue; } for (const [nodeId, value] of Object.entries(update)) { if (Array.isArray(value) && value.length > 0) { const lastMessage = value.at(-1); if (isBaseMessage(lastMessage) && lastMessage?.getType() === "ai") { console.log(`${nodeId}: ${lastMessage.content}`); } } } } } }; // Execute the conversation try { await runConversation(); } catch (e) { console.error(e); }
```

```
--- Conversation Turn 1 --- User: [ { "role": "user", "content": "i wanna go somewhere warm in the caribbean" } ] callTravelAdvisor: Based on the recommendations, Turks and Caicos would be an excellent choice for your Caribbean getaway! This British Overseas Territory is known for its stunning white-sand beaches, crystal-clear turquoise waters, and year-round warm weather. Grace Bay Beach in Providenciales is consistently rated as one of the world's best beaches. You can enjoy: - World-class snorkeling and diving - Luxury resorts and spas - Fresh seafood cuisine - Water sports like kayaking and paddleboarding - Beautiful coral reefs - Average temperatures between 75-85°F (24-29°C) year-round Would you like me to connect you with our hotel advisor to help you find the perfect place to stay in Turks and Caicos? --- Conversation Turn 2 --- User: { "resume": "could you recommend a nice hotel in one of the areas and tell me which area it is.", "goto": [] } callHotelAdvisor: I can recommend two excellent options in Turks and Caicos: 1. Grace Bay Club - This luxury resort is located on the world-famous Grace Bay Beach in Providenciales (often called "Provo"). This area is the most developed and popular island in Turks and Caicos, known for its 12-mile stretch of pristine beach, excellent restaurants, and shopping. The resort offers all-oceanfront suites and is perfect if you want to be close to amenities while enjoying luxury beachfront accommodations. 2. COMO Parrot Cay - This is an exclusive private island resort located on Parrot Cay, a secluded island accessible by boat from Providenciales. This is the ultimate luxury escape if you're looking for privacy and seclusion. The resort is set on 1,000 unspoiled acres with pristine white beaches. This location is perfect for those who want to truly get away from it all while enjoying world-class service and amenities. Would you like more specific information about either of these properties or their locations? --- Conversation Turn 3 --- User: { "resume": "i like the first one. could you recommend something to do near the hotel?", "goto": [] } callHotelAdvisor: Grace Bay Club is perfectly situated to enjoy many activities in Providenciales! Since the hotel is located on Grace Bay Beach in Provo, here are some excellent activities nearby: 1. Beach Activities (right at your doorstep): - Swimming and sunbathing on Grace Bay Beach - Snorkeling right off the beach - Beach walks along the pristine 12-mile stretch 2. Within Walking Distance: - Salt Mills Plaza (shopping center with local boutiques and restaurants) - Graceway Gourmet (upscale grocery store) - Several beachfront restaurants and bars 3. Very Close By (5-10 minute drive): - Princess Alexandra National Park (great for snorkeling) - Leeward Marina (for boat tours and fishing trips) - Provo Golf Club (18-hole championship golf course) - Thursday Night Fish Fry at Bight Park (local culture and food) 4. Water Activities (operators will pick you up): - Snorkeling or diving trips to the barrier reef - Sunset sailing cruises - Half-day trips to Iguana Island - Whale watching (in season - January to April) Would you like me to connect you with our travel advisor for more specific activity recommendations or help with booking any excursions?
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders