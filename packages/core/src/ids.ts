let sequence = 0;

export function createRequestId(): string {
  sequence += 1;
  return `mar-${Date.now().toString(36)}-${sequence.toString(36)}`;
}
