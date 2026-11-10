import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div>
        <p className={styles.kicker}>{kicker}</p>
        <h1>{title}</h1>
        {description ? <p style={{ color: "var(--muted)", marginTop: 6 }}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
