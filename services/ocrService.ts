
import Tesseract from 'tesseract.js';

export const runOCRPipeline = async (dataUrl: string): Promise<{ fullText: string; upcText: string }> => {
  const worker = await Tesseract.createWorker('eng');
  
  try {
    // Pass 1: Full Page
    const { data: { text: fullText } } = await worker.recognize(dataUrl);
    
    // Pass 2: Right-hand region heuristic for UPC column
    // We simulate a crop by creating a temporary canvas
    const upcText = await new Promise<string>((resolve) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve("");
        
        const width = img.width;
        const height = img.height;
        const cropW = width * 0.45;
        const cropX = width * 0.55;

        canvas.width = cropW;
        canvas.height = height;
        ctx.drawImage(img, cropX, 0, cropW, height, 0, 0, cropW, height);
        
        try {
          const { data: { text } } = await worker.recognize(canvas.toDataURL());
          resolve(text);
        } catch (e) {
          resolve("");
        }
      };
      img.onerror = () => resolve("");
    });

    return { fullText, upcText };
  } catch (error) {
    console.error("OCR Pipeline Error:", error);
    return { fullText: "", upcText: "" };
  } finally {
    await worker.terminate();
  }
};
