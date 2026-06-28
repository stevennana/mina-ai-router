import { Button } from "../primitives/Button";
import { Icon } from "../primitives/Icon";

export function SideRail({ onDiagnostics }: { onDiagnostics: () => void }) {
  return (
    <nav className="side-rail" aria-label="Main sections">
      <Button className="rail-button active" tone="ghost" title="Overview"><Icon name="dashboard" /></Button>
      <Button className="rail-button" tone="ghost" title="Agents"><Icon name="hub" /></Button>
      <Button className="rail-button" tone="ghost" title="Requests"><Icon name="monitoring" /></Button>
      <Button className="rail-button" tone="ghost" title="MCP"><Icon name="dns" /></Button>
      <Button className="rail-button" tone="ghost" title="Diagnostics" onClick={onDiagnostics}><Icon name="settings" /></Button>
    </nav>
  );
}
