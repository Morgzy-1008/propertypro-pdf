# Hudson Homes Package Studio Agent Guidelines

This repository hosts the Hudson Homes House & Land Package Studio and Flyer Builder.

## Production Domain
- **Live URL**: https://www.hudsonhomeshouselandflyer.dev/flyer

## Architecture & Code Standards
- Framework: Vite + React + TanStack Start.
- Styling: TailwindCSS v4 with Hudson Homes brand tokens.
- Permanent Lifetime Caching: Native IndexedDB store (`PropertyProFacadeCacheDB`) for instant 0ms reload of outpainted facades across browser restarts.
- AI Outpainting: Google Gemini API integration for generating widescreen 2.69:1 facade renders with preserved architectural details.
