
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { DetectedCode } from '../types';

export const generateBarcodePDF = async (codes: DetectedCode[]): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const margin = 10;
  const colWidth = 64; // Slightly wider for dates
  const rowHeight = 48; // Taller for the retail tag layout
  const cols = 3;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Retail Tag Label Sheet', margin, margin);
  doc.line(margin, margin + 2, 200, margin + 2);

  let currentX = margin;
  let currentY = margin + 10;

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    
    // Label Boundary Box (Subtle)
    doc.setDrawColor(230);
    doc.setLineWidth(0.1);
    doc.rect(currentX, currentY, colWidth - 2, rowHeight - 2);
    
    // --- Vertical Dates (Sides) ---
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    
    const dLeft = code.dateLeft || '09/04/2025';
    const dRight = code.dateRight || '09/08/2025';

    // Left Date (Rotated)
    doc.text(dLeft, currentX + 4, currentY + (rowHeight / 2) + 10, { angle: 90 });
    // Right Date (Rotated)
    doc.text(dRight, currentX + colWidth - 4, currentY + (rowHeight / 2) + 10, { angle: 90 });

    // --- Price Header ---
    if (code.price !== undefined) {
      doc.setFontSize(22);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      const priceText = `$${code.price.toFixed(2)}`;
      doc.text(priceText, currentX + (colWidth / 2), currentY + 10, { align: 'center' });
      
      // "each" label
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(code.unit || 'each', currentX + (colWidth / 2) + (doc.getTextWidth(priceText) / 2) + 2, currentY + 7);
    }

    // --- Description ---
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    const desc = (code.description || 'ITEM DESCRIPTION').toUpperCase();
    const truncatedDesc = desc.length > 25 ? desc.substring(0, 22) + '...' : desc;
    doc.text(truncatedDesc, currentX + (colWidth / 2), currentY + 16, { align: 'center' });

    // --- Barcode ---
    try {
      if (code.type === 'QR') {
        const qrDataUrl = await QRCode.toDataURL(code.value, { margin: 1 });
        doc.addImage(qrDataUrl, 'PNG', currentX + (colWidth/2) - 10, currentY + 18, 20, 20);
      } else {
        const canvas = document.createElement('canvas');
        let format: string = 'CODE128';
        if (code.type === 'UPC-A') format = 'UPC';
        if (code.type === 'EAN-13') format = 'EAN13';

        JsBarcode(canvas, code.value, {
          format,
          displayValue: false,
          margin: 0,
          width: 3,
          height: 50
        });
        const barcodeDataUrl = canvas.toDataURL('image/png');
        // Center the barcode relative to the side dates
        doc.addImage(barcodeDataUrl, 'PNG', currentX + 8, currentY + 20, colWidth - 18, 18);
      }
    } catch (err) {
      doc.setFontSize(8);
      doc.setTextColor(200, 0, 0);
      doc.text('[BARCODE ERROR]', currentX + (colWidth/2), currentY + 28, { align: 'center' });
    }

    // --- Human Readable Value (Grouped format like image) ---
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    
    let displayVal = code.value;
    if (code.type === 'UPC-A' && displayVal.length === 12) {
      // Format 8 18094 00587 6 style
      displayVal = `${displayVal[0]}   ${displayVal.substring(1, 6)}   ${displayVal.substring(6, 11)}   ${displayVal[11]}`;
    }
    
    doc.text(displayVal, currentX + (colWidth/2), currentY + rowHeight - 6, { align: 'center' });

    // --- Grid Management ---
    if ((i + 1) % cols === 0) {
      currentX = margin;
      currentY += rowHeight;
    } else {
      currentX += colWidth;
    }

    if (currentY + rowHeight > 280) {
      doc.addPage();
      currentX = margin;
      currentY = margin + 10;
    }
  }

  return doc.output('blob');
};
