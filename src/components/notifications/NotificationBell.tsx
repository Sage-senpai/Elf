"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const typeBadge: Record<string, string> = {
  "agent.stale_project": "agent",
  "fork.approved": "fork",
  "fork.rejected": "fork",
  "commit.created": "commit",
  "payment.settled": "payment",
  "member.invited": "team"
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Initial unread count + poll while the page is mounted.
  // Adaptive cadence: every 30s when healthy, exponential backoff up to
  // 5 minutes after consecutive failures, paused while the tab is hidden,
  // and reset to 30s the moment a request succeeds. Prevents the console
  // spam when DNS / network momentarily drops.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;

    function nextDelay(): number {
      if (failures === 0) return 30_000;
      const backoff = 30_000 * 2 ** Math.min(failures - 1, 4); // 30s,60s,2m,4m,5m
      return Math.min(backoff, 300_000);
    }

    async function pull() {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) {
        schedule();
        return;
      }
      try {
        const res = await fetch("/api/notifications/unread-count");
        if (!res.ok) {
          failures++;
        } else {
          const json = (await res.json()) as { count: number };
          if (!cancelled) setUnread(json.count);
          failures = 0;
        }
      } catch {
        failures++;
      } finally {
        schedule();
      }
    }

    function schedule() {
      if (cancelled) return;
      timer = setTimeout(pull, nextDelay());
    }

    function onVisible() {
      if (!document.hidden && failures > 0) {
        // Snap back to a fresh attempt when the user returns.
        if (timer) clearTimeout(timer);
        void pull();
      }
    }

    void pull();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Click outside to close.
  useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClickAway);
    return () => window.removeEventListener("mousedown", onClickAway);
  }, [open]);

  // Lazy-load list when opened.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/notifications?limit=20");
        const json = (await res.json()) as { notifications: Notification[] };
        setNotifications(json.notifications ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnread((u) => Math.max(0, u - 1));
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await fetch("/api/notifications/read-all", { method: "POST" });
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${unread} unread notifications`}
        aria-expanded={open}
        className="relative p-2 rounded-button hover:bg-elf-border/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-elf-mint"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 mono text-[10px] min-w-[18px] h-[18px] px-1 rounded-full bg-elf-deep text-elf-on-brand flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] overflow-hidden flex flex-col bg-elf-warm-white border-hair rounded-card z-50"
        >
          <div className="px-4 py-3 border-b border-hair flex items-center justify-between">
            <p className="mono text-xs uppercase tracking-widest text-elf-mid">
              notifications
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-elf-deep hover:text-elf-forest underline underline-offset-2"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="px-4 py-6 text-sm text-elf-muted">Loading…</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="px-4 py-8 text-sm text-elf-muted text-center">
                <p className="mb-1">No notifications yet.</p>
                <p className="text-xs">
                  Activity from your workspaces lands here.
                </p>
              </div>
            )}
            <ul>
              {notifications.map((n) => (
                <li key={n.id}>
                  <NotificationRow
                    notification={n}
                    onClick={() => {
                      if (!n.read) void markRead(n.id);
                      if (n.link) {
                        setOpen(false);
                        if (n.link.startsWith("http")) {
                          window.open(n.link, "_blank", "noreferrer");
                        } else {
                          router.push(n.link);
                        }
                      }
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  onClick
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const badge = typeBadge[notification.type];
  const Wrapper = notification.link ? "button" : "div";
  return (
    <Wrapper
      type={notification.link ? "button" : undefined}
      onClick={notification.link ? onClick : undefined}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-hair flex gap-3 transition-colors",
        notification.link && "hover:bg-elf-border/30 cursor-pointer",
        !notification.read && "bg-elf-mint/15"
      )}
    >
      <span
        className={cn(
          "mt-1 shrink-0 w-1.5 h-1.5 rounded-full",
          notification.read ? "bg-transparent" : "bg-elf-deep"
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          {badge && (
            <span className="mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-badge bg-elf-border/40 text-elf-muted">
              {badge}
            </span>
          )}
          <span className="text-elf-border">·</span>
          <span className="mono text-[10px] text-elf-muted">
            {relative(notification.createdAt)}
          </span>
        </div>
        <p className="text-sm text-elf-ink leading-snug truncate">
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-elf-muted leading-relaxed mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        )}
      </div>
    </Wrapper>
  );
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-elf-ink"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function relative(date: string): string {
  const d = new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
