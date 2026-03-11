
import React, { useState } from 'react';
import { DocumentResult } from '../types';
import { 
  FileText, 
  Grid, 
  Clipboard, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  XCircle,
  Hash,
  ShoppingBag
} from 'lucide-react';

interface ResultsPanelProps {
  result: DocumentResult;
  pdfBlob: Blob | null;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ result, pdfBlob }) => {
  const [activeTab, setActiveTab] = useState<'edi' | 'barcodes' | 'quality'>('edi');

  // Fix: Property access for DocumentResult structure
  const formattedEdi = result.edi_810.edi_string.replace(/~/g, '~\n');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result.edi_810.edi_string);
    alert('Raw EDI text copied to clipboard!');
  };

  const downloadEdi = () => {
    const blob = new Blob([result.edi_810.edi_string], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${result.invoice.number || 'export'}.edi`;
    a.click();
  };

  const downloadPdf = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labels_${result.invoice.number || 'export'}.pdf`;
    a.click();
  };

  // Derived detected codes list for compatibility with display logic
  const detected_codes = result.line_items
    .filter(item => item.code_value)
    .map(item => ({ type: item.code_type, value: item.code_value }));

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col h-[750px] overflow-hidden">
      {/* Navigation */}
      <div className="flex bg-slate-50 border-b border-slate-200 p-2 space-x-1">
        {[
          { id: 'edi', label: 'EDI Preview', icon: FileText },
          { id: 'barcodes', label: 'Barcode Sheet', icon: Grid },
          { id: 'quality', label: 'Quality & Data', icon: AlertTriangle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-bold rounded-2xl transition-all ${
              activeTab === tab.id 
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'edi' && (
          <div className="h-full flex flex-col p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">X12 810 Result</h3>
                <p className="text-xs text-slate-500">Human-readable transaction set preview</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={copyToClipboard} className="p-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                  <Clipboard className="w-5 h-5" />
                </button>
                <button onClick={downloadEdi} className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-shadow shadow-lg shadow-indigo-100">
                  <Download className="w-4 h-4 mr-2" />
                  Download .edi
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-900 rounded-2xl p-6 overflow-auto scrollbar-thin scrollbar-thumb-slate-700">
              <pre className="mono text-emerald-400 text-sm whitespace-pre leading-relaxed tracking-wide">
                {formattedEdi}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'barcodes' && (
          <div className="h-full flex flex-col p-8">
             <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Label Output</h3>
                <p className="text-xs text-slate-500">Logistics stickers for detected codes</p>
              </div>
              {pdfBlob && (
                <button onClick={downloadPdf} className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-shadow shadow-lg shadow-indigo-100">
                  <Download className="w-4 h-4 mr-2" />
                  Save PDF
                </button>
              )}
            </div>

            {detected_codes.length > 0 ? (
              <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
                <div className="grid grid-cols-2 gap-3">
                   {detected_codes.slice(0, 4).map((code, i) => (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                         <span className="text-[10px] font-bold text-indigo-500 uppercase block mb-1">{code.type}</span>
                         <span className="text-sm font-mono text-slate-900 font-bold break-all">{code.value}</span>
                      </div>
                   ))}
                </div>
                {pdfBlob && (
                  <div className="flex-1 bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                       <Grid className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-bold mb-1">PDF Labels Generated</p>
                    <p className="text-slate-400 text-sm mb-6">A {detected_codes.length}-count label sheet is ready for printing.</p>
                    <button onClick={downloadPdf} className="text-indigo-600 font-bold text-sm underline flex items-center">
                       <ExternalLink className="w-4 h-4 mr-1.5" />
                       View in browser
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-60">
                 <ShoppingBag className="w-16 h-16 text-slate-300 mb-6" />
                 <p className="text-slate-500 font-medium">No UPC or Logistics codes identified.</p>
                 <p className="text-slate-400 text-xs mt-1">Check manual validation for details.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="h-full flex flex-col p-8 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Validation Status */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Integrity</h4>
                <div className="space-y-2">
                  {result.quality.issues.map((issue, i) => (
                    <div key={i} className="flex items-center p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-100">
                      <AlertTriangle className="w-4 h-4 mr-3 shrink-0" />
                      Issue: {issue}
                    </div>
                  ))}
                  {result.quality.issues.length === 0 && (
                    <div className="flex items-center p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-medium border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 mr-3 shrink-0" />
                      Validation successful. No issues found.
                    </div>
                  )}
                </div>
              </div>

              {/* Core Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entity Facts</h4>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Seller</div>
                    <div className="text-right text-sm font-bold text-slate-900">{result.vendor.name || 'Unknown'}</div>
                  </div>
                  <div className="flex justify-between items-start border-t border-slate-200 pt-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Buyer</div>
                    <div className="text-right text-sm font-bold text-slate-900">{result.buyer.name || 'Unknown'}</div>
                  </div>
                  <div className="flex justify-between items-start border-t border-slate-200 pt-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Invoice #</div>
                    <div className="text-right text-sm font-bold text-indigo-600 font-mono">{result.invoice.number || 'N/A'}</div>
                  </div>
                  <div className="flex justify-between items-start border-t border-slate-200 pt-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Total Amount</div>
                    <div className="text-right text-lg font-black text-slate-900">
                      {result.invoice.currency} {result.pricing.total_cost?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mt-8">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Transaction Lines ({result.line_items.length})</h4>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-500">Ln</th>
                      <th className="px-4 py-3 font-bold text-slate-500">Description</th>
                      <th className="px-4 py-3 font-bold text-slate-500">Qty</th>
                      <th className="px-4 py-3 font-bold text-slate-500">Price</th>
                      <th className="px-4 py-3 font-bold text-slate-500">UPC</th>
                      <th className="px-4 py-3 font-bold text-slate-500 text-right">Ext</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.line_items.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-400">{item.line_no}</td>
                        <td className="px-4 py-3 text-slate-900">{item.description}</td>
                        <td className="px-4 py-3 text-slate-600">{item.qty} {item.uom}</td>
                        <td className="px-4 py-3 font-mono text-slate-500">${item.unit_price?.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-indigo-500 font-bold">{item.code_value || '-'}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 text-right">${item.line_total?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
