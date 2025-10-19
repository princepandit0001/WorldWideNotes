// JSONBIN.IO GLOBAL STORAGE - True worldwide document sharing
// Frontend-only registry so all devices can see uploaded notes

class JSONBinGlobalStorage {
    constructor() {
        // Provided credentials (frontend use per user's requirement)
        this.masterKey = '$2a$10$IFTGqeii/sqpc0hKBuRC..1n7Xame/tYb95uWW2s/.v4ZlqnfUufO';
        this.binId = '68f462e1d0ea881f40ab293d';
        this.apiUrl = 'https://api.jsonbin.io/v3';

        this.headers = {
            'Content-Type': 'application/json',
            'X-Master-Key': this.masterKey,
            'X-Access-Key': this.masterKey,
            'X-Bin-Meta': 'false'
        };
    }

    // Load all documents (global source of truth)
    async loadAllGlobalDocuments() {
        try {
            const res = await fetch(`${this.apiUrl}/b/${this.binId}/latest`, {
                method: 'GET',
                headers: this.headers,
                mode: 'cors'
            });

            if (!res.ok) {
                if (res.status === 404) {
                    // Initialize empty bin structure if missing
                    await this.initializeEmptyBin();
                    return [];
                }
                const txt = await res.text();
                throw new Error(`JSONBin read error ${res.status}: ${txt}`);
            }

            const json = await res.json();
            const docs = json.record?.documents || json.documents || [];
            return Array.isArray(docs) ? docs : [];
        } catch (err) {
            console.error('JSONBin load error:', err);
            return [];
        }
    }

    // Save/Upsert a single document into the bin
    async saveDocumentGlobally(document) {
        try {
            const current = await this.loadAllGlobalDocuments();
            const idx = current.findIndex(d =>
                (d.cloudinaryPublicId && document.cloudinaryPublicId && d.cloudinaryPublicId === document.cloudinaryPublicId) ||
                (d.id && document.id && d.id === document.id)
            );
            if (idx >= 0) current[idx] = { ...current[idx], ...document }; else current.push(document);

            const payload = {
                documents: current,
                metadata: {
                    version: '1.0',
                    purpose: 'World Wide Notes Global Document Storage'
                },
                lastUpdated: new Date().toISOString(),
                totalDocuments: current.length
            };

            const res = await fetch(`${this.apiUrl}/b/${this.binId}`, {
                method: 'PUT',
                headers: this.headers,
                mode: 'cors',
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`JSONBin write error ${res.status}: ${txt}`);
            }

            // Optional: refresh current view
            if (window.refreshDocumentDisplay) {
                setTimeout(() => window.refreshDocumentDisplay(), 500);
            }

            return true;
        } catch (err) {
            console.error('JSONBin save error:', err);
            return false;
        }
    }

    // Called from Cloudinary upload success
    async registerUpload(uploadResult, metadata = {}) {
        try {
            const doc = {
                // Identity
                id: uploadResult.public_id || `doc_${Date.now()}`,
                cloudinaryPublicId: uploadResult.public_id,

                // User-entered metadata
                title: metadata.title || this.generateTitleFromFilename(uploadResult.original_filename),
                description: metadata.description || `Student upload: ${uploadResult.original_filename}`,
                subject: metadata.subject || 'general',
                type: this.getFileType(uploadResult.original_filename),
                year: metadata.year || new Date().getFullYear(),
                tags: [
                    'global',
                    'jsonbin-shared',
                    ...(metadata.tags || []),
                    (metadata.subject || 'general')
                ],

                // Cloudinary info
                cloudinaryUrl: uploadResult.secure_url || uploadResult.url,
                downloadUrl: uploadResult.secure_url || uploadResult.url,
                fileName: uploadResult.original_filename,
                originalName: uploadResult.original_filename,
                fileType: (uploadResult.format || '').toUpperCase() || 'PDF',
                fileSize: this.formatFileSize(uploadResult.bytes),
                uploadDate: uploadResult.created_at || new Date().toISOString(),

                // Attribution
                uploadedBy: metadata.uploadedBy || 'Student',
                uploaderDevice: this.getDeviceInfo(),
                isCloudinary: true,
                isWorldwide: true
            };

            const saved = await this.saveDocumentGlobally(doc);
            if (!saved) throw new Error('Failed to persist to JSONBin');
            this.showGlobalSuccessNotification(doc);
            return doc;
        } catch (err) {
            console.error('Register upload error:', err);
            return null;
        }
    }

    async testConnection() {
        try {
            const res = await fetch(`${this.apiUrl}/b/${this.binId}/latest`, {
                method: 'GET',
                headers: this.headers,
                mode: 'cors'
            });
            return res.ok || res.status === 404;
        } catch (_) {
            return false;
        }
    }

    async initializeEmptyBin() {
        try {
            const payload = {
                documents: [],
                metadata: {
                    created: new Date().toISOString(),
                    version: '1.0',
                    purpose: 'World Wide Notes Global Document Storage'
                },
                lastUpdated: new Date().toISOString(),
                totalDocuments: 0
            };
            const res = await fetch(`${this.apiUrl}/b/${this.binId}`, {
                method: 'PUT',
                headers: this.headers,
                mode: 'cors',
                body: JSON.stringify(payload)
            });
            return res.ok;
        } catch (_) {
            return false;
        }
    }

    // Utilities
    generateTitleFromFilename(name) {
        if (!name) return 'Untitled Document';
        return name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
    }
    getFileType(name) {
        if (!name) return 'document';
        const ext = name.split('.').pop().toLowerCase();
        const map = { pdf: 'pdf', doc: 'document', docx: 'document', txt: 'text', jpg: 'image', png: 'image' };
        return map[ext] || 'document';
    }
    formatFileSize(bytes) {
        if (!bytes && bytes !== 0) return 'Unknown size';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes || 1) / Math.log(1024));
        return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
    }
    getDeviceInfo() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
    }
    showGlobalSuccessNotification(doc) {
        console.log(`🌍 "${doc.title}" is now globally visible!`);
    }
}

// Expose singleton
window.jsonBinGlobalStorage = new JSONBinGlobalStorage();

// Quick connectivity ping after load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        const ok = await window.jsonBinGlobalStorage.testConnection();
        if (ok) console.log('🌍 JSONBin ready'); else console.warn('⚠️ JSONBin connection failed');
    }, 800);
});

console.log('🌍 JSONBin Global Storage loaded');
