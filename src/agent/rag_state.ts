import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

/**
 * Defines the state for the RAG subgraph.
 */
export interface RagState {
  query: string;
  retrieved_documents: string[];
  generated_answer: string;
  messages: BaseMessage[]; // Keep messages within the subgraph state for local context
}

/**
 * Annotation for the RagState, defining how its fields are managed.
 */
export const RagAnnotation = Annotation.Root({
  query: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  retrieved_documents: Annotation<string[]>({
    reducer: (x, y) => (x ?? []).concat(y ?? []),
    default: () => [],
  }),
  generated_answer: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});
