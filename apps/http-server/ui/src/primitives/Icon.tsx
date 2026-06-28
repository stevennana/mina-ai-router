export type IconName =
  | "add"
  | "archive"
  | "bolt"
  | "chevron_left"
  | "chevron_right"
  | "code"
  | "content_copy"
  | "dashboard"
  | "database"
  | "delete"
  | "dns"
  | "folder_open"
  | "history"
  | "hub"
  | "info"
  | "keyboard_return"
  | "lan"
  | "monitoring"
  | "open_in_new"
  | "play_arrow"
  | "refresh"
  | "remove"
  | "restart_alt"
  | "router"
  | "send"
  | "settings"
  | "terminal";

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: `${size}px` }} aria-hidden="true">
      {name}
    </span>
  );
}
