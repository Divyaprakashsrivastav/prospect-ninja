import type { ReactNode } from "react";
import styles from "./Badge.module.css";

export function Badge({
  status,
  children,
}: {
  status: string;
  children?: ReactNode;
}) {
  const className = styles[status as keyof typeof styles] ?? styles.draft;
  const label = children ?? status.replaceAll("_", " ");
  return <span className={`${styles.badge} ${className}`}>{label}</span>;
}
