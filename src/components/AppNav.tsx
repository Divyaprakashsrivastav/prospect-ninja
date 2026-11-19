"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./AppNav.module.css";
import {
  IconChart,
  IconClipboardCheck,
  IconHistory,
  IconInbox,
  IconLayoutDashboard,
  IconLogOut,
  IconMegaphone,
  IconMessage,
  IconNinjaMark,
  IconPanelLeft,
  IconSettings,
  IconSparkles,
  IconUser,
  IconUsers,
} from "./icons";

const primaryLinks = [
  { href: "/dashboard", label: "Dashboard", Icon: IconLayoutDashboard },
  { href: "/targeting", label: "Campaigns", Icon: IconMegaphone },
  { href: "/prospects", label: "Prospects", Icon: IconUsers },
  { href: "/leads", label: "Leads", Icon: IconInbox },
  { href: "/outreach", label: "Outreach", Icon: IconMessage },
  { href: "/studio", label: "AI Message Studio", Icon: IconSparkles },
  { href: "/approval", label: "Approval Queue", Icon: IconClipboardCheck },
];

const secondaryLinks = [
  { href: "/analytics", label: "Analytics", Icon: IconChart },
  { href: "/history", label: "Activity History", Icon: IconHistory },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

const STORAGE_KEY = "pn-sidebar-collapsed";

export function AppNav({
  children,
  userLabel,
}: {
  children: React.ReactNode;
  userLabel: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderLinks(
    links: typeof primaryLinks,
    section?: string,
  ) {
    return (
      <>
        {section ? <div className={styles.sectionLabel}>{section}</div> : null}
        {links.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.link} ${isActive(href) ? styles.active : ""}`}
            title={label}
          >
            <span className={styles.linkIcon}>
              <Icon size={18} />
            </span>
            <span className={styles.linkLabel}>{label}</span>
          </Link>
        ))}
      </>
    );
  }

  return (
    <div
      className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ""}`}
      suppressHydrationWarning
    >
      <div className={styles.mobileBar}>
        <div className={styles.mobileBrand}>
          <IconNinjaMark size={28} />
          <span>Prospect Ninja</span>
        </div>
        <button
          type="button"
          className={styles.menuBtn}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <IconPanelLeft size={18} />
        </button>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className={styles.mobileOverlay}
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.brandRow}>
          <Link href="/dashboard" className={styles.brand} title="Prospect Ninja">
            <IconNinjaMark size={28} />
            <span className={styles.brandText}>
              <span className={styles.brandName}>Prospect Ninja</span>
              <span className={styles.brandTag}>Outreach workspace</span>
            </span>
          </Link>
          <button
            type="button"
            className={styles.collapseBtn}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleCollapsed}
          >
            <IconPanelLeft size={16} />
          </button>
        </div>

        <nav className={styles.nav} aria-label="Primary">
          {renderLinks(primaryLinks)}
          {renderLinks(secondaryLinks, "Insights")}
        </nav>

        <div className={styles.user}>
          <div className={styles.userMeta}>
            <span className={styles.avatar}>
              <IconUser size={16} />
            </span>
            <span className={styles.userText}>
              <span className={styles.userEmail}>{userLabel}</span>
              <span className={styles.userRole}>Signed in</span>
            </span>
          </div>
          <Link className={styles.signOut} href="/api/auth/logout" title="Sign out">
            <IconLogOut size={15} />
            <span>Sign out</span>
          </Link>
        </div>
      </aside>

      <div className={styles.main}>{children}</div>
    </div>
  );
}
