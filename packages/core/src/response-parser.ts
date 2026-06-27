export class ResponseMarkerNotFoundError extends Error {
  constructor(requestId: string) {
    super(`Response markers were not found for request ${requestId}.`);
    this.name = "ResponseMarkerNotFoundError";
  }
}

export function parseMarkedResponse(output: string, requestId: string): string {
  const startMarker = `<<<MINA_AGENT_RESPONSE_START ${requestId}>>>`;
  const endMarker = `<<<MINA_AGENT_RESPONSE_END ${requestId}>>>`;
  let end = output.lastIndexOf(endMarker);

  while (end !== -1) {
    const start = output.lastIndexOf(startMarker, end);
    if (start === -1) {
      throw new ResponseMarkerNotFoundError(requestId);
    }

    const contentStart = start + startMarker.length;
    const answer = output.slice(contentStart, end).trim();
    if (!isPlaceholderAnswer(answer)) {
      return answer;
    }

    end = output.lastIndexOf(endMarker, start - 1);
  }

  throw new ResponseMarkerNotFoundError(requestId);
}

function isPlaceholderAnswer(answer: string): boolean {
  const normalized = answer.replace(/[|\s]/g, "");
  return normalized === "..." || normalized === "[youranswer]";
}
