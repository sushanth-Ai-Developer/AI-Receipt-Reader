
import { DocumentResult } from '../types';

/**
 * Converts DocumentResult into a CSV string.
 * Optimized for spreadsheet imports (Excel, Sheets, etc.)
 */
export const generateCSVFromData = (data: DocumentResult): string => {
  const headers = [
    'Line #',
    'UPC/GTIN',
    'Description',
    'Qty',
    'UOM',
    'Unit Cost',
    'Line Total',
    'Vendor',
    'Invoice #',
    'Date'
  ];

  const rows = data.line_items.map(item => {
    // Escape double quotes in descriptions/vendor names
    const desc = (item.description || '').replace(/"/g, '""');
    // Fix: Access vendor from header_fields instead of top-level
    const vendor = (data.header_fields.vendor?.name || '').replace(/"/g, '""');
    // Fix: Access invoice number from invoice_identity
    const invNo = (data.invoice_identity?.invoice_number || '').replace(/"/g, '""');
    
    // We wrap values in quotes to handle commas within fields
    return [
      item.line_no,
      `"${item.code_value || ''}"`, // Quoted to prevent scientific notation in Excel for long UPCs
      `"${desc}"`,
      // Fix: Use correct property names for LineItem (qty_purchased, uom_purchased, unit_cost, extended_amount)
      item.qty_purchased || 0,
      `"${item.uom_purchased || 'EA'}"`,
      (item.unit_cost || 0).toFixed(2),
      (item.extended_amount || 0).toFixed(2),
      `"${vendor}"`,
      `"${invNo}"`,
      // Fix: Access date from invoice_identity
      `"${data.invoice_identity?.invoice_date || ''}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};
