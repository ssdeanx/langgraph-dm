---
trigger: manual
---

# LangSmith Tracing & Console Rules

These rules are designed to ensure effective tracing and debugging of agent interactions within the LangGraph project using LangSmith or similar console logging mechanisms. Proper logging and tracing are essential for monitoring the behavior of conversational agents and diagnosing issues in the graph workflow.

## Rule 1: Mandatory Logging for Agent Nodes
- **Description**: All agent nodes must log their entry and exit states, including key state variables like message count and session ID, to provide visibility into the conversation flow.
- **Rationale**: In 'src/agent/graph.ts', logging is implemented for chat and entry nodes to track processing, which is crucial for understanding node behavior during debugging.
- **Enforcement**: Ensure each node function includes logging statements at the beginning and end of processing, capturing relevant state information.

## Rule 2: Error Logging Standards
- **Description**: Errors encountered during model invocation or node processing must be logged with detailed error messages, including the error type and context, to facilitate quick diagnosis.
- **Rationale**: Error handling in 'src/agent/graph.ts' uses 'handleGlobalError' to manage and log errors, ensuring that issues are captured for review.
- **Enforcement**: Implement error logging in try-catch blocks within node functions, ensuring error details are recorded.

## Rule 3: Trace Agent Decision Paths
- **Description**: Log the decision paths taken by the supervisor or routing functions to trace how conversations are routed through the graph.
- **Rationale**: The 'routeMessages' function in 'src/agent/graph.ts' logs routing decisions, which helps in understanding why a particular node was chosen next.
- **Enforcement**: Include logging for routing logic outcomes, specifying the next node or termination condition.

## Rule 4: Console Output for Key Events
- **Description**: Key events such as user input receipt, agent response generation, and conversation termination must be output to the console for real-time monitoring.
- **Rationale**: Real-time console output provides immediate feedback on system operation, aiding developers during testing and debugging sessions.
- **Enforcement**: Add console.log statements or equivalent for significant events in the conversation flow.

## Rule 5: LangSmith Integration for Production
- **Description**: For production environments, integrate LangSmith or a similar tracing tool to capture detailed execution traces of graph workflows for post-analysis.
- **Rationale**: Advanced tracing tools like LangSmith provide deeper insights into performance and bottlenecks, beyond basic console logging.
- **Enforcement**: Configure LangSmith integration in the project settings or environment variables when moving to production testing or deployment.

These rules ensure that debugging and tracing capabilities are robust within the LangGraph project, allowing developers to monitor and improve agent performance effectively. Activate these rules during debugging sessions or when preparing for production deployment.
