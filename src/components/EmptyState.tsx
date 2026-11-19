import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className={styles.wrap}>
      {icon ? <div className={styles.icon}>{icon}</div> : null}
      <h3 className={styles.title}>{title}</h3>
      <p>{description}</p>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
