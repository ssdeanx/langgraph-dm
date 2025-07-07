
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

/**
 * Represents the state for a multi-agent collaboration workflow.
 */
export interface CollaborationState {
  messages: BaseMessage[];
  sender: string;
  next: string;
}

export const CollaborationAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  sender: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "user",
  }),
  next: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
});
