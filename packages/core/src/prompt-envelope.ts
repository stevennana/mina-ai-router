import type { Agent, AgentRequest } from "./types";

export function buildPromptEnvelope(request: AgentRequest, target: Agent): string {
  return [
    "[Mina AI Router Request]",
    `Request ID: ${request.id}`,
    `From: ${request.sourceAgent}`,
    `To: ${target.id} / ${target.agentType}`,
    "",
    "The source agent is asking you to answer the following request:",
    `"${request.task}"`,
    "",
    "Please answer based on your current project context.",
    "Include:",
    "- relevant project flow",
    "- API/status constraints",
    "- UI or integration states the source project should support",
    "- recommended behavior",
    "- risks or assumptions",
    "",
    "Wrap your final answer with:",
    `<<<MINA_AGENT_RESPONSE_START ${request.id}>>>`,
    "[your answer]",
    `<<<MINA_AGENT_RESPONSE_END ${request.id}>>>`,
  ].join("\n");
}
