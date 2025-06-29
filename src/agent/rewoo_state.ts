
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

/**
 * Represents the state for a Rewoo workflow.
 */
export interface RewooState {
  task: string;
  planString: string;
  steps: string[][];
  results: Record<string, any>;
  result: string;
  messages: BaseMessage[];
  next: string;
}

export const RewooAnnotation = Annotation.Root({
  task: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  planString: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  steps: Annotation<string[][]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  results: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  result: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  next: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
});
