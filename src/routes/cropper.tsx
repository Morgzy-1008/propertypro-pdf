import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { HUDSON_FLOORPLANS, FloorplanRecord } from "@/components/flyer/floorplans.data";
import { Button } from "@/components/ui/button";


export const Route = createFileRoute("/cropper")({
  beforeLoad: ({ context }) => {
    // Only allow Morgan
    const user = (context as any).user;
    if (!user || user.email !== "morgan.hales@hudsonhomes.com.au") {
      throw redirect({ to: "/" });
    }
  },
  component: CropperPage,
});

function CropperPage() {
  const [selectedPlan, setSelectedPlan] = useState<FloorplanRecord | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(2.0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Crop state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [crops, setCrops] = useState<{page: number, x: number, y: number, w: number, h: number}[]>([]);
  
  const [jsonOutput, setJsonOutput] = useState("");

  const loadPdf = async (plan: FloorplanRecord) => {
    setSelectedPlan(plan);
    setPdfDoc(null);
    setCrops(plan.cropBoxes || []);
    setJsonOutput("");
    
    let pdfUrl = plan.pdfUrl;
    if (!pdfUrl) {
      pdfUrl = `/floorplans_pdf/${plan.label.toUpperCase()}.pdf`;
    }
    
    try {
      console.log('Fetching PDF:', pdfUrl);
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error("Failed to fetch PDF");
      const buffer = await res.arrayBuffer();
      const data = new Uint8Array(buffer);
      
      const pdfjs = await import("pdfjs-dist");
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      
      const doc = await pdfjs.getDocument({ data }).promise;
      console.log('PDF loaded!', doc.numPages);
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setCurrentPage(1);
      renderPage(doc, 1);
    } catch (err) {
      alert("Could not load PDF for this floorplan. " + pdfUrl);
    }
  };

  const renderPage = async (doc: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext("2d");
    if (!context) return;
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({ canvasContext: context, viewport }).promise;
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage);
    }
  }, [currentPage, scale]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setStartX(e.clientX - rect.left);
    setStartY(e.clientY - rect.top);
    setCurrentX(e.clientX - rect.left);
    setCurrentY(e.clientY - rect.top);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCurrentX(e.clientX - rect.left);
    setCurrentY(e.clientY - rect.top);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Convert to normalized coordinates 0-1
    const x = Math.min(startX, currentX) / rect.width;
    const y = Math.min(startY, currentY) / rect.height;
    const w = Math.abs(currentX - startX) / rect.width;
    const h = Math.abs(currentY - startY) / rect.height;
    
    if (w > 0.01 && h > 0.01) {
      setCrops([...crops, { page: currentPage, x, y, w, h }]);
    }
  };

  const generateJson = () => {
    if (!selectedPlan) return;
    const updatedPlan = {
      ...selectedPlan,
      cropBoxes: crops
    };
    setJsonOutput(JSON.stringify(updatedPlan, null, 2) + ",");
  };

  return (
    <div className="flex h-screen w-full bg-gray-100">
      <div className="w-1/4 bg-white border-r overflow-y-auto p-4 flex flex-col gap-2">
        <h2 className="text-lg font-bold mb-4">Floorplans ({HUDSON_FLOORPLANS.length})</h2>
        {HUDSON_FLOORPLANS.map((plan) => (
          <Button 
            key={plan.label} 
            variant={selectedPlan?.label === plan.label ? "default" : "outline"}
            className="justify-start text-xs"
            onClick={() => loadPdf(plan)}
          >
            {plan.label} {plan.cropBoxes ? "✅" : ""}
          </Button>
        ))}
      </div>
      
      <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
        <div className="flex justify-between items-center bg-white p-2 border rounded mb-2 z-10 shadow-sm">
          <div className="flex gap-2 items-center">
            <Button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>Prev Page</Button>
            <span>Page {currentPage} of {numPages}</span>
            <Button disabled={currentPage >= numPages} onClick={() => setCurrentPage(p => p + 1)}>Next Page</Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => setCrops([])}>Clear Crops</Button>
            <Button variant="default" onClick={generateJson}>Generate JSON</Button>
          </div>
        </div>
        
        {jsonOutput && (
          <div className="bg-black text-green-400 p-4 rounded mb-2 overflow-auto max-h-40 font-mono text-xs shadow-lg">
            <pre>{jsonOutput}</pre>
          </div>
        )}
        
        <div className="flex-1 overflow-auto bg-gray-300 rounded border relative" style={{ cursor: "crosshair" }}>
          {pdfDoc && (
            <div className="relative inline-block m-4 shadow-xl">
              <canvas 
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="bg-white"
              />
              
              {/* Draw existing crops for this page */}
              {crops.filter(c => c.page === currentPage).map((crop, i) => (
                <div 
                  key={i}
                  className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none"
                  style={{
                    left: `${crop.x * 100}%`,
                    top: `${crop.y * 100}%`,
                    width: `${crop.w * 100}%`,
                    height: `${crop.h * 100}%`,
                  }}
                >
                  <span className="bg-red-500 text-white text-xs px-1 absolute -top-5 left-0">Crop {i+1}</span>
                </div>
              ))}
              
              {/* Draw current drag */}
              {isDragging && (
                <div 
                  className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
                  style={{
                    left: `${Math.min(startX, currentX)}px`,
                    top: `${Math.min(startY, currentY)}px`,
                    width: `${Math.abs(currentX - startX)}px`,
                    height: `${Math.abs(currentY - startY)}px`,
                  }}
                />
              )}
            </div>
          )}
          {!pdfDoc && (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              Select a floorplan to load its PDF
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
