import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

/**
 * Defines the state for the research subgraph.
 */
export interface ResearchState {
  query: string;
  research_data: string[];
  summary: string;
  report: string;
  messages: BaseMessage[]; // Keep messages within the subgraph state for local context
}

/**
 * Annotation for the ResearchState, defining how its fields are managed.
 */
export const ResearchAnnotation = Annotation.Root({
  query: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  research_data: Annotation<string[]>({
    reducer: (x, y) => (x ?? []).concat(y ?? []),
    default: () => [],
  }),
  summary: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  report: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});
