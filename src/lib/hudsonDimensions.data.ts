/**
 * Official Hudson Homes House Dimensions Registry
 * Automatically extracted and calibrated against official Hudson Homes PDF brochures and architectural CAD specifications.
 * Provides exact wall-to-wall width, overall length, minimum lot frontage, and garage count for every plan.
 */

export interface HudsonDimensionRecord {
  label: string;
  design: string;
  width: number; // Overall house width in meters
  length: number; // Overall house length in meters
  minLotWidth: number | null; // Minimum lot width in meters
  totalM2: number; // Total floor area in m²
  cars: number; // Garage spaces (1 = single, 2 = double)
}

export const HUDSON_DIMENSIONS_REGISTRY: Record<string, HudsonDimensionRecord> = {
  "Amaranth 23A": {
    "label": "Amaranth 23A",
    "design": "Amaranth",
    "width": 10.8,
    "length": 21.2,
    "minLotWidth": 12.02,
    "totalM2": 210.01,
    "cars": 2
  },
  "Amaranth 23B": {
    "label": "Amaranth 23B",
    "design": "Amaranth",
    "width": 10.8,
    "length": 21.2,
    "minLotWidth": 12.02,
    "totalM2": 210.01,
    "cars": 2
  },
  "Alabaster 31": {
    "label": "Alabaster 31",
    "design": "Alabaster",
    "width": 15.96,
    "length": 19.55,
    "minLotWidth": 17.8,
    "totalM2": 284.86,
    "cars": 2
  },
  "Alabaster 36": {
    "label": "Alabaster 36",
    "design": "Alabaster",
    "width": 15.71,
    "length": 22.43,
    "minLotWidth": 18,
    "totalM2": 330.66,
    "cars": 2
  },
  "Alabaster 40": {
    "label": "Alabaster 40",
    "design": "Alabaster",
    "width": 15.71,
    "length": 25.31,
    "minLotWidth": 18,
    "totalM2": 373.02,
    "cars": 2
  },
  "Charcoal 24": {
    "label": "Charcoal 24",
    "design": "Charcoal",
    "width": 11.39,
    "length": 21.71,
    "minLotWidth": 12.49,
    "totalM2": 222.56,
    "cars": 2
  },
  "Maroon 26": {
    "label": "Maroon 26",
    "design": "Maroon",
    "width": 11.2,
    "length": 22,
    "minLotWidth": 13,
    "totalM2": 244.42,
    "cars": 2
  },
  "Maroon 28": {
    "label": "Maroon 28",
    "design": "Maroon",
    "width": 11.2,
    "length": 23.2,
    "minLotWidth": 13,
    "totalM2": 261.34,
    "cars": 2
  },
  "Raven 45": {
    "label": "Raven 45",
    "design": "Raven",
    "width": 13.19,
    "length": 22.67,
    "minLotWidth": 15,
    "totalM2": 418.52,
    "cars": 2
  },
  "Raven 55": {
    "label": "Raven 55",
    "design": "Raven",
    "width": 15.59,
    "length": 21.58,
    "minLotWidth": 17.43,
    "totalM2": 508.16,
    "cars": 2
  },
  "Cayenne 42": {
    "label": "Cayenne 42",
    "design": "Cayenne",
    "width": 13.19,
    "length": 20.63,
    "minLotWidth": 15,
    "totalM2": 389.36,
    "cars": 2
  },
  "Cayenne 45": {
    "label": "Cayenne 45",
    "design": "Cayenne",
    "width": 14.35,
    "length": 19.54,
    "minLotWidth": 17.35,
    "totalM2": 420.28,
    "cars": 2
  },
  "Cayenne 47": {
    "label": "Cayenne 47",
    "design": "Cayenne",
    "width": 13.19,
    "length": 20.63,
    "minLotWidth": 15,
    "totalM2": 436.94,
    "cars": 2
  },
  "Cayenne 56": {
    "label": "Cayenne 56",
    "design": "Cayenne",
    "width": 14.35,
    "length": 23.6,
    "minLotWidth": 17.35,
    "totalM2": 523.26,
    "cars": 2
  },
  "Teal 29": {
    "label": "Teal 29",
    "design": "Teal",
    "width": 13.91,
    "length": 22.44,
    "minLotWidth": 16.83,
    "totalM2": 265.59,
    "cars": 2
  },
  "Teal 33": {
    "label": "Teal 33",
    "design": "Teal",
    "width": 15.65,
    "length": 23.03,
    "minLotWidth": 17.92,
    "totalM2": 306.25,
    "cars": 2
  },
  "Teal 45": {
    "label": "Teal 45",
    "design": "Teal",
    "width": 15.35,
    "length": 21.96,
    "minLotWidth": 17.43,
    "totalM2": 423.1,
    "cars": 3
  },
  "Teal 48": {
    "label": "Teal 48",
    "design": "Teal",
    "width": 14.51,
    "length": 22.19,
    "minLotWidth": 17.43,
    "totalM2": 443.45,
    "cars": 3
  },
  "Sabel (QLD ONLY) 28": {
    "label": "Sabel (QLD ONLY) 28",
    "design": "Sabel (QLD ONLY)",
    "width": 8.5,
    "length": 22.5,
    "minLotWidth": 10,
    "totalM2": 257.29,
    "cars": 2
  },
  "Hazel 14": {
    "label": "Hazel 14",
    "design": "Hazel",
    "width": 8.27,
    "length": 16.66,
    "minLotWidth": 9.95,
    "totalM2": 125.8,
    "cars": 1
  },
  "Hazel 15": {
    "label": "Hazel 15",
    "design": "Hazel",
    "width": 8.27,
    "length": 18.71,
    "minLotWidth": 9.95,
    "totalM2": 142.05,
    "cars": 1
  },
  "Hazel 17": {
    "label": "Hazel 17",
    "design": "Hazel",
    "width": 8.27,
    "length": 20.87,
    "minLotWidth": 9.95,
    "totalM2": 158.08,
    "cars": 1
  },
  "Hazel 19": {
    "label": "Hazel 19",
    "design": "Hazel",
    "width": 8.27,
    "length": 22.91,
    "minLotWidth": 9.95,
    "totalM2": 173.2,
    "cars": 1
  },
  "Olive 23": {
    "label": "Olive 23",
    "design": "Olive",
    "width": 11.03,
    "length": 21.47,
    "minLotWidth": 12.87,
    "totalM2": 210.86,
    "cars": 2
  },
  "Blanc 27": {
    "label": "Blanc 27",
    "design": "Blanc",
    "width": 13.07,
    "length": 21.47,
    "minLotWidth": 14.91,
    "totalM2": 246.93,
    "cars": 2
  },
  "Amber 21": {
    "label": "Amber 21",
    "design": "Amber",
    "width": 10.55,
    "length": 20.27,
    "minLotWidth": 12.39,
    "totalM2": 192.24,
    "cars": 2
  },
  "Amber 23": {
    "label": "Amber 23",
    "design": "Amber",
    "width": 10.55,
    "length": 20.87,
    "minLotWidth": 12.39,
    "totalM2": 210.63,
    "cars": 2
  },
  "Amber 26": {
    "label": "Amber 26",
    "design": "Amber",
    "width": 11.63,
    "length": 22.55,
    "minLotWidth": 13.47,
    "totalM2": 241.57,
    "cars": 2
  },
  "Amber 30": {
    "label": "Amber 30",
    "design": "Amber",
    "width": 11.63,
    "length": 25.19,
    "minLotWidth": 13.47,
    "totalM2": 282.99,
    "cars": 2
  },
  "Azure 19": {
    "label": "Azure 19",
    "design": "Azure",
    "width": 10.55,
    "length": 17.51,
    "minLotWidth": 12.39,
    "totalM2": 177.08,
    "cars": 2
  },
  "Azure 21": {
    "label": "Azure 21",
    "design": "Azure",
    "width": 11.03,
    "length": 18.95,
    "minLotWidth": 12.87,
    "totalM2": 197.08,
    "cars": 2
  },
  "Azure 23": {
    "label": "Azure 23",
    "design": "Azure",
    "width": 10.55,
    "length": 21.47,
    "minLotWidth": 12.39,
    "totalM2": 208.71,
    "cars": 2
  },
  "Azure 25": {
    "label": "Azure 25",
    "design": "Azure",
    "width": 10.62,
    "length": 24.01,
    "minLotWidth": 12.5,
    "totalM2": 235.44,
    "cars": 2
  },
  "Burgundy 27": {
    "label": "Burgundy 27",
    "design": "Burgundy",
    "width": 10.91,
    "length": 17.15,
    "minLotWidth": 13.33,
    "totalM2": 252.01,
    "cars": 2
  },
  "Burgundy 30": {
    "label": "Burgundy 30",
    "design": "Burgundy",
    "width": 11.15,
    "length": 18.35,
    "minLotWidth": 13.57,
    "totalM2": 277.51,
    "cars": 2
  },
  "Burgundy 32": {
    "label": "Burgundy 32",
    "design": "Burgundy",
    "width": 11.15,
    "length": 18.95,
    "minLotWidth": 13.57,
    "totalM2": 298.12,
    "cars": 2
  },
  "Burgundy 34": {
    "label": "Burgundy 34",
    "design": "Burgundy",
    "width": 11.15,
    "length": 20.03,
    "minLotWidth": 13.57,
    "totalM2": 317.03,
    "cars": 2
  },
  "Canary 1": {
    "label": "Canary 1",
    "design": "Canary",
    "width": 11.15,
    "length": 12.99,
    "minLotWidth": 11.63,
    "totalM2": 117.64,
    "cars": 1
  },
  "Canary 2": {
    "label": "Canary 2",
    "design": "Canary",
    "width": 10.31,
    "length": 13.95,
    "minLotWidth": 12.11,
    "totalM2": 113.03,
    "cars": 1
  },
  "Canary 3": {
    "label": "Canary 3",
    "design": "Canary",
    "width": 10.07,
    "length": 15.87,
    "minLotWidth": 14.03,
    "totalM2": 127.2,
    "cars": 1
  },
  "Canary 4": {
    "label": "Canary 4",
    "design": "Canary",
    "width": 10.07,
    "length": 14.43,
    "minLotWidth": 12.59,
    "totalM2": 117.36,
    "cars": 1
  },
  "Carolina 22": {
    "label": "Carolina 22",
    "design": "Carolina",
    "width": 8.27,
    "length": 16.55,
    "minLotWidth": 9.95,
    "totalM2": 202.58,
    "cars": 2
  },
  "Carolina 24": {
    "label": "Carolina 24",
    "design": "Carolina",
    "width": 8.27,
    "length": 16.55,
    "minLotWidth": 9.95,
    "totalM2": 222.48,
    "cars": 2
  },
  "Carolina 26": {
    "label": "Carolina 26",
    "design": "Carolina",
    "width": 8.27,
    "length": 19.77,
    "minLotWidth": 9.95,
    "totalM2": 242.63,
    "cars": 2
  },
  "Carolina 29": {
    "label": "Carolina 29",
    "design": "Carolina",
    "width": 8.27,
    "length": 19.79,
    "minLotWidth": 9.95,
    "totalM2": 266.7,
    "cars": 2
  },
  "Carmine 17": {
    "label": "Carmine 17",
    "design": "Carmine",
    "width": 9.95,
    "length": 16.91,
    "minLotWidth": 11.79,
    "totalM2": 162.11,
    "cars": 2
  },
  "Carmine 19": {
    "label": "Carmine 19",
    "design": "Carmine",
    "width": 9.95,
    "length": 18.71,
    "minLotWidth": 11.79,
    "totalM2": 180.02,
    "cars": 2
  },
  "Carmine 21": {
    "label": "Carmine 21",
    "design": "Carmine",
    "width": 9.95,
    "length": 20.39,
    "minLotWidth": 11.79,
    "totalM2": 193.57,
    "cars": 2
  },
  "Carmine 23": {
    "label": "Carmine 23",
    "design": "Carmine",
    "width": 9.95,
    "length": 22.32,
    "minLotWidth": 11.79,
    "totalM2": 215.19,
    "cars": 2
  },
  "Cedar 26": {
    "label": "Cedar 26",
    "design": "Cedar",
    "width": 15.23,
    "length": 33.52,
    "minLotWidth": 17.07,
    "totalM2": 242.35,
    "cars": 2
  },
  "Cedar 28": {
    "label": "Cedar 28",
    "design": "Cedar",
    "width": 15.23,
    "length": 33.67,
    "minLotWidth": 17.07,
    "totalM2": 261.44,
    "cars": 2
  },
  "Cedar 31": {
    "label": "Cedar 31",
    "design": "Cedar",
    "width": 16.19,
    "length": 33.61,
    "minLotWidth": 18.03,
    "totalM2": 291.51,
    "cars": 2
  },
  "Cedar 34": {
    "label": "Cedar 34",
    "design": "Cedar",
    "width": 16.79,
    "length": 33.49,
    "minLotWidth": 18.63,
    "totalM2": 318.36,
    "cars": 2
  },
  "Cerise 20": {
    "label": "Cerise 20",
    "design": "Cerise",
    "width": 7.51,
    "length": 15.65,
    "minLotWidth": 9.01,
    "totalM2": 181.35,
    "cars": 1
  },
  "Cinnamon 23": {
    "label": "Cinnamon 23",
    "design": "Cinnamon",
    "width": 10.91,
    "length": 14.87,
    "minLotWidth": 13.33,
    "totalM2": 218.03,
    "cars": 2
  },
  "Cinnamon 26": {
    "label": "Cinnamon 26",
    "design": "Cinnamon",
    "width": 11.15,
    "length": 16.77,
    "minLotWidth": 13.57,
    "totalM2": 237.61,
    "cars": 2
  },
  "Cinnamon 30": {
    "label": "Cinnamon 30",
    "design": "Cinnamon",
    "width": 11.99,
    "length": 17.63,
    "minLotWidth": 14.41,
    "totalM2": 275.83,
    "cars": 2
  },
  "Cinnamon 36": {
    "label": "Cinnamon 36",
    "design": "Cinnamon",
    "width": 12.71,
    "length": 17.63,
    "minLotWidth": 15.13,
    "totalM2": 338.87,
    "cars": 2
  },
  "Cobalt 22": {
    "label": "Cobalt 22",
    "design": "Cobalt",
    "width": 10.55,
    "length": 15.09,
    "minLotWidth": 12.97,
    "totalM2": 202.63,
    "cars": 2
  },
  "Cobalt 26": {
    "label": "Cobalt 26",
    "design": "Cobalt",
    "width": 11.03,
    "length": 15.95,
    "minLotWidth": 13.45,
    "totalM2": 242.03,
    "cars": 2
  },
  "Cobalt 30": {
    "label": "Cobalt 30",
    "design": "Cobalt",
    "width": 11.03,
    "length": 19.65,
    "minLotWidth": 13.45,
    "totalM2": 278.98,
    "cars": 2
  },
  "Cobalt 36": {
    "label": "Cobalt 36",
    "design": "Cobalt",
    "width": 11.99,
    "length": 20.75,
    "minLotWidth": 14.41,
    "totalM2": 332.6,
    "cars": 2
  },
  "Coral 19": {
    "label": "Coral 19",
    "design": "Coral",
    "width": 8.51,
    "length": 24.95,
    "minLotWidth": 10.21,
    "totalM2": 181.12,
    "cars": 2
  },
  "Coral 21": {
    "label": "Coral 21",
    "design": "Coral",
    "width": 9.6,
    "length": 23.51,
    "minLotWidth": 11.3,
    "totalM2": 198.08,
    "cars": 2
  },
  "Coral 23": {
    "label": "Coral 23",
    "design": "Coral",
    "width": 10.77,
    "length": 23.63,
    "minLotWidth": 12.47,
    "totalM2": 217.68,
    "cars": 2
  },
  "Coral 26": {
    "label": "Coral 26",
    "design": "Coral",
    "width": 11.33,
    "length": 24.94,
    "minLotWidth": 13.03,
    "totalM2": 240.93,
    "cars": 2
  },
  "Crimson 24": {
    "label": "Crimson 24",
    "design": "Crimson",
    "width": 11.99,
    "length": 20.51,
    "minLotWidth": 13.83,
    "totalM2": 224.56,
    "cars": 2
  },
  "Crimson 26": {
    "label": "Crimson 26",
    "design": "Crimson",
    "width": 12.83,
    "length": 20.51,
    "minLotWidth": 14.67,
    "totalM2": 245.04,
    "cars": 2
  },
  "Crimson 29": {
    "label": "Crimson 29",
    "design": "Crimson",
    "width": 15.59,
    "length": 20.75,
    "minLotWidth": 17.43,
    "totalM2": 273.85,
    "cars": 2
  },
  "Crimson 33": {
    "label": "Crimson 33",
    "design": "Crimson",
    "width": 15.59,
    "length": 21.47,
    "minLotWidth": 17.43,
    "totalM2": 302.45,
    "cars": 2
  },
  "Ebony (QLD Only) 24": {
    "label": "Ebony (QLD Only) 24",
    "design": "Ebony (QLD Only)",
    "width": 11.31,
    "length": 21.9,
    "minLotWidth": 13.11,
    "totalM2": 225.26,
    "cars": 2
  },
  "Ebony (QLD Only) 27": {
    "label": "Ebony (QLD Only) 27",
    "design": "Ebony (QLD Only)",
    "width": 12.03,
    "length": 22.9,
    "minLotWidth": 13.83,
    "totalM2": 249.27,
    "cars": 2
  },
  "Ebony (QLD Only) 29": {
    "label": "Ebony (QLD Only) 29",
    "design": "Ebony (QLD Only)",
    "width": 15.27,
    "length": 19.8,
    "minLotWidth": 17.07,
    "totalM2": 269.24,
    "cars": 2
  },
  "Ebony (QLD Only) 32": {
    "label": "Ebony (QLD Only) 32",
    "design": "Ebony (QLD Only)",
    "width": 16.35,
    "length": 20.3,
    "minLotWidth": 18.15,
    "totalM2": 293.23,
    "cars": 2
  },
  "Emerald 28": {
    "label": "Emerald 28",
    "design": "Emerald",
    "width": 9.71,
    "length": 19.56,
    "minLotWidth": 10.81,
    "totalM2": 261.45,
    "cars": 1
  },
  "Emerald 39": {
    "label": "Emerald 39",
    "design": "Emerald",
    "width": 12.23,
    "length": 21.37,
    "minLotWidth": 14.99,
    "totalM2": 363.29,
    "cars": 2
  },
  "Emerald 42": {
    "label": "Emerald 42",
    "design": "Emerald",
    "width": 12.23,
    "length": 21.6,
    "minLotWidth": 15.23,
    "totalM2": 392.45,
    "cars": 2
  },
  "Emerald 44": {
    "label": "Emerald 44",
    "design": "Emerald",
    "width": 12.23,
    "length": 22.09,
    "minLotWidth": 15.23,
    "totalM2": 408.67,
    "cars": 2
  },
  "Emerald 47": {
    "label": "Emerald 47",
    "design": "Emerald",
    "width": 12.23,
    "length": 22.09,
    "minLotWidth": 15.23,
    "totalM2": 438.52,
    "cars": 2
  },
  "Indigo (QLD Only) 15": {
    "label": "Indigo (QLD Only) 15",
    "design": "Indigo (QLD Only)",
    "width": 8.67,
    "length": 18.7,
    "minLotWidth": 10.47,
    "totalM2": 144.97,
    "cars": 1
  },
  "Indigo (QLD Only) 17": {
    "label": "Indigo (QLD Only) 17",
    "design": "Indigo (QLD Only)",
    "width": 8.67,
    "length": 20.9,
    "minLotWidth": 10.47,
    "totalM2": 162.18,
    "cars": 1
  },
  "Indigo (QLD Only) 19": {
    "label": "Indigo (QLD Only) 19",
    "design": "Indigo (QLD Only)",
    "width": 9.87,
    "length": 21.8,
    "minLotWidth": 11.67,
    "totalM2": 174.92,
    "cars": 1
  },
  "Indigo (QLD Only) 22": {
    "label": "Indigo (QLD Only) 22",
    "design": "Indigo (QLD Only)",
    "width": 9.87,
    "length": 24.3,
    "minLotWidth": 11.67,
    "totalM2": 206.17,
    "cars": 1
  },
  "Iris 15": {
    "label": "Iris 15",
    "design": "Iris",
    "width": 8.15,
    "length": 19.97,
    "minLotWidth": 9.25,
    "totalM2": 139.07,
    "cars": 1
  },
  "Iris 17": {
    "label": "Iris 17",
    "design": "Iris",
    "width": 8.15,
    "length": 21.95,
    "minLotWidth": 9.25,
    "totalM2": 159.99,
    "cars": 1
  },
  "Iris 18": {
    "label": "Iris 18",
    "design": "Iris",
    "width": 8.15,
    "length": 23.15,
    "minLotWidth": 9.25,
    "totalM2": 168.58,
    "cars": 1
  },
  "Iris 21": {
    "label": "Iris 21",
    "design": "Iris",
    "width": 9.11,
    "length": 22.07,
    "minLotWidth": 10.95,
    "totalM2": 195.59,
    "cars": 1
  },
  "Ivory 21": {
    "label": "Ivory 21",
    "design": "Ivory",
    "width": 10.89,
    "length": 20.57,
    "minLotWidth": 12.73,
    "totalM2": 199.23,
    "cars": 2
  },
  "Ivory 23": {
    "label": "Ivory 23",
    "design": "Ivory",
    "width": 11.39,
    "length": 20.99,
    "minLotWidth": 13.23,
    "totalM2": 211.51,
    "cars": 2
  },
  "Ivory 25": {
    "label": "Ivory 25",
    "design": "Ivory",
    "width": 11.87,
    "length": 20.99,
    "minLotWidth": 13.71,
    "totalM2": 232.9,
    "cars": 2
  },
  "Ivory 27": {
    "label": "Ivory 27",
    "design": "Ivory",
    "width": 12.59,
    "length": 21.23,
    "minLotWidth": 14.43,
    "totalM2": 254.56,
    "cars": 2
  },
  "Ivory 29": {
    "label": "Ivory 29",
    "design": "Ivory",
    "width": 12.83,
    "length": 24.11,
    "minLotWidth": 14.67,
    "totalM2": 273.92,
    "cars": 2
  },
  "Jade (QLD Only) 21": {
    "label": "Jade (QLD Only) 21",
    "design": "Jade (QLD Only)",
    "width": 10.83,
    "length": 21.5,
    "minLotWidth": 12.63,
    "totalM2": 196.98,
    "cars": 2
  },
  "Jade (QLD Only) 23": {
    "label": "Jade (QLD Only) 23",
    "design": "Jade (QLD Only)",
    "width": 11.19,
    "length": 22.8,
    "minLotWidth": 12.99,
    "totalM2": 216.11,
    "cars": 2
  },
  "Jasper 17": {
    "label": "Jasper 17",
    "design": "Jasper",
    "width": 10.31,
    "length": 17.99,
    "minLotWidth": 11.41,
    "totalM2": 161.71,
    "cars": 2
  },
  "Jasper 20": {
    "label": "Jasper 20",
    "design": "Jasper",
    "width": 10.67,
    "length": 20.51,
    "minLotWidth": 11.77,
    "totalM2": 185.15,
    "cars": 2
  },
  "Jasper 24": {
    "label": "Jasper 24",
    "design": "Jasper",
    "width": 10.79,
    "length": 22.19,
    "minLotWidth": 11.89,
    "totalM2": 219.83,
    "cars": 2
  },
  "Jasper 26": {
    "label": "Jasper 26",
    "design": "Jasper",
    "width": 11.39,
    "length": 24.71,
    "minLotWidth": 12.49,
    "totalM2": 241.82,
    "cars": 2
  },
  "Lime 19": {
    "label": "Lime 19",
    "design": "Lime",
    "width": 7.31,
    "length": 18.67,
    "minLotWidth": 8.99,
    "totalM2": 176.46,
    "cars": 1
  },
  "Lime 21": {
    "label": "Lime 21",
    "design": "Lime",
    "width": 7.31,
    "length": 19.39,
    "minLotWidth": 8.99,
    "totalM2": 195.08,
    "cars": 1
  },
  "Lime 23": {
    "label": "Lime 23",
    "design": "Lime",
    "width": 7.31,
    "length": 20.11,
    "minLotWidth": 8.99,
    "totalM2": 215.6,
    "cars": 1
  },
  "Lime 25": {
    "label": "Lime 25",
    "design": "Lime",
    "width": 7.31,
    "length": 21.63,
    "minLotWidth": 8.99,
    "totalM2": 234.87,
    "cars": 1
  },
  "Magenta 26": {
    "label": "Magenta 26",
    "design": "Magenta",
    "width": 15.11,
    "length": 17.03,
    "minLotWidth": 16.95,
    "totalM2": 244.4,
    "cars": 2
  },
  "Magenta 29": {
    "label": "Magenta 29",
    "design": "Magenta",
    "width": 15.47,
    "length": 19.19,
    "minLotWidth": 17.31,
    "totalM2": 271.52,
    "cars": 2
  },
  "Magenta 33": {
    "label": "Magenta 33",
    "design": "Magenta",
    "width": 15.95,
    "length": 20.39,
    "minLotWidth": 17.79,
    "totalM2": 305.98,
    "cars": 2
  },
  "Magenta 36": {
    "label": "Magenta 36",
    "design": "Magenta",
    "width": 15.83,
    "length": 22.07,
    "minLotWidth": 17.67,
    "totalM2": 334.09,
    "cars": 2
  },
  "Magnolia 34": {
    "label": "Magnolia 34",
    "design": "Magnolia",
    "width": 11.79,
    "length": 15.23,
    "minLotWidth": 14.79,
    "totalM2": 312.02,
    "cars": 2
  },
  "Magnolia 37": {
    "label": "Magnolia 37",
    "design": "Magnolia",
    "width": 11.79,
    "length": 17.39,
    "minLotWidth": 14.79,
    "totalM2": 346.94,
    "cars": 2
  },
  "Magnolia 43": {
    "label": "Magnolia 43",
    "design": "Magnolia",
    "width": 15.35,
    "length": 18.07,
    "minLotWidth": 17.19,
    "totalM2": 395.28,
    "cars": 2
  },
  "Magnolia 45": {
    "label": "Magnolia 45",
    "design": "Magnolia",
    "width": 15.35,
    "length": 18.35,
    "minLotWidth": 17.17,
    "totalM2": 419.08,
    "cars": 2
  },
  "Magnolia 47": {
    "label": "Magnolia 47",
    "design": "Magnolia",
    "width": 15.12,
    "length": 17.75,
    "minLotWidth": 17.16,
    "totalM2": 432.5,
    "cars": 2
  },
  "Magnolia 53": {
    "label": "Magnolia 53",
    "design": "Magnolia",
    "width": 16.07,
    "length": 19.07,
    "minLotWidth": 16.79,
    "totalM2": 494.24,
    "cars": 2
  },
  "Mulberry 22": {
    "label": "Mulberry 22",
    "design": "Mulberry",
    "width": 25.19,
    "length": 10.19,
    "minLotWidth": 27.03,
    "totalM2": 208.66,
    "cars": 2
  },
  "Mulberry 25": {
    "label": "Mulberry 25",
    "design": "Mulberry",
    "width": 25.67,
    "length": 11.75,
    "minLotWidth": 27.51,
    "totalM2": 235.57,
    "cars": 2
  },
  "Mulberry 25 (Alt Garage)": {
    "label": "Mulberry 25 (Alt Garage)",
    "design": "Mulberry",
    "width": 25.67,
    "length": 11.75,
    "minLotWidth": 27.51,
    "totalM2": 235.57,
    "cars": 2
  },
  "Mulberry 28": {
    "label": "Mulberry 28",
    "design": "Mulberry",
    "width": 27.83,
    "length": 12.71,
    "minLotWidth": 29.67,
    "totalM2": 259.28,
    "cars": 2
  },
  "Mulberry 28 (Bed 5)": {
    "label": "Mulberry 28 (Bed 5)",
    "design": "Mulberry",
    "width": 27.83,
    "length": 12.71,
    "minLotWidth": 29.67,
    "totalM2": 259.28,
    "cars": 2
  },
  "Mulberry 33": {
    "label": "Mulberry 33",
    "design": "Mulberry",
    "width": 31.07,
    "length": 13.07,
    "minLotWidth": 32.91,
    "totalM2": 307.82,
    "cars": 2
  },
  "Mulberry 33 (Bed 5)": {
    "label": "Mulberry 33 (Bed 5)",
    "design": "Mulberry",
    "width": 31.07,
    "length": 13.07,
    "minLotWidth": 32.91,
    "totalM2": 307.82,
    "cars": 2
  },
  "Mulberry 39": {
    "label": "Mulberry 39",
    "design": "Mulberry",
    "width": 29.51,
    "length": 16.95,
    "minLotWidth": 31.35,
    "totalM2": 365.23,
    "cars": 2
  },
  "Mahogany (QLD Only) 38": {
    "label": "Mahogany (QLD Only) 38",
    "design": "Mahogany (QLD Only)",
    "width": 12.03,
    "length": 19.8,
    "minLotWidth": 14,
    "totalM2": 348.55,
    "cars": 2
  },
  "Mahogany (QLD Only) 43": {
    "label": "Mahogany (QLD Only) 43",
    "design": "Mahogany (QLD Only)",
    "width": 12.03,
    "length": 21.5,
    "minLotWidth": 14,
    "totalM2": 396.08,
    "cars": 2
  },
  "Mahogany (QLD Only) 48": {
    "label": "Mahogany (QLD Only) 48",
    "design": "Mahogany (QLD Only)",
    "width": 13.5,
    "length": 22.8,
    "minLotWidth": 15.5,
    "totalM2": 445.98,
    "cars": 2
  },
  "Mahogany (QLD Only) 56": {
    "label": "Mahogany (QLD Only) 56",
    "design": "Mahogany (QLD Only)",
    "width": 13.5,
    "length": 25.2,
    "minLotWidth": 15.5,
    "totalM2": 51583,
    "cars": 3
  },
  "Maize 33": {
    "label": "Maize 33",
    "design": "Maize",
    "width": 11.99,
    "length": 15.35,
    "minLotWidth": 14.99,
    "totalM2": 310.96,
    "cars": 2
  },
  "Maize 36": {
    "label": "Maize 36",
    "design": "Maize",
    "width": 11.99,
    "length": 17.39,
    "minLotWidth": 14.99,
    "totalM2": 330.9,
    "cars": 2
  },
  "Maize 40": {
    "label": "Maize 40",
    "design": "Maize",
    "width": 11.99,
    "length": 17.87,
    "minLotWidth": 14.99,
    "totalM2": 369.42,
    "cars": 2
  },
  "Maize 43": {
    "label": "Maize 43",
    "design": "Maize",
    "width": 12.47,
    "length": 17.82,
    "minLotWidth": 15.47,
    "totalM2": 400.62,
    "cars": 2
  },
  "Maize 47": {
    "label": "Maize 47",
    "design": "Maize",
    "width": 13.19,
    "length": 18.95,
    "minLotWidth": 16.19,
    "totalM2": 440.64,
    "cars": 2
  },
  "Maize 54": {
    "label": "Maize 54",
    "design": "Maize",
    "width": 13.19,
    "length": 22.8,
    "minLotWidth": 16.19,
    "totalM2": 505.44,
    "cars": 2
  },
  "Marigold 26": {
    "label": "Marigold 26",
    "design": "Marigold",
    "width": 9.71,
    "length": 19.43,
    "minLotWidth": 11.39,
    "totalM2": 243.55,
    "cars": 2
  },
  "Marigold 28": {
    "label": "Marigold 28",
    "design": "Marigold",
    "width": 10.79,
    "length": 18.11,
    "minLotWidth": 12.47,
    "totalM2": 262.44,
    "cars": 2
  },
  "Marigold 31": {
    "label": "Marigold 31",
    "design": "Marigold",
    "width": 11.27,
    "length": 17.75,
    "minLotWidth": 12.95,
    "totalM2": 289.41,
    "cars": 2
  },
  "Marigold 35": {
    "label": "Marigold 35",
    "design": "Marigold",
    "width": 11.27,
    "length": 20.39,
    "minLotWidth": 12.95,
    "totalM2": 324.91,
    "cars": 2
  },
  "Mauve 24": {
    "label": "Mauve 24",
    "design": "Mauve",
    "width": 10.91,
    "length": 14.27,
    "minLotWidth": 13.91,
    "totalM2": 224.24,
    "cars": 2
  },
  "Mauve 28": {
    "label": "Mauve 28",
    "design": "Mauve",
    "width": 11.15,
    "length": 17.15,
    "minLotWidth": 14.15,
    "totalM2": 259.24,
    "cars": 2
  },
  "Mauve 32": {
    "label": "Mauve 32",
    "design": "Mauve",
    "width": 11.39,
    "length": 18.83,
    "minLotWidth": 14.39,
    "totalM2": 298.07,
    "cars": 2
  },
  "Mauve 35": {
    "label": "Mauve 35",
    "design": "Mauve",
    "width": 11.99,
    "length": 18.83,
    "minLotWidth": 14.99,
    "totalM2": 328.66,
    "cars": 2
  },
  "Mint 17": {
    "label": "Mint 17",
    "design": "Mint",
    "width": 6.23,
    "length": 18.11,
    "minLotWidth": 7.91,
    "totalM2": 158.74,
    "cars": 1
  },
  "Mint 19": {
    "label": "Mint 19",
    "design": "Mint",
    "width": 6.23,
    "length": 18.83,
    "minLotWidth": 7.91,
    "totalM2": 177.97,
    "cars": 1
  },
  "Mint 21": {
    "label": "Mint 21",
    "design": "Mint",
    "width": 6.23,
    "length": 19.67,
    "minLotWidth": 7.91,
    "totalM2": 191.33,
    "cars": 1
  },
  "Mint 24": {
    "label": "Mint 24",
    "design": "Mint",
    "width": 6.23,
    "length": 22.31,
    "minLotWidth": 7.91,
    "totalM2": 220.64,
    "cars": 1
  },
  "Mocha 24": {
    "label": "Mocha 24",
    "design": "Mocha",
    "width": 7.55,
    "length": 21.11,
    "minLotWidth": 11.05,
    "totalM2": 225.93,
    "cars": 2
  },
  "Mocha 25": {
    "label": "Mocha 25",
    "design": "Mocha",
    "width": 10.43,
    "length": 16.24,
    "minLotWidth": 13.93,
    "totalM2": 232.26,
    "cars": 2
  },
  "Mocha 28": {
    "label": "Mocha 28",
    "design": "Mocha",
    "width": 11.51,
    "length": 16.91,
    "minLotWidth": 15.01,
    "totalM2": 260.09,
    "cars": 2
  },
  "Mocha 31": {
    "label": "Mocha 31",
    "design": "Mocha",
    "width": 10.79,
    "length": 19.71,
    "minLotWidth": 14.29,
    "totalM2": 288.55,
    "cars": 2
  },
  "Mocha 35": {
    "label": "Mocha 35",
    "design": "Mocha",
    "width": 10.91,
    "length": 22.35,
    "minLotWidth": 14.41,
    "totalM2": 321.36,
    "cars": 2
  },
  "Onyx 17": {
    "label": "Onyx 17",
    "design": "Onyx",
    "width": 10.31,
    "length": 19.19,
    "minLotWidth": 11.41,
    "totalM2": 160.38,
    "cars": 2
  },
  "Onyx 19": {
    "label": "Onyx 19",
    "design": "Onyx",
    "width": 10.79,
    "length": 20.63,
    "minLotWidth": 11.89,
    "totalM2": 180.82,
    "cars": 2
  },
  "Onyx 21": {
    "label": "Onyx 21",
    "design": "Onyx",
    "width": 11.39,
    "length": 21.23,
    "minLotWidth": 12.49,
    "totalM2": 198.23,
    "cars": 2
  },
  "Onyx 24": {
    "label": "Onyx 24",
    "design": "Onyx",
    "width": 11.99,
    "length": 21.47,
    "minLotWidth": 13.09,
    "totalM2": 227.27,
    "cars": 2
  },
  "Orchid 23": {
    "label": "Orchid 23",
    "design": "Orchid",
    "width": 7.91,
    "length": 18.95,
    "minLotWidth": 9,
    "totalM2": 209.52,
    "cars": 1
  },
  "Orchid 25": {
    "label": "Orchid 25",
    "design": "Orchid",
    "width": 8.03,
    "length": 19.31,
    "minLotWidth": 10.45,
    "totalM2": 228.94,
    "cars": 1
  },
  "Orchid 29": {
    "label": "Orchid 29",
    "design": "Orchid",
    "width": 10.43,
    "length": 19.19,
    "minLotWidth": 12.85,
    "totalM2": 268.18,
    "cars": 2
  },
  "Orchid 34": {
    "label": "Orchid 34",
    "design": "Orchid",
    "width": 10.91,
    "length": 20.55,
    "minLotWidth": 13.33,
    "totalM2": 315.08,
    "cars": 2
  },
  "Quartz 21": {
    "label": "Quartz 21",
    "design": "Quartz",
    "width": 11.15,
    "length": 19.43,
    "minLotWidth": 12.99,
    "totalM2": 199.69,
    "cars": 2
  },
  "Quartz 23": {
    "label": "Quartz 23",
    "design": "Quartz",
    "width": 11.15,
    "length": 20.39,
    "minLotWidth": 12.99,
    "totalM2": 209.7,
    "cars": 2
  },
  "Quartz 25": {
    "label": "Quartz 25",
    "design": "Quartz",
    "width": 11.15,
    "length": 21.23,
    "minLotWidth": 12.99,
    "totalM2": 228.39,
    "cars": 2
  },
  "Quartz 27": {
    "label": "Quartz 27",
    "design": "Quartz",
    "width": 11.15,
    "length": 23.15,
    "minLotWidth": 12.99,
    "totalM2": 249.8,
    "cars": 2
  },
  "Robin 5": {
    "label": "Robin 5",
    "design": "Robin",
    "width": 10.19,
    "length": 13.94,
    "minLotWidth": 12.84,
    "totalM2": 148.71,
    "cars": 1
  },
  "Robin 6": {
    "label": "Robin 6",
    "design": "Robin",
    "width": 10.55,
    "length": 13.84,
    "minLotWidth": 11.87,
    "totalM2": 193.43,
    "cars": 2
  },
  "Robin 7": {
    "label": "Robin 7",
    "design": "Robin",
    "width": 10.55,
    "length": 13,
    "minLotWidth": 11.15,
    "totalM2": 177.73,
    "cars": 1
  },
  "Robin 8": {
    "label": "Robin 8",
    "design": "Robin",
    "width": 8.15,
    "length": 14.28,
    "minLotWidth": 10.27,
    "totalM2": 173.03,
    "cars": 1
  },
  "Rose 34": {
    "label": "Rose 34",
    "design": "Rose",
    "width": 15.11,
    "length": 17.53,
    "minLotWidth": 15.95,
    "totalM2": 318.59,
    "cars": 2
  },
  "Rose 38": {
    "label": "Rose 38",
    "design": "Rose",
    "width": 15.95,
    "length": 19.81,
    "minLotWidth": 17.39,
    "totalM2": 354.91,
    "cars": 2
  },
  "Rose 43": {
    "label": "Rose 43",
    "design": "Rose",
    "width": 16.43,
    "length": 19.81,
    "minLotWidth": 17.39,
    "totalM2": 401.51,
    "cars": 2
  },
  "Rose 53": {
    "label": "Rose 53",
    "design": "Rose",
    "width": 18.11,
    "length": 22.69,
    "minLotWidth": 20.27,
    "totalM2": 492.82,
    "cars": 3
  },
  "Rosewood 23": {
    "label": "Rosewood 23",
    "design": "Rosewood",
    "width": 10.1,
    "length": 16.99,
    "minLotWidth": 13.28,
    "totalM2": 212.95,
    "cars": 2
  },
  "Rosewood 31": {
    "label": "Rosewood 31",
    "design": "Rosewood",
    "width": 13.91,
    "length": 23.5,
    "minLotWidth": 15.71,
    "totalM2": 285.5,
    "cars": 2
  },
  "Ruby 19": {
    "label": "Ruby 19",
    "design": "Ruby",
    "width": 7.83,
    "length": 16.19,
    "minLotWidth": 8.51,
    "totalM2": 174.93,
    "cars": 1
  },
  "Ruby 21": {
    "label": "Ruby 21",
    "design": "Ruby",
    "width": 6.47,
    "length": 16.79,
    "minLotWidth": 8.31,
    "totalM2": 195.51,
    "cars": 1
  },
  "Ruby 23": {
    "label": "Ruby 23",
    "design": "Ruby",
    "width": 7.19,
    "length": 18.47,
    "minLotWidth": 9.03,
    "totalM2": 214.17,
    "cars": 1
  },
  "Ruby 26": {
    "label": "Ruby 26",
    "design": "Ruby",
    "width": 9.78,
    "length": 17.63,
    "minLotWidth": 12.2,
    "totalM2": 251.38,
    "cars": 2
  },
  "Ruby 28": {
    "label": "Ruby 28",
    "design": "Ruby",
    "width": 7.91,
    "length": 18.23,
    "minLotWidth": 9.75,
    "totalM2": 263.37,
    "cars": 1
  },
  "Saffron 23": {
    "label": "Saffron 23",
    "design": "Saffron",
    "width": 11.39,
    "length": 20.87,
    "minLotWidth": 13.23,
    "totalM2": 214.46,
    "cars": 2
  },
  "Saffron 26": {
    "label": "Saffron 26",
    "design": "Saffron",
    "width": 13.07,
    "length": 21.59,
    "minLotWidth": 14.91,
    "totalM2": 245.88,
    "cars": 2
  },
  "Saffron 30": {
    "label": "Saffron 30",
    "design": "Saffron",
    "width": 15.35,
    "length": 22.79,
    "minLotWidth": 17.19,
    "totalM2": 283.12,
    "cars": 2
  },
  "Saffron 35": {
    "label": "Saffron 35",
    "design": "Saffron",
    "width": 16.07,
    "length": 23.63,
    "minLotWidth": 17.91,
    "totalM2": 320.98,
    "cars": 2
  },
  "Sienna 28": {
    "label": "Sienna 28",
    "design": "Sienna",
    "width": 13.07,
    "length": 21.47,
    "minLotWidth": 14.91,
    "totalM2": 257.87,
    "cars": 2
  },
  "Sienna 30": {
    "label": "Sienna 30",
    "design": "Sienna",
    "width": 15.23,
    "length": 21.23,
    "minLotWidth": 17.07,
    "totalM2": 283.24,
    "cars": 2
  },
  "Sienna 33": {
    "label": "Sienna 33",
    "design": "Sienna",
    "width": 15.47,
    "length": 22.07,
    "minLotWidth": 17.31,
    "totalM2": 310.51,
    "cars": 2
  },
  "Sienna 36": {
    "label": "Sienna 36",
    "design": "Sienna",
    "width": 15.71,
    "length": 23.39,
    "minLotWidth": 17.55,
    "totalM2": 335.41,
    "cars": 2
  },
  "Tangerine 37": {
    "label": "Tangerine 37",
    "design": "Tangerine",
    "width": 11.39,
    "length": 20.5,
    "minLotWidth": 13.81,
    "totalM2": 346.67,
    "cars": 2
  },
  "Tangerine 41": {
    "label": "Tangerine 41",
    "design": "Tangerine",
    "width": 11.99,
    "length": 21.82,
    "minLotWidth": 14.41,
    "totalM2": 383.4,
    "cars": 2
  },
  "Tangerine 44": {
    "label": "Tangerine 44",
    "design": "Tangerine",
    "width": 12.59,
    "length": 22.8,
    "minLotWidth": 15.01,
    "totalM2": 411.72,
    "cars": 2
  },
  "Tangerine 49": {
    "label": "Tangerine 49",
    "design": "Tangerine",
    "width": 12.59,
    "length": 23.51,
    "minLotWidth": 15.59,
    "totalM2": 451.78,
    "cars": 2
  },
  "Terracotta 23": {
    "label": "Terracotta 23",
    "design": "Terracotta",
    "width": 7.79,
    "length": 15.71,
    "minLotWidth": 9.63,
    "totalM2": 211.58,
    "cars": 1
  },
  "Terracotta 25": {
    "label": "Terracotta 25",
    "design": "Terracotta",
    "width": 10.31,
    "length": 15.23,
    "minLotWidth": 11.44,
    "totalM2": 230.69,
    "cars": 2
  },
  "Terracotta 30": {
    "label": "Terracotta 30",
    "design": "Terracotta",
    "width": 10.55,
    "length": 18.83,
    "minLotWidth": 12.39,
    "totalM2": 282.01,
    "cars": 2
  },
  "Terracotta 36": {
    "label": "Terracotta 36",
    "design": "Terracotta",
    "width": 11.15,
    "length": 21.11,
    "minLotWidth": 12.99,
    "totalM2": 336.1,
    "cars": 2
  },
  "Tiffany 22": {
    "label": "Tiffany 22",
    "design": "Tiffany",
    "width": 14.51,
    "length": 16.35,
    "minLotWidth": 15.23,
    "totalM2": 203.97,
    "cars": 2
  },
  "Tiffany 24": {
    "label": "Tiffany 24",
    "design": "Tiffany",
    "width": 15.47,
    "length": 17.31,
    "minLotWidth": 15.9,
    "totalM2": 222.53,
    "cars": 2
  },
  "Tiffany 27": {
    "label": "Tiffany 27",
    "design": "Tiffany",
    "width": 15.47,
    "length": 35.61,
    "minLotWidth": 17.31,
    "totalM2": 252.45,
    "cars": 2
  },
  "Tiffany 29": {
    "label": "Tiffany 29",
    "design": "Tiffany",
    "width": 15.47,
    "length": 20.03,
    "minLotWidth": 17.31,
    "totalM2": 271.65,
    "cars": 2
  },
  "Topaz 21": {
    "label": "Topaz 21",
    "design": "Topaz",
    "width": 11.15,
    "length": 18.71,
    "minLotWidth": 12.99,
    "totalM2": 199.37,
    "cars": 2
  },
  "Topaz 23": {
    "label": "Topaz 23",
    "design": "Topaz",
    "width": 11.63,
    "length": 19.19,
    "minLotWidth": 13.47,
    "totalM2": 213.92,
    "cars": 2
  },
  "Topaz 26": {
    "label": "Topaz 26",
    "design": "Topaz",
    "width": 11.63,
    "length": 22.07,
    "minLotWidth": 13.47,
    "totalM2": 239.47,
    "cars": 2
  },
  "Topaz 29": {
    "label": "Topaz 29",
    "design": "Topaz",
    "width": 12.83,
    "length": 22.67,
    "minLotWidth": 14.67,
    "totalM2": 268.05,
    "cars": 2
  },
  "Turquoise 24": {
    "label": "Turquoise 24",
    "design": "Turquoise",
    "width": 8.39,
    "length": 17.5,
    "minLotWidth": 9.49,
    "totalM2": 222.13,
    "cars": 2
  },
  "Turquoise 25": {
    "label": "Turquoise 25",
    "design": "Turquoise",
    "width": 8.39,
    "length": 17.5,
    "minLotWidth": 9.49,
    "totalM2": 235.31,
    "cars": 2
  },
  "Turquoise 26": {
    "label": "Turquoise 26",
    "design": "Turquoise",
    "width": 8.15,
    "length": 18.82,
    "minLotWidth": 10.57,
    "totalM2": 244.98,
    "cars": 2
  },
  "Turquoise 28": {
    "label": "Turquoise 28",
    "design": "Turquoise",
    "width": 8.15,
    "length": 20.5,
    "minLotWidth": 10.57,
    "totalM2": 263.24,
    "cars": 2
  },
  "Turquoise 31": {
    "label": "Turquoise 31",
    "design": "Turquoise",
    "width": 8.15,
    "length": 23.98,
    "minLotWidth": 10.57,
    "totalM2": 290.14,
    "cars": 2
  },
  "Violet 33": {
    "label": "Violet 33",
    "design": "Violet",
    "width": 10.79,
    "length": 20.53,
    "minLotWidth": 13.21,
    "totalM2": 309.3,
    "cars": 2
  },
  "Violet 40": {
    "label": "Violet 40",
    "design": "Violet",
    "width": 11.03,
    "length": 21.13,
    "minLotWidth": 14.03,
    "totalM2": 372.44,
    "cars": 2
  },
  "Violet 45": {
    "label": "Violet 45",
    "design": "Violet",
    "width": 11.99,
    "length": 22.09,
    "minLotWidth": 14.99,
    "totalM2": 415.04,
    "cars": 2
  },
  "Violet 48": {
    "label": "Violet 48",
    "design": "Violet",
    "width": 11.99,
    "length": 22.33,
    "minLotWidth": 14.99,
    "totalM2": 442.11,
    "cars": 2
  },
  "Violet 64": {
    "label": "Violet 64",
    "design": "Violet",
    "width": 15.84,
    "length": 24.14,
    "minLotWidth": 18.26,
    "totalM2": 586.61,
    "cars": 3
  },
  "Viridian 28": {
    "label": "Viridian 28",
    "design": "Viridian",
    "width": 10.67,
    "length": 18.82,
    "minLotWidth": 12.61,
    "totalM2": 264.05,
    "cars": 2
  },
  "Viridian 32": {
    "label": "Viridian 32",
    "design": "Viridian",
    "width": 11.15,
    "length": 22.5,
    "minLotWidth": 13.5,
    "totalM2": 310.96,
    "cars": 2
  },
  "Viridian 39": {
    "label": "Viridian 39",
    "design": "Viridian",
    "width": 13.07,
    "length": 20.86,
    "minLotWidth": 14.91,
    "totalM2": 360.85,
    "cars": 2
  },
  "Viridian 43": {
    "label": "Viridian 43",
    "design": "Viridian",
    "width": 12.59,
    "length": 22.9,
    "minLotWidth": 14.43,
    "totalM2": 400,
    "cars": 2
  },
  "Wisteria 22": {
    "label": "Wisteria 22",
    "design": "Wisteria",
    "width": 12.83,
    "length": 17.75,
    "minLotWidth": 14.67,
    "totalM2": 201.45,
    "cars": 2
  },
  "Wisteria 24 Mk II": {
    "label": "Wisteria 24 Mk II",
    "design": "Wisteria",
    "width": 13.08,
    "length": 19.19,
    "minLotWidth": 14.92,
    "totalM2": 226.25,
    "cars": 2
  },
  "Wisteria 26": {
    "label": "Wisteria 26",
    "design": "Wisteria",
    "width": 12.81,
    "length": 21.35,
    "minLotWidth": 14.65,
    "totalM2": 240.79,
    "cars": 2
  },
  "Wisteria 29": {
    "label": "Wisteria 29",
    "design": "Wisteria",
    "width": 12.82,
    "length": 22.8,
    "minLotWidth": 14.66,
    "totalM2": 267.82,
    "cars": 2
  }
};

/**
 * Normalizes design or floorplan label to look up exact dimensions.
 * Accepts full label (e.g. "Hazel 14", "Hazel 14 Classic") or design name ("Hazel").
 */
export function getHudsonDimensions(designOrLabel: string): HudsonDimensionRecord | null {
  if (!designOrLabel) return null;
  const trimmed = designOrLabel.trim();
  
  // 1. Direct label match
  if (HUDSON_DIMENSIONS_REGISTRY[trimmed]) {
    return HUDSON_DIMENSIONS_REGISTRY[trimmed];
  }

  // 2. Case-insensitive exact match
  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(HUDSON_DIMENSIONS_REGISTRY)) {
    if (key.toLowerCase() === lower) {
      return val;
    }
  }

  // 3. Normalized alphanumeric match
  const norm = lower.replace(/[^a-z0-9]/g, "");
  for (const [key, val] of Object.entries(HUDSON_DIMENSIONS_REGISTRY)) {
    const keyNorm = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (keyNorm === norm || norm.startsWith(keyNorm) || keyNorm.startsWith(norm)) {
      return val;
    }
  }

  // 4. Design name prefix match (e.g. "Hazel" matches "Hazel 14")
  for (const [key, val] of Object.entries(HUDSON_DIMENSIONS_REGISTRY)) {
    if (val.design.toLowerCase() === lower || lower.includes(key.toLowerCase())) {
      return val;
    }
  }

  return null;
}
