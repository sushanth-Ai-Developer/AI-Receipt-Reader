
import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  Upload, ChevronRight, RotateCcw, FileDigit, Trash2, Loader2, 
  AlertCircle, CheckCircle, Download, Copy, LayoutGrid, Filter, 
  FileCheck, ChevronDown, ChevronUp, RefreshCw, ExternalLink, 
  Settings2, Package, ZoomIn, ZoomOut, Maximize2, X, Search, 
  User, Truck, FileText, Barcode, HelpCircle, Plus, Terminal,
  ClipboardCheck, ShoppingCart, Percent, RotateCw, Wand2, Image as ImageIcon,
  Wine, AlertTriangle, Info, Layers, FileSpreadsheet, Sparkles, Database,
  Eye, FileCode, Archive
} from 'lucide-react';
import { 
  AppStep, BatchState, InvoiceState, DocumentResult, LineItem 
} from './types';
import { extractStitchedInvoiceData, roundToRetailEnding } from './services/geminiService';
import { generateEDI810FromData } from './services/ediService';
import { generateCSVFromData } from './services/csvService';
import { repairEDIStream } from './services/ediRepairService';
import { generateRetailLabelPDF } from './services/pdfService';
import { validateCode } from './services/validationService';
import JsBarcode from 'jsbarcode';

// --- Sub-components ---

const BarcodePreview: React.FC<{ item: LineItem; currency?: string }> = ({ item, currency }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrRef = useRef<HTMLImageElement>(null);
  const { code_value: code, code_type: type, description, retail_ssp_msrp, unit_cost } = item;
  const price = unit_cost || retail_ssp_msrp || 0;
  const currencySymbol = currency === 'USD' || !currency ? '$' : currency;

  useEffect(() => {
    if (canvasRef.current && code) {
      try {
        const cleanCode = code.replace(/[^0-9]/g, '');
        let format = 'CODE128';
        
        if (type === 'UPC-A' && cleanCode.length === 12) {
          format = 'UPC';
        } else if (type === 'EAN-13' && cleanCode.length === 13) {
          format = 'EAN13';
        }

        const renderOptions = {
          format,
          displayValue: true,
          fontSize: 12,
          height: 40,
          width: 1.5,
          margin: 5,
          background: "#ffffff",
          lineColor: "#000000",
        };

        try {
          JsBarcode(canvasRef.current, cleanCode, renderOptions);
        } catch (innerErr) {
          JsBarcode(canvasRef.current, cleanCode, { ...renderOptions, format: 'CODE128' });
        }
      } catch (err) {
        console.error("Barcode render error", err);
      }
    }
  }, [code, type]);

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center space-y-2 w-full max-w-[180px]">
      <div className="text-[8px] font-black text-slate-900 uppercase truncate w-full text-center">{description}</div>
      <div className="text-sm font-black text-indigo-600">{currencySymbol}{price?.toFixed(2) || '0.00'}</div>
      <canvas ref={canvasRef} className="max-w-full h-auto" />
      {!code && <div className="text-[10px] text-slate-400 font-bold uppercase py-4">No Code</div>}
    </div>
  );
};

const ZoomableImage: React.FC<{ src: string; rotation: number; onClose: () => void }> = ({ src, rotation, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 1));
  const handleReset = () => { setZoom(1); setPosition({ x: 0, y: 0 }); };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) { 
      setIsDragging(true); 
      setDragStart({ x: e.clientX - position.x, y: e.clientY - dragStart.y }); 
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <button onClick={handleZoomOut} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><ZoomOut className="w-5 h-5" /></button>
          <span className="text-[10px] font-black text-slate-500 w-12 text-center uppercase tracking-widest">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><ZoomIn className="w-5 h-5" /></button>
          <button onClick={handleReset} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><Maximize2 className="w-5 h-5" /></button>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <div className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`, transformOrigin: 'center' }}>
          <img src={src} alt="Invoice" className="max-w-full max-h-full object-contain pointer-events-none shadow-2xl" style={{ transform: `rotate(${rotation}deg)` }} />
        </div>
      </div>
      <div className="p-4 bg-slate-800/50 text-center"><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Hold & Drag to Pan when zoomed</p></div>
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('UPLOAD');
  const [batch, setBatch] = useState<BatchState>({
    name: 'Batch_' + new Date().toISOString().slice(0, 10),
    invoices: []
  });
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [previewingDocId, setPreviewingDocId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const startOver = () => {
    batch.invoices.forEach(inv => { inv.previewUrls.forEach(url => URL.revokeObjectURL(url)); if (inv.pdfBlobUrl) URL.revokeObjectURL(inv.pdfBlobUrl); });
    setBatch({ name: 'Batch_' + new Date().toISOString().slice(0, 10), invoices: [] });
    setStep('UPLOAD');
    setPreviewingDocId(null);
  };

  const downloadBatchZip = async () => {
    if (batch.invoices.length === 0) return;
    
    const zip = new JSZip();
    const batchFolder = zip.folder(`audit_batch_${batch.name}`);
    
    for (const inv of batch.invoices) {
      if (!inv.data) continue;
      const result = inv.data;
      const docFolder = batchFolder?.folder(`invoice_${result.invoice_identity.invoice_number || inv.id}`);
      
      // 1. JSON Data
      docFolder?.file('data.json', JSON.stringify(result, null, 2));
      
      // 2. CSV Data
      const csvContent = [
        ['Line No', 'UPC', 'SKU', 'Description', 'Qty', 'UOM', 'Unit Cost', 'Extended Amount'].join(','),
        ...result.line_items.map(item => [
          item.line_no,
          `"${item.upc}"`,
          `"${item.item_id_or_sku}"`,
          `"${item.description.replace(/"/g, '""')}"`,
          item.qty_purchased,
          item.uom_purchased,
          item.unit_cost,
          item.extended_amount
        ].join(','))
      ].join('\n');
      docFolder?.file('items.csv', csvContent);
      
      // 3. EDI 810
      if (result.edi_810?.edi_string) {
        docFolder?.file('edi_810.edi', result.edi_810.edi_string);
      }
      
      // 4. Logistics Labels (PDF)
      if (inv.pdfBlobUrl) {
        try {
          const response = await fetch(inv.pdfBlobUrl);
          const blob = await response.blob();
          docFolder?.file('logistics_labels.pdf', blob);
        } catch (err) {
          console.error('Failed to add PDF to zip:', err);
        }
      }
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${batch.name}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    
    // Enforce 5 image limit
    const currentCount = batch.invoices.length;
    const remaining = 5 - currentCount;
    
    if (remaining <= 0) {
      alert("You have reached the limit of 5 images per batch.");
      return;
    }

    const filesToAdd = files.slice(0, remaining);
    if (files.length > remaining) {
      alert(`Only the first ${remaining} images were added to stay within the 5-image limit.`);
    }

    const newInvoices: InvoiceState[] = filesToAdd.map(file => ({
      id: Math.random().toString(36).substring(7),
      files: [file], previewUrls: [URL.createObjectURL(file)], status: 'QUEUED', progress: 0,
      currentTask: 'Ready', sellerName: 'Queued file', data: null, pdfBlobUrl: null, retryCount: 0, extractionMethod: 'GEMINI'
    }));
    setBatch(prev => ({ ...prev, invoices: [...prev.invoices, ...newInvoices] }));
  };

  const processBatch = async () => {
    setStep('PROCESSING');
    setProcessingStatus('Performing Senior-Level Stitching Analysis...');
    
    const allFiles = batch.invoices.flatMap(inv => inv.files);
    const allPreviewUrls = batch.invoices.flatMap(inv => inv.previewUrls);
    
    try {
      const results = await extractStitchedInvoiceData(allFiles);
      
      if (!results || results.length === 0) {
        throw new Error("The auditor could not find any recognizable invoices in these photos.");
      }

      const newInvoiceStates: InvoiceState[] = await Promise.all(results.map(async (data) => {
        setProcessingStatus(`Generating EDI and Logistics for ${data.invoice_identity.vendor_name}...`);
        
        const pdf = await generateRetailLabelPDF(data);
        const pdfUrl = pdf ? URL.createObjectURL(pdf) : null;

        return {
          id: data.doc_id,
          files: allFiles,
          previewUrls: allPreviewUrls,
          status: data.quality.status === 'ok' ? 'DONE' : 'NEEDS_REVIEW',
          progress: 100,
          currentTask: 'Complete',
          sellerName: data.invoice_identity.vendor_name || 'Unknown',
          data,
          pdfBlobUrl: pdfUrl,
          retryCount: 0,
          extractionMethod: 'GEMINI'
        };
      }));

      setBatch(prev => ({ ...prev, invoices: newInvoiceStates }));
      setStep('RESULTS');
      if (newInvoiceStates.length > 0) setExpandedDoc(newInvoiceStates[0].id);
      
    } catch (err) {
      console.error("Batch processing failed", err);
      setStep('UPLOAD');
      alert(err instanceof Error ? err.message : "Analysis failed unexpectedly.");
    }
  };

  const handleEdit = (invId: string, idx: number, field: keyof LineItem, val: any) => {
    setBatch(prev => {
      const inv = prev.invoices.find(i => i.id === invId);
      if (!inv || !inv.data) return prev;
      const newItems = [...inv.data.line_items];
      const it = { ...newItems[idx], [field]: val };
      newItems[idx] = it;
      const newData = { ...inv.data, line_items: newItems };
      return { ...prev, invoices: prev.invoices.map(i => i.id === invId ? { ...i, data: newData } : i) };
    });
  };

  const syncChanges = async (invId: string) => {
    const inv = batch.invoices.find(i => i.id === invId);
    if (!inv || !inv.data) return;
    const newPdf = await generateRetailLabelPDF(inv.data);
    updateInv(invId, { pdfBlobUrl: newPdf ? URL.createObjectURL(newPdf) : null });
  };

  const updateInv = (id: string, updates: Partial<InvoiceState>) => {
    setBatch(prev => ({ ...prev, invoices: prev.invoices.map(i => i.id === id ? { ...i, ...updates } : i) }));
  };

  const currentActiveInv = batch.invoices.find(i => i.id === expandedDoc);

  if (step === 'UPLOAD') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <header className="text-center mb-12">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center">
              <Database className="w-10 h-10 mr-4 text-indigo-600" />
              Auditor Hub
            </h1>
            <p className="text-slate-500 font-medium mt-2 tracking-wide uppercase text-xs">Multi-Photo Document Analysis</p>
          </header>
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 p-12 overflow-hidden relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="relative group border-2 border-dashed border-slate-300 rounded-[32px] p-12 text-center hover:bg-indigo-50 transition-all cursor-pointer">
                  <input type="file" multiple accept="image/*" onChange={handleFiles} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <Upload className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
                  <p className="font-black text-slate-900">Drop Photos to Stitch</p>
                  <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest leading-relaxed">Combine up to 5 images. Each image can be a separate receipt or a page of one.</p>
                </div>
              </div>
              <div className="flex flex-col h-[300px]">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Input Buffer ({batch.invoices.length})</h3>
                <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-thin">
                  {batch.invoices.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[32px] text-slate-200">
                      <ImageIcon className="w-10 h-10 mb-2 opacity-10" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Awaiting documents</span>
                    </div>
                  ) : batch.invoices.map(inv => (
                    <div key={inv.id} className="flex items-center p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <img src={inv.previewUrls[0]} className="w-10 h-10 rounded-lg object-cover mr-4" />
                      <span className="text-xs font-bold text-slate-600 truncate flex-1">{inv.files[0].name}</span>
                      <button onClick={() => setBatch(p => ({...p, invoices: p.invoices.filter(i => i.id !== inv.id)}))} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                {batch.invoices.length > 0 && (
                  <button onClick={processBatch} className="mt-6 w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center group active:scale-95 transition-all">
                    Process Batch
                    <Layers className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'PROCESSING') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full bg-white rounded-[40px] shadow-2xl p-16 text-center border border-slate-200">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-8" />
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Audit In Progress</h2>
          <p className="text-slate-400 text-sm mb-12 uppercase font-bold tracking-widest">{processingStatus}</p>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full max-w-xs mx-auto">
            <div className="h-full bg-indigo-600 animate-pulse w-full" />
          </div>
          <p className="mt-8 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Cross-referencing photos and calculating unit costs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-80 bg-white border-r border-slate-200 h-screen sticky top-0 p-8 flex flex-col shadow-lg z-10">
        <div className="flex items-center space-x-4 mb-12">
          <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-xl"><Database className="w-6 h-6" /></div>
          <span className="font-black text-xl text-slate-900 tracking-tight leading-none">Senior Auditor</span>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-thin">
           {batch.invoices.map(inv => (
             <button key={inv.id} onClick={() => setExpandedDoc(inv.id)} className={`w-full p-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] text-left transition-all group ${expandedDoc === inv.id ? 'bg-slate-900 text-white shadow-2xl scale-105 z-10' : 'text-slate-500 hover:bg-slate-50'}`}>
               <div className="truncate flex items-center">
                 {inv.status === 'DONE' ? <CheckCircle className="w-3 h-3 mr-2 text-emerald-400" /> : <AlertCircle className="w-3 h-3 mr-2 text-amber-400" />}
                 {inv.sellerName}
               </div>
               <div className="text-[8px] opacity-60 mt-2 font-mono flex items-center justify-between">
                 <span>ID: {inv.data?.invoice_identity.invoice_number || inv.id.toUpperCase()}</span>
                 <span className="bg-slate-100 group-hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md uppercase text-[7px]">STITCHED</span>
               </div>
             </button>
           ))}
        </div>
        <div className="mt-8 space-y-3">
          {batch.invoices.some(inv => inv.status === 'DONE' || inv.status === 'NEEDS_REVIEW') && (
            <button 
              onClick={downloadBatchZip} 
              className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl flex items-center justify-center active:scale-95 transition-all hover:bg-emerald-700"
            >
              <Archive className="w-4 h-4 mr-3" />
              Download ZIP
            </button>
          )}
          <button onClick={startOver} className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl flex items-center justify-center active:scale-95 transition-all">
            <RotateCcw className="w-4 h-4 mr-3" />
            New Audit
          </button>
        </div>
      </aside>

      <main className="flex-1 p-16 max-w-7xl mx-auto h-screen overflow-y-auto">
        {currentActiveInv ? (
          <DocResultView 
            inv={currentActiveInv} 
            isPreviewing={previewingDocId === expandedDoc}
            onTogglePreview={() => setPreviewingDocId(p => p ? null : expandedDoc)}
            onEdit={handleEdit}
            onSync={syncChanges}
            onUpdateEDI={(newEdi: string) => updateInv(currentActiveInv.id, { data: { ...currentActiveInv.data!, edi_810: { ...currentActiveInv.data!.edi_810, edi_string: newEdi } } })}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
            <LayoutGrid className="w-24 h-24 mb-6 opacity-10" />
            <p className="font-black uppercase tracking-widest text-sm text-slate-400">Select results to review</p>
          </div>
        )}
      </main>
    </div>
  );
};

const DocResultView: React.FC<{ 
  inv: InvoiceState; isPreviewing: boolean; onTogglePreview: () => void; onEdit: any; onSync: any; onUpdateEDI: (edi: string) => void;
}> = ({ inv, isPreviewing, onTogglePreview, onEdit, onSync, onUpdateEDI }) => {
  const [tab, setTab] = useState<'SUMMARY' | 'GRID' | 'EDI' | 'AUDIT' | 'TAGS'>('SUMMARY');
  const [isRefining, setIsRefining] = useState(false);
  
  if (!inv.data) return null;

  const confidence = inv.data.invoice_identity.confidence_score_0_to_100;

  const downloadCSV = () => {
    if (!inv.data) return;
    const csvString = inv.data.sections_raw.csv || generateCSVFromData(inv.data);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Invoice_${inv.data.invoice_identity.invoice_number || inv.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefineEDI = async () => {
    if (!inv.data?.edi_810?.edi_string) return;
    setIsRefining(true);
    try {
      const refined = await repairEDIStream(inv.data.edi_810.edi_string);
      onUpdateEDI(refined);
    } catch (err) {
      alert("Failed to refine EDI. Check console for details.");
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center space-x-6">
          <div onClick={onTogglePreview} className="relative cursor-pointer group shadow-xl rounded-[24px]">
            <img src={inv.previewUrls[0]} className="w-20 h-20 rounded-[24px] object-cover border-2 border-white group-hover:opacity-75 transition-all" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Search className="text-white w-6 h-6" /></div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">{inv.data.invoice_identity.invoice_number || 'STITCHED'}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
              <User className="w-3 h-3 mr-2 text-indigo-500" />
              {inv.data.invoice_identity.vendor_name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-6">
           <StatusBadge status={inv.data.quality?.status} />
           <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase mb-1 text-xs">Total Net</p>
             <p className="text-2xl font-black text-slate-900">
               ${inv.data.header_fields.totals.total_cost.toFixed(2)}
             </p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
        <div className="flex bg-slate-50 border-b border-slate-100 px-8 scrollbar-none overflow-x-auto whitespace-nowrap">
          <TabBtn label="Summary" active={tab === 'SUMMARY'} onClick={() => setTab('SUMMARY')} />
          <TabBtn label="List of items" active={tab === 'GRID'} onClick={() => setTab('GRID')} />
          <TabBtn label="EDI 810" active={tab === 'EDI'} onClick={() => setTab('EDI')} />
          <TabBtn label="Logistics Tags" active={tab === 'TAGS'} onClick={() => setTab('TAGS')} />
        </div>

        <div className="p-10 flex-1 overflow-x-auto">
          {tab === 'SUMMARY' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 h-full animate-in fade-in duration-300">
              <div className="space-y-8">
                <SectionHeader icon={<User />} label="Document Profile" />
                <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 space-y-4 shadow-inner">
                  <SummaryRow label="Vendor" value={inv.data.invoice_identity.vendor_name} />
                  <SummaryRow label="Buyer" value={inv.data.invoice_identity.buyer_name} />
                  <SummaryRow label="Date" value={inv.data.invoice_identity.invoice_date} />
                  <SummaryRow label="Confidence" value={confidence + '%'} />
                  <SummaryRow label="Input Files" value={inv.data.invoice_identity.source_images_count + ' photos'} />
                </div>
                
                <SectionHeader icon={<Package />} label="Financial Metrics" />
                <div className="grid grid-cols-2 gap-4">
                  <StatCard label="Subtotal" value={'$' + (inv.data.header_fields.totals.subtotal || 0).toFixed(2)} />
                  <StatCard label="Total Cost" value={'$' + inv.data.header_fields.totals.total_cost.toFixed(2)} />
                  <StatCard label="Line Items" value={inv.data.line_items.length} />
                  <StatCard label="Tax/Disc" value={'$' + ((inv.data.header_fields.totals.tax || 0) + (inv.data.header_fields.totals.discounts || 0)).toFixed(2)} />
                </div>
              </div>

              <div className="bg-indigo-50/20 p-10 rounded-[40px] border border-indigo-100">
                <SectionHeader icon={<Search className="text-indigo-400" />} label="Analysis Insights" />
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 scrollbar-thin">
                  {inv.data.quality?.issues?.length > 0 ? (
                    inv.data.quality.issues.map((iss: string, i: number) => (
                      <div key={i} className="flex items-center space-x-3 text-amber-700 bg-white p-5 rounded-2xl border border-amber-200 text-[10px] font-black uppercase tracking-widest shadow-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{iss}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 bg-white rounded-3xl border border-indigo-100 flex items-center space-x-4">
                      <CheckCircle className="text-emerald-500 w-8 h-8" />
                      <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">Audited: All fields stitched with high confidence.</p>
                    </div>
                  )}

                  {inv.data.header_fields.extra_fields.length > 0 && (
                    <div className="mt-8">
                       <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Detailed Captures</h5>
                       {inv.data.header_fields.extra_fields.map((field, idx) => (
                         <div key={idx} className="mb-4 bg-white/60 p-4 rounded-2xl border border-slate-200">
                           <p className="text-[10px] font-black text-slate-900">{field.label_original}: {field.value_original}</p>
                           <p className="text-[9px] text-slate-500 mt-1 italic">{field.likely_meaning}</p>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'GRID' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center">
                    <ShoppingCart className="w-4 h-4 mr-3 text-indigo-500" />
                    List of items
                  </h4>
                  <div className="flex space-x-2">
                    <button onClick={downloadCSV} className="px-6 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-indigo-100 active:scale-95 transition-all"><FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> Download CSV</button>
                    <button onClick={() => onSync(inv.id)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center hover:bg-indigo-700 active:scale-95 transition-all"><RefreshCw className="w-3.5 h-3.5 mr-2" /> Re-Audit</button>
                  </div>
              </div>
              <div className="border border-slate-200 rounded-[32px] overflow-hidden shadow-inner bg-slate-50/50">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] font-black min-w-[1200px]">
                    <thead className="bg-white border-b border-slate-200 text-slate-600 uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-6 w-12 text-center">#</th>
                        <th className="px-6 py-6 w-64">Description & Packaging</th>
                        <th className="px-4 py-6 w-32 text-center">Qty/UOM</th>
                        <th className="px-4 py-6 w-32 text-center">Pack/Structure</th>
                        <th className="px-4 py-6 w-32 text-center">Unit Cost</th>
                        <th className="px-6 py-6 w-64">UPC/GTIN Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {inv.data.line_items.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-5 text-center text-slate-400 font-mono">{item.line_no}</td>
                          <td className="px-6 py-5">
                            <div className="font-black text-slate-900 text-sm truncate uppercase mb-1">{item.description}</div>
                            <div className="flex items-center space-x-2">
                               <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">{item.packaging_level || 'EACH'}</span>
                               {item.container_size_value && <span className="text-[8px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded uppercase">{item.container_size_value}</span>}
                            </div>
                            {item.packaging_interpretation_note && (
                              <div className="text-[8px] text-slate-400 mt-2 italic flex items-center group-hover:text-indigo-400 transition-colors">
                                <Info className="w-2.5 h-2.5 mr-1" /> {item.packaging_interpretation_note}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-5 text-center">
                            <div className="font-black text-slate-900">{item.qty_purchased}</div>
                            <div className="text-[9px] text-slate-400 uppercase">{item.uom_purchased}</div>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <div className="font-black text-slate-900">{item.pack_structure_raw || '-'}</div>
                            <div className="text-[9px] text-slate-400 uppercase">Units: {item.units_per_case || '1'}</div>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <div className="font-black text-slate-900">${(item.unit_cost || 0).toFixed(2)}</div>
                            <div className="text-[9px] text-slate-400 uppercase">Ext: ${(item.extended_amount || 0).toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center space-x-3">
                               <span className="font-mono font-black text-sm text-slate-900">{item.upc || item.item_id_or_sku}</span>
                               {item.code_status === 'VALID' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
                            </div>
                            <div className="text-[8px] text-slate-400 uppercase mt-1">{item.code_type}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'EDI' && (
             <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-300">
               <div className="flex items-center justify-between">
                 <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center">
                   <ClipboardCheck className="w-4 h-4 mr-3 text-emerald-500" />
                   X12 810 Transmission Stream
                 </h4>
                 <div className="flex space-x-2">
                   <button onClick={downloadCSV} className="flex items-center px-6 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-indigo-100 transition-all"><FileSpreadsheet className="w-4 h-4 mr-2" /> Download CSV</button>
                   <button 
                     onClick={handleRefineEDI} 
                     disabled={isRefining}
                     className="flex items-center px-6 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-indigo-100 disabled:opacity-50"
                   >
                     {isRefining ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} 
                     Repair AI
                   </button>
                   <button onClick={() => navigator.clipboard.writeText(inv.data?.edi_810?.edi_string || '')} className="flex items-center px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 border border-slate-200 transition-all"><Copy className="w-4 h-4 mr-2" /> Copy Raw</button>
                   <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(inv.data?.edi_810?.edi_string || '')}`} download={`EDI_${inv.id}.edi`} className="flex items-center px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl"><Download className="w-4 h-4 mr-2" /> Download .edi</a>
                 </div>
               </div>
               <div className="flex-1 bg-slate-950 rounded-[40px] p-12 font-mono text-[12px] text-emerald-400 border border-slate-800 shadow-2xl overflow-auto leading-relaxed">
                  {inv.data.edi_810?.edi_string ? inv.data.edi_810.edi_string.split('~').map((seg: string, i: number) => {
                    if (!seg.trim()) return null;
                    return (
                      <div key={i} className="mb-2 group flex hover:bg-emerald-900/10 px-4 py-1 rounded transition-colors">
                        <span className="text-emerald-900 mr-6 select-none font-bold opacity-30">{(i+1).toString().padStart(3, '0')}</span>
                        <span className="flex-1">{seg}<span className="text-emerald-800 opacity-50">~</span></span>
                      </div>
                    );
                  }) : <div className="text-slate-600 italic">EDI stream unavailable. Click Re-Audit to generate.</div>}
               </div>
             </div>
          )}

          {tab === 'TAGS' && (
            <div className="h-full flex flex-col space-y-12 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center">
                  <Barcode className="w-5 h-5 mr-3 text-indigo-500" />
                  Printable Logistics Labels
                </h4>
                <a href={inv.pdfBlobUrl || '#'} download={`Labels_${inv.id}.pdf`} className="flex items-center px-8 py-4 bg-indigo-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-indigo-700 transition-all"><Download className="w-4 h-4 mr-3" /> Export PDF</a>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-10 bg-slate-50 rounded-[40px] border border-slate-100">
                 {inv.data.line_items?.filter(it => it.code_value).slice(0, 12).map((it, i) => (
                   <BarcodePreview key={i} item={it} currency={inv.data?.invoice_identity.currency} />
                 ))}
              </div>
              <div className="flex-1 bg-slate-900 rounded-[40px] border-[12px] border-slate-900 overflow-hidden shadow-2xl relative min-h-[400px]">
                <iframe src={`${inv.pdfBlobUrl}#toolbar=0`} className="w-full h-full border-none" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabBtn: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`px-10 py-7 text-[10px] font-black uppercase tracking-[0.2em] relative transition-all whitespace-nowrap ${active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
    {label}
    {active && <div className="absolute bottom-0 left-10 right-10 h-1.5 bg-indigo-600 rounded-t-full shadow-lg" />}
  </button>
);

const SummaryRow: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => (
  <div className="flex justify-between items-center text-xs group">
    <span className="font-bold text-slate-400 uppercase tracking-widest">{label}</span>
    <span className={`font-black tracking-tight text-right ${!value || value === 'Not detected' ? 'text-red-400 italic' : 'text-slate-900'}`}>{value || 'Not detected'}</span>
  </div>
);

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center group hover:border-indigo-100 hover:shadow-lg transition-all">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-base font-black text-slate-900 truncate">{value}</p>
  </div>
);

const SectionHeader: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center space-x-4 mb-6 text-slate-400 group">
    <div className="p-2 bg-white border border-slate-100 rounded-xl group-hover:bg-indigo-50 transition-colors">
      {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
    </div>
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-800">{label}</span>
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <div className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm transition-all ${status === 'ok' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100 shadow-amber-100/50 animate-pulse'}`}>
    {status === 'ok' ? <><CheckCircle className="w-3.5 h-3.5 inline mr-2" /> Audit Passed</> : <><AlertCircle className="w-3.5 h-3.5 inline mr-2" /> Manual Check Required</>}
  </div>
);

export default App;
