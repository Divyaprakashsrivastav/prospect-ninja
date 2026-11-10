import type { ReactNode } from "react";
import styles from "./Banner.module.css";

export function Banner({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warn" | "error";
}) {
  return <div className={`${styles.banner} ${styles[tone]}`}>{children}</div>;
}
