/**
 * BrainDump - Morgan & Alyssa's Task Storage & Real-Time Sync
 * Multi-user reactive sync via localStorage and BroadcastChannel.
 */

import {
  BrainDumpTask,
  BrainDumpTaskType,
  BrainDumpAssignee,
  BrainDumpStatus,
  DueUrgency,
  TASK_TYPE_CONFIGS,
} from "./brainDumpTypes";

const BRAINDUMP_STORAGE_KEY = "hudson_braindump_tasks_v1";
const BRAINDUMP_CHANNEL_NAME = "hudson_braindump_sync_v1";

/**
 * Calculates End-Of-Day (5:00 PM local time) deadline given a number of days from now.
 */
export function calculateEodDeadline(days: number, fromDate: Date = new Date()): string {
  const target = new Date(fromDate);
  target.setDate(target.getDate() + days);
  target.setHours(17, 0, 0, 0); // 5:00:00 PM
  return target.toISOString();
}

/**
 * Returns urgency category for a task.
 */
export function getDueUrgency(dueAt: string, completed: boolean): DueUrgency {
  if (completed) return "completed";

  const now = new Date();
  const due = new Date(dueAt);

  if (due.getTime() < now.getTime()) {
    return "overdue";
  }

  const isToday =
    now.getFullYear() === due.getFullYear() &&
    now.getMonth() === due.getMonth() &&
    now.getDate() === due.getDate();

  if (isToday) return "due_today";

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    tomorrow.getFullYear() === due.getFullYear() &&
    tomorrow.getMonth() === due.getMonth() &&
    tomorrow.getDate() === due.getDate();

  if (isTomorrow) return "due_tomorrow";

  return "upcoming";
}

/**
 * Formats a clean human-readable countdown badge.
 */
export function formatDueCountdown(
  dueAt: string,
  completed: boolean
): {
  text: string;
  isOverdue: boolean;
  urgentLevel: "red" | "amber" | "yellow" | "green" | "gray";
} {
  if (completed) {
    return { text: "Smashed Out", isOverdue: false, urgentLevel: "gray" };
  }

  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();

  if (diffMs < 0) {
    const absDiffMs = Math.abs(diffMs);
    const diffHours = Math.floor(absDiffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remHours = diffHours % 24;

    let overdueText = "Overdue";
    if (diffDays > 0) {
      overdueText = `Overdue by ${diffDays}d ${remHours}h`;
    } else if (diffHours > 0) {
      overdueText = `Overdue by ${diffHours}h`;
    } else {
      const diffMins = Math.max(1, Math.floor(absDiffMs / (1000 * 60)));
      overdueText = `Overdue by ${diffMins}m`;
    }

    return {
      text: overdueText,
      isOverdue: true,
      urgentLevel: "red",
    };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  const isToday =
    now.getFullYear() === due.getFullYear() &&
    now.getMonth() === due.getMonth() &&
    now.getDate() === due.getDate();

  if (isToday) {
    if (diffHours <= 1) {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return {
        text: `Due in ${diffMins} mins (5:00 PM)`,
        isOverdue: false,
        urgentLevel: "red",
      };
    }
    return {
      text: `Due today in ${diffHours}h (5:00 PM)`,
      isOverdue: false,
      urgentLevel: "amber",
    };
  }

  if (diffDays === 0 || diffDays === 1) {
    return {
      text: "Due tomorrow 5:00 PM",
      isOverdue: false,
      urgentLevel: "yellow",
    };
  }

  return {
    text: `Due in ${diffDays} days (${due.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })})`,
    isOverdue: false,
    urgentLevel: "green",
  };
}

/**
 * Seed initial real-world tasks for Morgan and Alyssa.
 */
function getInitialSeedTasks(): BrainDumpTask[] {
  const now = new Date();

  return [
    {
      id: "bd_task_01_markup_steve",
      title: "Mark-up Jasper 26 - Extended Alfresco & Butler's Pantry",
      description: "Steve from NSW requested an extra 2.4m on the rear alfresco and converting the walk-in linen into an extended butler's pantry with cavity sliding door.",
      type: "mark_up",
      assignee: "alyssa",
      creator: "morgan",
      status: "todo",
      priority: "high",
      slaDays: 2, // 2 Days EOD standard for mark-ups
      dueAt: calculateEodDeadline(2, now),
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      clientName: "Steve from NSW",
      clientPhone: "0411 222 333",
      clientEmail: "steve.nsw@example.com.au",
      siteAddress: "Penrith NSW 2750",
      designName: "Jasper 26",
      quoteNumber: "SN101",
      checklist: [
        { id: "c1", text: "Extend rear alfresco roofline by 2.4m", completed: false },
        { id: "c2", text: "Insert cavity sliding door to pantry", completed: false },
        { id: "c3", text: "Export PDF redline and attach to client quote", completed: false },
      ],
      notes: [
        {
          id: "n1",
          author: "Morgan Hales",
          authorInitials: "MH",
          text: "Client is ready to sign ATP once mark-up is approved by Wednesday afternoon.",
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        },
      ],
      externalUrl: "/floorplan-editor",
      tags: ["Floorplan Mark-up", "Jasper 26", "NSW"],
    },
    {
      id: "bd_task_02_call_david",
      title: "Call David Miller - Soil Test & Piering Allowance Review",
      description: "Discuss geotechnical borehole findings. Slab engineer upgraded to Class H1 soil; explain $4,850 piering inclusion and reassurance of fixed price foundation cap.",
      type: "call_followup",
      assignee: "morgan",
      creator: "morgan",
      status: "todo",
      priority: "urgent",
      slaDays: 0, // Today EOD
      dueAt: calculateEodDeadline(0, now),
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      clientName: "David Miller",
      clientPhone: "0412 345 678",
      clientEmail: "david.miller@example.com.au",
      siteAddress: "Bottletree Street, Bahrs Scrub",
      designName: "Jasper 26",
      quoteNumber: "DM101",
      checklist: [
        { id: "c1", text: "Walk client through H1 soil classification", completed: false },
        { id: "c2", text: "Send updated tender variation breakdown", completed: false },
      ],
      externalUrl: "/quote-builder",
      tags: ["Client Call", "Site Costs", "Soil Class"],
    },
    {
      id: "bd_task_03_tender_robert",
      title: "Submit Tender Request (ATP) - Robert Miller",
      description: "Prepare and lock in official Acceptance of Tender Proposal contract bundle for Lot 42 Sanctuary Boulevard. Ensure H2 Inclusions and NAB trust deposit reference are set.",
      type: "tender_submission",
      assignee: "both",
      creator: "morgan",
      status: "todo",
      priority: "high",
      slaDays: 3, // 3 Days EOD standard
      dueAt: calculateEodDeadline(3, now),
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      clientName: "Robert Miller",
      clientPhone: "0412 345 678",
      clientEmail: "robert.miller@example.com.au",
      siteAddress: "42 Sanctuary Boulevard",
      designName: "Jasper 26",
      quoteNumber: "RM101",
      checklist: [
        { id: "c1", text: "Verify H2 inclusions schedule is signed", completed: true },
        { id: "c2", text: "Check $1,650 greenfield prelim deposit receipt", completed: false },
        { id: "c3", text: "Submit tender archive package to head office", completed: false },
      ],
      externalUrl: "/tender-request",
      tags: ["Tender", "ATP", "H2 Collection"],
    },
    {
      id: "bd_task_04_retender_amber",
      title: "Re-Tender Amber 21 - Revised Façade & Moreton Bay Fee Update",
      description: "Client requested switching from Classic façade to Coastal Hampton ($3,200) and confirming Moreton Bay Regional Council statutory allowance ($2,227).",
      type: "re_tender",
      assignee: "morgan",
      creator: "alyssa",
      status: "todo",
      priority: "normal",
      slaDays: 2, // 2 Days EOD
      dueAt: calculateEodDeadline(2, now),
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      clientName: "Sarah Jenkins",
      clientPhone: "0422 999 111",
      siteAddress: "Narangba QLD 4504",
      designName: "Amber 21",
      checklist: [
        { id: "c1", text: "Update façade to Hampton in Quote Builder", completed: true },
        { id: "c2", text: "Re-verify Moreton Bay statutory schedule", completed: false },
        { id: "c3", text: "Send updated PDF estimate link to client", completed: false },
      ],
      externalUrl: "/quote-builder",
      tags: ["Re-Tender", "Façade", "QLD"],
    },
    {
      id: "bd_task_05_contract_bahrs",
      title: "Building Contract Signing Review - Lot 118 Bahrs Scrub",
      description: "Review Master Builders standard contract clauses, 5% deposit invoice, and finance approval letter before Morgan signs off.",
      type: "contract",
      assignee: "morgan",
      creator: "alyssa",
      status: "todo",
      priority: "high",
      slaDays: 3,
      dueAt: calculateEodDeadline(3, now),
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      clientName: "Michael & Karen Smith",
      clientPhone: "0433 112 233",
      estate: "Ridgeview Estate",
      lotNumber: "Lot 118",
      designName: "Jasper 24",
      checklist: [
        { id: "c1", text: "Verify 5% deposit funds in trust account", completed: true },
        { id: "c2", text: "Confirm special condition: 14-day unconditional finance", completed: false },
      ],
      externalUrl: "/crm",
      tags: ["Contract", "5% Deposit", "Bahrs Scrub"],
    },
    {
      id: "bd_task_06_overdue_call",
      title: "OVERDUE: Follow up Flagstone Display Walk-in (John & Emma)",
      description: "Clients spent 45 minutes in the Flagstone display on Saturday loving the double storey floorplan. Follow up before competitor secures appointment.",
      type: "call_followup",
      assignee: "morgan",
      creator: "morgan",
      status: "todo",
      priority: "critical",
      slaDays: 0,
      // Intentionally set to yesterday EOD to demonstrate the urgent overdue HUD
      dueAt: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(),
      clientName: "John & Emma Henderson",
      clientPhone: "0400 555 444",
      siteAddress: "Flagstone QLD 4280",
      designName: "Jasper 26",
      checklist: [
        { id: "c1", text: "Call client mobile with custom siting proposal", completed: false },
        { id: "c2", text: "Send VIP pricing freeze text if no answer", completed: false },
      ],
      externalUrl: "/crm",
      tags: ["Critical", "Overdue", "Display Enquiry"],
    },
  ];
}

/**
 * Loads all tasks from localStorage. If empty, seeds initial starter tasks.
 */
export function loadBrainDumpTasks(): BrainDumpTask[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(BRAINDUMP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load BrainDump tasks:", err);
  }

  // First time initialization: seed and save
  const seeded = getInitialSeedTasks();
  saveAllTasks(seeded, false);
  return seeded;
}

/**
 * Saves all tasks and notifies across tabs.
 */
function saveAllTasks(tasks: BrainDumpTask[], broadcast: boolean = true): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(BRAINDUMP_STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error("Failed to save BrainDump tasks:", err);
  }

  if (broadcast) {
    notifyChange();
  }
}

/**
 * Broadcasts change event across tabs/windows.
 */
function notifyChange(): void {
  if (typeof window === "undefined") return;

  // Custom event for same-window listeners
  window.dispatchEvent(new CustomEvent("hudson_braindump_change"));

  // BroadcastChannel for cross-tab multi-user sync
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(BRAINDUMP_CHANNEL_NAME);
      bc.postMessage({ type: "UPDATE", timestamp: Date.now() });
      bc.close();
    }
  } catch {}
}

/**
 * Subscribes to real-time BrainDump updates.
 */
export function subscribeBrainDump(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = () => callback();
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === BRAINDUMP_STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener("hudson_braindump_change", handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  let bc: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel(BRAINDUMP_CHANNEL_NAME);
      bc.onmessage = () => callback();
    }
  } catch {}

  return () => {
    window.removeEventListener("hudson_braindump_change", handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
    if (bc) {
      bc.close();
    }
  };
}

/**
 * Adds a new task or updates an existing one.
 */
export function saveBrainDumpTask(task: BrainDumpTask): void {
  const current = loadBrainDumpTasks();
  const idx = current.findIndex((t) => t.id === task.id);

  if (idx >= 0) {
    current[idx] = { ...task, updatedAt: new Date().toISOString() };
  } else {
    current.unshift({
      ...task,
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  saveAllTasks(current);
}

/**
 * Quick helper to create a pre-configured task based on type and days SLA.
 */
export function createQuickBrainDumpTask(params: {
  title: string;
  type: BrainDumpTaskType;
  slaDays?: number;
  assignee?: BrainDumpAssignee;
  clientName?: string;
  clientPhone?: string;
  designName?: string;
  description?: string;
  creator?: "morgan" | "alyssa";
}): BrainDumpTask {
  const config = TASK_TYPE_CONFIGS[params.type];
  const days = params.slaDays !== undefined ? params.slaDays : config.defaultDays;
  const now = new Date();

  const newTask: BrainDumpTask = {
    id: `bd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: params.title.trim(),
    description: params.description?.trim(),
    type: params.type,
    assignee: params.assignee || config.defaultAssignee,
    creator: params.creator || "morgan",
    status: "todo",
    priority: days === 0 ? "urgent" : days <= 2 ? "high" : "normal",
    slaDays: days,
    dueAt: calculateEodDeadline(days, now),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    clientName: params.clientName?.trim(),
    clientPhone: params.clientPhone?.trim(),
    designName: params.designName?.trim(),
    externalUrl: config.quickActionUrl,
  };

  saveBrainDumpTask(newTask);
  return newTask;
}

/**
 * Smashes / completes a task.
 */
export function smashTask(taskId: string, completedBy: string = "Morgan Hales"): void {
  const current = loadBrainDumpTasks();
  const idx = current.findIndex((t) => t.id === taskId);
  if (idx >= 0) {
    current[idx] = {
      ...current[idx],
      status: "completed",
      completedAt: new Date().toISOString(),
      completedBy,
      updatedAt: new Date().toISOString(),
    };
    saveAllTasks(current);
  }
}

/**
 * Re-opens a completed task.
 */
export function reopenTask(taskId: string): void {
  const current = loadBrainDumpTasks();
  const idx = current.findIndex((t) => t.id === taskId);
  if (idx >= 0) {
    current[idx] = {
      ...current[idx],
      status: "todo",
      completedAt: undefined,
      completedBy: undefined,
      updatedAt: new Date().toISOString(),
    };
    saveAllTasks(current);
  }
}

/**
 * Deletes a task permanently.
 */
export function deleteBrainDumpTask(taskId: string): void {
  const current = loadBrainDumpTasks();
  const filtered = current.filter((t) => t.id !== taskId);
  saveAllTasks(filtered);
}

/**
 * Snoozes a task by adding additional days to its deadline.
 */
export function snoozeTask(taskId: string, daysToAdd: number = 1): void {
  const current = loadBrainDumpTasks();
  const idx = current.findIndex((t) => t.id === taskId);
  if (idx >= 0) {
    const existing = current[idx];
    const baseDate = new Date(existing.dueAt);
    const newDeadline = calculateEodDeadline(daysToAdd, baseDate > new Date() ? baseDate : new Date());

    current[idx] = {
      ...existing,
      dueAt: newDeadline,
      slaDays: Math.max(1, (existing.slaDays || 0) + daysToAdd),
      updatedAt: new Date().toISOString(),
    };
    saveAllTasks(current);
  }
}

/**
 * Reassigns a task between Morgan, Alyssa, or Both.
 */
export function reassignTask(taskId: string, newAssignee: BrainDumpAssignee): void {
  const current = loadBrainDumpTasks();
  const idx = current.findIndex((t) => t.id === taskId);
  if (idx >= 0) {
    current[idx] = {
      ...current[idx],
      assignee: newAssignee,
      updatedAt: new Date().toISOString(),
    };
    saveAllTasks(current);
  }
}

/**
 * Toggles a checklist sub-item.
 */
export function toggleChecklistItem(taskId: string, itemId: string): void {
  const current = loadBrainDumpTasks();
  const idx = current.findIndex((t) => t.id === taskId);
  if (idx >= 0 && current[idx].checklist) {
    const item = current[idx].checklist?.find((c) => c.id === itemId);
    if (item) {
      item.completed = !item.completed;
      current[idx].updatedAt = new Date().toISOString();
      saveAllTasks(current);
    }
  }
}

/**
 * Adds an internal collaboration note to a task.
 */
export function addNoteToTask(taskId: string, author: string, text: string): void {
  const current = loadBrainDumpTasks();
  const idx = current.findIndex((t) => t.id === taskId);
  if (idx >= 0) {
    const notes = current[idx].notes || [];
    const initials = author
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

    notes.push({
      id: `note_${Date.now()}`,
      author,
      authorInitials: initials,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    });

    current[idx].notes = notes;
    current[idx].updatedAt = new Date().toISOString();
    saveAllTasks(current);
  }
}

export interface BrainDumpStats {
  totalActive: number;
  overdueCount: number;
  dueTodayCount: number;
  dueNext48HoursCount: number;
  smashedTodayCount: number;
  totalCompleted: number;
  morganActiveCount: number;
  alyssaActiveCount: number;
  sharedActiveCount: number;
}

/**
 * Computes live HUD statistics.
 */
export function getBrainDumpStats(tasks?: BrainDumpTask[]): BrainDumpStats {
  const all = tasks || loadBrainDumpTasks();
  const now = new Date();
  const todayDateString = now.toDateString();

  let totalActive = 0;
  let overdueCount = 0;
  let dueTodayCount = 0;
  let dueNext48HoursCount = 0;
  let smashedTodayCount = 0;
  let totalCompleted = 0;
  let morganActiveCount = 0;
  let alyssaActiveCount = 0;
  let sharedActiveCount = 0;

  for (const t of all) {
    if (t.status === "completed") {
      totalCompleted++;
      if (t.completedAt) {
        const completedDate = new Date(t.completedAt);
        if (completedDate.toDateString() === todayDateString) {
          smashedTodayCount++;
        }
      }
      continue;
    }

    if (t.status === "cancelled") continue;

    totalActive++;

    if (t.assignee === "morgan") morganActiveCount++;
    else if (t.assignee === "alyssa") alyssaActiveCount++;
    else sharedActiveCount++;

    const urgency = getDueUrgency(t.dueAt, false);
    if (urgency === "overdue") {
      overdueCount++;
    } else if (urgency === "due_today") {
      dueTodayCount++;
    } else if (urgency === "due_tomorrow") {
      dueNext48HoursCount++;
    }
  }

  return {
    totalActive,
    overdueCount,
    dueTodayCount,
    dueNext48HoursCount,
    smashedTodayCount,
    totalCompleted,
    morganActiveCount,
    alyssaActiveCount,
    sharedActiveCount,
  };
}

/**
 * Resets tasks to default demo seeds.
 */
export function resetBrainDumpTasksToSeed(): BrainDumpTask[] {
  const seeded = getInitialSeedTasks();
  saveAllTasks(seeded);
  return seeded;
}
