
export const preprocessForOCR = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas error');

      // 2.5x upscale for digit detection
      const scale = 2.5;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Grayscale + Adaptive Thresholding approximation
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const gray = (r + g + b) / 3;
        
        // Sharpen contrast
        let val = gray;
        if (gray > 160) val = 255;
        else if (gray < 90) val = 0;
        else val = (gray - 90) * (255 / (160 - 90));

        data[i] = data[i+1] = data[i+2] = val;
      }
      ctx.putImageData(imageData, 0, 0);

      resolve(canvas.toDataURL('image/jpeg', 0.9));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
  });
};
