// Reference photos are shrunk before they are stored or sent to Gemini: phone photos are often
// 4–8 MB, and the image model only needs enough detail to guide a cartoon.

const MAX_SIDE = 1280;

export async function prepareImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return out || file;
  } catch {
    // HEIC and other formats the browser can't decode go as they are; Gemini accepts HEIC.
    return file;
  }
}
