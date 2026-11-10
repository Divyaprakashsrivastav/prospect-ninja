import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.wrap}>
      <h3 className={styles.title}>{title}</h3>
      <p>{description}</p>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
