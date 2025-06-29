How to pass private state

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to pass private state¶

Oftentimes, you may want nodes to be able to pass state to each other that should NOT be part of the main schema of the graph. This is often useful because there may be information that is not needed as input/output (and therefore doesn't really make sense to have in the main schema) but is needed as part of the intermediate working logic.

Let's take a look at an example below. In this example, we will create a RAG pipeline that: 1. Takes in a user question 2. Uses an LLM to generate a search query 3. Retrieves documents for that generated query 4. Generates a final answer based on those documents

We will have a separate node for each step. We will only have the question and answer on the overall state. However, we will need separate states for the search_query and the documents - we will pass these as private state keys by defining an input annotation on each relevant node.

Let's look at an example!

```
import { Annotation, StateGraph } from "@langchain/langgraph"; // The overall state of the graph const OverallStateAnnotation = Annotation.Root({ question: Annotation<string>, answer: Annotation<string>, }); // This is what the node that generates the query will return const QueryOutputAnnotation = Annotation.Root({ query: Annotation<string>, }); // This is what the node that retrieves the documents will return const DocumentOutputAnnotation = Annotation.Root({ docs: Annotation<string[]>, }); // This is what the node that retrieves the documents will return const GenerateOutputAnnotation = Annotation.Root({ ...OverallStateAnnotation.spec, ...DocumentOutputAnnotation.spec }); // Node to generate query const generateQuery = async (state: typeof OverallStateAnnotation.State) => { // Replace this with real logic return { query: state.question + " rephrased as a query!", }; }; // Node to retrieve documents const retrieveDocuments = async (state: typeof QueryOutputAnnotation.State) => { // Replace this with real logic return { docs: [state.query, "some random document"], }; }; // Node to generate answer const generate = async (state: typeof GenerateOutputAnnotation.State) => {
return { answer: state.docs.concat([state.question]).join("\n\n"), }; }; const graph = new StateGraph(OverallStateAnnotation)
.addNode("generate_query", generateQuery)
.addNode("retrieve_documents", retrieveDocuments, { input: QueryOutputAnnotation })
.addNode("generate", generate, { input: GenerateOutputAnnotation })
.addEdge("__start__", "generate_query")
.addEdge("generate_query", "retrieve_documents")
.addEdge("retrieve_documents", "generate")
.compile(); await graph.invoke({ question: "How are you?", });
```

```
{ question: 'How are you?', answer: 'How are you? rephrased as a query!\n\nsome random document\n\nHow are you?' }
```

Above, the original question value in the input has been preserved, but that the generate_query node rephrased it, the retrieve_documents node added "some random document", and finally the generate node combined the docs in the state with the original question to create an answer. The intermediate steps populated by the input annotations passed to the individual nodes are not present in the final output.

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders