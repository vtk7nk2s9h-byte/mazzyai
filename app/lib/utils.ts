import { Revenue } from './definitions';
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const formatCurrency = (amount: number) => {
  return (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

/** Milliseconds to m:ss, the way a call length is normally read. */
export const formatDuration = (ms: number | null | undefined) => {
  if (ms == null) return '—';
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** "Ada Lovelace" -> "AL", "ada@x.io" -> "A". Fallback when there's no image. */
export const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/** The name we captured for a caller, falling back to their number. */
export const callerLabel = (call: {
  callerName?: string | null;
  fromNumber?: string | null;
}) => call.callerName ?? call.fromNumber ?? 'Unknown caller';

export const formatDateToLocal = (
  dateStr: string,
  locale: string = 'en-US',
) => {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  const formatter = new Intl.DateTimeFormat(locale, options);
  return formatter.format(date);
};

export const generateYAxis = (revenue: Revenue[]) => {
  // Calculate what labels we need to display on the y-axis
  // based on highest record and in 1000s
  const yAxisLabels = [];
  const highestRecord = Math.max(...revenue.map((month) => month.revenue));
  const topLabel = Math.ceil(highestRecord / 1000) * 1000;

  for (let i = topLabel; i >= 0; i -= 1000) {
    yAxisLabels.push(`$${i / 1000}K`);
  }

  return { yAxisLabels, topLabel };
};

export const generatePagination = (currentPage: number, totalPages: number) => {
  // If the total number of pages is 7 or less,
  // display all pages without any ellipsis.
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // If the current page is among the first 3 pages,
  // show the first 3, an ellipsis, and the last 2 pages.
  if (currentPage <= 3) {
    return [1, 2, 3, '...', totalPages - 1, totalPages];
  }

  // If the current page is among the last 3 pages,
  // show the first 2, an ellipsis, and the last 3 pages.
  if (currentPage >= totalPages - 2) {
    return [1, 2, '...', totalPages - 2, totalPages - 1, totalPages];
  }

  // If the current page is somewhere in the middle,
  // show the first page, an ellipsis, the current page and its neighbors,
  // another ellipsis, and the last page.
  return [
    1,
    '...',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    '...',
    totalPages,
  ];
};

/** The contract's AgentStatus members, in the order the status picker lists them. */
export const AGENT_STATUSES = ['IDLE', 'READY', 'ACTIVE', 'PAUSED', 'DISACTIVATED'] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

/** The contract's OrgStatus members, in the order the status picker lists them. */
export const ORG_STATUSES = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'] as const;
export type OrgStatus = (typeof ORG_STATUSES)[number];

/** The contract's Plan members, cheapest first. */
export const ORG_PLANS = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] as const;
export type OrgPlan = (typeof ORG_PLANS)[number];

/** The contract's EmailType members, with how each reads in the UI. */
export const EMAIL_TYPES = ['MARKETING', 'INVITATION', 'FOLLOW_UP'] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];
export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  MARKETING: 'Marketing email',
  INVITATION: 'Invitation email',
  FOLLOW_UP: 'Follow-up email',
};

/** The contract's SystemRole members, least to most privileged. */
export const USER_ROLES = ['USER', 'ADMIN', 'SUPERUSER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Rows every table shows per page. */
export const PAGE_SIZE = 7;

/**
 * One page of an in-memory list, for tables whose data isn't paged by its
 * query. A page past the end is clamped to the last one.
 */
export function paginate<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page || 1), totalPages);
  return {
    rows: items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    totalPages,
  };
}
