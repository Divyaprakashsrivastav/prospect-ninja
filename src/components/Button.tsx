import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  block?: boolean;
};

export function Button({
  variant = "primary",
  block,
  className,
  ...props
}: Props) {
  return (
    <button
      className={[
        styles.button,
        styles[variant],
        block ? styles.block : "",
        className ?? "",
      ].join(" ")}
      {...props}
    />
  );
}
