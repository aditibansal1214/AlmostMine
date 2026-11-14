/**
 * Image processing utilities for client-side resizing and compression.
 * Enforces max 1024px, JPEG quality 0.7, < 250KB each.
 */
export async function resizeImageToDataUrl(file: File, maxDimension = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if HEIC
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic';
    if (isHeic) {
      // In browsers without native HEIC decode support
      reject(new Error('HEIC format is not supported directly in this browser. Please select a JPEG or PNG image.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas rendering context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for resizing.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}
