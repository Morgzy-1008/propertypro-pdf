import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  User,
  MapPin,
  PenTool,
  FolderArchive,
  ArrowRight,
  ShieldAlert,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TenderSubmission } from "@/lib/tender/tenderTypes";

type SectionTab = "client_job" | "land_siting" | "home_spec" | "atp_sign" | "job_folder" | "pdf_preview";

interface TenderReadinessChecklistProps {
  tender: TenderSubmission;
  onNavigateTab: (tab: SectionTab) => void;
}

interface AuditIssue {
  id: string;
  category: "atp" | "client" | "land" | "files" | "home";
  field: string;
  message: string;
  severity: "error" | "warning";
  targetTab: SectionTab;
}

export function TenderReadinessChecklist({
  tender,
  onNavigateTab,
}: TenderReadinessChecklistProps) {
  const issues: AuditIssue[] = [];

  // 1. Client Details Audit
  if (!tender.customer1?.firstName?.trim()) {
    issues.push({
      id: "client_1_firstname",
      category: "client",
      field: "Purchaser 1 First Name",
      message: "Client 1 First Name is missing",
      severity: "error",
      targetTab: "client_job",
    });
  }
  if (!tender.customer1?.surname?.trim()) {
    issues.push({
      id: "client_1_surname",
      category: "client",
      field: "Purchaser 1 Surname",
      message: "Client 1 Surname is missing",
      severity: "error",
      targetTab: "client_job",
    });
  }
  if (!tender.customer1?.phone?.trim()) {
    issues.push({
      id: "client_1_phone",
      category: "client",
      field: "Purchaser 1 Phone",
      message: "Client 1 contact phone number is missing",
      severity: "error",
      targetTab: "client_job",
    });
  }
  if (!tender.customer1?.email?.trim()) {
    issues.push({
      id: "client_1_email",
      category: "client",
      field: "Purchaser 1 Email",
      message: "Client 1 email address is missing",
      severity: "error",
      targetTab: "client_job",
    });
  }
  if (!tender.customer1?.currentAddress?.trim()) {
    issues.push({
      id: "client_1_address",
      category: "client",
      field: "Purchaser 1 Current Address",
      message: "Client 1 current residential address is missing",
      severity: "warning",
      targetTab: "client_job",
    });
  }

  // 2nd Purchaser (if enabled)
  if (tender.hasSecondPurchaser) {
    if (!tender.customer2?.firstName?.trim()) {
      issues.push({
        id: "client_2_firstname",
        category: "client",
        field: "Purchaser 2 First Name",
        message: "Purchaser 2 is enabled but first name is empty",
        severity: "error",
        targetTab: "client_job",
      });
    }
    if (!tender.customer2?.surname?.trim()) {
      issues.push({
        id: "client_2_surname",
        category: "client",
        field: "Purchaser 2 Surname",
        message: "Purchaser 2 surname is empty",
        severity: "error",
        targetTab: "client_job",
      });
    }
    if (!tender.customer2?.phone?.trim()) {
      issues.push({
        id: "client_2_phone",
        category: "client",
        field: "Purchaser 2 Phone",
        message: "Purchaser 2 phone number is missing",
        severity: "warning",
        targetTab: "client_job",
      });
    }
    if (!tender.customer2?.email?.trim()) {
      issues.push({
        id: "client_2_email",
        category: "client",
        field: "Purchaser 2 Email",
        message: "Purchaser 2 email address is missing",
        severity: "warning",
        targetTab: "client_job",
      });
    }
  }

  // 2. Land & Property Audit
  if (!tender.land?.lotNo?.trim()) {
    issues.push({
      id: "land_lot",
      category: "land",
      field: "Lot Number",
      message: "Land Lot Number is missing (e.g. Lot 12)",
      severity: "error",
      targetTab: "land_siting",
    });
  }
  if (!tender.land?.streetName?.trim()) {
    issues.push({
      id: "land_street",
      category: "land",
      field: "Street Name",
      message: "Property street address is missing",
      severity: "error",
      targetTab: "land_siting",
    });
  }
  if (!tender.land?.suburb?.trim()) {
    issues.push({
      id: "land_suburb",
      category: "land",
      field: "Suburb",
      message: "Suburb name is missing",
      severity: "error",
      targetTab: "land_siting",
    });
  }
  if (!tender.land?.council?.trim()) {
    issues.push({
      id: "land_council",
      category: "land",
      field: "Local Council",
      message: "Local Council LGA is not selected",
      severity: "warning",
      targetTab: "land_siting",
    });
  }
  if (tender.land?.status === "Unregistered" && !tender.land?.expectedRegistrationDate?.trim() && !tender.land?.registrationMonth?.trim()) {
    issues.push({
      id: "land_registration_date",
      category: "land",
      field: "Expected Registration Date",
      message: "Land is marked Unregistered but no anticipated registration date/month is specified",
      severity: "warning",
      targetTab: "land_siting",
    });
  }

  // 3. Home Spec Audit
  if (!tender.homeSpec?.homeDesign?.trim()) {
    issues.push({
      id: "home_design",
      category: "home",
      field: "Home Design",
      message: "Home design is not selected",
      severity: "error",
      targetTab: "home_spec",
    });
  }

  // 4. Authority to Proceed (ATP) Audit
  if (!tender.atp?.client1Signed || !tender.atp?.client1SignatureUrl) {
    issues.push({
      id: "atp_sig_1",
      category: "atp",
      field: "Client 1 Signature",
      message: "Authority to Proceed (ATP) has not been digitally signed by Client 1",
      severity: "error",
      targetTab: "atp_sign",
    });
  }
  if (tender.hasSecondPurchaser && (!tender.atp?.client2Signed || !tender.atp?.client2SignatureUrl)) {
    issues.push({
      id: "atp_sig_2",
      category: "atp",
      field: "Client 2 Signature",
      message: "Purchaser 2 is enabled but ATP has not been signed by Client 2",
      severity: "error",
      targetTab: "atp_sign",
    });
  }
  if (!tender.atp?.feeAmount || tender.atp.feeAmount <= 0) {
    issues.push({
      id: "atp_fee",
      category: "atp",
      field: "Tender Fee Amount",
      message: "Tender preparation fee amount is $0 or missing",
      severity: "warning",
      targetTab: "atp_sign",
    });
  }
  if (!tender.atp?.paymentMethod) {
    issues.push({
      id: "atp_payment_method",
      category: "atp",
      field: "Payment Method",
      message: "ATP payment method (EFT, Credit Card, etc.) is not specified",
      severity: "warning",
      targetTab: "atp_sign",
    });
  }

  // 5. Job Folder Documents Audit
  const docs = tender.jobFolderDocuments || {};
  if (!docs["license_c1_front"]?.fileDataUrl) {
    issues.push({
      id: "doc_license_c1_front",
      category: "files",
      field: "Client 1 Driver Licence (Front)",
      message: "Client 1 Driver Licence (Front photo/scan) is not uploaded",
      severity: "error",
      targetTab: "job_folder",
    });
  }
  if (!docs["license_c1_back"]?.fileDataUrl) {
    issues.push({
      id: "doc_license_c1_back",
      category: "files",
      field: "Client 1 Driver Licence (Back)",
      message: "Client 1 Driver Licence (Back photo/scan) is not uploaded",
      severity: "warning",
      targetTab: "job_folder",
    });
  }
  if (tender.hasSecondPurchaser && !docs["license_c2_front"]?.fileDataUrl) {
    issues.push({
      id: "doc_license_c2_front",
      category: "files",
      field: "Client 2 Driver Licence",
      message: "Client 2 Driver Licence is not uploaded",
      severity: "warning",
      targetTab: "job_folder",
    });
  }
  if (!docs["proof_of_ownership"]?.fileDataUrl) {
    issues.push({
      id: "doc_proof_of_ownership",
      category: "files",
      field: "Land Contract / Proof of Ownership",
      message: "Land Contract or Proof of Ownership document is missing",
      severity: "error",
      targetTab: "job_folder",
    });
  }
  if (!docs["disclosure_plan"]?.fileDataUrl) {
    issues.push({
      id: "doc_disclosure_plan",
      category: "files",
      field: "Disclosure Plan",
      message: "Developer Disclosure Plan is missing",
      severity: "error",
      targetTab: "job_folder",
    });
  }
  if (!docs["siting_plan"]?.fileDataUrl) {
    issues.push({
      id: "doc_siting_plan",
      category: "files",
      field: "1:200 Siting Plan",
      message: "1:200 Scale Siting / House Position Plan is missing",
      severity: "error",
      targetTab: "job_folder",
    });
  }
  if (!docs["deposit_receipt"]?.fileDataUrl) {
    issues.push({
      id: "doc_deposit_receipt",
      category: "files",
      field: "Tender Deposit Receipt",
      message: "Tender Fee Transfer / Deposit Receipt is missing",
      severity: "warning",
      targetTab: "job_folder",
    });
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const isAllClear = issues.length === 0;

  if (isAllClear) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-2">
              Pre-Flight Tender Readiness Verified ✓
            </h4>
            <p className="text-xs text-emerald-200/80 mt-0.5">
              All mandatory client details, land records, signed ATP, and required job folder attachments are complete and ready for Bernie.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-900/60 px-3 py-1 rounded-lg border border-emerald-700/50 shrink-0">
          <FileCheck className="h-3.5 w-3.5" /> 100% Submission Ready
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-lg space-y-0">
      {/* Header Banner */}
      <div className="p-4 bg-gradient-to-r from-amber-950/70 via-amber-900/40 to-slate-900 border-b border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                Pre-Flight Checklist: Items Requiring NHC Attention
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {issues.length} {issues.length === 1 ? "Item" : "Items"} Flagged
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Please review and resolve the flagged items below before submitting your Tender Request to Bernie and OnSite.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {errorCount > 0 && (
            <span className="text-[11px] font-bold text-red-300 bg-red-950/80 px-2.5 py-1 rounded-lg border border-red-700/60 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
              {errorCount} Required Missing
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-[11px] font-bold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-700/60 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              {warningCount} Recommended
            </span>
          )}
        </div>
      </div>

      {/* Grid of Audit Items */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto">
        {issues.map((issue) => {
          const isErr = issue.severity === "error";
          return (
            <div
              key={issue.id}
              className={`p-3 rounded-xl border flex items-start justify-between gap-2.5 transition-colors ${
                isErr
                  ? "bg-red-950/20 border-red-500/30 hover:border-red-500/60"
                  : "bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60"
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="mt-0.5 shrink-0">
                  {issue.category === "atp" && <PenTool className="h-4 w-4 text-amber-400" />}
                  {issue.category === "client" && <User className="h-4 w-4 text-sky-400" />}
                  {issue.category === "land" && <MapPin className="h-4 w-4 text-emerald-400" />}
                  {issue.category === "files" && <FolderArchive className="h-4 w-4 text-rose-400" />}
                  {issue.category === "home" && <FileCheck className="h-4 w-4 text-purple-400" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100 truncate">
                      {issue.field}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                        isErr
                          ? "bg-red-900/60 text-red-300 border border-red-700/50"
                          : "bg-amber-900/60 text-amber-300 border border-amber-700/50"
                      }`}
                    >
                      {isErr ? "Required" : "Missing"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {issue.message}
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigateTab(issue.targetTab)}
                className="h-7 px-2 text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 shrink-0 gap-1"
              >
                <span>Fix</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
