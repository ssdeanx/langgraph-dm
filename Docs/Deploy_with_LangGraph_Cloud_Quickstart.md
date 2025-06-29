Cloud Deploy

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# Deployment quickstart¶

This guide shows you how to set up and use LangGraph Platform for a cloud deployment.

## Prerequisites¶

Before you begin, ensure you have the following:

* A GitHub account
* A LangSmith account – free to sign up

## 1. Create a repository on GitHub¶

To deploy an application to LangGraph Platform, your application code must reside in a GitHub repository. Both public and private repositories are supported. For this quickstart, use the new-langgraph-project template for your application:

1. Go to the new-langgraph-project repository or new-langgraphjs-project template.
2. Click the Fork button in the top right corner to fork the repository to your GitHub account.
3. Click Create fork.

## 2. Deploy to LangGraph Platform¶

1. Log in to LangSmith.
2. In the left sidebar, select Deployments.
3. Click the + New Deployment button. A pane will open where you can fill in the required fields.
4. If you are a first time user or adding a private repository that has not been previously connected, click the Import from GitHub button and follow the instructions to connect your GitHub account.
5. Select your New LangGraph Project repository.
6. Click Submit to deploy.

   This may take about 15 minutes to complete. You can check the status in the Deployment details view.

## 3. Test your application in LangGraph Studio¶

Once your application is deployed:

1. Select the deployment you just created to view more details.
2. Click the LangGraph Studio button in the top right corner.

   LangGraph Studio will open to display your graph.

   Sample graph run in LangGraph Studio.

## 4. Get the API URL for your deployment¶

1. In the Deployment details view in LangGraph, click the API URL to copy it to your clipboard.
2. Click the URL to copy it to the clipboard.

## 5. Test the API¶

You can now test the API:

1. Install the LangGraph Python SDK:

   ```
   pip install langgraph-sdk
   ```
2. Send a message to the assistant (threadless run):

   ```
   from langgraph_sdk import get_client client = get_client(url="your-deployment-url", api_key="your-langsmith-api-key") async for chunk in client.runs.stream( None, # Threadless run "agent", # Name of assistant. Defined in langgraph.json. input={ "messages": [{ "role": "human", "content": "What is LangGraph?", }], }, stream_mode="updates", ): print(f"Receiving new event of type: {chunk.event}...") print(chunk.data) print("\n\n")
   ```

1. Install the LangGraph Python SDK:

   ```
   pip install langgraph-sdk
   ```
2. Send a message to the assistant (threadless run):

   ```
   from langgraph_sdk import get_sync_client client = get_sync_client(url="your-deployment-url", api_key="your-langsmith-api-key") for chunk in client.runs.stream( None, # Threadless run "agent", # Name of assistant. Defined in langgraph.json. input={ "messages": [{ "role": "human", "content": "What is LangGraph?", }], }, stream_mode="updates", ): print(f"Receiving new event of type: {chunk.event}...") print(chunk.data) print("\n\n")
   ```

1. Install the LangGraph JS SDK

   ```
   npm install @langchain/langgraph-sdk
   ```
2. Send a message to the assistant (threadless run):

   ```
   const { Client } = await import("@langchain/langgraph-sdk"); const client = new Client({ apiUrl: "your-deployment-url", apiKey: "your-langsmith-api-key" }); const streamResponse = client.runs.stream( null, // Threadless run "agent", // Assistant ID { input: { "messages": [ { "role": "user", "content": "What is LangGraph?"} ] }, streamMode: "messages", } ); for await (const chunk of streamResponse) { console.log(`Receiving new event of type: ${chunk.event}...`); console.log(JSON.stringify(chunk.data)); console.log("\n\n"); }
   ```

```
curl -s --request POST \ --url <DEPLOYMENT_URL> \ --header 'Content-Type: application/json' \ --data "{ \"assistant_id\": \"agent\", \"input\": { \"messages\": [ { \"role\": \"human\", \"content\": \"What is LangGraph?\" } ] }, \"stream_mode\": \"updates\" }"
```

## Next steps¶

Congratulations! You have deployed an application using LangGraph Platform.

Here are some other resources to check out:

* LangGraph Platform overview
* Deployment options

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders