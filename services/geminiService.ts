
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { DocumentResult, LineItem, ExtraField } from "../types";
import { validateCode } from "./validationService";

const resizeImage = (file: File, maxWidth = 2048, maxHeight = 2048): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
    };
  });
};

export const normalizeData = (rawData: any, rawSections: any): DocumentResult => {
  const base = rawData || {};
  
  const parseNum = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val || val === "") return null;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  };

  const line_items = Array.isArray(base.line_items) ? base.line_items.map((it: any, idx: number) => {
    const rawCode = String(it.upc_gtin || it.item_id || it.upc || it.sku || it.gtin || it.item_code || '').trim();
    const validation = validateCode(rawCode);
    
    const netTotal = parseNum(it.net_line_total || it.extended_amount || it.amount || it.total || it.line_total || it.net_amount);
    const qty = parseNum(it.qty_purchased || it.qty || it.quantity || it.quantity_purchased || it.units) || 1;
    const gross = parseNum(it.gross_price || it.unit_price || it.unit_cost || it.price || it.rate || it.cost);
    
    let unitCost = gross;
    if (!unitCost && netTotal && qty) {
      unitCost = netTotal / qty;
    }

    return {
      line_no: it.line_no || idx + 1,
      upc: it.upc_gtin || it.upc || '',
      item_id_or_sku: it.item_id || it.sku || '',
      description: it.description || 'Unknown Item',
      qty_purchased: qty,
      uom_purchased: it.uom_purchased || it.uom || 'EA',
      packaging_level: it.packaging_level || '',
      pack_structure_raw: it.pack_structure_raw || '',
      units_per_case: it.units_per_case || '',
      container_size_value: it.container_size_raw || '',
      container_size_uom: '',
      container_type: '',
      retail_units_total: '',
      packaging_interpretation_note: it.packaging_interpretation_note || '',
      unit_cost: unitCost,
      extended_amount: netTotal,
      retail_ssp_msrp: parseNum(it.retail_price),
      discount_amount: it.discount || '',
      discount_percent: '',
      promo_amount: '',
      deposit_dp_crv: it.deposit || '',
      net_amount: netTotal,
      tax_flags: it.tax_flags || '',
      extra_fields: it.extra_fields || [],
      code_value: rawCode,
      code_type: validation.type || 'UPC-A',
      code_status: validation.isValid ? 'VALID' : (rawCode ? 'UNVERIFIED' : 'MISSING'),
      category: 'other'
    };
  }) : [];

  const totals = base.totals || {};
  const totalDue = parseNum(totals.total_due || totals.invoice_total || 0);

  return {
    doc_id: Math.random().toString(36).substring(7),
    doc_type: 'invoice',
    invoice_identity: {
      vendor_name: base.header?.vendor_name || 'Unknown Vendor',
      buyer_name: base.header?.buyer_name || '',
      invoice_number: base.header?.invoice_number || '',
      invoice_date: base.header?.invoice_date || '',
      confidence_score_0_to_100: base.confidence_overall || 85,
      source_images_count: 1,
      po: base.header?.po_number || '',
      currency: base.header?.currency || 'USD'
    },
    header_fields: {
      vendor: {
        name: base.header?.vendor_name || '',
        address: base.header?.vendor_address || '',
        city: base.header?.vendor_city || '',
        state: base.header?.vendor_state || '',
        zip: base.header?.vendor_zip || '',
        phone: base.header?.vendor_phone || ''
      },
      buyer: {
        name: base.header?.buyer_name || '',
        address: base.header?.buyer_address || '',
        city: base.header?.buyer_city || '',
        state: base.header?.buyer_state || '',
        zip: base.header?.buyer_zip || '',
        account_id: base.header?.['customer_id/account'] || ''
      },
      delivery: base.header?.delivery_datetime || {},
      payment_terms: base.header?.terms || {},
      totals: {
        total_cost: totalDue || 0,
        subtotal: parseNum(totals.subtotal),
        tax: parseNum(totals.total_tax),
        fees: 0,
        discounts: parseNum(totals.total_discount)
      },
      route_driver_sales: base.header?.route_stop_driver_salesrep || {},
      extra_fields: base.extra_fields_header || []
    },
    line_items,
    edi_810: {
      edi_string: rawSections.edi || ''
    },
    sections_raw: rawSections,
    quality: {
      status: (totalDue > 0 || line_items.length > 0) ? 'ok' : 'needs_review',
      issues: base.parsing_warnings || [],
      field_confidence: { total: (base.confidence_overall || 85) / 100 }
    }
  };
};

const extractSingleReceipt = async (file: File, isRetry = false): Promise<DocumentResult> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const base64Data = await resizeImage(file);

  const schema = {
    type: Type.OBJECT,
    properties: {
      header: {
        type: Type.OBJECT,
        properties: {
          vendor_name: { type: Type.STRING },
          buyer_name: { type: Type.STRING },
          invoice_number: { type: Type.STRING },
          invoice_date: { type: Type.STRING },
          currency: { type: Type.STRING }
        },
        required: ["vendor_name"]
      },
      totals: {
        type: Type.OBJECT,
        properties: {
          total_due: { type: Type.NUMBER },
          subtotal: { type: Type.NUMBER },
          total_tax: { type: Type.NUMBER },
          total_discount: { type: Type.NUMBER }
        }
      },
      line_items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            line_no: { type: Type.NUMBER },
            item_id: { type: Type.STRING },
            upc_gtin: { type: Type.STRING },
            description: { type: Type.STRING },
            qty_purchased: { type: Type.NUMBER },
            uom_purchased: { type: Type.STRING },
            gross_price: { type: Type.NUMBER },
            net_line_total: { type: Type.NUMBER }
          },
          required: ["description", "qty_purchased", "net_line_total"]
        }
      },
      confidence_overall: { type: Type.NUMBER }
    },
    required: ["header", "totals", "line_items"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: isRetry ? "RETRY: Your previous response was invalid. Extract the receipt data accurately into the JSON schema." : "Extract receipt data." }
        ]
      },
      config: {
        systemInstruction: "You are a Senior Auditor. Extract receipt details into the provided JSON schema. Return ONLY valid JSON.",
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: schema,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    let rawText = response.text || "";
    rawText = rawText.replace(/```json\n?/, "").replace(/```\n?/, "").trim();

    try {
      const parsed = JSON.parse(rawText);
      return normalizeData(parsed, { json: JSON.stringify(parsed, null, 2) });
    } catch (parseError) {
      if (!isRetry) {
        console.warn(`Parse failed for ${file.name}, retrying...`);
        return extractSingleReceipt(file, true);
      }
      throw new Error(`Failed to extract data from ${file.name} after retry.`);
    }
  } catch (e) {
    console.error(`Extraction error for ${file.name}:`, e);
    throw e;
  }
};

export const extractStitchedInvoiceData = async (files: File[]): Promise<DocumentResult[]> => {
  const results: DocumentResult[] = [];
  for (const file of files) {
    try {
      const result = await extractSingleReceipt(file);
      results.push(result);
    } catch (e) {
      console.error(`Skipping file ${file.name} due to extraction failure.`);
    }
  }
  return results;
};

export const roundToRetailEnding = (retailRaw: number): number => {
  if (!retailRaw || retailRaw <= 0) return 0;
  const raw = Math.ceil(retailRaw * 100) / 100;
  const dollar = Math.floor(raw);
  const endings = [0.49, 0.79, 0.95, 0.99];
  const candidates = endings.map(e => dollar + e);
  const validCandidates = candidates.filter(c => c >= raw);
  return validCandidates.length > 0 ? Math.min(...validCandidates) : (dollar + 1) + 0.99;
};
