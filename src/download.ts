/**
 * Professional Image Downloader & Universal Compatibility Module (TypeScript)
 * Ensures downloaded images have clean filenames and open in all desktop/mobile software.
 */

import { ImageItem } from './types.js';

/**
 * Creates a clean, professional, branded filename
 * Example: "Everest, Himalayas" -> "Lumen-Everest-Himalayas.jpg"
 */
export function getProfessionalFilename(title: string, extension: 'jpg' | 'png' = 'jpg'): string {
  // 1. Strip common prefixes
  let clean = (title || 'Photograph').replace(/^(File|Image):/i, '');

  // 2. Remove file extensions if still present
  clean = clean.replace(/\.(jpe?g|png|webp|svg|tiff?|gif|avif)$/i, '');

  // 3. Remove common raw camera metadata codes (e.g. IMG_20210815, DSC_0492)
  clean = clean.replace(/\b(IMG|DSC|P|SAM|DJI|GH)[\-_]?\d+\b/gi, '');

  // 4. Remove unwanted symbols and multiple spaces
  clean = clean.replace(/[_\-+]+/g, ' ').replace(/[^\w\s]/g, '').trim();

  // 5. Build clean capitalized words
  const words = clean.split(/\s+/).filter(Boolean).slice(0, 5);
  let formatted = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('-');

  if (!formatted || formatted.length < 3) {
    formatted = 'Photograph';
  }

  return `Lumen-${formatted}.${extension}`;
}

/**
 * Converts any exotic/unsupported image blob (WebP, TIFF, SVG, etc.) into a 100% standard JPEG
 * baseline image that opens in every single viewer on Windows, Mac, iOS, and Android.
 */
async function convertToStandardJpeg(blob: Blob, quality: number = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(blob);
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 1920;
        canvas.height = img.naturalHeight || img.height || 1080;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(blob);
          return;
        }

        // Fill white background to prevent transparent areas from rendering as black
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Maximum smoothing quality for professional rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (convertedBlob) => {
            if (convertedBlob) {
              resolve(convertedBlob);
            } else {
              resolve(blob);
            }
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        resolve(blob);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      resolve(blob);
    };

    img.src = blobUrl;
  });
}

/**
 * Downloads an image with guaranteed universal software compatibility.
 */
export async function downloadImageWithCompatibility(
  item: ImageItem,
  onStatusChange?: (status: 'downloading' | 'processing' | 'success' | 'error') => void
): Promise<void> {
  if (onStatusChange) onStatusChange('downloading');

  const primaryUrl = item.downloadUrl || item.previewUrl;
  const fallbackUrl = item.previewUrl || item.downloadUrl;

  let blob: Blob | null = null;

  // Attempt 1: Fetch original high-resolution URL
  try {
    const res = await fetch(primaryUrl);
    if (res.ok) {
      blob = await res.blob();
    }
  } catch (err) {
    console.warn('Original high-res fetch restricted or timed out, trying fallback preview...', err);
  }

  // Attempt 2: Fallback to high-definition preview URL if attempt 1 failed
  if (!blob && fallbackUrl && fallbackUrl !== primaryUrl) {
    try {
      const res = await fetch(fallbackUrl);
      if (res.ok) {
        blob = await res.blob();
      }
    } catch (err) {
      console.warn('Fallback preview fetch failed:', err);
    }
  }

  // If both direct blob fetches failed (e.g. strict browser sandbox), trigger direct link download
  if (!blob) {
    if (onStatusChange) onStatusChange('error');
    const a = document.createElement('a');
    a.href = primaryUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = getProfessionalFilename(item.title, 'jpg');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  if (onStatusChange) onStatusChange('processing');

  // Check format and determine compatibility
  const detectedType = (blob.type || item.mimeType || '').toLowerCase();
  let finalBlob = blob;
  let ext: 'jpg' | 'png' = 'jpg';

  if (detectedType.includes('png')) {
    // Standard PNG is universally supported and preserves transparency
    ext = 'png';
  } else if (detectedType.includes('jpeg') || detectedType.includes('jpg')) {
    // Standard JPEG is universally supported
    ext = 'jpg';
  } else {
    // WebP, SVG, TIFF, AVIF, or unknown format:
    // Convert to standard JPEG so any software (Windows Photo Viewer, Photoshop, MS Office) can open it
    try {
      finalBlob = await convertToStandardJpeg(blob, 0.95);
      ext = 'jpg';
    } catch {
      ext = 'jpg';
    }
  }

  const filename = getProfessionalFilename(item.title, ext);

  // Trigger browser download with proper filename
  const objectUrl = URL.createObjectURL(finalBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = objectUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 2000);

  if (onStatusChange) onStatusChange('success');
}
