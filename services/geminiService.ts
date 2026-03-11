
import { GoogleGenAI, Type } from "@google/genai";
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

/**
 * Normalizes a complex result into the App's state.
 * Implements Rule 5: Robust Pricing and Data Mapping.
 */
export const normalizeData = (rawData: any, rawSections: any): DocumentResult => {
  const base = rawData || {};
  
  // Robust numeric parsing
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
    
    // Rule 5: Pricing Heuristics (Unit Cost Calculation)
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
      container_size_uom: '', // Derived if needed
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
      // App Internal
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
      source_images_count: base.header?.source_images_count || 1,
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

export const extractStitchedInvoiceData = async (
  files: File[]
): Promise<DocumentResult[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.VITE_API_KEY });
  const parts = await Promise.all(files.map(async (f) => ({
    inlineData: { mimeType: 'image/jpeg', data: await resizeImage(f) }
  })));

  const systemInstruction = `
    You are a Senior Auditor and EDI Specialist. Your task is to extract EVERY SINGLE DETAIL from the provided images of invoices/receipts with 100% accuracy and ZERO LOSS of information.
    
    CRITICAL INSTRUCTIONS:
    1. DOCUMENT IDENTIFICATION:
       - You are provided with up to 5 images. These images could be:
         a) Multiple pages of a single invoice.
         b) Multiple separate, distinct receipts/invoices.
         c) A mix of both.
       - You MUST carefully analyze each image to determine if it's a continuation of a previous document or a new one.
       - Produce one entry in the "document_groups" array for EACH distinct document found.
       - If you see 5 separate receipts, you MUST produce 5 entries. If you see 5 pages of 1 invoice, produce 1 entry.
    2. EXHAUSTIVE EXTRACTION (ZERO LOSS):
       - Do NOT skip any line items. Extract EVERY product, service, fee, tax, or adjustment listed.
       - If a receipt has 100 items, you MUST extract 100 items. 
       - If an item description is long, capture the full description.
       - If there are handwritten notes or stamps, capture them in "extra_fields_audit_text".
    3. LINE ITEM DETAILS:
       - Description: Full title as it appears.
       - Quantity: Extract exactly as shown. If missing, assume 1.
       - Unit Cost: Extract the price per unit. If missing, calculate: extended_amount / quantity.
       - Extended Amount: The total for that line.
       - UPC/GTIN/SKU: Extract any codes associated with the item.
    4. PACKAGING & LOGISTICS:
       - Pay close attention to packaging terms (e.g., "Case of 12", "Pack", "Box", "Lbs").
       - Extract "units_per_case" and "pack_structure_raw" if mentioned.
    5. MATHEMATICAL CONSISTENCY:
       - Ensure that (Quantity * Unit Cost) matches the Extended Amount. If there's a discrepancy, note it in "parsing_warnings".
    6. ADAPTIVE VISION:
       - If an image is rotated, blurry, or has poor lighting, use all available context to read it. Do not give up.
    
    Output MUST be a strictly valid JSON object with a "document_groups" array. No conversational text.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      document_groups: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            lossless_json: {
              type: Type.OBJECT,
              properties: {
                header: { 
                  type: Type.OBJECT,
                  properties: {
                    vendor_name: { type: Type.STRING },
                    vendor_address: { type: Type.STRING },
                    vendor_city: { type: Type.STRING },
                    vendor_state: { type: Type.STRING },
                    vendor_zip: { type: Type.STRING },
                    vendor_phone: { type: Type.STRING },
                    buyer_name: { type: Type.STRING },
                    buyer_address: { type: Type.STRING },
                    buyer_city: { type: Type.STRING },
                    buyer_state: { type: Type.STRING },
                    buyer_zip: { type: Type.STRING },
                    "customer_id/account": { type: Type.STRING },
                    invoice_number: { type: Type.STRING },
                    invoice_date: { type: Type.STRING },
                    delivery_datetime: { type: Type.STRING },
                    terms: { type: Type.STRING },
                    po_number: { type: Type.STRING },
                    route_stop_driver_salesrep: { type: Type.STRING },
                    currency: { type: Type.STRING }
                  }
                },
                totals: { 
                  type: Type.OBJECT, 
                  properties: {
                    invoice_total: { type: Type.NUMBER },
                    total_due: { type: Type.NUMBER },
                    total_discount: { type: Type.NUMBER },
                    total_deposit: { type: Type.NUMBER },
                    total_tax: { type: Type.NUMBER },
                    total_credits: { type: Type.NUMBER },
                    subtotal: { type: Type.NUMBER }
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
                      units_per_case: { type: Type.NUMBER },
                      pack_structure_raw: { type: Type.STRING },
                      container_size_raw: { type: Type.STRING },
                      retail_price: { type: Type.NUMBER },
                      gross_price: { type: Type.NUMBER },
                      discount: { type: Type.NUMBER },
                      deposit: { type: Type.NUMBER },
                      sugar_fee: { type: Type.NUMBER },
                      net_line_total: { type: Type.NUMBER }
                    }
                  } 
                },
                confidence_overall: { type: Type.NUMBER },
                parsing_warnings: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            csv_preview: { type: Type.STRING },
            edi_810_text: { type: Type.STRING },
            extra_fields_audit_text: { type: Type.STRING }
          }
        }
      }
    },
    required: ["document_groups"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [...parts, { text: "Stitch and audit these photos for high-fidelity extraction. Ensure every line item is captured." }] },
      config: { 
        systemInstruction,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    if (!result.document_groups || !Array.isArray(result.document_groups)) {
      throw new Error("Invalid response format from AI.");
    }

    return result.document_groups.map((group: any) => {
      const sections = {
        json: JSON.stringify(group.lossless_json, null, 2),
        csv: group.csv_preview || "",
        edi: group.edi_810_text || "",
        extra: group.extra_fields_audit_text || ""
      };
      return normalizeData(group.lossless_json, sections);
    });

  } catch (e) {
    console.error("Extraction error:", e);
    throw new Error("Could not process images. " + (e instanceof Error ? e.message : "Unknown error."));
  }
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
