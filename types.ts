
export type AppStep = 'UPLOAD' | 'PROCESSING' | 'RESULTS';

export type DocType = 'invoice' | 'receipt' | 'unknown';

// Add missing ProcessingStep enum
export enum ProcessingStep {
  IDLE = 'IDLE',
  RUNNING_OCR = 'RUNNING_OCR',
  UNDERSTANDING_INVOICE = 'UNDERSTANDING_INVOICE',
  GENERATING_EDI = 'GENERATING_EDI',
  GENERATING_PDF = 'GENERATING_PDF',
  COMPLETED = 'COMPLETED'
}

// Add missing DetectedCode interface
export interface DetectedCode {
  type: string;
  value: string;
  dateLeft?: string;
  dateRight?: string;
  price?: number;
  unit?: string;
  description?: string;
}

export interface ExtraField {
  label_original: string;
  value_original: string;
  likely_meaning: string;
  evidence_nearby_text: string;
  location_hint: 'header' | 'line_item';
}

export interface Party {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  account_id?: string;
  phone?: string;
}

export interface LineItem {
  line_no: number | string;
  upc: string;
  item_id_or_sku: string;
  description: string;
  
  // Packaging Logic
  qty_purchased: number | string;
  uom_purchased: string;
  packaging_level: string; // EACH / CASE / PACK / BOTTLE / CAN / etc.
  pack_structure_raw: string; // 4/6, 2/12, etc.
  units_per_case: number | string;
  container_size_value: string;
  container_size_uom: string;
  container_type: string;
  retail_units_total: number | string;
  packaging_interpretation_note: string;

  unit_cost: number | null;
  extended_amount: number | null;
  retail_ssp_msrp: number | null;
  discount_amount: number | string;
  discount_percent: number | string;
  promo_amount: number | string;
  deposit_dp_crv: number | string;
  net_amount: number | null;
  tax_flags: string;

  // For app internal use
  code_type: string;
  code_value: string; // mapped from upc
  code_status: 'VALID' | 'INVALID' | 'UNVERIFIED' | 'MISSING';
  category: string;
  extra_fields: ExtraField[];
}

export interface DocumentResult {
  doc_id: string;
  doc_type: DocType;
  invoice_identity: {
    vendor_name: string;
    buyer_name: string;
    invoice_number: string;
    invoice_date: string;
    confidence_score_0_to_100: number;
    source_images_count: number;
    po?: string;
    currency?: string;
  };
  header_fields: {
    vendor: Party;
    buyer: Party;
    delivery: any;
    payment_terms: any;
    totals: {
      subtotal?: number;
      total_cost: number;
      tax?: number;
      fees?: number;
      discounts?: number;
    };
    route_driver_sales: any;
    extra_fields: ExtraField[];
  };
  line_items: LineItem[];
  edi_810: {
    edi_string: string;
  };
  sections_raw: {
    json: string;
    csv: string;
    edi: string;
    extra: string;
  };
  quality: {
    status: 'ok' | 'needs_review';
    issues: string[];
    field_confidence: Record<string, number>;
    notes?: string;
  };
}

export interface InvoiceState {
  id: string;
  files: File[];
  previewUrls: string[];
  status: 'QUEUED' | 'RUNNING' | 'DONE' | 'NEEDS_REVIEW';
  progress: number;
  currentTask: string;
  sellerName: string;
  data: DocumentResult | null;
  pdfBlobUrl: string | null;
  retryCount: number;
  extractionMethod: 'OCR' | 'HYBRID' | 'GEMINI';
}

export interface BatchState {
  name: string;
  invoices: InvoiceState[];
}

export interface CodeValidationResult {
  value: string;
  type: string;
  isValid: boolean;
}
