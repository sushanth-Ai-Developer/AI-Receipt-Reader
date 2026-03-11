
import { DocumentResult } from '../types';

/**
 * Generates an enterprise-grade EDI 810 X12 stream from extracted document data.
 * Adheres to standard X12 4010/5010 conventions.
 */
export const generateEDI810FromData = (data: DocumentResult | null): string => {
  if (!data) return '';
  const segments: string[] = [];
  const delimiter = '*';
  const terminator = '~';

  // Helper to format date as CCYYMMDD
  const formatDate = (date: string) => (date || '').replace(/[-/]/g, '').substring(0, 8);
  const now = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '').substring(0, 4);

  // --- Envelopes (Simulated for high-fidelity preview) ---
  // ISA: Interchange Control Header
  segments.push(`ISA${delimiter}00${delimiter}          ${delimiter}00${delimiter}          ${delimiter}ZZ${delimiter}SENDERID       ${delimiter}ZZ${delimiter}RECEIVERID     ${delimiter}${now.substring(2)}${delimiter}${time}${delimiter}^${delimiter}00501${delimiter}000000001${delimiter}0${delimiter}P${delimiter}:`);
  
  // GS: Functional Group Header
  segments.push(`GS${delimiter}IN${delimiter}SENDERID${delimiter}RECEIVERID${delimiter}${now}${delimiter}${time}${delimiter}1${delimiter}X${delimiter}005010`);

  // --- Transaction Set ---
  // ST: Transaction Set Header
  segments.push(`ST${delimiter}810${delimiter}0001`);

  // BIG: Beginning Segment for Invoice
  // Fix: Access properties from invoice_identity instead of top-level invoice
  const invDate = formatDate(data.invoice_identity?.invoice_date) || now;
  const invNo = data.invoice_identity?.invoice_number || 'INV-TEMP';
  const poNo = data.invoice_identity?.po || 'PO-PENDING';
  segments.push(`BIG${delimiter}${invDate}${delimiter}${invNo}${delimiter}${delimiter}${poNo}${delimiter}${delimiter}${delimiter}DI`);

  // CUR: Currency
  // Fix: Access properties from invoice_identity
  if (data.invoice_identity?.currency) {
    segments.push(`CUR${delimiter}SE${delimiter}${data.invoice_identity.currency.toUpperCase()}`);
  }

  // REF: Reference Identifiers
  // Fix: Access properties from header_fields.vendor
  if (data.header_fields.vendor?.account_id) {
    segments.push(`REF${delimiter}IA${delimiter}${data.header_fields.vendor.account_id}`);
  }
  if (poNo && poNo !== 'PO-PENDING') {
    segments.push(`REF${delimiter}PO${delimiter}${poNo}`);
  }

  // --- N1 Loop: Seller (Vendor) ---
  // Fix: Access properties from header_fields.vendor
  const vName = (data.header_fields.vendor?.name || 'UNKNOWN VENDOR').toUpperCase().substring(0, 60);
  segments.push(`N1${delimiter}SU${delimiter}${vName}`);
  if (data.header_fields.vendor?.address) {
    segments.push(`N3${delimiter}${data.header_fields.vendor.address.toUpperCase().substring(0, 55)}`);
  }
  if (data.header_fields.vendor?.city) {
    const city = data.header_fields.vendor.city.toUpperCase();
    const state = (data.header_fields.vendor.state || 'XX').toUpperCase().substring(0, 2);
    const zip = (data.header_fields.vendor.zip || '00000').replace(/[^\d]/g, '').substring(0, 5);
    segments.push(`N4${delimiter}${city}${delimiter}${state}${delimiter}${zip}`);
  }

  // --- N1 Loop: Buyer ---
  // Fix: Access properties from header_fields.buyer
  const bName = (data.header_fields.buyer?.name || 'UNKNOWN BUYER').toUpperCase().substring(0, 60);
  segments.push(`N1${delimiter}BY${delimiter}${bName}`);
  if (data.header_fields.buyer?.address) {
    segments.push(`N3${delimiter}${data.header_fields.buyer.address.toUpperCase().substring(0, 55)}`);
  }
  if (data.header_fields.buyer?.city) {
    const city = data.header_fields.buyer.city.toUpperCase();
    const state = (data.header_fields.buyer.state || 'XX').toUpperCase().substring(0, 2);
    const zip = (data.header_fields.buyer.zip || '00000').replace(/[^\d]/g, '').substring(0, 5);
    segments.push(`N4${delimiter}${city}${delimiter}${state}${delimiter}${zip}`);
  }

  // --- IT1 Loops: Line Items ---
  (data.line_items || []).forEach((item, idx) => {
    // Fix: Access LineItem specific fields (qty_purchased, unit_cost, uom_purchased)
    const qty = item.qty_purchased || 1;
    const price = item.unit_cost || 0;
    const uom = item.uom_purchased || 'EA';
    
    let qualifier = 'VN';
    if (item.code_type === 'UPC-A') qualifier = 'UP';
    if (item.code_type === 'EAN-13') qualifier = 'EN';

    const lineNo = item.line_no || (idx + 1);
    const codeValue = item.code_value ? `${qualifier}${delimiter}${item.code_value}` : '';
    
    segments.push(`IT1${delimiter}${lineNo}${delimiter}${qty}${delimiter}${uom}${delimiter}${price}${delimiter}${delimiter}${codeValue}`);
    
    if (item.description) {
      segments.push(`PID${delimiter}F${delimiter}${delimiter}${delimiter}${delimiter}${item.description.toUpperCase().substring(0, 80)}`);
    }
  });

  // --- Summary ---
  // TDS: Total Amount (in cents)
  // Fix: Access property from header_fields.totals
  const totalCost = data.header_fields.totals.total_cost || 0;
  const cents = Math.round(totalCost * 100);
  segments.push(`TDS${delimiter}${cents}`);

  // CTT: Transaction Totals
  segments.push(`CTT${delimiter}${(data.line_items || []).length}`);

  // SE: Transaction Set Trailer
  // Segment count includes ST but not ISA/GS/GE/IEA usually in raw X12, 
  // but for the 810 block it's standard to count from ST to SE.
  const tsSegmentsCount = segments.findIndex(s => s.startsWith('ST'));
  const tsCount = segments.length - tsSegmentsCount + 1;
  segments.push(`SE${delimiter}${tsCount}${delimiter}0001`);

  // GE/IEA: Functional Group and Interchange Trailers
  segments.push(`GE${delimiter}1${delimiter}1`);
  segments.push(`IEA${delimiter}1${delimiter}000000001`);

  return segments.join(terminator) + terminator;
};
