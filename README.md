# Hudson Homes Flyer Studio

**Live Production App**: [https://www.hudsonhomeshouselandflyer.dev/flyer](https://www.hudsonhomeshouselandflyer.dev/flyer)

High-performance, custom web application built for Hudson Homes to generate print-ready A4 House & Land Package PDF flyers.

## Layout & Features

- **Sidebar Controls**: Dynamic inputs for Suburb/Estate, House Model Name, Package Price, Land Size ($m^2$), Bed/Bath/Car counts, and facade library selection.
- **Live Preview Panel**: Pixel-perfect A4-proportioned flyer preview ($210\text{mm} \times 297\text{mm}$) using Hudson Homes brand colors (warm gold accents, deep navy, clean off-white backgrounds).
- **Template Switcher**: Toggles between 1-Page Express Flyer, 2-Page Showcase Booklet, and House Only layouts.
- **Widescreen AI Facade Outpainting**: Generates widescreen 2.69:1 architectural hero renders with extended landscaping using Google Gemini AI, with instant permanent client-side caching.
- **Export Function**: One-click print-ready A4 PDF export.

## Development

```sh
# Clone & install dependencies
git clone https://github.com/Morgzy-1008/propertypro-pdf.git
cd propertypro-pdf
npm install

# Run local development server
npm run dev

# Build for production
npm run build
```
