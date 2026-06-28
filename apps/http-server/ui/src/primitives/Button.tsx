import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonTone = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  tone = "primary",
  children,
  className,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone }>) {
  const toneClass = tone === "primary" ? "" : tone;
  return (
    <button className={[toneClass, className].filter(Boolean).join(" ")} type="button" {...props}>
      {children}
    </button>
  );
}
