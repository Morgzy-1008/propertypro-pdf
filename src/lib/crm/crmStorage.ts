import { CrmLead, CrmStageId, CrmMessage, CrmTask } from "./crmTypes";
import type { FullQuote } from "@/lib/quoting/quoteTypes";

const CRM_STORAGE_KEY = "hudson_crm_leads_v3";
const CRM_MESSAGES_KEY = "hudson_crm_messages_v3";
const OUTLOOK_SYNC_KEY = "hudson_outlook_sync_state_v3";
const CONSULTANT_SETTINGS_KEY = "hudson_consultant_settings_v3";

export const INITIAL_DEMO_LEADS: CrmLead[] = [];
export const INITIAL_DEMO_MESSAGES: CrmMessage[] = [];

// Cleanup old mock data keys from prior runs if present
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("hudson_crm_leads_v2");
    localStorage.removeItem("hudson_crm_messages_v2");
  } catch {
    // ignore
  }
}

export async function loadAllCrmLeads(): Promise<CrmLead[]> {
  try {
    const raw = localStorage.getItem(CRM_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_LEADS));
      return INITIAL_DEMO_LEADS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_DEMO_LEADS;
  } catch (err) {
    console.error("Error loading CRM leads:", err);
    return INITIAL_DEMO_LEADS;
  }
}

export async function saveCrmLead(lead: CrmLead): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const idx = list.findIndex((l) => l.id === lead.id);
  let updatedList: CrmLead[];

  const updatedLead = {
    ...lead,
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    updatedList = [...list];
    updatedList[idx] = updatedLead;
  } else {
    updatedList = [updatedLead, ...list];
  }

  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updatedList));
  return updatedList;
}

export async function deleteCrmLead(leadId: string): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const updated = list.filter((l) => l.id !== leadId);
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function clearAllCrmData(): Promise<void> {
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify([]));
  localStorage.setItem(CRM_MESSAGES_KEY, JSON.stringify([]));
}

export async function updateCrmLeadStage(leadId: string, newStage: CrmStageId): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const updatedList = list.map((l) => {
    if (l.id === leadId) {
      const newActivities = [...(l.activities || [])];
      newActivities.unshift({
        id: `act_${Date.now()}`,
        type: "status_change",
        title: `Moved to ${newStage.replace(/_/g, " ").toUpperCase()}`,
        description: `Lead moved to ${newStage} stage by sales consultant.`,
        timestamp: new Date().toISOString(),
      });

      return {
        ...l,
        stage: newStage,
        activities: newActivities,
        updatedAt: new Date().toISOString(),
        lastContactedAt: new Date().toISOString(),
      };
    }
    return l;
  });

  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updatedList));
  return updatedList;
}

// -------------------------------------------------------------
// Tasks Management across all clients
// -------------------------------------------------------------

export async function updateLeadTask(
  leadId: string,
  taskId: string,
  completed: boolean
): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const updated = list.map((lead) => {
    if (lead.id === leadId && lead.tasks) {
      const updatedTasks = lead.tasks.map((t) =>
        t.id === taskId ? { ...t, completed } : t
      );
      return { ...lead, tasks: updatedTasks, updatedAt: new Date().toISOString() };
    }
    return lead;
  });
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function addLeadTask(
  leadId: string,
  task: Omit<CrmTask, "id" | "createdAt">
): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const updated = list.map((lead) => {
    if (lead.id === leadId) {
      const currentTasks = lead.tasks || [];
      const newTask: CrmTask = {
        ...task,
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      return {
        ...lead,
        tasks: [newTask, ...currentTasks],
        updatedAt: new Date().toISOString(),
      };
    }
    return lead;
  });
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteLeadTask(leadId: string, taskId: string): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const updated = list.map((lead) => {
    if (lead.id === leadId && lead.tasks) {
      return {
        ...lead,
        tasks: lead.tasks.filter((t) => t.id !== taskId),
        updatedAt: new Date().toISOString(),
      };
    }
    return lead;
  });
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

// -------------------------------------------------------------
// Honey CRM Batch Importer
// -------------------------------------------------------------

export async function importHoneyContacts(
  importedLeads: Partial<CrmLead>[],
  defaultConsultantId: string = "morgan_hales"
): Promise<{ addedCount: number; allLeads: CrmLead[] }> {
  const existingList = await loadAllCrmLeads();
  const newLeads: CrmLead[] = [];

  for (const item of importedLeads) {
    if (!item.clientName || item.clientName.trim() === "") continue;

    // Check duplicate by email or phone or exact name
    const isDup = existingList.some(
      (ex) =>
        (item.email && ex.email.toLowerCase() === item.email.toLowerCase()) ||
        (item.mobile && ex.mobile.replace(/\s+/g, "") === item.mobile.replace(/\s+/g, "")) ||
        ex.clientName.toLowerCase() === item.clientName!.toLowerCase()
    );

    if (isDup) continue;

    const lead: CrmLead = {
      id: item.id || `lead_honey_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      clientName: item.clientName.trim(),
      email: item.email || "",
      mobile: item.mobile || "",
      secondaryCustomerName: item.secondaryCustomerName || "",
      secondaryCustomerMobile: item.secondaryCustomerMobile || "",
      secondaryCustomerEmail: item.secondaryCustomerEmail || "",
      targetEstate: item.targetEstate || "Unspecified Estate",
      suburb: item.suburb || "Queensland",
      lotNumber: item.lotNumber || "TBA",
      landStatus: item.landStatus || "Looking for Land",
      landBudget: item.landBudget || 300000,
      preferredDesign: item.preferredDesign || "Standard Hudson Design",
      facadeName: item.facadeName || "Classic",
      housingType: item.housingType || "Single Storey",
      totalEstimatedDealValue: item.totalEstimatedDealValue || 450000,
      tenderPrice: item.tenderPrice,
      stage: item.stage || "new_lead",
      assignedConsultantId: item.assignedConsultantId || defaultConsultantId,
      leadSource: (item.leadSource as any) || "Website Inquiry",
      notes: item.notes || "Imported from Honey CRM contact export.",
      isAtpSigned: !!item.isAtpSigned,
      atpFeePaid: !!item.atpFeePaid,
      isContractSigned: !!item.isContractSigned,
      contractDepositPaid: !!item.contractDepositPaid,
      clientNotes: item.clientNotes || [
        {
          id: `note_honey_${Date.now()}`,
          author: "Honey CRM Import",
          content: "Contact batch-imported from Honey CRM records.",
          createdAt: new Date().toISOString(),
        },
      ],
      tasks: item.tasks || [
        {
          id: `task_honey_${Date.now()}`,
          title: `Initial follow-up call with ${item.clientName}`,
          dueDate: "Tomorrow",
          completed: false,
          createdAt: new Date().toISOString(),
        },
      ],
      activities: item.activities || [
        {
          id: `act_honey_${Date.now()}`,
          type: "status_change",
          title: "Imported from Honey CRM",
          description: "Contact created in Hudson Horizon CRM.",
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastContactedAt: new Date().toISOString(),
    };

    newLeads.push(lead);
  }

  const combined = [...newLeads, ...existingList];
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(combined));
  return { addedCount: newLeads.length, allLeads: combined };
}

// -------------------------------------------------------------
// Auto-Sync from Quoting Tool to CRM
// -------------------------------------------------------------

export async function upsertLeadFromQuote(quote: FullQuote): Promise<CrmLead[]> {
  if (!quote.client.clientName || quote.client.clientName.trim() === "") {
    return loadAllCrmLeads();
  }

  const list = await loadAllCrmLeads();
  const searchName = quote.client.clientName.trim().toLowerCase();
  const searchPhone = (quote.client.clientPhone || "").replace(/\s+/g, "");
  const searchEmail = (quote.client.clientEmail || "").trim().toLowerCase();

  const matchIdx = list.findIndex((l) => {
    if (searchEmail && l.email && l.email.toLowerCase() === searchEmail) return true;
    if (searchPhone && l.mobile && l.mobile.replace(/\s+/g, "") === searchPhone) return true;
    return l.clientName.toLowerCase() === searchName;
  });

  const dealVal = quote.totals?.totalPriceIncGst || quote.design.basePrice || 450000;
  const designName = quote.design.designName ? `${quote.design.designName} (${quote.design.housingType})` : "Custom Design";

  if (matchIdx >= 0) {
    // Update existing lead
    const existing = list[matchIdx];
    const newActivities = [...(existing.activities || [])];
    newActivities.unshift({
      id: `act_${Date.now()}`,
      type: "quote",
      title: `Estimate Updated #${quote.quoteNumber || "MH"}`,
      description: `${designName} total: $${dealVal.toLocaleString()} with ${quote.design.specTier}.`,
      timestamp: new Date().toISOString(),
    });

    const updated: CrmLead = {
      ...existing,
      clientName: quote.client.clientName,
      mobile: quote.client.clientPhone || existing.mobile,
      email: quote.client.clientEmail || existing.email,
      secondaryCustomerName: quote.client.hasClient2 ? quote.client.client2Name : existing.secondaryCustomerName,
      secondaryCustomerMobile: quote.client.hasClient2 ? quote.client.client2Phone : existing.secondaryCustomerMobile,
      secondaryCustomerEmail: quote.client.hasClient2 ? quote.client.client2Email : existing.secondaryCustomerEmail,
      targetEstate: quote.client.estate || existing.targetEstate,
      suburb: quote.client.suburb || existing.suburb,
      lotNumber: quote.client.lotNumber || existing.lotNumber,
      preferredDesign: quote.design.designName || existing.preferredDesign,
      facadeName: quote.design.facadeName || existing.facadeName,
      housingType: quote.design.housingType as any || existing.housingType,
      totalEstimatedDealValue: dealVal,
      linkedQuoteNumber: quote.quoteNumber,
      activities: newActivities,
      updatedAt: new Date().toISOString(),
    };

    list[matchIdx] = updated;
    localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(list));
    return list;
  } else {
    // Create new lead
    const newLead: CrmLead = {
      id: `lead_quote_${Date.now()}`,
      clientName: quote.client.clientName,
      email: quote.client.clientEmail || "",
      mobile: quote.client.clientPhone || "",
      secondaryCustomerName: quote.client.hasClient2 ? quote.client.client2Name : undefined,
      secondaryCustomerMobile: quote.client.hasClient2 ? quote.client.client2Phone : undefined,
      secondaryCustomerEmail: quote.client.hasClient2 ? quote.client.client2Email : undefined,
      targetEstate: quote.client.estate || "Estate TBA",
      suburb: quote.client.suburb || "Queensland",
      lotNumber: quote.client.lotNumber || "TBA",
      landStatus: "Looking for Land",
      landBudget: 300000,
      preferredDesign: quote.design.designName || "Hudson Home",
      facadeName: quote.design.facadeName || "Classic",
      housingType: (quote.design.housingType as any) || "Single Storey",
      totalEstimatedDealValue: dealVal,
      stage: "estimate_presented",
      assignedConsultantId: quote.client.consultantId || "morgan_hales",
      leadSource: "Website Inquiry",
      notes: quote.client.notes || `Generated from Hudson Quoting Tool Estimate #${quote.quoteNumber}.`,
      linkedQuoteNumber: quote.quoteNumber,
      isAtpSigned: false,
      atpFeePaid: false,
      isContractSigned: false,
      contractDepositPaid: false,
      clientNotes: [
        {
          id: `cn_${Date.now()}`,
          author: quote.client.consultantName || "Sales Consultant",
          content: `Initial Builders Estimate #${quote.quoteNumber} created for ${designName}.`,
          createdAt: new Date().toISOString(),
        },
      ],
      tasks: [
        {
          id: `task_${Date.now()}`,
          title: `Follow up ${quote.client.clientName} on Estimate #${quote.quoteNumber}`,
          dueDate: "In 2 days",
          completed: false,
          createdAt: new Date().toISOString(),
        },
      ],
      activities: [
        {
          id: `act_${Date.now()}`,
          type: "quote",
          title: `Estimate #${quote.quoteNumber} Created`,
          description: `${designName} estimate total: $${dealVal.toLocaleString()}.`,
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastContactedAt: new Date().toISOString(),
    };

    const combined = [newLead, ...list];
    localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(combined));
    return combined;
  }
}

// -------------------------------------------------------------
// Messages & Communications Storage
// -------------------------------------------------------------

export async function loadAllCrmMessages(): Promise<CrmMessage[]> {
  try {
    const raw = localStorage.getItem(CRM_MESSAGES_KEY);
    if (!raw) {
      localStorage.setItem(CRM_MESSAGES_KEY, JSON.stringify(INITIAL_DEMO_MESSAGES));
      return INITIAL_DEMO_MESSAGES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_DEMO_MESSAGES;
  } catch {
    return INITIAL_DEMO_MESSAGES;
  }
}

export async function saveCrmMessage(msg: CrmMessage): Promise<CrmMessage[]> {
  const list = await loadAllCrmMessages();
  const updated = [msg, ...list];
  localStorage.setItem(CRM_MESSAGES_KEY, JSON.stringify(updated));
  return updated;
}

export function getOutlookSyncStatus(): { synced: boolean; count: number; lastSync: string } {
  try {
    const raw = localStorage.getItem(OUTLOOK_SYNC_KEY);
    if (!raw) return { synced: true, count: 0, lastSync: "Ready to Sync" };
    return JSON.parse(raw);
  } catch {
    return { synced: true, count: 0, lastSync: "Ready to Sync" };
  }
}

export function triggerOutlookSync(): { synced: boolean; count: number; lastSync: string } {
  const current = getOutlookSyncStatus();
  const updated = {
    synced: true,
    count: current.count + 1,
    lastSync: "Just now (Synced)",
  };
  localStorage.setItem(OUTLOOK_SYNC_KEY, JSON.stringify(updated));
  return updated;
}

// -------------------------------------------------------------
// Consultant Private Salary & Commission Settings
// -------------------------------------------------------------

export interface ConsultantPrivateSettings {
  baseSalaryYearly: number;
  commissionRatePct: number;
}

export function loadConsultantSettings(consultantId: string): ConsultantPrivateSettings {
  try {
    const raw = localStorage.getItem(`${CONSULTANT_SETTINGS_KEY}_${consultantId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { baseSalaryYearly: 75000, commissionRatePct: 2.25 };
}

export function saveConsultantSettings(
  consultantId: string,
  settings: ConsultantPrivateSettings
): void {
  localStorage.setItem(`${CONSULTANT_SETTINGS_KEY}_${consultantId}`, JSON.stringify(settings));
}
