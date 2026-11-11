/**
 * Plain Image Search Engine - Main Application (TypeScript)
 */

import { ImageApiService } from './api.js';
import { LightboxController } from './lightbox.js';
import { ImageItem } from './types.js';

class PlainImageSearchApp {
  private api: ImageApiService;
  private lightbox: LightboxController;

  private currentQuery: string = 'nature';
  private currentPage: number = 1;
  private isLoading: boolean = false;
  private currentItems: ImageItem[] = [];
  private hasMore: boolean = false;

  // DOM Elements
  private searchForm!: HTMLFormElement;
  private searchInput!: HTMLInputElement;
  private searchClearBtn!: HTMLButtonElement;
  private searchSpinner!: HTMLElement;
  private suggestionChips!: NodeListOf<HTMLButtonElement>;

  private queryTitleEl!: HTMLElement;
  private countSpanEl!: HTMLElement;
  private galleryGrid!: HTMLElement;
  private loadMoreContainer!: HTMLElement;
  private loadMoreBtn!: HTMLButtonElement;

  constructor() {
    this.api = new ImageApiService();
    this.lightbox = new LightboxController();

    this.cacheDOMElements();
    this.initFromUrl();
    this.bindEvents();

    // Initial search
    this.executeSearch(this.currentQuery, 1, false);
  }

  private cacheDOMElements(): void {
    this.searchForm = document.getElementById('search-form') as HTMLFormElement;
    this.searchInput = document.getElementById('search-input') as HTMLInputElement;
    this.searchClearBtn = document.getElementById('search-clear-btn') as HTMLButtonElement;
    this.searchSpinner = document.getElementById('search-spinner') as HTMLElement;
    this.suggestionChips = document.querySelectorAll('.suggestion-chip');

    this.queryTitleEl = document.getElementById('result-query-title') as HTMLElement;
    this.countSpanEl = document.getElementById('result-count-span') as HTMLElement;
    this.galleryGrid = document.getElementById('gallery-grid') as HTMLElement;
    this.loadMoreContainer = document.getElementById('load-more-container') as HTMLElement;
    this.loadMoreBtn = document.getElementById('load-more-btn') as HTMLButtonElement;
  }

  private initFromUrl(): void {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q && q.trim()) {
      this.currentQuery = q.trim();
      this.searchInput.value = this.currentQuery;
    } else {
      this.currentQuery = 'nature';
      this.searchInput.value = 'nature';
    }
    this.toggleClearButton();
  }

  private updateUrl(): void {
    const params = new URLSearchParams();
    if (this.currentQuery) {
      params.set('q', this.currentQuery);
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }

  private bindEvents(): void {
    // Form submit
    this.searchForm.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      const val = this.searchInput.value.trim();
      if (val) {
        this.currentQuery = val;
        this.executeSearch(this.currentQuery, 1, false);
      }
    });

    // Debounced live typing
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    this.searchInput.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const val = target.value;
      this.toggleClearButton();

      if (val.trim()) {
        this.searchSpinner.classList.remove('hidden');
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (val.trim() && val.trim() !== this.currentQuery) {
            this.currentQuery = val.trim();
            this.executeSearch(this.currentQuery, 1, false);
          }
        }, 450);
      } else {
        this.searchSpinner.classList.add('hidden');
      }
    });

    // Clear search input
    this.searchClearBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.toggleClearButton();
      this.searchInput.focus();
    });

    // Suggestion chips
    this.suggestionChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const query = chip.dataset.query || chip.textContent?.trim() || '';
        if (query) {
          this.searchInput.value = query;
          this.currentQuery = query;
          this.toggleClearButton();
          this.executeSearch(this.currentQuery, 1, false);
        }
      });
    });

    // Load More pagination
    this.loadMoreBtn.addEventListener('click', () => {
      if (!this.isLoading && this.hasMore) {
        this.executeSearch(this.currentQuery, this.currentPage + 1, true);
      }
    });
  }

  private toggleClearButton(): void {
    if (this.searchInput.value.length > 0) {
      this.searchClearBtn.classList.remove('hidden');
    } else {
      this.searchClearBtn.classList.add('hidden');
    }
  }

  private async executeSearch(query: string, page: number = 1, append: boolean = false): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;
    this.searchSpinner.classList.remove('hidden');

    if (!append) {
      this.currentPage = 1;
      this.currentItems = [];
      this.queryTitleEl.textContent = `“${query}”`;
      this.countSpanEl.textContent = 'Searching...';
      this.renderSkeletons(12);
      this.loadMoreContainer.classList.add('hidden');
    } else {
      this.loadMoreBtn.textContent = 'Loading more...';
      this.loadMoreBtn.disabled = true;
    }

    this.updateUrl();

    try {
      const res = await this.api.search(query, page);

      this.searchSpinner.classList.add('hidden');
      this.isLoading = false;
      this.loadMoreBtn.disabled = false;
      this.loadMoreBtn.textContent = 'Load More Images';

      if (res.items.length === 0 && !append) {
        this.countSpanEl.textContent = '0 images found';
        this.renderEmptyState(query);
        this.loadMoreContainer.classList.add('hidden');
        return;
      }

      if (append) {
        this.currentItems = [...this.currentItems, ...res.items];
        this.currentPage = page;
      } else {
        this.currentItems = res.items;
        this.currentPage = 1;
      }

      this.hasMore = res.hasMore;
      const count = this.currentItems.length;
      this.countSpanEl.textContent = `${count}+ images found`;

      this.renderGrid(this.currentItems);

      if (this.hasMore) {
        this.loadMoreContainer.classList.remove('hidden');
      } else {
        this.loadMoreContainer.classList.add('hidden');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      this.searchSpinner.classList.add('hidden');
      this.isLoading = false;
      this.loadMoreContainer.classList.add('hidden');
      this.countSpanEl.textContent = 'Error';
      this.renderErrorState(err.message || 'Unable to retrieve images from the external API.');
    }
  }

  private renderGrid(items: ImageItem[]): void {
    this.galleryGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    items.forEach((item, index) => {
      const card = document.createElement('article');
      card.className = 'masonry-card';
      card.dataset.index = index.toString();

      card.innerHTML = `
        <div class="card-inner">
          <img 
            src="${item.thumbUrl}" 
            alt="${this.escapeHtml(item.title)}" 
            loading="lazy" 
            class="card-img"
            onload="this.classList.add('loaded')"
            onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22600%22%20height%3D%22400%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23eae7e1%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%23999%22%20text-anchor%3D%22middle%22%3EImage%20Unavailable%3C%2Ftext%3E%3C%2Fsvg%3E'"
          />

          <!-- Quick Action Bar on Card -->
          <div class="card-overlay">
            <div class="card-meta">
              <h3 class="card-title" title="${this.escapeHtml(item.title)}">${this.escapeHtml(item.title)}</h3>
              <p class="card-artist">By ${this.escapeHtml(item.author)}</p>
            </div>
            
            <div class="card-actions">
              <button type="button" class="card-action-btn preview-btn" title="Realistic Fullscreen Preview">
                Preview
              </button>
              <button type="button" class="card-action-icon-btn download-btn" title="Download High-Res Image">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;

      // Clicking card or Preview button opens the realistic preview
      card.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.download-btn')) {
          e.stopPropagation();
          this.triggerDownload(item);
          return;
        }
        this.lightbox.open(items, index);
      });

      fragment.appendChild(card);
    });

    this.galleryGrid.appendChild(fragment);
  }

  private triggerDownload(item: ImageItem): void {
    const originalUrl = item.downloadUrl || item.previewUrl;
    const filename = `${(item.title || 'photograph').slice(0, 35).replace(/[^a-z0-9]/gi, '_')}.jpg`;

    fetch(originalUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        window.open(originalUrl, '_blank');
      });
  }

  private renderSkeletons(count: number = 12): void {
    this.galleryGrid.innerHTML = '';
    const heights = [280, 360, 240, 400, 300, 320, 260, 380, 310, 340, 270, 390];

    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'masonry-card skeleton-card';
      card.style.height = `${heights[i % heights.length]}px`;
      card.innerHTML = `
        <div class="skeleton-shimmer"></div>
        <div class="skeleton-meta">
          <div class="skeleton-line title"></div>
          <div class="skeleton-line subtitle"></div>
        </div>
      `;
      this.galleryGrid.appendChild(card);
    }
  }

  private renderEmptyState(query: string): void {
    this.galleryGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
            <path d="M8 11h6"/>
          </svg>
        </div>
        <h3 class="empty-title">No images found for “${this.escapeHtml(query)}”</h3>
        <p class="empty-desc">Try exploring one of these popular photographic topics:</p>
        <div class="empty-chips">
          <button type="button" class="empty-chip" data-query="Coastal calm">Coastal calm</button>
          <button type="button" class="empty-chip" data-query="Modern homes">Modern homes</button>
          <button type="button" class="empty-chip" data-query="Wildflowers">Wildflowers</button>
          <button type="button" class="empty-chip" data-query="Tokyo nights">Tokyo nights</button>
          <button type="button" class="empty-chip" data-query="Architecture">Architecture</button>
          <button type="button" class="empty-chip" data-query="Nature">Nature</button>
        </div>
      </div>
    `;

    this.galleryGrid.querySelectorAll('.empty-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = (btn as HTMLElement).dataset.query || '';
        this.searchInput.value = q;
        this.currentQuery = q;
        this.toggleClearButton();
        this.executeSearch(q, 1, false);
      });
    });
  }

  private renderErrorState(message: string): void {
    this.galleryGrid.innerHTML = `
      <div class="empty-state error-state">
        <h3 class="empty-title">Unable to retrieve images</h3>
        <p class="empty-desc">${this.escapeHtml(message)}</p>
        <button type="button" class="btn-retry" id="retry-search-btn">Retry Search</button>
      </div>
    `;

    document.getElementById('retry-search-btn')?.addEventListener('click', () => {
      this.executeSearch(this.currentQuery, 1, false);
    });
  }

  private escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Bootstrap once DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new PlainImageSearchApp();
});

