import type { AgentCapabilityProfile } from "./types";

export interface CapabilityProfileInput {
  capabilitySummary?: string;
  capabilitySources?: string;
  capabilityProfile?: Partial<AgentCapabilityProfile>;
}

export function buildCapabilityProfile(input: CapabilityProfileInput): AgentCapabilityProfile | undefined {
  const summary = input.capabilitySummary?.trim();
  const profile = normalizeProfile(input.capabilityProfile);
  const quality = scoreCapabilityProfile({ ...input, capabilityProfile: profile });

  if (!summary && !profile) {
    return undefined;
  }

  return {
    ...profile,
    quality: quality.quality,
    qualityReasons: quality.reasons,
  };
}

export function scoreCapabilityProfile(input: CapabilityProfileInput): { quality: AgentCapabilityProfile["quality"]; reasons: string[] } {
  const summary = input.capabilitySummary?.trim() ?? "";
  const sources = splitList(input.capabilitySources);
  const profile = normalizeProfile(input.capabilityProfile);
  const canAnswer = profile?.canAnswer ?? [];
  const evidence = profile?.evidence?.length ? profile.evidence : sources;
  const keyAreas = profile?.keyAreas ?? [];
  const languageCount = profile?.primaryLanguages?.length ?? 0;
  const purpose = profile?.projectPurpose?.trim() ?? "";
  const text = [summary, purpose, canAnswer.join(" "), keyAreas.join(" ")].join(" ").toLowerCase();

  if (!summary && !purpose && canAnswer.length === 0 && keyAreas.length === 0 && evidence.length === 0) {
    return { quality: "missing", reasons: ["No capability summary or structured profile is recorded."] };
  }

  const genericHits = genericCapabilitySignals.filter((signal) => text.includes(signal));
  const domainHits = domainCapabilitySignals.filter((signal) => text.includes(signal));
  const hasStructuredStrongShape = Boolean(purpose)
    && canAnswer.length >= 2
    && keyAreas.length >= 1
    && evidence.length >= 2;
  const hasSummaryStrongShape = domainHits.length >= 3
    && evidence.length >= 2
    && !mostlyGenericFileMention(summary);

  if (hasStructuredStrongShape || hasSummaryStrongShape) {
    return {
      quality: "strong",
      reasons: [
        hasStructuredStrongShape
          ? "Structured profile includes purpose, answerable areas, key areas, and evidence."
          : "Capability summary includes multiple answerable domains backed by evidence.",
      ],
    };
  }

  if (genericHits.length > 0 || mostlyGenericFileMention(summary) || domainHits.length < 2 || evidence.length === 0) {
    return {
      quality: "thin",
      reasons: [
        genericHits.length > 0
          ? `Summary leans on generic file references: ${genericHits.slice(0, 3).join(", ")}.`
          : "Profile does not yet describe enough answerable domains with evidence.",
      ],
    };
  }

  if (languageCount > 0 && (canAnswer.length > 0 || keyAreas.length > 0)) {
    return {
      quality: "thin",
      reasons: ["Profile has some structure but needs more answerable domains and evidence."],
    };
  }

  return { quality: "thin", reasons: ["Capability profile is present but not yet strong."] };
}

function normalizeProfile(profile: Partial<AgentCapabilityProfile> | undefined): Partial<AgentCapabilityProfile> | undefined {
  if (!profile) {
    return undefined;
  }

  const normalized = {
    projectPurpose: stringValue(profile.projectPurpose),
    primaryLanguages: cleanList(profile.primaryLanguages),
    keyAreas: cleanList(profile.keyAreas),
    canAnswer: cleanList(profile.canAnswer),
    cannotAnswerYet: cleanList(profile.cannotAnswerYet),
    evidence: cleanList(profile.evidence),
  };

  if (!normalized.projectPurpose
    && normalized.primaryLanguages.length === 0
    && normalized.keyAreas.length === 0
    && normalized.canAnswer.length === 0
    && normalized.cannotAnswerYet.length === 0
    && normalized.evidence.length === 0) {
    return undefined;
  }

  return normalized;
}

function cleanList(value: readonly string[] | undefined): string[] {
  return Array.isArray(value)
    ? value.map((item) => item.trim()).filter(Boolean)
    : [];
}

function splitList(value: string | undefined): string[] {
  return value
    ? value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean)
    : [];
}

function stringValue(value: string | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function mostlyGenericFileMention(summary: string): boolean {
  if (!summary) {
    return false;
  }

  const lower = summary.toLowerCase();
  const fileMentionCount = (lower.match(/\b(readme|claude\.md|agents\.md|src|package\.json|docs?|directories|files?)\b/g) ?? []).length;
  return fileMentionCount >= 2 && (lower.includes("provides guidance") || lower.includes("contains") || lower.includes("there is"));
}

const genericCapabilitySignals = [
  "claude.md",
  "agents.md",
  "readme",
  "src directory",
  "provides guidance",
  "project files",
  "files exist",
  "directory",
  "package.json",
];

const domainCapabilitySignals = [
  "api",
  "endpoint",
  "router",
  "mcp",
  "transport",
  "tmux",
  "request",
  "response",
  "schema",
  "database",
  "auth",
  "payment",
  "frontend",
  "backend",
  "cli",
  "web ui",
  "http",
  "react",
  "typescript",
  "node",
  "test",
  "workflow",
];
