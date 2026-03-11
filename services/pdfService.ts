
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { DocumentResult } from '../types';

/**
 * Generates a retail label sheet PDF from extracted document data.
 * Focuses on logistics data (Description + Barcode + Price).
 */
export const generateRetailLabelPDF = async (data: DocumentResult): Promise<Blob | null> => {
  const validCodes = data.line_items.filter(it => it.code_value);
  if (validCodes.length === 0) return null;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const margin = 10;
  const colWidth = 63;
  const rowHeight = 45; // Increased height for more info
  const cols = 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Retail Tag Batch: ${data.invoice_identity.invoice_number || 'Draft'}`, margin, margin);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Vendor: ${data.invoice_identity.vendor_name}`, margin, margin + 4);
  doc.line(margin, margin + 6, 200, margin + 6);

  let currentX = margin;
  let currentY = margin + 12;

  for (let i = 0; i < data.line_items.length; i++) {
    const item = data.line_items[i];
    if (!item.code_value) continue;

    // Label Frame
    doc.setDrawColor(220);
    doc.rect(currentX, currentY, colWidth - 2, rowHeight - 2);

    // Description
    doc.setFontSize(7);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    const desc = item.description.toUpperCase().substring(0, 40);
    doc.text(desc, currentX + colWidth / 2, currentY + 6, { align: 'center' });

    // Price (Large)
    const displayPrice = item.unit_cost || item.retail_ssp_msrp || 0;
    const currencySymbol = data.invoice_identity.currency === 'USD' || !data.invoice_identity.currency ? '$' : data.invoice_identity.currency;
    
    if (displayPrice > 0) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(`${currencySymbol}${displayPrice.toFixed(2)}`, currentX + colWidth / 2, currentY + 14, { align: 'center' });
    } else {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('PRICE PENDING', currentX + colWidth / 2, currentY + 14, { align: 'center' });
    }

    // Barcode Generation
    try {
      const canvas = document.createElement('canvas');
      const cleanCode = item.code_value.replace(/[^0-9]/g, '');
      let format = 'CODE128';
      
      if (item.code_type === 'UPC-A' && cleanCode.length === 12) {
        format = 'UPC';
      } else if (item.code_type === 'EAN-13' && cleanCode.length === 13) {
        format = 'EAN13';
      }

      const renderOptions = {
        format,
        displayValue: false,
        margin: 0,
        width: 4,
        height: 40,
        background: "#ffffff"
      };

      try {
        JsBarcode(canvas, cleanCode, renderOptions);
      } catch (innerErr) {
        JsBarcode(canvas, cleanCode, { ...renderOptions, format: 'CODE128' });
      }

      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', currentX + 4, currentY + 18, colWidth - 24, 15);
    } catch (err) {
      doc.setFontSize(5);
      doc.setTextColor(200, 0, 0);
      doc.text('BARCODE ERROR', currentX + 10, currentY + 25);
    }

    // QR Code (Mini)
    try {
      const qrDataUrl = await QRCode.toDataURL(item.code_value, { margin: 1, width: 64 });
      doc.addImage(qrDataUrl, 'PNG', currentX + colWidth - 18, currentY + 18, 14, 14);
    } catch (qrErr) {
      // Skip QR if error
    }

    // Human Readable Code
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(item.code_value, currentX + colWidth / 2 - 6, currentY + 36, { align: 'center' });

    // Packaging Info
    doc.setFontSize(6);
    doc.text(`${item.uom_purchased} | ${item.packaging_level || 'UNIT'}`, currentX + colWidth / 2, currentY + rowHeight - 4, { align: 'center' });

    // Cell Positioning Logic
    if ((i + 1) % cols === 0) {
      currentX = margin;
      currentY += rowHeight;
    } else {
      currentX += colWidth;
    }

    if (currentY + rowHeight > 280) {
      doc.addPage();
      currentX = margin;
      currentY = margin + 12;
    }
  }

  return doc.output('blob');
};
