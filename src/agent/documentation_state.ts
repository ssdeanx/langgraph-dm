import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

/**
 * Defines the state for the documentation subgraph.
 */
export interface DocumentationState {
  query: string;
  drafted_documentation: string;
  final_documentation: string;
  messages: BaseMessage[]; // Keep messages within the subgraph state for local context
}

/**
 * Annotation for the DocumentationState, defining how its fields are managed.
 */
export const DocumentationAnnotation = Annotation.Root({
  query: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  drafted_documentation: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  final_documentation: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});
