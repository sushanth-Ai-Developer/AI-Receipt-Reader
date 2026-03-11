
import { BrowserMultiFormatReader } from '@zxing/library';
import { DetectedCode } from '../types';

export const scanBarcodes = async (file: File): Promise<DetectedCode[]> => {
  const reader = new BrowserMultiFormatReader();
  const imageUrl = URL.createObjectURL(file);
  
  try {
    // Attempt multiple decodes or common results
    // NOTE: ZXing's browser reader usually expects a video element or canvas, 
    // but can handle static image elements.
    const img = new Image();
    img.src = imageUrl;
    
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    ctx.drawImage(img, 0, 0);

    const results: DetectedCode[] = [];
    
    try {
      // Decode the whole image
      const decodeResult = await reader.decodeFromImageElement(img);
      if (decodeResult) {
        results.push({
          // Force cast as we handle valid types later in the logic
          type: decodeResult.getBarcodeFormat().toString() as any,
          value: decodeResult.getText()
        });
      }
    } catch (e) {
      console.debug("Single decode failed, proceeding with logic...");
    }

    // Heuristic: Check for UCI (Uniquely Code Identifier) patterns in decoded results
    // E.g., [UCI:123456789]
    results.forEach(res => {
      if (res.value.match(/^[A-Z0-9]{12,20}$/)) {
        // Potential UCI match
        // Fix: Changed 'UCI / Serial' to 'UCI' to match the DetectedCode type
        res.type = 'UCI';
      }
    });

    return results;
  } catch (error) {
    console.error("Barcode scan failed:", error);
    return []; // Return empty instead of crashing as per requirements
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};
