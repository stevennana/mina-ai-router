import type { ResponseParserDiagnostics } from "./types";

export class ResponseParseError extends Error {
  constructor(public readonly diagnostics: ResponseParserDiagnostics) {
    super(diagnostics.message);
    this.name = "ResponseParseError";
  }
}

export class ResponseMarkerNotFoundError extends ResponseParseError {
  constructor(diagnostics: ResponseParserDiagnostics) {
    super(diagnostics);
    this.name = "ResponseMarkerNotFoundError";
  }
}

export type MarkedResponseParseResult =
  | { ok: true; answer: string; diagnostics: ResponseParserDiagnostics }
  | { ok: false; diagnostics: ResponseParserDiagnostics };

export function inspectMarkedResponse(output: string, requestId: string): MarkedResponseParseResult {
  const startMarker = `<<<MINA_AGENT_RESPONSE_START ${requestId}>>>`;
  const endMarker = `<<<MINA_AGENT_RESPONSE_END ${requestId}>>>`;
  const startMarkerFound = output.includes(startMarker);
  const endMarkerFound = output.includes(endMarker);
  let candidateCount = 0;
  let placeholderCount = 0;
  let end = output.lastIndexOf(endMarker);

  while (end !== -1) {
    const start = output.lastIndexOf(startMarker, end);
    if (start === -1) {
      return failedDiagnostics({
        kind: "missing_start_marker",
        requestId,
        message: `Response end marker was found without a matching start marker for request ${requestId}.`,
        startMarkerFound,
        endMarkerFound,
        candidateCount,
        placeholderCount,
      });
    }

    const contentStart = start + startMarker.length;
    const answer = output.slice(contentStart, end).trim();
    candidateCount += 1;
    if (!isPlaceholderAnswer(answer)) {
      return {
        ok: true,
        answer,
        diagnostics: {
          kind: "parsed",
          requestId,
          message: `Parsed marker-wrapped response for request ${requestId}.`,
          startMarkerFound,
          endMarkerFound,
          candidateCount,
          placeholderCount,
          answerLength: answer.length,
        },
      };
    }

    placeholderCount += 1;
    end = output.lastIndexOf(endMarker, start - 1);
  }

  if (placeholderCount > 0) {
    return failedDiagnostics({
      kind: "placeholder_only",
      requestId,
      message: `Response markers only contained placeholder content for request ${requestId}.`,
      startMarkerFound,
      endMarkerFound,
      candidateCount,
      placeholderCount,
    });
  }

  return failedDiagnostics({
    kind: "missing_markers",
    requestId,
    message: `Response markers were not found for request ${requestId}.`,
    startMarkerFound,
    endMarkerFound,
    candidateCount,
    placeholderCount,
  });
}

export function parseMarkedResponse(output: string, requestId: string): string {
  const result = inspectMarkedResponse(output, requestId);

  if (result.ok) {
    return result.answer;
  }

  throw new ResponseMarkerNotFoundError(result.diagnostics);
}

function isPlaceholderAnswer(answer: string): boolean {
  const normalized = answer.replace(/[|\s]/g, "");
  return normalized === "..." || normalized === "[youranswer]";
}

function failedDiagnostics(diagnostics: ResponseParserDiagnostics): MarkedResponseParseResult {
  return {
    ok: false,
    diagnostics,
  };
}
