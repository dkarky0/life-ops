export type MemberId = string;

export type Assignee = "me" | "partner" | "either";

export type ItemType =
  | "place"
  | "task"
  | "care"
  | "date"
  | "payment"
  | "inbox"
  | "shopping";

export type ItemStatus = "open" | "done" | "cancelled";

export type Recurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";

export type TrackerKind = "cycle" | "rate";

export interface Member {
  id: string;
  displayName: string;
  pinHash: string;
  role: "you" | "partner";
}

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  notes: string;
  tags: string;
  dueAt: string | null;
  recurrence: Recurrence;
  status: ItemStatus;
  assignee: Assignee;
  amount: number | null;
  currency: string;
  locationLabel: string | null;
  mapsUrl: string | null;
  shoppingLines: string;
  createdBy: string;
  updatedAt: string;
  createdAt: string;
  doneAt: string | null;
}

export interface Tracker {
  id: string;
  name: string;
  kind: TrackerKind;
  unit: string;
  defaultUnitPrice: number;
  expectedDays: number | null;
  createdAt: string;
}

export interface TrackerCycle {
  id: string;
  trackerId: string;
  installedAt: string;
  replacedAt: string | null;
  expectedDays: number;
  dueAt: string;
  pricePaid: number | null;
  createdBy: string;
  createdAt: string;
}

export interface TrackerSegment {
  id: string;
  trackerId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  quantity: number;
  unitPrice: number;
  createdBy: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  memberId: string;
  action: string;
  summary: string;
  createdAt: string;
}

export interface Message {
  id: string;
  memberId: string;
  role: "user" | "assistant" | "system";
  content: string;
  proposalJson: string | null;
  createdAt: string;
}

export interface ShoppingLine {
  id: string;
  text: string;
  done: boolean;
}
