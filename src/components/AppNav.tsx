"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppNav.module.css";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/targeting", label: "Targeting" },
  { href: "/prospects", label: "Prospects" },
  { href: "/approval", label: "Approval queue" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

export function AppNav({
  children,
  userLabel,
}: {
  children: React.ReactNode;
  userLabel: string;
}) {
  const pathname = usePathname();
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Outreach Studio</div>
        <nav className={styles.nav}>
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.link} ${active ? styles.active : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.user}>{userLabel}</div>
      </aside>
      <div className={styles.main}>{children}</div>
    </div>
  );
}
