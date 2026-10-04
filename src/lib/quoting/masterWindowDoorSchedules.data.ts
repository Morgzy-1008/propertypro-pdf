/**
 * Master Window and Door Schedules extracted directly from Hudson Homes Master Architectural Plans
 * Generated automatically from public/floorplans_master
 */

export interface MasterWindowItem {
  no: string;
  code: string;
  heightMm: number;
  widthMm: number;
}

export interface MasterDoorItem {
  no: string;
  code: string;
  heightMm: number;
  widthMm: number;
}

export interface MasterDesignSchedule {
  fileName?: string;
  windows: MasterWindowItem[];
  doors: MasterDoorItem[];
}

export const MASTER_WINDOW_DOOR_CATALOG: Record<string, MasterDesignSchedule> = {
  "Amber 21": {
    "fileName": "Amber 21 Classic LH_Full Master_07.03.2022.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W4",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1216",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Amber 23": {
    "fileName": "AMBER 23 CLASSIC RH _FULL MASTER_08.05.20.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W4",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1216",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Amber 26": {
    "fileName": "Amber 26 Classic RH_Full Master_18.03.2022.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "0909",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Amber 30": {
    "fileName": "Amber 30 Classic RH_Full Master_17.03.2022.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1216",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Aqua 1": {
    "fileName": "Aqua 1 Classic LH_Full Master_13.05.2020.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W2",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W3",
        "code": "1216",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2400
      }
    ]
  },
  "Auburn 22": {
    "fileName": "Auburn 22 Classic LH_Full Master_18.06.20.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1030,
        "widthMm": 1570
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2410
      },
      {
        "no": "D3",
        "code": "2124",
        "heightMm": 2040,
        "widthMm": 820
      }
    ]
  },
  "Azure 19": {
    "fileName": "AZURE 19  CLASSIC LH_FULL MASTER_17.09.18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Azure 21": {
    "fileName": "Azure 21 Classic LH_Full Master_19.03.20 (PDF).pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Azure 23": {
    "fileName": "AZURE 23 CLASSIC LH_FULL MASTER_20.09.19 (PDF).pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Burgundy 27 -": {
    "fileName": "BURGUNDY 27 - RH_FULL MASTER_31-10.18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 600,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W4",
        "code": "0606",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W6",
        "code": "1824",
        "heightMm": 1200,
        "widthMm": 610
      },
      {
        "no": "W7",
        "code": "AAT",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1806",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AAT",
        "heightMm": 1200,
        "widthMm": 2410
      },
      {
        "no": "W10",
        "code": "1806",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W11",
        "code": "AFAS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W12",
        "code": "1206",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 1570
      },
      {
        "no": "W14",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 610
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Burgundy 32": {
    "fileName": "BURGUNDY 32 CLASSIC RH_FULL MASTER_26-11-18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 600,
        "widthMm": 610
      },
      {
        "no": "W4",
        "code": "1222",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "0606",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 610
      },
      {
        "no": "W8",
        "code": "1824",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W12",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W13",
        "code": "AFAS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W14",
        "code": "1206",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W15",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W16",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Burgundy 34": {
    "fileName": "BURGUNDY 34 CLASSIC RH_FULL MASTER_15.04.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AAT",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W4",
        "code": "1806",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W5",
        "code": "AAT",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W6",
        "code": "1806",
        "heightMm": 1800,
        "widthMm": 2650
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 610
      },
      {
        "no": "W10",
        "code": "1824",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W12",
        "code": "1827",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W13",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W14",
        "code": "1809",
        "heightMm": 1030,
        "widthMm": 1570
      },
      {
        "no": "W15",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W16",
        "code": "1209",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W17",
        "code": "AFAS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W18",
        "code": "1206",
        "heightMm": 860,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Canary 7": {
    "fileName": "Canary 7 Classic LH_Full Master_16.01.23.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W4",
        "code": "1209",
        "heightMm": 1030,
        "widthMm": 1210
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1030,
        "widthMm": 610
      },
      {
        "no": "W8",
        "code": "1012",
        "heightMm": 1030,
        "widthMm": 610
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W10",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W12",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W13",
        "code": "AF",
        "heightMm": 860,
        "widthMm": 610
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Carmine 23": {
    "fileName": "Carmine 23 Classic LH_Full Master_02.05.2023.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W10",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2170
      },
      {
        "no": "D3",
        "code": "2122",
        "heightMm": 2040,
        "widthMm": 820
      }
    ]
  },
  "Cedar 28": {
    "fileName": "Cedar 28 Classic RH_Full Master_19.03.21.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 2650
      },
      {
        "no": "W8",
        "code": "1216",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2710
      },
      {
        "no": "D3",
        "code": "2127",
        "heightMm": 2040,
        "widthMm": 820
      }
    ]
  },
  "Cedar 34": {
    "fileName": "Cedar 34 Classic RH_Full Master_29.04.21.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W5",
        "code": "AAT",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1806",
        "heightMm": 1030,
        "widthMm": 1570
      },
      {
        "no": "W7",
        "code": "AAT",
        "heightMm": 850,
        "widthMm": 610
      },
      {
        "no": "W8",
        "code": "1806",
        "heightMm": 1200,
        "widthMm": 2650
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 2650
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W12",
        "code": "1016",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Celeste 24": {
    "fileName": "Celeste 24 Classic RH_Full Master_20.04.2022.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W02",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W03",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W04",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W05",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W06",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W07",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W08",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W09",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W12",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 610
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 3250
      }
    ]
  },
  "Cerise 20": {
    "fileName": "Cerise 20 Classic RH_Full Master_11.10.2019.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AA",
        "heightMm": 1200,
        "widthMm": 610
      },
      {
        "no": "W2",
        "code": "1206",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 610
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W10",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W11",
        "code": "AA",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W12",
        "code": "1209",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W13",
        "code": "AA",
        "heightMm": 1030,
        "widthMm": 850
      },
      {
        "no": "W14",
        "code": "1212",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W15",
        "code": "AF",
        "heightMm": 1200,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 3250
      }
    ]
  },
  "Cinnamon 36": {
    "fileName": "Cinnamon 36 Classic RH_Full Master_05.07.21.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W2",
        "code": "1816",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "1816",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 600,
        "widthMm": 1210
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W8",
        "code": "1209",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W10",
        "code": "0612",
        "heightMm": 600,
        "widthMm": 2170
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W12",
        "code": "1209",
        "heightMm": 1200,
        "widthMm": 2650
      },
      {
        "no": "W13",
        "code": "AST",
        "heightMm": 1030,
        "widthMm": 1210
      },
      {
        "no": "W14",
        "code": "1816",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W15",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W16",
        "code": "1816",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2710
      },
      {
        "no": "D3",
        "code": "2127",
        "heightMm": 2100,
        "widthMm": 2410
      },
      {
        "no": "D4",
        "code": "ASDI",
        "heightMm": 2040,
        "widthMm": 820
      }
    ]
  },
  "Crimson 24": {
    "fileName": "CRIMSON 24 CLASSIC RH_ FULL MASTER _09-11-18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W5",
        "code": "AAT",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W6",
        "code": "1806",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W7",
        "code": "AAT",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W8",
        "code": "1806",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1816",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Crimson 26": {
    "fileName": "CRIMSON 26  CLASSIC RH_FULL MASTER_29.08.18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 600,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AFAS",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "0606",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "0909",
        "heightMm": 1800,
        "widthMm": 2650
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W12",
        "code": "1827",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Crimson 33": {
    "fileName": "CRIMSON 33 CLASSIC RH_FULL MASTER_08.05.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W5",
        "code": "AAT",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1806",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W8",
        "code": "1216",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W12",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Ebony 24": {
    "fileName": "EBONY 24 CLASSIC RH_FULL MASTER_22.10.18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W10",
        "code": "1216",
        "heightMm": 1800,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Ebony 27": {
    "fileName": "Ebony 27 Classic RH_Full Master_03.11.2020.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W10",
        "code": "1216",
        "heightMm": 1800,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Ebony 32": {
    "fileName": "EBONY 32 CLASSIC RH_FULL MASTER_25-03-19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W2",
        "code": "1816",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 1030,
        "widthMm": 1570
      },
      {
        "no": "W5",
        "code": "AAT",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1806",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1016",
        "heightMm": 1030,
        "widthMm": 1570
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W12",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Emerald 39": {
    "fileName": "EMERALD 39 CLASSIC - LH_FULL MASTER SET _11-02-19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W2",
        "code": "1822",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 600,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "1209",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "0618",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AST1824",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W8",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W10",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W11",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W12",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W13",
        "code": "1822",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W14",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W15",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W16",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W17",
        "code": "1222",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W18",
        "code": "AFAS",
        "heightMm": 1370,
        "widthMm": 2170
      },
      {
        "no": "W19",
        "code": "1209",
        "heightMm": 1800,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Eton 15": {
    "fileName": "Eton 15 Classic_Full Master_LH_10.09.18 (PDF).pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "1212",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 850,
        "widthMm": 610
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Eton 17": {
    "fileName": "Eton 17 Classic_Full Master_RH_10.09.18 (PDF).pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Fuschia 44": {
    "fileName": "FUSCHIA 44 CLASSIC RH_FULL MASTER_03.04.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W2",
        "code": "1822",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "1212",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 600,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W10",
        "code": "1824",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AEFS",
        "heightMm": 600,
        "widthMm": 610
      },
      {
        "no": "W12",
        "code": "0618",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W14",
        "code": "1212",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W15",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W16",
        "code": "1212",
        "heightMm": 600,
        "widthMm": 2170
      },
      {
        "no": "W17",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W18",
        "code": "1212",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W19",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W20",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 610
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Indigo 17": {
    "fileName": "INDIGO 17 CLASSIC LH_FULL MASTER_31-01-19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AAT",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W8",
        "code": "1806",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AAT",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W10",
        "code": "1806",
        "heightMm": 860,
        "widthMm": 610
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Indigo 19": {
    "fileName": "INDIGO 19 CLASSIC RH CLASSIC_FULL MASTER_26-11-18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W9",
        "code": "AAT",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1806",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W11",
        "code": "AAT",
        "heightMm": 860,
        "widthMm": 610
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Iris 15": {
    "fileName": "Iris 15 Classic LH_Full Master_12.11.2019.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 860,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Iris 17": {
    "fileName": "IRIS 17 CLASSIC LH_FULL_MASTER_29.05.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Iris 18": {
    "fileName": "IRIS 18 CLASSIC RH_FULL MASTER_08.10.18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1818",
        "heightMm": 600,
        "widthMm": 1210
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Iris 21": {
    "fileName": "Iris 21 Classic RH_Full Master_1.12.2020.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1210
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 1210
      },
      {
        "no": "W9",
        "code": "AAT",
        "heightMm": 1030,
        "widthMm": 1570
      },
      {
        "no": "W10",
        "code": "1806",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2410
      },
      {
        "no": "D3",
        "code": "2124",
        "heightMm": 2040,
        "widthMm": 820
      }
    ]
  },
  "Ivory 23": {
    "fileName": "Ivory 23 LH Classic_Full Master_14.03.19 (PDF).pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1822",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1030,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Ivory 25": {
    "fileName": "Ivory 25 Classic_Full Master_ LH_17.07.18 (PDF).pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "1216",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 610
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Ivory 29": {
    "fileName": "Ivory 29 Classic RH_Full Master_07.05.2020.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AAT",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W4",
        "code": "1806",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W6",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1222",
        "heightMm": 860,
        "widthMm": 1570
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1822",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W12",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2410
      },
      {
        "no": "D3",
        "code": "2124",
        "heightMm": 2040,
        "widthMm": 820
      }
    ]
  },
  "Jade 21": {
    "fileName": "JADE 21 CLASSIC RH_FULL MASTER_13.03.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W2",
        "code": "1816",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Jasper 20": {
    "fileName": "JASPER 20 RH CLASSIC - FULL MASTER - 18.05.21.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1030,
        "widthMm": 1210
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "1012",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 600,
        "widthMm": 610
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 2410
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 3250
      },
      {
        "no": "D3",
        "code": "2132",
        "heightMm": 2040,
        "widthMm": 820
      }
    ]
  },
  "Jasper 24": {
    "fileName": "Jasper 24 Classic RH_Full Master_24.06.2020.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1030,
        "widthMm": 1210
      },
      {
        "no": "W4",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1012",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1030,
        "widthMm": 610
      },
      {
        "no": "W8",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2400
      }
    ]
  },
  "Jasper 26": {
    "fileName": "Jasper 26 Classic LH_Full Master_23.09.2019.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 1210
      },
      {
        "no": "W4",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "0912",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 2410
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 3610
      },
      {
        "no": "D3",
        "code": "2136",
        "heightMm": 2040,
        "widthMm": 820
      }
    ]
  },
  "Kobi 19": {
    "fileName": "Kobi 19 Classic RH_Full Master_23.03.2021.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1030,
        "widthMm": 1210
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1012",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W8",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W10",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2410
      },
      {
        "no": "D4",
        "code": "2124",
        "heightMm": 2040,
        "widthMm": 820
      }
    ]
  },
  "Magenta 26": {
    "fileName": "MAGENTA 26 CLASSIC RH_FULL MASTER_26.10.18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W2",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1216",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W12",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 610
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Magnolia 37": {
    "fileName": "MAGNOLIA 37 CLASSIC CTR_FULL MASTER_28.05.20.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AA",
        "heightMm": 1460,
        "widthMm": 610
      },
      {
        "no": "W2",
        "code": "1506",
        "heightMm": 1460,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AA",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W4",
        "code": "1506",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 600,
        "widthMm": 610
      },
      {
        "no": "W6",
        "code": "1216",
        "heightMm": 600,
        "widthMm": 610
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W8",
        "code": "1212",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W9",
        "code": "AFAS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "0606",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AFAS",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W12",
        "code": "0606",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W14",
        "code": "1212",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W15",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W16",
        "code": "1216",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Magnolia 42": {
    "fileName": "MAGNOLIA 42 Classic RH_Full Master_21.01.20.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W6",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1216",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W12",
        "code": "1216",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W13",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W14",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W15",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W16",
        "code": "0906",
        "heightMm": 1030,
        "widthMm": 610
      },
      {
        "no": "W17",
        "code": "AS",
        "heightMm": 1030,
        "widthMm": 610
      },
      {
        "no": "W18",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W19",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W20",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2410
      },
      {
        "no": "D4",
        "code": "2124",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Mahogany 38": {
    "fileName": "MAHOGANY 38 CLASSIC LH_FULL MASTER_20.08.18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 600,
        "widthMm": 2410
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1460,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W12",
        "code": "1824",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W13",
        "code": "AEFF",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W14",
        "code": "0624",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W15",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W16",
        "code": "1518",
        "heightMm": 900,
        "widthMm": 610
      },
      {
        "no": "W17",
        "code": "AS",
        "heightMm": 900,
        "widthMm": 610
      },
      {
        "no": "W18",
        "code": "1518",
        "heightMm": 900,
        "widthMm": 1810
      },
      {
        "no": "W19",
        "code": "AST",
        "heightMm": 900,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Mahogany 48": {
    "fileName": "MAHOGANY 48 CLASSIC RH_FULL MASTER_16.04.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2650
      },
      {
        "no": "W2",
        "code": "1827",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "1809",
        "heightMm": 600,
        "widthMm": 1210
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 600,
        "widthMm": 2410
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 2650
      },
      {
        "no": "W7",
        "code": "AEFS",
        "heightMm": 1800,
        "widthMm": 2650
      },
      {
        "no": "W8",
        "code": "0612",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AEFF",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "0624",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W12",
        "code": "1827",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W13",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W14",
        "code": "1827",
        "heightMm": 1030,
        "widthMm": 1570
      },
      {
        "no": "W15",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W16",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W17",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W18",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 1570
      },
      {
        "no": "W19",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W20",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W21",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W22",
        "code": "1216",
        "heightMm": 1200,
        "widthMm": 2650
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Maize 38": {
    "fileName": "Maize 38_Full Master_21.12.2020.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AA",
        "heightMm": 1460,
        "widthMm": 850
      },
      {
        "no": "W2",
        "code": "1509",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1460,
        "widthMm": 2410
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1460,
        "widthMm": 2410
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W6",
        "code": "1524",
        "heightMm": 1460,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W8",
        "code": "1524",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W10",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AA",
        "heightMm": 1030,
        "widthMm": 1570
      },
      {
        "no": "W12",
        "code": "1509",
        "heightMm": 1030,
        "widthMm": 1570
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 1030,
        "widthMm": 1570
      },
      {
        "no": "W14",
        "code": "0906",
        "heightMm": 1030,
        "widthMm": 1570
      },
      {
        "no": "W15",
        "code": "AF",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W16",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W17",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W18",
        "code": "1216",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W19",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W20",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Maize 43": {
    "fileName": "MAIZE 43 CLASSIC _FULL MASTER_27.05.19 (PDF).pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AA",
        "heightMm": 1460,
        "widthMm": 610
      },
      {
        "no": "W2",
        "code": "1506",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W4",
        "code": "0609",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W6",
        "code": "1216",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W8",
        "code": "1216",
        "heightMm": 1460,
        "widthMm": 610
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1216",
        "heightMm": 600,
        "widthMm": 1210
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 600,
        "widthMm": 610
      },
      {
        "no": "W12",
        "code": "1216",
        "heightMm": 600,
        "widthMm": 2170
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W14",
        "code": "0609",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W15",
        "code": "AA",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W16",
        "code": "1506",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W17",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W18",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W19",
        "code": "AS",
        "heightMm": 600,
        "widthMm": 2170
      },
      {
        "no": "W20",
        "code": "0612",
        "heightMm": 600,
        "widthMm": 610
      },
      {
        "no": "W21",
        "code": "AFAS",
        "heightMm": 600,
        "widthMm": 1210
      },
      {
        "no": "W22",
        "code": "0606",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Mauve 28": {
    "fileName": "Mauve 28 Classic LH_Full Master_01.02.21.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W2",
        "code": "1822",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AAT",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "1806",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W10",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W12",
        "code": "1809",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W13",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W14",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 3610
      },
      {
        "no": "D3",
        "code": "2136",
        "heightMm": 2040,
        "widthMm": 820
      }
    ]
  },
  "Mocha 28": {
    "fileName": "Mocha 28 Classic LH_Full Master_12.04.21.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1824",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W10",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "1216",
        "heightMm": 1200,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 3250
      }
    ]
  },
  "Mocha 31": {
    "fileName": "Mocha 31 Classic LH_Contract Plans_28.11.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 600,
        "widthMm": 1570
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AEFF",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "0616",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1209",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W12",
        "code": "1809",
        "heightMm": 860,
        "widthMm": 1210
      },
      {
        "no": "W15",
        "code": "AST",
        "heightMm": 1030,
        "widthMm": 850
      },
      {
        "no": "W16",
        "code": "1809",
        "heightMm": 1030,
        "widthMm": 850
      },
      {
        "no": "W17",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W18",
        "code": "1218",
        "heightMm": 600,
        "widthMm": 2410
      },
      {
        "no": "W19",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2710
      }
    ]
  },
  "Mocha 35": {
    "fileName": "MOCHA 35 CLASSIC LH_FULL MASTER_12.07.18 (PRELIMINARY).pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W2",
        "code": "1822",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "1809",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1210
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W8",
        "code": "0909",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W10",
        "code": "1812",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W12",
        "code": "1822",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W14",
        "code": "1212",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W15",
        "code": "AST",
        "heightMm": 860,
        "widthMm": 1210
      },
      {
        "no": "W16",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W17",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W18",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Mulberry 22": {
    "fileName": "Mulberry 22 Classic _Full Master_RH_20.07.18 (PDF).pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W2",
        "code": "1816",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W4",
        "code": "1816",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1050,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1816",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1816",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W10",
        "code": "1009",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W12",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1210
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Mulberry 25": {
    "fileName": "MULBERRY 25 CLASSIC RH_FULL MASTER_03.06.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W2",
        "code": "1816",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W4",
        "code": "1216",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2650
      },
      {
        "no": "W6",
        "code": "1816",
        "heightMm": 1030,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W8",
        "code": "1816",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "ASD",
        "heightMm": 2100,
        "widthMm": 2170
      },
      {
        "no": "D3",
        "code": "2122",
        "heightMm": 2040,
        "widthMm": 820
      }
    ]
  },
  "Mulberry 28 -": {
    "fileName": "MULBERRY 28 - RH _FULL MASTER_29.10.18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W2",
        "code": "1216",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W4",
        "code": "1216",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W6",
        "code": "1216",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1216",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W10",
        "code": "1216",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W12",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W13",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W14",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W15",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Onyx 19": {
    "fileName": "Onyx 19 Classic RH_Full Master_09.02.2023.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "1209",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 2170
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2710
      },
      {
        "no": "D3",
        "code": "2124",
        "heightMm": 2040,
        "widthMm": 820
      }
    ]
  },
  "Onyx 21": {
    "fileName": "ONYX 21 LH - CLASSIC_FULL MASTER_08.07.2021.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "1209",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 2170
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 3250
      },
      {
        "no": "D3",
        "code": "2124",
        "heightMm": 2040,
        "widthMm": 820
      }
    ]
  },
  "Onyx 24": {
    "fileName": "Onyx 24 Classic LH_Full Master_10.09.2019.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1810,
        "widthMm": 2170
      },
      {
        "no": "W2",
        "code": "1822",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 1210
      },
      {
        "no": "W4",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "0912",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 2170
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2170
      },
      {
        "no": "D3",
        "code": "2122",
        "heightMm": 2100,
        "widthMm": 3250
      },
      {
        "no": "D3",
        "code": "ASDI",
        "heightMm": 2040,
        "widthMm": 820
      }
    ]
  },
  "Orchid 23": {
    "fileName": "ORCHID 23 CLASSIC RH_FULL MASTER_19.07.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W2",
        "code": "1816",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1216",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1816",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W12",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W14",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1210
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Orchid 25": {
    "fileName": "ORCHID 25 CLASSIC - RH_FULL_MASTER_19-02-19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W2",
        "code": "1816",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W4",
        "code": "1816",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 900,
        "widthMm": 610
      },
      {
        "no": "W6",
        "code": "1216",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1212",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W10",
        "code": "0906",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W12",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W14",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Platinum 23": {
    "fileName": "PLATINUM 23 Classic LH_Full House Master_27.07.20.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "1822",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1030,
        "widthMm": 1570
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 2170
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Quartz 21": {
    "fileName": "Quartz 21 Classic_Full Master_LH_03.10.19 (PDF).pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W4",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W6",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 2170
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Quartz 25": {
    "fileName": "QUARTZ 25 CLASSIC RH_FULL MASTER_11-12-18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 2650
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W6",
        "code": "1827",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W10",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 2170
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Quartz 27": {
    "fileName": "QUARTZ 27 CLASSIC RH_FULL MASTER_17.07.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 2650
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W6",
        "code": "1827",
        "heightMm": 1030,
        "widthMm": 1570
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W10",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 2410
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Rose 43": {
    "fileName": "ROSE 43 CLASSIC RH_FULL MASTER_01.05.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "1824",
        "heightMm": 1800,
        "widthMm": 2650
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1210
      },
      {
        "no": "W6",
        "code": "1818",
        "heightMm": 600,
        "widthMm": 1210
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1827",
        "heightMm": 600,
        "widthMm": 2650
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W10",
        "code": "1812",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W11",
        "code": "AEFS",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W12",
        "code": "0612",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 600,
        "widthMm": 2650
      },
      {
        "no": "W14",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W15",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W16",
        "code": "0627",
        "heightMm": 1200,
        "widthMm": 2650
      },
      {
        "no": "W17",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W18",
        "code": "1209",
        "heightMm": 860,
        "widthMm": 1570
      },
      {
        "no": "W19",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 1570
      },
      {
        "no": "W20",
        "code": "1209",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W21",
        "code": "AFAS",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Ruby 19": {
    "fileName": "Ruby 19 Classic RH_Full Master_08.02.23.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AA",
        "heightMm": 1460,
        "widthMm": 610
      },
      {
        "no": "W2",
        "code": "1506",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W8",
        "code": "1822",
        "heightMm": 600,
        "widthMm": 610
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 600,
        "widthMm": 2170
      },
      {
        "no": "W10",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W12",
        "code": "1216",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Ruby 23": {
    "fileName": "Ruby 23 Classic RH_FULL MASTER _29.10.21.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AA",
        "heightMm": 1460,
        "widthMm": 610
      },
      {
        "no": "W2",
        "code": "1506",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1816",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 610
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 600,
        "widthMm": 2650
      },
      {
        "no": "W10",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W12",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2710
      }
    ]
  },
  "Ruby 26": {
    "fileName": "Ruby 26 Classic LH_Full Master_04.11.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AA",
        "heightMm": 1200,
        "widthMm": 610
      },
      {
        "no": "W2",
        "code": "1206",
        "heightMm": 1200,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AA",
        "heightMm": 900,
        "widthMm": 610
      },
      {
        "no": "W4",
        "code": "1206",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W6",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W8",
        "code": "1806",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 2110
      },
      {
        "no": "W10",
        "code": "1806",
        "heightMm": 1200,
        "widthMm": 1510
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 600,
        "widthMm": 610
      },
      {
        "no": "W12",
        "code": "1806",
        "heightMm": 1200,
        "widthMm": 910
      },
      {
        "no": "W13",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 910
      },
      {
        "no": "W14",
        "code": "1806",
        "heightMm": 1200,
        "widthMm": 2410
      },
      {
        "no": "W15",
        "code": "AST",
        "heightMm": 900,
        "widthMm": 910
      },
      {
        "no": "W16",
        "code": "1818",
        "heightMm": 600,
        "widthMm": 2110
      },
      {
        "no": "W17",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Saffron 26": {
    "fileName": "SAFFRON 26 CLASSIC RH_FULL MASTER_05.06.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1100,
        "widthMm": 370
      },
      {
        "no": "W3",
        "code": "STD",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "STD",
        "heightMm": 1800,
        "widthMm": 1210
      },
      {
        "no": "W5",
        "code": "STD",
        "heightMm": 1800,
        "widthMm": 1210
      },
      {
        "no": "W6",
        "code": "STD",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "STD",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "STD",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "STD",
        "heightMm": 600,
        "widthMm": 1570
      },
      {
        "no": "W10",
        "code": "STD",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W11",
        "code": "STD",
        "heightMm": 1200,
        "widthMm": 1210
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Saffron 35": {
    "fileName": "SAFFRON 35 CLASSIC LH_FULL MASTER_18-02-19. ONLY PENSET'S INCORRECT..pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1806",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1216",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W12",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W13",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Sage 12": {
    "fileName": "SAGE 12 CLASSIC RH_FULL MASTER_17-01-19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1209",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Scarlet 38": {
    "fileName": "SCARLET 38 CLASSIC - RH_FULL MASTER_(NSW)_22.01.21 (PDF).pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1822",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 600,
        "widthMm": 2410
      },
      {
        "no": "W10",
        "code": "1822",
        "heightMm": 1030,
        "widthMm": 1210
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W12",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 2410
      },
      {
        "no": "W13",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W14",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W15",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W16",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W17",
        "code": "AEFF",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W18",
        "code": "0624",
        "heightMm": 600,
        "widthMm": 1570
      },
      {
        "no": "W19",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W20",
        "code": "1012",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W21",
        "code": "AS",
        "heightMm": 600,
        "widthMm": 2650
      },
      {
        "no": "W22",
        "code": "1209",
        "heightMm": 860,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Scarlet 45": {
    "fileName": "Scarlet 45 Classic RH_Full Master_11.04.19 (PDF).pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W10",
        "code": "1824",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 600,
        "widthMm": 2410
      },
      {
        "no": "W12",
        "code": "1824",
        "heightMm": 600,
        "widthMm": 1210
      },
      {
        "no": "W13",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W14",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 2650
      },
      {
        "no": "W15",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 2650
      },
      {
        "no": "W16",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W17",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1210
      },
      {
        "no": "W18",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 1210
      },
      {
        "no": "W19",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1210
      },
      {
        "no": "W20",
        "code": "1824",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W21",
        "code": "AEFF",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W22",
        "code": "0624",
        "heightMm": 860,
        "widthMm": 1570
      },
      {
        "no": "W23",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W24",
        "code": "0612",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W25",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W26",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W27",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 2650
      },
      {
        "no": "W28",
        "code": "1227",
        "heightMm": 860,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Sienna 27": {
    "fileName": "SIENNA 27 CLASSIC RH_FULL MASTER_04.09.18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W2",
        "code": "1816",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 2650
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 860,
        "widthMm": 1210
      },
      {
        "no": "W8",
        "code": "1827",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W10",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W12",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 610
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Sienna 28": {
    "fileName": "Sienna 28 Classic RH_Full Master_22.01.2022.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W2",
        "code": "1816",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1210
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 2650
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1210
      },
      {
        "no": "W6",
        "code": "1812",
        "heightMm": 1800,
        "widthMm": 2650
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1827",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1812",
        "heightMm": 1030,
        "widthMm": 1570
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W12",
        "code": "1827",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W13",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W14",
        "code": "1809",
        "heightMm": 860,
        "widthMm": 610
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2410
      },
      {
        "no": "D3",
        "code": "2124",
        "heightMm": 2040,
        "widthMm": 820
      }
    ]
  },
  "Sienna 30": {
    "fileName": "SIENNA 30 Classic RH_Full Master_08.02.19 (PDF).pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AA",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1806",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1210
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W12",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 2650
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Terra Cotta 25": {
    "fileName": "TERRA COTTA 25 CLASSIC - LH_FULL MASTER_20-03-19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1570
      },
      {
        "no": "W4",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 1210
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1210
      },
      {
        "no": "W6",
        "code": "1816",
        "heightMm": 1460,
        "widthMm": 2410
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W8",
        "code": "1812",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1812",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W12",
        "code": "1524",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 1570
      },
      {
        "no": "W14",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W15",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W16",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Terracotta 23": {
    "fileName": "Terracotta 23 Classic RH_Full Master 05.07.18 (PDF).pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1460,
        "widthMm": 2410
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1524",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W10",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W12",
        "code": "1809",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W14",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 610
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Tiffany 24": {
    "fileName": "Tiffany 24 Classic_Full Master_ RH_07.02.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 300,
        "widthMm": 1450
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "0315",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 610
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Tiffany 27": {
    "fileName": "TIFFANY 27 CLASSIC RH_FULL MASTER_26-03-19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1030,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1009",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1030,
        "widthMm": 610
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1030,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Tiffany 29": {
    "fileName": "TIFFANY 29 CLASSIC RH_FULL MASTER_21.05.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1209",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W8",
        "code": "1209",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 610
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Topaz 21 -": {
    "fileName": "TOPAZ 21 - CLASSIC RH_FULL MASTER_04.07.18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Topaz 23": {
    "fileName": "Topaz 23 Classic RH_Full Master_08.03.19 (PDF).pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W10",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Topaz 26": {
    "fileName": "TOPAZ 26 CLASSIC RH_FULL MASTER_16.10.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1030,
        "widthMm": 610
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W10",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Turquoise 25": {
    "fileName": "Turquoise 25 Classic RH_Full Master_06.07.20.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "SP",
        "heightMm": 1200,
        "widthMm": 360
      },
      {
        "no": "W2",
        "code": "SP",
        "heightMm": 1200,
        "widthMm": 1500
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W4",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1030,
        "widthMm": 610
      },
      {
        "no": "W12",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W13",
        "code": "AST",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W14",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W15",
        "code": "AS",
        "heightMm": 1030,
        "widthMm": 610
      },
      {
        "no": "W16",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 1810
      },
      {
        "no": "W17",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 1210
      },
      {
        "no": "W18",
        "code": "1218",
        "heightMm": 860,
        "widthMm": 610
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "N/A",
        "heightMm": 2040,
        "widthMm": 1330
      },
      {
        "no": "D2",
        "code": "ASDI",
        "heightMm": 2100,
        "widthMm": 2710
      },
      {
        "no": "D3",
        "code": "2127",
        "heightMm": 2040,
        "widthMm": 820
      }
    ]
  },
  "Turquoise 26": {
    "fileName": "TURQUOISE 26 CLASSIC RH_FULL MASTER_26.07.18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W2",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "1809",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "0906",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W10",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W11",
        "code": "1822",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W12",
        "code": "AST",
        "heightMm": 900,
        "widthMm": 1210
      },
      {
        "no": "W13",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W14",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W15",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W16",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W17",
        "code": "1216",
        "heightMm": 1200,
        "widthMm": 1210
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Turquoise 28": {
    "fileName": "TURQUOISE 28 CLASSIC LH_FULL MASTER_31.07.18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W2",
        "code": "1209",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W3",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2410
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W10",
        "code": "1824",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W12",
        "code": "1209",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W13",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W14",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W15",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W16",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W17",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W18",
        "code": "1809",
        "heightMm": 900,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Violet 45": {
    "fileName": "VIOLET 45 CLASSIC  RH_FULL MASTER_22.11.18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W2",
        "code": "1822",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W4",
        "code": "0909",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W6",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W8",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W9",
        "code": "AST",
        "heightMm": 600,
        "widthMm": 2410
      },
      {
        "no": "W10",
        "code": "1809",
        "heightMm": 600,
        "widthMm": 1210
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1030,
        "widthMm": 1810
      },
      {
        "no": "W12",
        "code": "1809",
        "heightMm": 1030,
        "widthMm": 1810
      },
      {
        "no": "W13",
        "code": "AS",
        "heightMm": 1030,
        "widthMm": 1810
      },
      {
        "no": "W14",
        "code": "1216",
        "heightMm": 860,
        "widthMm": 1570
      },
      {
        "no": "W15",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W16",
        "code": "1216",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W17",
        "code": "AEFF",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W18",
        "code": "0624",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W19",
        "code": "AEFF",
        "heightMm": 1200,
        "widthMm": 1210
      },
      {
        "no": "W20",
        "code": "0612",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W21",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1570
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Violet 64": {
    "fileName": "VIOLET 64 CLASSIC LH_FULL MASTER_13.08.18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W2",
        "code": "1822",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 600,
        "widthMm": 1810
      },
      {
        "no": "W4",
        "code": "1222",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W5",
        "code": "AEFF",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W6",
        "code": "0618",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1216",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W10",
        "code": "1216",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 860,
        "widthMm": 1570
      },
      {
        "no": "W12",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W13",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W14",
        "code": "1809",
        "heightMm": 860,
        "widthMm": 1570
      },
      {
        "no": "W15",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 2650
      },
      {
        "no": "W16",
        "code": "1809",
        "heightMm": 1200,
        "widthMm": 1570
      },
      {
        "no": "W17",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W18",
        "code": "1809",
        "heightMm": 600,
        "widthMm": 2410
      },
      {
        "no": "W19",
        "code": "AS",
        "heightMm": 900,
        "widthMm": 2170
      },
      {
        "no": "W20",
        "code": "0909",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W21",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 850
      },
      {
        "no": "W22",
        "code": "0916",
        "heightMm": 1200,
        "widthMm": 2170
      },
      {
        "no": "W23",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W24",
        "code": "1222",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W25",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 2170
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Wisteria 28": {
    "fileName": "WISTERIA 28 CLASSIC LH_FULL MASTER_30.04.19.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 2170
      },
      {
        "no": "W4",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AST",
        "heightMm": 1030,
        "widthMm": 610
      },
      {
        "no": "W6",
        "code": "1822",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 610
      },
      {
        "no": "W10",
        "code": "1006",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W11",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W12",
        "code": "1209",
        "heightMm": 1200,
        "widthMm": 850
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  },
  "Wisteria 31": {
    "fileName": "WISTERIA 31 CLASSIC CTR_FULL MASTER_20.09.18.pdf",
    "windows": [
      {
        "no": "W1",
        "code": "AST",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W2",
        "code": "1818",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W3",
        "code": "AS",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W4",
        "code": "1218",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W5",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W6",
        "code": "0906",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W7",
        "code": "AS",
        "heightMm": 1800,
        "widthMm": 850
      },
      {
        "no": "W8",
        "code": "1218",
        "heightMm": 1800,
        "widthMm": 1810
      },
      {
        "no": "W9",
        "code": "AS",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W10",
        "code": "1818",
        "heightMm": 860,
        "widthMm": 610
      },
      {
        "no": "W11",
        "code": "AST",
        "heightMm": 1200,
        "widthMm": 1810
      },
      {
        "no": "W12",
        "code": "1809",
        "heightMm": 1800,
        "widthMm": 1810
      }
    ],
    "doors": [
      {
        "no": "D1",
        "code": "Front Door",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D2",
        "code": "Laundry / Garage",
        "heightMm": 2040,
        "widthMm": 820
      },
      {
        "no": "D3",
        "code": "ASDI 2124 Sliding Door",
        "heightMm": 2100,
        "widthMm": 2410
      }
    ]
  }
};
