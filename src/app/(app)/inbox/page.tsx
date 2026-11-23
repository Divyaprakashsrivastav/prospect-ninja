import Link from "next/link";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { InboxReplyActions } from "@/components/InboxReplyActions";
import { PageHeader } from "@/components/PageHeader";
import { IconInbox, IconLinkedIn } from "@/components/icons";
import {
  DATABASE_UNREACHABLE_MESSAGE,
  isPrismaUnavailable,
} from "@/lib/db-errors";
import { requireUser } from "@/lib/session";
import {
  INBOX_STATUS_LABELS,
  INBOX_STATUSES,
  isInboxStatus,
} from "@/modules/inbox/constants";
import { listInboxReplies, type InboxReply } from "@/modules/inbox/service";
import styles from "./inbox.module.css";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  year: "numeric",
});

const TABS = [
  { key: "all", label: "All replies", href: "/inbox" },
  ...INBOX_STATUSES.map((status) => ({
    key: status,
    label: INBOX_STATUS_LABELS[status],
    href: `/inbox?status=${status}`,
  })),
] as const;

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const filter = isInboxStatus(params.status) ? params.status : undefined;
  const activeTab = filter ?? "all";
  let result: Awaited<ReturnType<typeof listInboxReplies>> | null = null;
  try {
    result = await listInboxReplies(user.id, filter);
  } catch (error) {
    if (!isPrismaUnavailable(error)) {
      throw error;
    }
  }
  const replies = result?.replies ?? [];

  return (
    <>
      <PageHeader
        kicker="Every reply, one place"
        title="Inbox"
        description="Replies from LinkedIn, ready for your next move."
      />

      {!result ? <Banner tone="error">{DATABASE_UNREACHABLE_MESSAGE}</Banner> : null}

      {result && !result.connected ? (
        <EmptyState
          icon={<IconInbox size={22} />}
          title="Link LinkedIn to see replies"
          description="Replies arrive here once your LinkedIn account is linked through Unipile."
          action={
            <Link href="/connect-linkedin">
              <Button type="button">Connect LinkedIn</Button>
            </Link>
          }
        />
      ) : null}

      {result?.connected ? (
        <>
          <nav className={styles.tabs} aria-label="Reply status">
            {TABS.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                className={`${styles.tab} ${tab.key === activeTab ? styles.tabActive : ""}`}
                aria-current={tab.key === activeTab ? "page" : undefined}
              >
                {tab.label}
                <span className={styles.count}>{result.counts[tab.key]}</span>
              </Link>
            ))}
          </nav>

          {replies.length === 0 ? (
            <EmptyState
              icon={<IconInbox size={22} />}
              title={filter ? `No replies marked ${INBOX_STATUS_LABELS[filter]}` : "No replies yet"}
              description={
                filter
                  ? "Mark a reply with this status and it shows up here."
                  : "When someone messages your linked LinkedIn account, it shows up here."
              }
            />
          ) : (
            <div className={styles.list}>
              {replies.map((reply) => (
                <ReplyCard key={reply.id} reply={reply} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </>
  );
}

function ReplyCard({ reply }: { reply: InboxReply }) {
  const meta = [
    reply.campaignName,
    reply.sentAt ? `Sent ${dateFormat.format(reply.sentAt)}` : null,
    `Replied ${dateFormat.format(reply.receivedAt)}`,
  ].filter(Boolean);

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <div className={styles.person}>
          <span className={styles.avatar} aria-hidden>
            {reply.initials}
          </span>
          <div>
            <div className={styles.name}>{reply.name}</div>
            {reply.headline ? <div className={styles.headline}>{reply.headline}</div> : null}
          </div>
        </div>
        {reply.profileUrl ? (
          <a
            className={styles.channel}
            href={reply.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open LinkedIn profile"
            aria-label={`Open ${reply.name}'s LinkedIn profile`}
          >
            <IconLinkedIn size={24} />
          </a>
        ) : (
          <span className={styles.channel} title="LinkedIn">
            <IconLinkedIn size={24} />
          </span>
        )}
      </div>

      <div className={styles.meta}>
        {meta.map((item, index) => (
          <span key={item}>
            {index > 0 ? "· " : ""}
            {item}
          </span>
        ))}
        {reply.status ? (
          <span className={`${styles.pill} ${styles[`pill_${reply.status}`]}`}>
            {INBOX_STATUS_LABELS[reply.status]}
          </span>
        ) : null}
      </div>

      <blockquote className={styles.quote}>
        <div className={styles.quoteLabel}>Reply from {reply.firstName}</div>
        <p className={styles.quoteText}>{reply.text}</p>
      </blockquote>

      <InboxReplyActions
        key={reply.status ?? "none"}
        eventId={reply.id}
        firstName={reply.firstName}
        status={reply.status}
      />
    </article>
  );
}
