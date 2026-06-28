import type { PropsWithChildren } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";

export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string; onClose: () => void }>) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div className="modal-head">
          <div>
            <h2 id="modalTitle">{title}</h2>
            {subtitle ? <p className="subtitle">{subtitle}</p> : null}
          </div>
          <Button tone="secondary" onClick={onClose}><Icon name="delete" />Close</Button>
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
