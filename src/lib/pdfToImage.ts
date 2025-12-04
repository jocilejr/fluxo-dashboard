import * as pdfjsLib from 'pdfjs-dist';

// Disable worker to avoid CORS/loading issues in browser
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

export async function pdfToImage(pdfData: ArrayBuffer, scale: number = 2): Promise<Blob> {
  const loadingTask = pdfjsLib.getDocument({ 
    data: pdfData,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true
  });
  
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get canvas context');
  }

  await page.render({
    canvasContext: context,
    viewport
  }).promise;
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create image blob'));
        }
      },
      'image/jpeg',
      0.92
    );
  });
}
