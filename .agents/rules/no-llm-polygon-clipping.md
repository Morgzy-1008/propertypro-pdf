---
description: Rule against using LLM vision models for tight polygon clipping
---

# Do not use LLMs for tight polygon clipping

When isolating foreground objects (like a house, person, or product) from a background for compositing, **DO NOT** rely on Vision LLMs (like Gemini or GPT-4o) to return exact `[x,y]` coordinates for a tight polygon mask. 

**Why?**
LLMs do not provide pixel-perfect spatial precision for complex shapes. The resulting polygons are often jagged, inaccurate, and cut off critical parts of the object (e.g., "dismantling" a house by chopping off gutters or rooflines). 

**What to do instead:**
1. Use a dedicated background removal model (like `@imgly/background-removal`, `rembg`, or Segment Anything).
2. Or use bounding boxes for scaling/positioning only, not for masking.
3. Or rely on inpainting/outpainting models to generate the whole image natively without attempting hard compositing cutouts.
