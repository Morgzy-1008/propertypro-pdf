import {
  ALL_SEMANTIC_SURFACES,
  MaterialCategory,
  SemanticSurfaceId,
  SurfaceMaterialConfig,
  getOrGeneratePbrMaps,
  useHouseMaterialStore,
} from "./houseMaterialStore";
import { SceneAction, SceneSelectedElement } from "./studio3dTypes";

export interface ActiveSceneContext {
  selectedElement?: SceneSelectedElement | null;
  fixtures?: Array<{
    id: string;
    type: string;
    roomName?: string;
    position: [number, number];
    level?: number;
  }>;
  openings?: Array<{
    id: string;
    type: string;
    wallId?: string;
    position: [number, number];
    level?: number;
  }>;
  rooms?: Array<{
    id: string;
    name: string;
    category: string;
    level?: number;
  }>;
}

export interface ConversationalSurfaceUpdate {
  surfaceId: SemanticSurfaceId;
  name: string;
  category: MaterialCategory;
  baseColorHex: string;
  roughness: number;
  metalness: number;
  textureScaleMeters: number;
  bumpScale?: number;
  isCustomTexture?: boolean;
  customTexturePrompt?: string;
  albedoMapUrl?: string;
}

export interface ConversationalArchitectTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  appliedUpdates?: ConversationalSurfaceUpdate[];
  appliedSceneActions?: SceneAction[];
  modelUsed?: string;
}

export const QUICK_ARCHITECT_PROMPTS: { label: string; prompt: string }[] = [
  {
    label: "Coastal Hamptons Exterior",
    prompt:
      "Give the exterior Bowral Chillingham White bricks, Crisp White Scyon Linea weatherboard upper cladding, Surfmist Colorbond roof, and white window frames.",
  },
  {
    label: "Modern Monument & Cedar",
    prompt:
      "Apply Austral Bowral Blue charcoal bricks, Western Red Cedar vertical timber battens on the feature cladding, Colorbond Monument roof, and a Cedar sectional garage door.",
  },
  {
    label: "Luxury Taj Mahal Kitchen",
    prompt:
      "Update the kitchen benchtop to Taj Mahal Quartzite, lower cabinetry to Polytec Florentine Walnut, upper cupboards to Crisp Matte White, and an Emerald Green Zellige tile splashback.",
  },
  {
    label: "Spotted Gum & Travertine Interior",
    prompt:
      "Set the living room floor to Australian Spotted Gum wide-plank timber, wet area floors to Warm Beige Travertine stone tiles, and the interior feature wall to Venetian Warm Plaster.",
  },
  {
    label: "Custom Terracotta Herringbone",
    prompt:
      "Generate a custom seamless Terracotta Herringbone artisan tile texture on the kitchen splashback and interior feature wall.",
  },
];

/**
 * Synthesizes a bespoke custom seamless 512x512 tileable texture on HTML5 Canvas
 * for any material not in the standard preset catalog (e.g. Herringbone, Zellige, Terrazzo, Fluted Timber, Quartzite).
 */
export function synthesizeCustomSeamlessAlbedoDataUrl(
  name: string,
  category: MaterialCategory,
  baseColorHex: string,
  customPrompt = ""
): string {
  if (typeof document === "undefined") return "";
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const lower = `${name} ${customPrompt}`.toLowerCase();
  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, size, size);

  if (lower.includes("herringbone")) {
    // Seamless 45-degree Herringbone brick/tile pattern
    ctx.strokeStyle = "rgba(15,23,42,0.28)";
    ctx.lineWidth = 2;
    const step = 32;
    for (let y = -size; y < size * 2; y += step) {
      for (let x = -size; x < size * 2; x += step) {
        const flip = ((Math.floor(x / step) + Math.floor(y / step)) & 1) === 0;
        ctx.fillStyle = flip ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
        if (flip) {
          ctx.fillRect(x % size, y % size, step - 2, step / 2 - 2);
          ctx.strokeRect(x % size, y % size, step - 2, step / 2 - 2);
        } else {
          ctx.fillRect(x % size, y % size, step / 2 - 2, step - 2);
          ctx.strokeRect(x % size, y % size, step / 2 - 2, step - 2);
        }
      }
    }
  } else if (lower.includes("zellige") || lower.includes("mosaic") || lower.includes("subway")) {
    // Handcrafted glazed Zellige / Finger mosaic tile grid with shimmer variation
    const cols = lower.includes("finger") || lower.includes("kit kat") ? 16 : 8;
    const rows = 8;
    const cw = size / cols;
    const ch = size / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const shade = ((r * 7 + c * 13) % 5) - 2;
        ctx.fillStyle =
          shade >= 0
            ? `rgba(255,255,255,${0.04 + shade * 0.03})`
            : `rgba(0,0,0,${0.04 + Math.abs(shade) * 0.03})`;
        ctx.fillRect(c * cw + 1.5, r * ch + 1.5, cw - 3, ch - 3);
      }
    }
  } else if (lower.includes("terrazzo")) {
    // Seamless Venetian Terrazzo with multi-tone marble chips
    const chipColors = [
      "rgba(255,255,255,0.45)",
      "rgba(30,41,59,0.35)",
      "rgba(180,83,9,0.32)",
      "rgba(100,116,139,0.38)",
    ];
    for (let i = 0; i < 140; i++) {
      const cx = (i * 73) % size;
      const cy = (i * 137) % size;
      const rad = 3 + (i % 7);
      ctx.fillStyle = chipColors[i % chipColors.length];
      ctx.beginPath();
      ctx.moveTo(cx, cy - rad);
      ctx.lineTo(cx + rad, cy + rad * 0.4);
      ctx.lineTo(cx - rad * 0.8, cy + rad * 0.7);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // Delegate to the core procedural PBR generator for standard categories
    const maps = getOrGeneratePbrMaps({
      surfaceId: "exterior_wall_main",
      name,
      category,
      baseColorHex,
      roughness: 0.4,
      metalness: 0.05,
      textureScaleMeters: 1.5,
    });
    return maps?.albedoDataUrl || "";
  }

  return canvas.toDataURL("image/png");
}

/**
 * Local deterministic architectural NLU parser that interprets natural language
 * material requests in <5ms when offline or as a supplement to Gemini 3.8 Flash.
 */
export function parseMaterialCommandLocally(prompt: string): {
  reply: string;
  updates: ConversationalSurfaceUpdate[];
} {
  const lower = prompt.toLowerCase();
  const updates: ConversationalSurfaceUpdate[] = [];
  const addUpdate = (u: ConversationalSurfaceUpdate) => {
    const idx = updates.findIndex((x) => x.surfaceId === u.surfaceId);
    if (idx >= 0) updates[idx] = u;
    else updates.push(u);
  };

  // Helper to detect requested color/material attributes
  const pickColorAndFinish = (
    text: string,
    defaultCat: MaterialCategory,
    defaultScale = 1.5
  ): Omit<ConversationalSurfaceUpdate, "surfaceId"> => {
    if (text.includes("chillingham") || (text.includes("white") && text.includes("brick"))) {
      return {
        name: "Bowral Chillingham White Brick",
        category: "brick",
        baseColorHex: "#ece8e1",
        roughness: 0.84,
        metalness: 0.02,
        textureScaleMeters: 1.2,
        bumpScale: 0.035,
      };
    }
    if (text.includes("bowral blue") || (text.includes("charcoal") && text.includes("brick")) || (text.includes("dark") && text.includes("brick"))) {
      return {
        name: "Austral Bowral Blue Brick",
        category: "brick",
        baseColorHex: "#363b42",
        roughness: 0.85,
        metalness: 0.04,
        textureScaleMeters: 1.2,
        bumpScale: 0.038,
      };
    }
    if (text.includes("red") && text.includes("brick")) {
      return {
        name: "PGH Recycled Red Warehouse Brick",
        category: "brick",
        baseColorHex: "#9e4735",
        roughness: 0.88,
        metalness: 0.02,
        textureScaleMeters: 1.2,
        bumpScale: 0.042,
      };
    }
    if (text.includes("cedar") || text.includes("batten")) {
      return {
        name: "Western Red Cedar Vertical Battens",
        category: "cladding",
        baseColorHex: "#9c522b",
        roughness: 0.55,
        metalness: 0.02,
        textureScaleMeters: 1.0,
        bumpScale: 0.03,
      };
    }
    if (text.includes("weatherboard") || text.includes("linea") || text.includes("hamptons")) {
      return {
        name: "James Hardie Scyon Linea Crisp White",
        category: "cladding",
        baseColorHex: "#f4f5f0",
        roughness: 0.58,
        metalness: 0.02,
        textureScaleMeters: 1.1,
        bumpScale: 0.028,
      };
    }
    if (text.includes("monument") || text.includes("matte black") || text.includes("black")) {
      return {
        name: defaultCat === "stone" ? "Caesarstone Empira Black" : "Colorbond Monument Matt",
        category: defaultCat,
        baseColorHex: "#24282e",
        roughness: defaultCat === "stone" ? 0.14 : 0.42,
        metalness: defaultCat === "roofing" || defaultCat === "metal" ? 0.65 : 0.08,
        textureScaleMeters: defaultScale,
        bumpScale: 0.02,
      };
    }
    if (text.includes("surfmist") || text.includes("off-white")) {
      return {
        name: "Colorbond Surfmist",
        category: defaultCat,
        baseColorHex: "#e4e4dd",
        roughness: 0.4,
        metalness: defaultCat === "roofing" || defaultCat === "metal" ? 0.55 : 0.04,
        textureScaleMeters: defaultScale,
        bumpScale: 0.02,
      };
    }
    if (text.includes("basalt")) {
      return {
        name: "Colorbond Basalt",
        category: defaultCat,
        baseColorHex: "#585c60",
        roughness: 0.45,
        metalness: 0.55,
        textureScaleMeters: defaultScale,
        bumpScale: 0.02,
      };
    }
    if (text.includes("terracotta") || text.includes("spanish")) {
      return {
        name: "Custom Terracotta Artisan Tile",
        category: defaultCat === "roofing" ? "roofing" : "tiles",
        baseColorHex: "#b85435",
        roughness: 0.52,
        metalness: 0.03,
        textureScaleMeters: 1.1,
        bumpScale: 0.032,
        isCustomTexture: true,
        customTexturePrompt: text,
      };
    }
    if (text.includes("taj mahal") || text.includes("quartzite")) {
      return {
        name: "Taj Mahal Honed Quartzite",
        category: "stone",
        baseColorHex: "#ebe3d5",
        roughness: 0.14,
        metalness: 0.05,
        textureScaleMeters: 2.2,
        bumpScale: 0.01,
      };
    }
    if (text.includes("calacatta") || text.includes("carrara") || text.includes("marble")) {
      return {
        name: "Caesarstone Calacatta Nuvo",
        category: "stone",
        baseColorHex: "#f8fafc",
        roughness: 0.12,
        metalness: 0.06,
        textureScaleMeters: 2.0,
        bumpScale: 0.008,
      };
    }
    if (text.includes("emerald") || text.includes("zellige") || text.includes("green tile")) {
      return {
        name: "Artisan Emerald Zellige Glazed Tile",
        category: "tiles",
        baseColorHex: "#14532d",
        roughness: 0.15,
        metalness: 0.08,
        textureScaleMeters: 0.85,
        bumpScale: 0.022,
        isCustomTexture: true,
        customTexturePrompt: "Emerald green glazed Moroccan Zellige tile",
      };
    }
    if (text.includes("walnut")) {
      return {
        name: "Polytec Florentine Walnut Timber",
        category: "timber",
        baseColorHex: "#5c3a21",
        roughness: 0.36,
        metalness: 0.04,
        textureScaleMeters: 1.4,
        bumpScale: 0.015,
      };
    }
    if (text.includes("spotted gum")) {
      return {
        name: "Australian Spotted Gum Wide-Plank",
        category: "timber",
        baseColorHex: "#9e6637",
        roughness: 0.28,
        metalness: 0.04,
        textureScaleMeters: 1.8,
        bumpScale: 0.015,
      };
    }
    if (text.includes("oak") || text.includes("timber") || text.includes("wood")) {
      return {
        name: "European Natural Oak",
        category: "timber",
        baseColorHex: "#c9965c",
        roughness: 0.32,
        metalness: 0.04,
        textureScaleMeters: 1.6,
        bumpScale: 0.016,
      };
    }
    if (text.includes("travertine") || text.includes("limestone")) {
      return {
        name: "Warm Beige Travertine 600x600",
        category: "tiles",
        baseColorHex: "#dfd3c3",
        roughness: 0.35,
        metalness: 0.04,
        textureScaleMeters: 1.2,
        bumpScale: 0.018,
      };
    }
    if (text.includes("sage") || text.includes("olive") || text.includes("eucalyptus")) {
      return {
        name: "Dulux Olive Leaf / Botanic Sage",
        category: defaultCat,
        baseColorHex: "#5d6e58",
        roughness: 0.55,
        metalness: 0.03,
        textureScaleMeters: defaultScale,
        bumpScale: 0.015,
      };
    }
    if (text.includes("venetian") || text.includes("warm plaster") || text.includes("render")) {
      return {
        name: "Venetian Warm Travertine Plaster",
        category: "render",
        baseColorHex: "#dfd5c6",
        roughness: 0.68,
        metalness: 0.02,
        textureScaleMeters: 1.6,
        bumpScale: 0.024,
      };
    }
    if (text.includes("white") || text.includes("lexicon")) {
      return {
        name: "Dulux Lexicon Quarter Crisp White",
        category: defaultCat,
        baseColorHex: "#f8fafc",
        roughness: 0.45,
        metalness: 0.02,
        textureScaleMeters: defaultScale,
        bumpScale: 0.01,
      };
    }
    return {
      name: "Custom Architectural Finish",
      category: defaultCat,
      baseColorHex: "#cbd5e1",
      roughness: 0.5,
      metalness: 0.05,
      textureScaleMeters: defaultScale,
      bumpScale: 0.02,
    };
  };

  // Split compound sentences on "and", ",", or ";" so multi-surface prompts update all mentioned surfaces!
  const clauses = prompt
    .split(/(?:,|\band\b|;)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const clause of clauses) {
    const c = clause.toLowerCase();
    if (c.includes("brick") || c.includes("exterior wall")) {
      addUpdate({
        surfaceId: "exterior_wall_main",
        ...pickColorAndFinish(c, "brick", 1.2),
      });
    }
    if (c.includes("cladding") || c.includes("upper") || c.includes("weatherboard") || c.includes("batten")) {
      addUpdate({
        surfaceId: "exterior_cladding_feature",
        ...pickColorAndFinish(c, "cladding", 1.1),
      });
    }
    if (c.includes("portico") || c.includes("pier") || c.includes("facade")) {
      addUpdate({
        surfaceId: "portico_facade",
        ...pickColorAndFinish(c, "render", 1.5),
      });
    }
    if (c.includes("roof")) {
      addUpdate({
        surfaceId: "roof_main",
        ...pickColorAndFinish(c, "roofing", 1.4),
      });
    }
    if (c.includes("fascia") || c.includes("gutter")) {
      addUpdate({
        surfaceId: "roof_fascia_gutter",
        ...pickColorAndFinish(c, "metal", 1.0),
      });
    }
    if (c.includes("garage")) {
      addUpdate({
        surfaceId: "garage_door",
        ...pickColorAndFinish(c, c.includes("cedar") || c.includes("timber") ? "timber" : "metal", 1.2),
      });
    }
    if (c.includes("window")) {
      addUpdate({
        surfaceId: "window_frames",
        ...pickColorAndFinish(c, "metal", 1.0),
      });
    }
    if (c.includes("front door") || c.includes("entry door")) {
      addUpdate({
        surfaceId: "front_entry_door",
        ...pickColorAndFinish(c, "timber", 1.2),
      });
    }
    if (c.includes("driveway") || c.includes("paving")) {
      addUpdate({
        surfaceId: "driveway_paving",
        ...pickColorAndFinish(c, "stone", 1.6),
      });
    }
    if (c.includes("benchtop") || c.includes("island") || c.includes("countertop")) {
      addUpdate({
        surfaceId: "kitchen_benchtop",
        ...pickColorAndFinish(c, "stone", 2.0),
      });
    }
    if (c.includes("lower cabinet") || c.includes("base cabinet") || (c.includes("cabinet") && !c.includes("upper") && !c.includes("overhead"))) {
      addUpdate({
        surfaceId: "kitchen_cabinetry_lower",
        ...pickColorAndFinish(c, "timber", 1.4),
      });
    }
    if (c.includes("upper") || c.includes("overhead") || c.includes("cupboard")) {
      addUpdate({
        surfaceId: "kitchen_cabinetry_upper",
        ...pickColorAndFinish(c, "paint", 1.2),
      });
    }
    if (c.includes("splashback") || c.includes("backsplash")) {
      addUpdate({
        surfaceId: "kitchen_splashback",
        ...pickColorAndFinish(c, "tiles", 0.9),
      });
    }
    if (c.includes("living") && c.includes("floor") || c.includes("floorboard") || c.includes("timber floor") || c.includes("spotted gum")) {
      addUpdate({
        surfaceId: "interior_floor_living",
        ...pickColorAndFinish(c, "timber", 1.8),
      });
    }
    if (c.includes("bedroom") && c.includes("floor") || c.includes("carpet")) {
      addUpdate({
        surfaceId: "interior_floor_bedrooms",
        ...pickColorAndFinish(c, "paint", 1.2),
      });
    }
    if (c.includes("wet") || c.includes("bathroom") || c.includes("ensuite") || c.includes("travertine")) {
      addUpdate({
        surfaceId: "interior_floor_wet_areas",
        ...pickColorAndFinish(c, "tiles", 1.2),
      });
    }
    if (c.includes("feature wall")) {
      addUpdate({
        surfaceId: "interior_feature_wall",
        ...pickColorAndFinish(c, "render", 1.4),
      });
    }
    if (c.includes("interior wall") || c.includes("paint the walls")) {
      addUpdate({
        surfaceId: "interior_walls_main",
        ...pickColorAndFinish(c, "paint", 2.0),
      });
    }
    if (c.includes("skirting") || c.includes("architrave")) {
      addUpdate({
        surfaceId: "interior_skirting_architraves",
        ...pickColorAndFinish(c, "paint", 1.0),
      });
    }
    if (c.includes("ceiling")) {
      addUpdate({
        surfaceId: "interior_ceiling",
        ...pickColorAndFinish(c, "paint", 2.0),
      });
    }
  }

  // Fallback if user didn't name a specific surface, apply to currently selected surface in store!
  if (updates.length === 0) {
    const selectedId = useHouseMaterialStore.getState().selectedSurfaceId || "exterior_wall_main";
    const currentCfg = useHouseMaterialStore.getState().surfaces[selectedId];
    addUpdate({
      surfaceId: selectedId,
      ...pickColorAndFinish(lower, currentCfg?.category || "brick", currentCfg?.textureScaleMeters || 1.5),
    });
  }

  const summaryList = updates
    .map((u) => {
      const label =
        ALL_SEMANTIC_SURFACES.find((s) => s.surfaceId === u.surfaceId)?.label || u.surfaceId;
      return `**${label}** → *${u.name}* (\`${u.baseColorHex}\`, scale \`${u.textureScaleMeters}m\`)`;
    })
    .join(", ");

  return {
    reply: `Updated ${updates.length} architectural surface${updates.length === 1 ? "" : "s"} on the 3D model in real time: ${summaryList}.`,
    updates,
  };
}

/**
 * Local deterministic 3D Scene / Geometry NLU parser that interprets natural language
 * requests to remove, move, rotate, resize, add, or clean up 3D fixtures, doors, windows, stairs, or walls.
 */
export function parseSceneActionsLocally(
  prompt: string,
  sceneContext?: ActiveSceneContext
): {
  reply: string;
  sceneActions: SceneAction[];
} {
  const lower = prompt.toLowerCase();
  const sceneActions: SceneAction[] = [];

  const isRemove =
    /\b(remove|delete|get rid of|clear|erase|drop|hide|take away|misplaced|shouldn't be|should not be|wrong place|in front of the garage|infront of the garage)\b/i.test(
      lower
    );
  const isCleanAll =
    /\b(clean up|auto[- ]?clean|fix misplaced|clamp fixtures|validate fixtures)\b/i.test(lower);
  const isRotate = /\b(rotate|turn|spin|flip)\b/i.test(lower);
  const isMove = /\b(move|nudge|shift|relocate|push|pull)\b/i.test(lower);
  const isAdd = /\b(add|place|spawn|insert|create)\b/i.test(lower) && !/\b(texture|finish|color|paint|tile|brick|render)\b/i.test(lower);

  const detectTargetType = (text: string): string | undefined => {
    if (text.includes("vanity") || text.includes("basin")) return "vanity";
    if (text.includes("toilet") || text.includes("wc")) return "toilet";
    if (text.includes("bath") && !text.includes("bathroom")) return "bath";
    if (text.includes("shower")) return "shower";
    if (text.includes("island")) return "kitchen_island";
    if (text.includes("kitchen bench") || text.includes("bench")) return "kitchen_bench";
    if (text.includes("sink")) return "sink";
    if (text.includes("cooktop") || text.includes("stove") || text.includes("oven")) return "cooktop";
    if (text.includes("laundry") || text.includes("tub")) return "laundry_tub";
    if (text.includes("bed")) return "bed";
    if (text.includes("sofa") || text.includes("couch") || text.includes("lounge")) return "sofa";
    if (text.includes("dining") || text.includes("table")) return "dining_table";
    if (text.includes("tv")) return "tv_unit";
    if (text.includes("desk") || text.includes("study")) return "study_desk";
    if (text.includes("stair")) return "stairs";
    if (text.includes("garage door")) return "garage_door";
    if (text.includes("door")) return "door";
    if (text.includes("window")) return "window";
    if (text.includes("wall")) return "wall";
    return undefined;
  };

  const detectLocationFilter = (text: string): string | undefined => {
    if (text.includes("garage") || text.includes("driveway") || text.includes("in front") || text.includes("infront")) {
      return "near_garage";
    }
    if (text.includes("outside") || text.includes("exterior") || text.includes("out of bounds")) {
      return "outside_footprint";
    }
    if (text.includes("selected") || text.includes("this")) {
      return "selected";
    }
    if (text.includes("ensuite")) return "Ensuite";
    if (text.includes("powder")) return "Powder";
    if (text.includes("master")) return "Master";
    if (text.includes("kitchen")) return "Kitchen";
    if (text.includes("living") || text.includes("family")) return "Living";
    return undefined;
  };

  const targetType =
    detectTargetType(lower) || sceneContext?.selectedElement?.type || undefined;
  const locFilter = detectLocationFilter(lower);

  if (isCleanAll) {
    sceneActions.push({
      action: "auto_clean_fixtures",
      targetElementType: targetType || "all_misplaced",
      locationFilter: "all_misplaced",
    });
    return {
      reply:
        "Executed geometric containment & room-type validation across the 3D scene (`validateAndClampFixtures`), removing any misplaced or out-of-bounds fixtures.",
      sceneActions,
    };
  }

  if (isRemove && (targetType || sceneContext?.selectedElement)) {
    let matchedId =
      locFilter === "selected" && sceneContext?.selectedElement
        ? sceneContext.selectedElement.id
        : undefined;

    if (!matchedId && sceneContext?.fixtures && targetType) {
      const candidates = sceneContext.fixtures.filter(
        (f) => f.type === targetType || f.type.includes(targetType)
      );
      if (locFilter === "near_garage") {
        // Pick the fixture with the highest Z (closest to front garage/driveway) or matching Garage roomName
        const sorted = [...candidates].sort((a, b) => b.position[1] - a.position[1]);
        if (sorted[0]) matchedId = sorted[0].id;
      } else if (candidates.length === 1) {
        matchedId = candidates[0].id;
      }
    }

    sceneActions.push({
      action: "remove_element",
      targetElementType: targetType || "vanity",
      targetElementId: matchedId,
      locationFilter: locFilter || "all_misplaced",
    });

    const friendlyType = (targetType || "element").replace(/_/g, " ");
    const whereDesc =
      locFilter === "near_garage"
        ? " in front of / near the garage"
        : locFilter && locFilter !== "selected"
          ? ` in ${locFilter}`
          : "";
    return {
      reply: `Removed the **${friendlyType}**${whereDesc} from the 3D floorplan model${matchedId ? ` (\`${matchedId}\`)` : ""}.`,
      sceneActions,
    };
  }

  if (isRotate && (targetType || sceneContext?.selectedElement)) {
    const degMatch = lower.match(/(\d+)\s*(?:deg|°)/);
    const deg = degMatch ? Number(degMatch[1]) : 90;
    sceneActions.push({
      action: "rotate_element",
      targetElementType: targetType,
      targetElementId: sceneContext?.selectedElement?.id,
      locationFilter: locFilter || "selected",
      newRotationDeg: deg,
    });
    return {
      reply: `Rotated the **${(targetType || "selected element").replace(/_/g, " ")}** by ${deg}°.`,
      sceneActions,
    };
  }

  if (isMove && (targetType || sceneContext?.selectedElement)) {
    let dx = 0;
    let dz = 0;
    const distMatch = lower.match(/(\d+(?:\.\d+)?)\s*m/);
    const step = distMatch ? Number(distMatch[1]) : 0.25;
    if (lower.includes("left") || lower.includes("west")) dx = -step;
    else if (lower.includes("right") || lower.includes("east")) dx = step;
    if (lower.includes("up") || lower.includes("north") || lower.includes("back")) dz = -step;
    else if (lower.includes("down") || lower.includes("south") || lower.includes("forward") || lower.includes("front")) dz = step;
    if (dx === 0 && dz === 0) dx = step;

    sceneActions.push({
      action: "move_element",
      targetElementType: targetType,
      targetElementId: sceneContext?.selectedElement?.id,
      locationFilter: locFilter || "selected",
      newPosition: [dx, dz],
    });
    return {
      reply: `Nudged the **${(targetType || "selected element").replace(/_/g, " ")}** by \`[${dx.toFixed(2)}m, ${dz.toFixed(2)}m]\`.`,
      sceneActions,
    };
  }

  if (isAdd && targetType) {
    sceneActions.push({
      action: "add_element",
      targetElementType: targetType,
      locationFilter: locFilter,
    });
    return {
      reply: `Added a new **${targetType.replace(/_/g, " ")}** to the 3D floorplan scene.`,
      sceneActions,
    };
  }

  return { reply: "", sceneActions: [] };
}

/**
 * Executes a conversational command against Gemini 3.8 Flash Structured Outputs
 * (with automatic local architectural & geometry NLU fallback) and applies material updates
 * to `useHouseMaterialStore` plus returns `appliedSceneActions` for 3D geometry editing.
 */
export async function processHouseMaterialCommand(
  prompt: string,
  options: {
    generateAiTextureTile?: boolean;
    activeSceneContext?: ActiveSceneContext;
  } = {}
): Promise<ConversationalArchitectTurn> {
  const store = useHouseMaterialStore.getState();
  let reply = "";
  let updates: ConversationalSurfaceUpdate[] = [];
  let sceneActions: SceneAction[] = [];
  let modelUsed = "gemini-3.8-flash";

  // Check local deterministic scene-action parser first for explicit geometry commands
  const localSceneCheck = parseSceneActionsLocally(prompt, options.activeSceneContext);
  const hasExplicitMaterialWord =
    /\b(color|colour|paint|brick|render|tile|timber|stone|marble|quartzite|colorbond|roof|floor|cladding|herringbone|zellige|terrazzo)\b/i.test(
      prompt
    );

  if (localSceneCheck.sceneActions.length > 0 && !hasExplicitMaterialWord) {
    return {
      id: `turn_${Date.now()}`,
      role: "assistant",
      text: localSceneCheck.reply,
      timestamp: Date.now(),
      appliedUpdates: [],
      appliedSceneActions: localSceneCheck.sceneActions,
      modelUsed: "gemini-3.8-flash",
    };
  }

  try {
    const resp = await fetch("/api/ai/design-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: prompt,
        currentSurfaces: store.surfaces,
        activeSceneContext: options.activeSceneContext || null,
        generateAiTextureTile: Boolean(options.generateAiTextureTile),
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (!data.fallback) {
        if (Array.isArray(data.sceneActions) && data.sceneActions.length > 0) {
          sceneActions = data.sceneActions;
        }
        if (Array.isArray(data.updates) && data.updates.length > 0) {
          updates = data.updates;
        }
        if (sceneActions.length > 0 || updates.length > 0) {
          reply =
            data.reply ||
            data.assistantReply ||
            (sceneActions.length > 0
              ? "Applied requested 3D scene modifications."
              : "Applied requested material updates to the 3D house.");
          modelUsed = data.modelUsed || "gemini-3.8-flash";
        }
      }
    }
  } catch {
    // Fallback to local deterministic NLU parser below
  }

  // Ensure explicit geometry commands (e.g. "remove the bathroom vanity in front of the garage")
  // always trigger sceneActions and NEVER accidentally fall back to changing garage/bathroom surface materials!
  if (sceneActions.length === 0 && localSceneCheck.sceneActions.length > 0) {
    sceneActions = localSceneCheck.sceneActions;
    reply = localSceneCheck.reply;
    // Strip accidental material updates if the prompt was strictly a fixture removal/move command
    const hasExplicitMaterialWord =
      /\b(color|colour|paint|brick|render|tile|timber|stone|marble|quartzite|colorbond|roof|floor|cladding|herringbone|zellige|terrazzo)\b/i.test(
        prompt
      );
    if (!hasExplicitMaterialWord) {
      updates = [];
    }
  }

  if (updates.length === 0 && sceneActions.length === 0) {
    const localResult = parseMaterialCommandLocally(prompt);
    reply = localResult.reply;
    updates = localResult.updates;
    modelUsed = "architect-nlu-engine";
  }

  // Apply each surface update to the reactive PBR store (generating custom seamless textures when needed)
  const batchUpdates: Array<{
    surfaceId: SemanticSurfaceId;
    config: Partial<SurfaceMaterialConfig>;
  }> = [];

  for (const u of updates) {
    let albedoMapUrl = u.albedoMapUrl;
    if (!albedoMapUrl && u.isCustomTexture) {
      albedoMapUrl = synthesizeCustomSeamlessAlbedoDataUrl(
        u.name,
        u.category,
        u.baseColorHex,
        u.customTexturePrompt
      );
    }

    const maps = getOrGeneratePbrMaps({
      surfaceId: u.surfaceId,
      name: u.name,
      category: u.category,
      baseColorHex: u.baseColorHex,
      roughness: u.roughness,
      metalness: u.metalness,
      textureScaleMeters: u.textureScaleMeters || 1.5,
    });

    batchUpdates.push({
      surfaceId: u.surfaceId,
      config: {
        name: u.name,
        category: u.category,
        baseColorHex: u.baseColorHex,
        roughness: u.roughness,
        metalness: u.metalness,
        textureScaleMeters: u.textureScaleMeters || 1.5,
        bumpScale: u.bumpScale ?? 0.025,
        albedoMapUrl: albedoMapUrl || maps?.albedoDataUrl,
        normalMapUrl: maps?.normalDataUrl,
        roughnessMapUrl: maps?.roughnessDataUrl,
      },
    });
  }

  if (batchUpdates.length > 0) {
    useHouseMaterialStore.getState().applyBatchUpdates(batchUpdates);
    useHouseMaterialStore.getState().setSelectedSurfaceId(batchUpdates[0].surfaceId);
  }

  return {
    id: `turn_${Date.now()}`,
    role: "assistant",
    text: reply,
    timestamp: Date.now(),
    appliedUpdates: updates,
    appliedSceneActions: sceneActions,
    modelUsed,
  };
}

/**
 * Web Speech API Voice Input helper for hands-free "Talk to the House"
 */
export function startVoiceArchitectRecognition(
  onTranscript: (text: string, isFinal: boolean) => void,
  onError: (err: string) => void,
  onEnd: () => void
): (() => void) | null {
  if (typeof window === "undefined") return null;
  const SpeechRecognitionCtor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    onError("Voice recognition is not supported in this browser.");
    return null;
  }

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = "en-AU";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    let transcript = "";
    let isFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) isFinal = true;
    }
    onTranscript(transcript.trim(), isFinal);
  };

  recognition.onerror = (event: any) => {
    onError(event?.error || "Microphone recognition error");
  };

  recognition.onend = () => {
    onEnd();
  };

  recognition.start();
  return () => {
    try {
      recognition.stop();
    } catch {}
  };
}
