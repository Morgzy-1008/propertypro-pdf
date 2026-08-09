# AI Outpainting & Scale Preservation

When performing AI outpainting on facades (or any subject requiring strict mathematical scaling), you MUST adhere to the following workflow:

1. **Do not rely on the AI for strict pixel scale.** AI generation will always introduce slight scale or positional shifts, even when heavily prompted to preserve the size exactly.
2. **Always Composite.** To guarantee exact mathematical constraints (e.g., 5mm top gap, 10mm bottom gap), you must paste the original image back over the final AI-generated background using a `canvas`.
3. **Prevent Seams with Prompting + Feathering.** To ensure the composite doesn't look like two different images stitched together:
   - The AI prompt must explicitly demand that the generated background matches the original image's sky, grass, and lighting perfectly.
   - The canvas composite must use a feathered alpha mask (e.g., by blurring a black rectangle and using `source-in` composite mode) so the edges of the original background smoothly blend into the AI background.
