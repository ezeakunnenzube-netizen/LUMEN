/**
 * Realistic Image Preview & Download Modal Controller (TypeScript)
 */

import { ImageItem } from './types.js';
import { downloadImageWithCompatibility } from './download.js';

export class LightboxController {
  private modalEl: HTMLElement;
  private backdropEl: HTMLElement;
  private closeBtn: HTMLElement;
  private prevBtn: HTMLElement;
  private nextBtn: HTMLElement;
  private imgEl: HTMLImageElement;
  private loaderEl: HTMLElement;

  private titleEl: HTMLElement;
  private authorEl: HTMLElement;
  private authorLinkEl: HTMLAnchorElement;
  private dimensionsEl: HTMLElement;
  private licenseEl: HTMLElement;
  private counterEl: HTMLElement;

  private downloadBtn: HTMLButtonElement;
  private sourceLink: HTMLAnchorElement;

  private items: ImageItem[] = [];
  private currentIndex: number = 0;
  private isOpen: boolean = false;

  constructor() {
    this.modalEl = document.getElementById('lightbox-modal') as HTMLElement;
    this.backdropEl = document.getElementById('lightbox-backdrop') as HTMLElement;
    this.closeBtn = document.getElementById('lightbox-close') as HTMLElement;
    this.prevBtn = document.getElementById('lightbox-prev') as HTMLElement;
    this.nextBtn = document.getElementById('lightbox-next') as HTMLElement;
    this.imgEl = document.getElementById('lightbox-img') as HTMLImageElement;
    this.loaderEl = document.getElementById('lightbox-loader') as HTMLElement;

    this.titleEl = document.getElementById('lightbox-title') as HTMLElement;
    this.authorEl = document.getElementById('lightbox-author') as HTMLElement;
    this.authorLinkEl = document.getElementById('lightbox-author-link') as HTMLAnchorElement;
    this.dimensionsEl = document.getElementById('lightbox-dimensions') as HTMLElement;
    this.licenseEl = document.getElementById('lightbox-license') as HTMLElement;
    this.counterEl = document.getElementById('lightbox-counter') as HTMLElement;

    this.downloadBtn = document.getElementById('lightbox-download-btn') as HTMLButtonElement;
    this.sourceLink = document.getElementById('lightbox-source-link') as HTMLAnchorElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.closeBtn.addEventListener('click', () => this.close());
    this.backdropEl.addEventListener('click', () => this.close());

    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());

    // Keyboard shortcuts
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.isOpen) return;

      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'ArrowLeft') {
        this.prev();
      } else if (e.key === 'ArrowRight') {
        this.next();
      }
    });

    // Direct Image Download
    this.downloadBtn.addEventListener('click', () => {
      const current = this.items[this.currentIndex];
      if (current) {
        this.downloadImage(current);
      }
    });
  }

  public open(items: ImageItem[], index: number = 0): void {
    if (!items || items.length === 0) return;
    this.items = items;
    this.currentIndex = Math.max(0, Math.min(index, items.length - 1));
    this.isOpen = true;

    this.modalEl.classList.remove('hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    this.renderCurrent();
  }

  public close(): void {
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
    this.modalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    this.imgEl.src = '';
  }

  public prev(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      this.currentIndex = this.items.length - 1;
    }
    this.renderCurrent();
  }

  public next(): void {
    if (this.currentIndex < this.items.length - 1) {
      this.currentIndex++;
    } else {
      this.currentIndex = 0;
    }
    this.renderCurrent();
  }

  private renderCurrent(): void {
    const item = this.items[this.currentIndex];
    if (!item) return;

    // Show loading state
    this.loaderEl.classList.remove('hidden');
    this.imgEl.style.opacity = '0.3';

    // Progressive image preloading
    const preload = new Image();
    const targetUrl = item.previewUrl || item.downloadUrl;
    preload.src = targetUrl;
    preload.onload = () => {
      this.imgEl.src = targetUrl;
      this.imgEl.alt = item.title;
      this.imgEl.style.opacity = '1';
      this.loaderEl.classList.add('hidden');
    };
    preload.onerror = () => {
      this.imgEl.src = item.thumbUrl;
      this.imgEl.style.opacity = '1';
      this.loaderEl.classList.add('hidden');
    };

    // Metadata rendering
    this.titleEl.textContent = item.title || 'Untitled Photograph';
    this.authorEl.textContent = item.author;

    if (item.authorUrl) {
      this.authorLinkEl.href = item.authorUrl;
      this.authorLinkEl.style.display = 'inline-flex';
    } else {
      this.authorLinkEl.style.display = 'none';
    }

    // Realistic dimension formatting
    const dims = item.dimensionsFormatted || `${item.width} × ${item.height}`;
    const orientationTag = item.aspectRatio >= 1.2 ? 'Landscape' : item.aspectRatio <= 0.85 ? 'Portrait' : 'Square';
    this.dimensionsEl.textContent = `${dims} px · ${orientationTag}`;

    this.licenseEl.textContent = item.license || 'Open License';
    this.counterEl.textContent = `${this.currentIndex + 1} / ${this.items.length}`;

    if (item.sourceUrl) {
      this.sourceLink.href = item.sourceUrl;
      this.sourceLink.style.display = 'inline-flex';
    } else {
      this.sourceLink.style.display = 'none';
    }

    // Reset download button text
    this.downloadBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>Download Image</span>
    `;
    this.downloadBtn.disabled = false;
  }

  /**
   * Direct high-resolution image download with guaranteed compatibility
   */
  private async downloadImage(item: ImageItem): Promise<void> {
    this.downloadBtn.disabled = true;

    await downloadImageWithCompatibility(item, (status) => {
      if (status === 'downloading') {
        this.downloadBtn.innerHTML = `
          <div class="download-spinner"></div>
          <span>Downloading...</span>
        `;
      } else if (status === 'processing') {
        this.downloadBtn.innerHTML = `
          <div class="download-spinner"></div>
          <span>Optimizing Format...</span>
        `;
      } else if (status === 'success') {
        this.downloadBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Downloaded</span>
        `;
        setTimeout(() => {
          this.downloadBtn.disabled = false;
          this.downloadBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Download Image</span>
          `;
        }, 2200);
      } else if (status === 'error') {
        this.downloadBtn.disabled = false;
        this.downloadBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Download Image</span>
        `;
      }
    });
  }
}

