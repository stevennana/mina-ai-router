import type { AgentTransport, TransportRegistry, TransportType } from "../../core/src";

export class DefaultTransportRegistry implements TransportRegistry {
  private readonly transports = new Map<TransportType, AgentTransport>();

  register(type: TransportType, transport: AgentTransport): this {
    this.transports.set(type, transport);
    return this;
  }

  get(type: TransportType): AgentTransport {
    const transport = this.transports.get(type);

    if (!transport) {
      throw new Error(`Transport "${type}" is not configured.`);
    }

    return transport;
  }
}
