/**
 * Lumen Plain Image Search Engine - Type Definitions
 */

export interface ImageItem {
  id: string;
  title: string;
  description: string;
  thumbUrl: string;
  previewUrl: string;
  downloadUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  author: string;
  authorUrl?: string;
  sourceName: string;
  sourceUrl: string;
  license?: string;
  date?: string;
  dimensionsFormatted?: string;
}

export interface SearchResult {
  query: string;
  items: ImageItem[];
  total: number;
  hasMore: boolean;
  page: number;
}

