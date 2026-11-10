import styles from "./Badge.module.css";

export function Badge({ status }: { status: string }) {
  const className = styles[status as keyof typeof styles] ?? styles.draft;
  const label = status.replaceAll("_", " ");
  return <span className={`${styles.badge} ${className}`}>{label}</span>;
}
