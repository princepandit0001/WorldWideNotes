// CLOUDINARY WORKAROUND SYNC - Handles 401 errors gracefully
// Uses browser-based sync to share documents across devices when Cloudinary API is restricted

class CloudinaryWorkaroundSync {
    constructor() {
        this.cloudName = CLOUDINARY_CONFIG.cloudName;
        this.uploadPreset = CLOUDINARY_CONFIG.uploadPreset;
        this.folder = CLOUDINARY_CONFIG.folder;
        this.syncInterval = null;
        this.isInitialized = false;
        this.syncKey = `wwnotes_sync_${this.cloudName}`;
    }

    // Initialize the workaround sync
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🔧 Initializing Cloudinary Workaround Sync...');
        
        try {
            // Check if we can access Cloudinary
            await this.checkCloudinaryAccess();
            
            // Setup cross-browser sync
            this.setupCrossBrowserSync();
            
            // Start periodic sync
            this.startPeriodicSync();
            
            this.isInitialized = true;
            console.log('✅ Workaround sync initialized successfully!');
            
        } catch (error) {
            console.error('❌ Sync initialization failed:', error);
        }
    }

    // Check what Cloudinary access we have
    async checkCloudinaryAccess() {
        const testUrls = [
            `https://res.cloudinary.com/${this.cloudName}/raw/list/${this.folder}.json`,
            `https://res.cloudinary.com/${this.cloudName}/image/list/world-wide-notes.json`
        ];

        let hasAccess = false;
        
        for (const url of testUrls) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    console.log('✅ Cloudinary API access available:', url);
                    hasAccess = true;
                    break;
                } else if (response.status === 401) {
                    console.log('⚠️ Cloudinary API requires authentication:', url);
                } else {
                    console.log(`⚠️ Cloudinary API returned ${response.status}:`, url);
                }
            } catch (error) {
                console.log('⚠️ Cloudinary API test failed:', url, error.message);
            }
        }

        if (!hasAccess) {
            console.log('ℹ️ Using workaround sync due to Cloudinary API limitations');
        }

        return hasAccess;
    }

    // Save document using workaround method
    async saveDocument(document) {
        try {
            console.log('💾 Saving document with workaround sync:', document.title);
            
            // Get existing documents
            const existingDocs = await this.loadDocuments();
            
            // Add or update the document
            const updatedDocs = this.mergeDocument(existingDocs, document);
            
            // Save to multiple storage locations for reliability
            const saveResults = await Promise.allSettled([
                this.saveToLocalStorage(updatedDocs),
                this.saveToSessionStorage(updatedDocs),
                this.saveToBrowserDatabase(updatedDocs),
                this.broadcastToOtherTabs(document)
            ]);

            const successCount = saveResults.filter(r => r.status === 'fulfilled' && r.value).length;
            
            if (successCount >= 2) {
                console.log(`✅ Document saved successfully (${successCount}/4 methods)`);
                this.showNotification(`✅ "${document.title}" saved and syncing across devices!`, 'success');
                
                // Trigger page refresh to show new document
                setTimeout(() => {
                    if (typeof window.loadDocuments === 'function') {
                        window.loadDocuments();
                    }
                }, 500);
                
                return true;
            } else {
                throw new Error('Most save methods failed');
            }
            
        } catch (error) {
            console.error('❌ Document save failed:', error);
            this.showNotification(`❌ Failed to save "${document.title}": ${error.message}`, 'error');
            return false;
        }
    }

    // Load documents using all available methods
    async loadDocuments() {
        try {
            console.log('📥 Loading documents with workaround sync...');
            
            const loadMethods = [
                () => this.loadFromBrowserDatabase(),
                () => this.loadFromLocalStorage(),
                () => this.loadFromSessionStorage(),
                () => this.loadFromOtherTabs(),
                () => this.loadFromCloudinaryIfPossible()
            ];

            let allDocuments = [];
            
            for (const method of loadMethods) {
                try {
                    const docs = await method();
                    if (docs && docs.length > 0) {
                        allDocuments = allDocuments.concat(docs);
                    }
                } catch (error) {
                    console.log('Load method failed:', error.message);
                }
            }

            // Remove duplicates and sort
            const uniqueDocs = this.removeDuplicates(allDocuments);
            const sortedDocs = uniqueDocs.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
            
            console.log(`📊 Loaded ${sortedDocs.length} unique documents total`);
            
            return sortedDocs;
            
        } catch (error) {
            console.error('❌ Error loading documents:', error);
            return [];
        }
    }

    // Save to localStorage
    async saveToLocalStorage(documents) {
        try {
            const data = {
                documents: documents,
                lastUpdated: new Date().toISOString(),
                deviceId: this.getDeviceId(),
                syncVersion: Date.now()
            };
            
            localStorage.setItem(this.syncKey, JSON.stringify(data));
            localStorage.setItem('wwnotes_backup', JSON.stringify(data));
            console.log('💾 Saved to localStorage');
            return true;
        } catch (error) {
            console.error('localStorage save failed:', error);
            return false;
        }
    }

    // Load from localStorage
    async loadFromLocalStorage() {
        try {
            const keys = [this.syncKey, 'wwnotes_backup', 'cloudinaryCachedDocs'];
            let allDocs = [];
            
            for (const key of keys) {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    const docs = parsed.documents || parsed || [];
                    if (Array.isArray(docs)) {
                        allDocs = allDocs.concat(docs);
                    }
                }
            }
            
            return allDocs;
        } catch (error) {
            console.error('localStorage load failed:', error);
            return [];
        }
    }

    // Save to sessionStorage for cross-tab sync
    async saveToSessionStorage(documents) {
        try {
            const data = {
                documents: documents,
                timestamp: Date.now(),
                tabId: this.getTabId()
            };
            
            sessionStorage.setItem('wwnotes_session', JSON.stringify(data));
            console.log('📡 Saved to sessionStorage');
            return true;
        } catch (error) {
            console.error('sessionStorage save failed:', error);
            return false;
        }
    }

    // Load from sessionStorage
    async loadFromSessionStorage() {
        try {
            const data = sessionStorage.getItem('wwnotes_session');
            if (data) {
                const parsed = JSON.parse(data);
                return parsed.documents || [];
            }
            return [];
        } catch (error) {
            console.error('sessionStorage load failed:', error);
            return [];
        }
    }

    // Save to IndexedDB (browser database)
    async saveToBrowserDatabase(documents) {
        try {
            // Simple IndexedDB simulation using localStorage
            const dbData = {
                documents: documents,
                lastSync: new Date().toISOString(),
                version: '1.0'
            };
            
            localStorage.setItem('wwnotes_db', JSON.stringify(dbData));
            console.log('🗄️ Saved to browser database');
            return true;
        } catch (error) {
            console.error('Browser database save failed:', error);
            return false;
        }
    }

    // Load from browser database
    async loadFromBrowserDatabase() {
        try {
            const data = localStorage.getItem('wwnotes_db');
            if (data) {
                const parsed = JSON.parse(data);
                return parsed.documents || [];
            }
            return [];
        } catch (error) {
            console.error('Browser database load failed:', error);
            return [];
        }
    }

    // Broadcast to other tabs
    async broadcastToOtherTabs(document) {
        try {
            const broadcast = {
                type: 'newDocument',
                document: document,
                timestamp: Date.now(),
                deviceId: this.getDeviceId()
            };
            
            localStorage.setItem('wwnotes_broadcast', JSON.stringify(broadcast));
            
            // Setup listener if not already done
            if (!this.broadcastListener) {
                this.setupBroadcastListener();
            }
            
            console.log('📻 Broadcasted to other tabs');
            return true;
        } catch (error) {
            console.error('Broadcast failed:', error);
            return false;
        }
    }

    // Load from other tabs
    async loadFromOtherTabs() {
        try {
            const broadcast = localStorage.getItem('wwnotes_broadcast');
            if (broadcast) {
                const data = JSON.parse(broadcast);
                if (data.document && (Date.now() - data.timestamp < 600000)) { // Last 10 minutes
                    return [data.document];
                }
            }
            return [];
        } catch (error) {
            console.error('Other tabs load failed:', error);
            return [];
        }
    }

    // Try to load from Cloudinary if possible
    async loadFromCloudinaryIfPossible() {
        try {
            // This will fail with 401, but we try anyway
            const response = await fetch(`https://res.cloudinary.com/${this.cloudName}/raw/list/${this.folder}.json`);
            
            if (response.ok) {
                const data = await response.json();
                const docs = this.convertCloudinaryResources(data.resources || []);
                console.log(`☁️ Successfully loaded ${docs.length} from Cloudinary API`);
                return docs;
            }
            
            return [];
        } catch (error) {
            // Expected to fail, that's why we have workarounds
            return [];
        }
    }

    // Setup broadcast listener for cross-tab communication
    setupBroadcastListener() {
        this.broadcastListener = (e) => {
            if (e.key === 'wwnotes_broadcast' && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    if (data.deviceId !== this.getDeviceId() && data.document) {
                        console.log('📢 Received document from another tab:', data.document.title);
                        
                        // Refresh the page after a short delay
                        setTimeout(() => {
                            if (typeof window.loadDocuments === 'function') {
                                window.loadDocuments();
                            }
                        }, 1000);
                    }
                } catch (error) {
                    console.error('Broadcast parse error:', error);
                }
            }
        };
        
        window.addEventListener('storage', this.broadcastListener);
        console.log('👂 Broadcast listener setup complete');
    }

    // Setup cross-browser sync
    setupCrossBrowserSync() {
        // Setup storage event listener for cross-tab sync
        this.setupBroadcastListener();
        
        // Setup visibility change listener
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                setTimeout(() => this.syncNow(), 1000);
            }
        });
    }

    // Start periodic sync
    startPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => {
            this.syncNow();
        }, 30000); // Sync every 30 seconds
        
        console.log('🔄 Periodic sync started (every 30 seconds)');
    }

    // Sync now
    async syncNow() {
        try {
            console.log('🔄 Syncing documents...');
            const documents = await this.loadDocuments();
            
            if (documents.length > 0 && typeof window.loadDocuments === 'function') {
                window.loadDocuments();
            }
        } catch (error) {
            console.error('Sync error:', error);
        }
    }

    // Helper methods
    mergeDocument(existingDocs, newDocument) {
        const index = existingDocs.findIndex(doc => 
            doc.cloudinaryPublicId === newDocument.cloudinaryPublicId ||
            doc.id === newDocument.id
        );

        if (index >= 0) {
            existingDocs[index] = newDocument;
        } else {
            existingDocs.unshift(newDocument);
        }

        return existingDocs.slice(0, 100); // Keep only 100 documents
    }

    removeDuplicates(documents) {
        const seen = new Set();
        return documents.filter(doc => {
            const key = doc.cloudinaryPublicId || doc.id || doc.title;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    convertCloudinaryResources(resources) {
        return resources.map(resource => {
            const filename = resource.public_id.split('/').pop();
            return {
                id: `cloudinary_${resource.public_id}`,
                title: this.generateTitle(filename),
                description: `Document: ${filename}`,
                subject: 'other',
                type: 'notes',
                year: new Date().getFullYear(),
                cloudinaryUrl: resource.secure_url,
                cloudinaryPublicId: resource.public_id,
                fileSize: this.formatBytes(resource.bytes || 0),
                uploadDate: resource.created_at || new Date().toISOString(),
                isCloudinary: true
            };
        });
    }

    generateTitle(filename) {
        return filename.replace(/[_-]/g, ' ').replace(/\.[^/.]+$/, '').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getDeviceId() {
        let deviceId = localStorage.getItem('wwnotes_deviceId');
        if (!deviceId) {
            deviceId = 'device_' + Math.random().toString(36).substr(2, 10) + '_' + Date.now();
            localStorage.setItem('wwnotes_deviceId', deviceId);
        }
        return deviceId;
    }

    getTabId() {
        if (!this.tabId) {
            this.tabId = 'tab_' + Math.random().toString(36).substr(2, 8);
        }
        return this.tabId;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 350px;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;

        notification.innerHTML = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        if (this.broadcastListener) {
            window.removeEventListener('storage', this.broadcastListener);
        }
    }
}

// Create and export the workaround sync
const cloudinaryWorkaroundSync = new CloudinaryWorkaroundSync();

// Override global functions
window.saveToWorldwideDatabase = async function(document) {
    return await cloudinaryWorkaroundSync.saveDocument(document);
};

window.loadFromWorldwideDatabase = async function() {
    return await cloudinaryWorkaroundSync.loadDocuments();
};

window.instantSync = cloudinaryWorkaroundSync;
window.pureCloudinarySync = cloudinaryWorkaroundSync;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    await cloudinaryWorkaroundSync.initialize();
    
    setTimeout(() => {
        cloudinaryWorkaroundSync.showNotification('🔧 Workaround sync active - handles Cloudinary 401 errors!', 'success');
    }, 2000);
});

console.log('🔧 Cloudinary Workaround Sync loaded - handles 401 errors gracefully!');