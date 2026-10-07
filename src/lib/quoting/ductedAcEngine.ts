/**
 * Automated Ducted Air-Conditioning Upgrade Engine for H1 Smart Inclusions
 * 
 * Sizing & Costing Specifications:
 * - Replaces standard H1 Split-System AC with a whole-home Reverse-Cycle Inverter Ducted System.
 * - Net upgrade price incorporates full credit for the omitted standard H1 Split-System unit.
 * - Automatically sizes capacity (kW), zone dampers, and outlet counts based on floor area (m²) and storeys.
 * - Single Storey starts from ~$10,000 for compact homes and scales smoothly.
 * - Double Storey accounts for vertical risers/droppers, heat load through upper ceiling, and multi-level zoning.
 */

export interface DuctedAcUpgradeSpec {
  capacityKw: number;
  capacityLabel: string;
  zones: number;
  outlets: number;
  upgradeCost: number;
  title: string;
  shortTitle: string;
  description: string;
  summaryPill: string;
}

export interface CalculateDuctedAcOptions {
  m2: number;
  isDoubleStorey: boolean;
  housingType?: string;
  designName?: string;
}

export function calculateDuctedAcUpgrade(options: CalculateDuctedAcOptions): DuctedAcUpgradeSpec {
  const { m2, isDoubleStorey, housingType } = options;
  const isDouble =
    isDoubleStorey ||
    (housingType || "").toLowerCase().includes("double") ||
    (housingType || "").toLowerCase().includes("split");

  const effectiveM2 = Math.max(90, m2 || 160);

  let capacityKw: number;
  let zones: number;
  let outlets: number;
  let baseCost: number;

  if (isDouble) {
    // DOUBLE STOREY SCALING (Includes vertical riser droppers, dual-level zoning & upper heat load)
    if (effectiveM2 < 240) {
      capacityKw = 12.5;
      zones = 4;
      outlets = Math.max(8, Math.round(effectiveM2 / 24));
      baseCost = 13500 + Math.max(0, (effectiveM2 - 180) * 22);
    } else if (effectiveM2 < 300) {
      capacityKw = 14.0;
      zones = 5;
      outlets = Math.max(10, Math.round(effectiveM2 / 23));
      baseCost = 14800 + (effectiveM2 - 240) * 25;
    } else if (effectiveM2 < 380) {
      capacityKw = 16.0;
      zones = 5;
      outlets = Math.max(12, Math.round(effectiveM2 / 22));
      baseCost = 16500 + (effectiveM2 - 300) * 28;
    } else if (effectiveM2 < 450) {
      capacityKw = 19.0;
      zones = 6;
      outlets = Math.max(14, Math.round(effectiveM2 / 22));
      baseCost = 18800 + (effectiveM2 - 380) * 30;
    } else {
      capacityKw = 22.0;
      zones = 8;
      outlets = Math.min(18, Math.max(16, Math.round(effectiveM2 / 22)));
      baseCost = 21000 + Math.min(3000, (effectiveM2 - 450) * 30);
    }
  } else {
    // SINGLE STOREY SCALING (Starts from ~$10,000 for smaller homes)
    if (effectiveM2 < 150) {
      capacityKw = 8.5;
      zones = 2;
      outlets = 6;
      baseCost = 10000;
    } else if (effectiveM2 < 190) {
      capacityKw = 10.0;
      zones = 3;
      outlets = Math.max(7, Math.round(effectiveM2 / 23));
      baseCost = 10000 + (effectiveM2 - 150) * 25;
    } else if (effectiveM2 < 240) {
      capacityKw = 12.5;
      zones = 4;
      outlets = Math.max(8, Math.round(effectiveM2 / 23));
      baseCost = 11000 + (effectiveM2 - 190) * 26;
    } else if (effectiveM2 < 300) {
      capacityKw = 14.0;
      zones = 4;
      outlets = Math.max(10, Math.round(effectiveM2 / 23));
      baseCost = 12300 + (effectiveM2 - 240) * 28;
    } else {
      capacityKw = 16.0;
      zones = 5;
      outlets = Math.min(14, Math.max(11, Math.round(effectiveM2 / 23)));
      baseCost = 14000 + Math.min(2500, (effectiveM2 - 300) * 30);
    }
  }

  // Round neatly to nearest $50
  const upgradeCost = Math.round(baseCost / 50) * 50;
  const capacityLabel = `${capacityKw.toFixed(1)}kW`;

  const shortTitle = `Upgrade to Ducted AC in Lieu of H1 standard Split-System AC`;
  const title = `Upgrade to Ducted AC in Lieu of H1 standard Split-System AC (${capacityLabel})`;
  const description = `Upgrade from H1 standard split-system to a premium ${capacityLabel} reverse-cycle inverter ducted air conditioning system with ${zones} zones and ${outlets} outlets throughout the home. Includes multi-zone digital wall controller, acoustic insulated ductwork, internal return air grille, and outdoor condenser slab. (Price includes credit of the Split-AC).`;
  const summaryPill = `${capacityLabel} Inverter • ${zones} Zones • ${outlets} Outlets`;

  return {
    capacityKw,
    capacityLabel,
    zones,
    outlets,
    upgradeCost,
    title,
    shortTitle,
    description,
    summaryPill,
  };
}
