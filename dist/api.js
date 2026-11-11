/**
 * Lumen Image Search Engine - API Service (TypeScript)
 * Integrates external high-resolution REST APIs with zero friction.
 */
export class ImageApiService {
    perPage = 24;
    /**
     * Search for high-resolution images by keyword
     */
    async search(query, page = 1) {
        const cleanQuery = query.trim();
        if (!cleanQuery) {
            return {
                query: '',
                items: [],
                total: 0,
                hasMore: false,
                page: 1
            };
        }
        const offset = (page - 1) * this.perPage;
        const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanQuery)}&gsrnamespace=6&gsrlimit=${this.perPage}&gsroffset=${offset}&prop=imageinfo&iiprop=url|size|extmetadata|mime&iiurlwidth=1280&format=json&origin=*`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`External API responded with status ${response.status}`);
            }
            const data = await response.json();
            if (!data.query || !data.query.pages) {
                return {
                    query: cleanQuery,
                    items: [],
                    total: 0,
                    hasMore: false,
                    page
                };
            }
            const pages = Object.values(data.query.pages);
            const items = pages
                .filter((p) => p.imageinfo && p.imageinfo.length > 0)
                .map((p) => {
                const info = p.imageinfo[0];
                const ext = info.extmetadata || {};
                // Clean title
                const rawTitle = p.title.replace(/^File:/i, '');
                const cleanTitle = rawTitle.replace(/\.[^/.]+$/, '').trim();
                // Photographer / Author
                const rawArtist = ext.Artist?.value || ext.Credit?.value || 'Wikimedia Contributor';
                const cleanArtist = this.stripHtml(rawArtist) || 'Unknown Photographer';
                // Description
                const rawDesc = ext.ImageDescription?.value || cleanTitle;
                const cleanDesc = this.stripHtml(rawDesc);
                // License
                const license = ext.LicenseShortName?.value || ext.License?.value || 'Open License';
                // Dimensions
                const width = Number(info.width) || 1920;
                const height = Number(info.height) || 1080;
                const aspectRatio = width / (height || 1);
                // Original high-resolution URL for download
                const downloadUrl = info.url;
                // High-definition preview URL (1280px width)
                const previewUrl = info.thumburl || info.url;
                // Grid thumbnail URL
                const thumbUrl = info.thumburl || info.url;
                return {
                    id: `img-${p.pageid}`,
                    title: cleanTitle,
                    description: cleanDesc,
                    thumbUrl,
                    previewUrl,
                    downloadUrl,
                    width,
                    height,
                    aspectRatio,
                    author: cleanArtist,
                    authorUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
                    sourceName: 'Wikimedia Commons',
                    sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
                    license,
                    date: ext.DateTimeOriginal?.value || ext.DateTime?.value || '',
                    dimensionsFormatted: `${width} × ${height}`
                };
            });
            return {
                query: cleanQuery,
                items,
                total: items.length >= this.perPage ? items.length * 4 : items.length,
                hasMore: items.length >= this.perPage,
                page
            };
        }
        catch (error) {
            console.error('Error fetching images:', error);
            throw error;
        }
    }
    /**
     * Helper to strip HTML tags from metadata strings
     */
    stripHtml(html) {
        if (!html)
            return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const text = tmp.textContent || tmp.innerText || '';
        return text.replace(/\s+/g, ' ').trim();
    }
}
//# sourceMappingURL=api.js.map