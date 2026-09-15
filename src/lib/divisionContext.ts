/**
 * Hudson Homes Multi-State Division Management (QLD & NSW)
 * Provides centralized division state, automatic consultant division matching,
 * and reactive notifications when the user toggles divisions.
 */

export type Division = "QLD" | "NSW";

const DIVISION_STORAGE_KEY = "hudson_active_division";
const listeners = new Set<(division: Division) => void>();

export function getActiveDivision(): Division {
  if (typeof window === "undefined") return "QLD";
  try {
    const saved = localStorage.getItem(DIVISION_STORAGE_KEY);
    if (saved === "NSW" || saved === "QLD") {
      return saved;
    }
    // Check active staff user's division
    const authUser = localStorage.getItem("hudson_hub_auth_user") || localStorage.getItem("hudson_auth_user");
    if (authUser) {
      const parsed = JSON.parse(authUser);
      if (parsed?.division === "NSW" || parsed?.state === "NSW") {
        return "NSW";
      }
    }
    return "QLD";
  } catch {
    return "QLD";
  }
}

export function setActiveDivision(division: Division): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DIVISION_STORAGE_KEY, division);
    listeners.forEach((fn) => {
      try {
        fn(division);
      } catch (e) {
        console.error("Division listener error:", e);
      }
    });
  } catch (err) {
    console.error("Failed to save active division:", err);
  }
}

export function onDivisionChanged(listener: (division: Division) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface HudsonCompanyInfo {
  division: Division;
  isNsw: boolean;
  companyName: string;
  abn: string;
  licenceNumber: string;
  licenceLabel: string;
  bankName: string;
  bsb: string;
  accountNumber: string;
  accountNumberRaw: string;
  headerTitle: string;
  headOfficeAddress: string;
  phone: string;
  website: string;
}

export function getHudsonCompanyInfo(opts?: {
  division?: Division;
  state?: string;
  postcode?: string;
  suburb?: string;
  siteAddress?: string;
  council?: string;
  consultantOffice?: string;
}): HudsonCompanyInfo {
  const isNsw = Boolean(
    (opts?.state && opts.state.toUpperCase() === "NSW") ||
    (opts?.division && opts.division === "NSW") ||
    (opts?.postcode && opts.postcode.trim().startsWith("2")) ||
    (opts?.suburb && /sydney|parramatta|oran park|box hill|marsden park|austral|leppington|calderwood|menangle|the gables|blacktown|penrith|liverpool|hunter|newcastle|central coast|wollongong|nsw/i.test(opts.suburb)) ||
    (opts?.council && /nsw|parramatta|blacktown|camden|liverpool|penrith|campbelltown|hills|wollongong|lake macquarie|newcastle|central coast|cessnock|hawkesbury|wollondilly|shellharbour/i.test(opts.council)) ||
    (opts?.siteAddress && /\bnsw\b/i.test(opts.siteAddress)) ||
    (opts?.consultantOffice && /nsw|parramatta|marsden/i.test(opts.consultantOffice)) ||
    (!opts?.state && !opts?.division && !opts?.postcode && !opts?.suburb && getActiveDivision() === "NSW")
  );

  if (isNsw) {
    return {
      division: "NSW",
      isNsw: true,
      companyName: "Hudson Homes (NSW) Pty Ltd",
      abn: "49 163 189 071",
      licenceNumber: "259372C",
      licenceLabel: "Licence 259372C",
      bankName: "Hudson Homes (NSW) Pty Ltd",
      bsb: "082-778",
      accountNumber: "77-847-8427",
      accountNumberRaw: "778478427",
      headerTitle: "HUDSON HOMES NSW BANK DETAILS",
      headOfficeAddress: "Level 1, 85 George St, Parramatta NSW 2150",
      phone: "1300 246 700",
      website: "www.hudsonhomes.com.au",
    };
  }

  return {
    division: "QLD",
    isNsw: false,
    companyName: "Hudson Homes (QLD) Pty Ltd",
    abn: "92 623 431 685",
    licenceNumber: "15078318",
    licenceLabel: "QBCC Licence 15078318",
    bankName: "Hudson Homes (QLD) Pty Ltd",
    bsb: "082-778",
    accountNumber: "74-586-5607",
    accountNumberRaw: "745865607",
    headerTitle: "HUDSON HOMES QLD BANK DETAILS",
    headOfficeAddress: "Level 5, 106 City Road, Beenleigh QLD 4207",
    phone: "1300 246 700",
    website: "www.hudsonhomes.com.au",
  };
}
