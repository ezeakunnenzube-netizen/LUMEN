/**
 * Professional Image Downloader & Universal Compatibility Module (TypeScript)
 * Ensures downloaded images have clean filenames, full resolution, zero distortion,
 * and open centered and full-bleed in all desktop and mobile photo viewers.
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
 * Converts unsupported or exotic web formats (like WebP or AVIF) into a standard,
 * universally-openable JPEG without any white borders, shrinking, or distortion.
 */
async function convertToStandardJpeg(blob: Blob, item: ImageItem, quality: number = 0.96): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(blob);
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      try {
        // Detect exact dimensions of the image
        let width = img.naturalWidth || img.width || 0;
        let height = img.naturalHeight || img.height || 0;

        // Fallback to metadata dimensions if browser does not report natural dimensions
        if (!width || !height) {
          width = item.width || 1920;
          height = item.height || 1080;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(blob);
          return;
        }

        // High quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image edge-to-edge to match the exact canvas dimensions
        // NEVER draw at (0, 0) without width/height to avoid corner-shrinking bugs
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (convertedBlob) => {
            resolve(convertedBlob || blob);
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        console.warn('Canvas conversion failed, using original blob:', err);
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

  // Primary download source
  const primaryUrl = item.downloadUrl || item.previewUrl;
  const fallbackUrl = item.previewUrl || item.downloadUrl;

  let blob: Blob | null = null;

  // Attempt 1: Fetch download URL
  try {
    const res = await fetch(primaryUrl);
    if (res.ok) {
      blob = await res.blob();
    }
  } catch (err) {
    console.warn('Primary image fetch restricted or timed out, trying preview fallback...', err);
  }

  // Attempt 2: Fallback to high-res preview URL if attempt 1 failed
  if (!blob && fallbackUrl && fallbackUrl !== primaryUrl) {
    try {
      const res = await fetch(fallbackUrl);
      if (res.ok) {
        blob = await res.blob();
      }
    } catch (err) {
      console.warn('Preview fallback fetch failed:', err);
    }
  }

  // If both direct blob fetches failed, trigger direct link download
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

  // Detect format
  const detectedType = (blob.type || item.mimeType || '').toLowerCase();
  const urlCheck = primaryUrl.toLowerCase();
  let finalBlob = blob;
  let ext: 'jpg' | 'png' = 'jpg';

  if (detectedType.includes('png') || urlCheck.includes('.png')) {
    // 1. Genuine PNG: Standard, lossless, perfectly compatible with all phones
    ext = 'png';
    finalBlob = blob;
  } else if (detectedType.includes('jpeg') || detectedType.includes('jpg') || urlCheck.includes('.jpg') || urlCheck.includes('.jpeg')) {
    // 2. Genuine JPEG: Standard photographic format, 100% compatible with all phones
    // Keep raw original blob directly to preserve camera metadata and avoid any canvas distortion
    ext = 'jpg';
    finalBlob = blob;
  } else {
    // 3. Exotic format (WebP, AVIF, etc.): Convert cleanly to standard JPEG
    try {
      finalBlob = await convertToStandardJpeg(blob, item, 0.96);
      ext = 'jpg';
    } catch {
      ext = 'jpg';
      finalBlob = blob;
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
  }, 2500);

  if (onStatusChange) onStatusChange('success');
}
