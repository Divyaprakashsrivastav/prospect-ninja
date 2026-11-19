import styles from "./loading.module.css";

export default function Loading() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-label="Loading">
      <div className={styles.header}>
        <div className={`${styles.skel} ${styles.title}`} />
        <div className={`${styles.skel} ${styles.button}`} />
      </div>
      <div className={styles.kpi}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className={`${styles.skel} ${styles.card}`} />
        ))}
      </div>
      <div className={`${styles.skel} ${styles.panel}`} />
    </div>
  );
}
