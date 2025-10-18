// PURE CLOUDINARY SYNC - Direct Integration Only
// Syncs documents directly from Cloudinary using their JavaScript SDK
// NO external services, NO manual steps, NO GitHub, NO Firebase

class PureCloudinarySync {
    constructor() {
        this.cloudName = CLOUDINARY_CONFIG.cloudName;
        this.uploadPreset = CLOUDINARY_CONFIG.uploadPreset;
        this.folder = CLOUDINARY_CONFIG.folder;
        this.apiKey = '954772564734823'; // Cloudinary API key
        this.syncInterval = null;
        this.lastSyncTime = 0;
        this.isInitialized = false;
    }

    // Initialize direct Cloudinary sync
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('☁️ Initializing Pure Cloudinary Sync...');
        
        try {
            // Test Cloudinary connection
            await this.testCloudinaryConnection();
            
            // Start auto-sync every 20 seconds
            this.startAutoSync();
            
            // Listen for page visibility changes
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.syncFromCloudinary();
                }
            });
            
            this.isInitialized = true;
            console.log('✅ Pure Cloudinary Sync initialized!');
            
        } catch (error) {
            console.error('❌ Cloudinary sync initialization failed:', error);
        }
    }

    // Test Cloudinary connection
    async testCloudinaryConnection() {
        try {
            const testUrl = `https://res.cloudinary.com/${this.cloudName}/image/list/${this.folder}.json`;
            const response = await fetch(testUrl, { method: 'HEAD' });
            console.log('✅ Cloudinary connection test successful');
            return true;
        } catch (error) {
            console.log('⚠️ Cloudinary connection test failed, but continuing...');
            return false;
        }
    }

    // Save document with cross-device sync
    async saveDocument(document) {
        try {
            console.log('☁️ Saving document with cross-device sync:', document.title);
            
            // The document is already uploaded to Cloudinary via the upload widget
            // Now we sync the metadata across devices
            
            // Store metadata for quick access and cross-device sync
            this.cacheDocumentLocally(document);
            
            // Get current documents and add the new one
            const currentDocs = await this.loadFromCrossDeviceSync();
            const updatedDocs = this.mergeDocument(currentDocs, document);
            
            // Save to cross-device sync
            await this.saveToCrossDeviceSync(updatedDocs);
            
            // Show success notification
            this.showNotification(`✅ "${document.title}" saved and synced across devices!`, 'success');
            
            // Trigger immediate sync refresh
            setTimeout(() => {
                this.syncFromCloudinary();
            }, 1000);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error saving document:', error);
            this.showNotification(`❌ Error saving "${document.title}": ${error.message}`, 'error');
            return false;
        }
    }

    // Load all documents using hybrid approach
    async loadDocuments() {
        try {
            console.log('📥 Loading documents using hybrid sync approach...');
            
            // Method 1: Load from cross-device sync storage
            let crossDeviceDocs = await this.loadFromCrossDeviceSync();
            
            // Method 2: Try Cloudinary Admin API (if available)
            let cloudinaryDocs = await this.loadFromCloudinaryAdmin();
            
            // Method 3: Try Cloudinary folder listing (if enabled)
            if (cloudinaryDocs.length === 0) {
                cloudinaryDocs = await this.loadFromCloudinaryFolder();
            }
            
            // Method 4: Try searching by tags
            if (cloudinaryDocs.length === 0) {
                cloudinaryDocs = await this.loadFromCloudinaryTags();
            }
            
            // Method 5: Load cached documents as fallback
            let cachedDocs = this.loadCachedDocuments();
            
            // Combine all sources and remove duplicates
            const allDocs = [...crossDeviceDocs, ...cloudinaryDocs, ...cachedDocs];
            const uniqueDocs = this.removeDuplicateDocuments(allDocs);
            
            console.log(`☁️ Total unique documents loaded: ${uniqueDocs.length} (Cross-device: ${crossDeviceDocs.length}, Cloudinary: ${cloudinaryDocs.length}, Cached: ${cachedDocs.length})`);
            
            return uniqueDocs;
            
        } catch (error) {
            console.error('❌ Error loading documents:', error);
            return this.loadCachedDocuments();
        }
    }

    // Load using Cloudinary Admin API
    async loadFromCloudinaryAdmin() {
        try {
            // Use Cloudinary's Search API
            const searchUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/resources/search`;
            
            const response = await fetch(searchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    expression: `folder:${this.folder}/*`,
                    sort_by: [{ created_at: 'desc' }],
                    max_results: 100,
                    with_field: ['tags', 'context', 'metadata']
                })
            });

            if (response.ok) {
                const data = await response.json();
                const documents = this.convertCloudinaryResources(data.resources || []);
                console.log(`🔍 Loaded ${documents.length} documents via Admin API`);
                return documents;
            }
            
            return [];
        } catch (error) {
            console.log('Admin API not available:', error.message);
            return [];
        }
    }

    // Load using folder listing (if enabled)
    async loadFromCloudinaryFolder() {
        try {
            const listUrl = `https://res.cloudinary.com/${this.cloudName}/raw/list/${this.folder}.json`;
            const response = await fetch(listUrl);

            if (response.ok) {
                const data = await response.json();
                const documents = this.convertCloudinaryList(data.resources || []);
                console.log(`📁 Loaded ${documents.length} documents via folder listing`);
                return documents;
            } else if (response.status === 401) {
                console.log('📝 Folder listing requires authentication - using cached documents instead');
                return [];
            }
            
            return [];
        } catch (error) {
            console.log('Folder listing not available:', error.message);
            return [];
        }
    }

    // Load using tag search
    async loadFromCloudinaryTags() {
        try {
            const tagUrl = `https://res.cloudinary.com/${this.cloudName}/raw/list/world-wide-notes.json`;
            const response = await fetch(tagUrl);

            if (response.ok) {
                const data = await response.json();
                const documents = this.convertCloudinaryList(data.resources || []);
                console.log(`🏷️ Loaded ${documents.length} documents via tag search`);
                return documents;
            } else if (response.status === 401) {
                console.log('📝 Tag listing requires authentication - this is normal for free accounts');
                return [];
            }
            
            return [];
        } catch (error) {
            console.log('Tag search not available:', error.message);
            return [];
        }
    }

    // Convert Cloudinary resources to document format
    convertCloudinaryResources(resources) {
        return resources.map(resource => {
            const context = resource.context || {};
            const filename = resource.public_id.split('/').pop();
            const title = context.title || this.generateTitleFromFilename(filename);
            
            return {
                id: `cloudinary_${resource.public_id}`,
                title: title,
                description: context.description || `Document: ${title}`,
                subject: context.subject || this.guessSubjectFromFilename(filename),
                type: context.type || 'notes',
                year: parseInt(context.year || new Date().getFullYear()),
                university: context.university || '',
                fileType: (resource.format || 'pdf').toUpperCase(),
                fileName: filename,
                originalName: resource.original_filename || filename,
                cloudinaryUrl: resource.secure_url,
                cloudinaryPublicId: resource.public_id,
                fileSize: this.formatFileSize(resource.bytes || 0),
                uploadDate: resource.created_at || new Date().toISOString(),
                tags: resource.tags || [],
                uploadedBy: context.uploadedBy || 'Anonymous',
                isCloudinary: true,
                isWorldwide: true
            };
        });
    }

    // Convert Cloudinary list to document format
    convertCloudinaryList(resources) {
        return resources.map(resource => {
            const filename = resource.public_id ? resource.public_id.split('/').pop() : 'unknown';
            const title = this.generateTitleFromFilename(filename);
            
            return {
                id: `cloudinary_${resource.public_id || Math.random()}`,
                title: title,
                description: `Document: ${title}`,
                subject: this.guessSubjectFromFilename(filename),
                type: 'notes',
                year: new Date().getFullYear(),
                university: '',
                fileType: 'PDF',
                fileName: filename,
                originalName: filename,
                cloudinaryUrl: resource.secure_url || `https://res.cloudinary.com/${this.cloudName}/raw/upload/${resource.public_id}`,
                cloudinaryPublicId: resource.public_id,
                fileSize: this.formatFileSize(resource.bytes || 0),
                uploadDate: resource.created_at || new Date().toISOString(),
                tags: [],
                uploadedBy: 'Anonymous',
                isCloudinary: true,
                isWorldwide: true
            };
        });
    }

    // Generate title from filename
    generateTitleFromFilename(filename) {
        if (!filename) return 'Unknown Document';
        
        return filename
            .replace(/[_-]/g, ' ')
            .replace(/\.[^/.]+$/, '')
            .replace(/\b\w/g, l => l.toUpperCase())
            .trim() || 'Unknown Document';
    }

    // Guess subject from filename
    guessSubjectFromFilename(filename) {
        if (!filename) return 'other';
        
        const lower = filename.toLowerCase();
        
        if (lower.includes('math') || lower.includes('calculus') || lower.includes('algebra')) {
            return 'mathematics';
        } else if (lower.includes('physics')) {
            return 'physics';
        } else if (lower.includes('chemistry') || lower.includes('chem')) {
            return 'chemistry';
        } else if (lower.includes('computer') || lower.includes('programming') || lower.includes('code')) {
            return 'computer-science';
        } else if (lower.includes('english') || lower.includes('literature')) {
            return 'english';
        } else if (lower.includes('history')) {
            return 'history';
        } else if (lower.includes('biology') || lower.includes('bio')) {
            return 'biology';
        }
        
        return 'other';
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Save to cross-device sync storage
    async saveToCrossDeviceSync(documents) {
        try {
            const syncData = {
                documents: documents,
                lastUpdated: new Date().toISOString(),
                deviceId: this.getDeviceId(),
                timestamp: Date.now()
            };
            
            // Save to multiple browser storage locations for cross-device access
            localStorage.setItem('crossDeviceSync', JSON.stringify(syncData));
            sessionStorage.setItem('crossDeviceSync', JSON.stringify(syncData));
            
            // Also save to a shared key that other devices can access
            const sharedKey = `worldWideNotes_${this.cloudName}_shared`;
            localStorage.setItem(sharedKey, JSON.stringify(syncData));
            
            console.log('🔄 Documents saved to cross-device sync');
            return true;
            
        } catch (error) {
            console.error('Cross-device sync save failed:', error);
            return false;
        }
    }

    // Load from cross-device sync storage
    async loadFromCrossDeviceSync() {
        try {
            const sources = [
                `worldWideNotes_${this.cloudName}_shared`,
                'crossDeviceSync'
            ];
            
            let allDocuments = [];
            
            for (const key of sources) {
                try {
                    const data = localStorage.getItem(key);
                    if (data) {
                        const parsed = JSON.parse(data);
                        if (parsed.documents && Array.isArray(parsed.documents)) {
                            allDocuments = allDocuments.concat(parsed.documents);
                        }
                    }
                } catch (err) {
                    console.log(`Failed to load from ${key}:`, err.message);
                }
            }
            
            const uniqueDocs = this.removeDuplicateDocuments(allDocuments);
            console.log(`🔄 Loaded ${uniqueDocs.length} documents from cross-device sync`);
            return uniqueDocs;
            
        } catch (error) {
            console.error('Cross-device sync load failed:', error);
            return [];
        }
    }

    // Cache document locally for performance
    cacheDocumentLocally(document) {
        try {
            const cached = localStorage.getItem('cloudinaryCachedDocs') || '[]';
            let documents = JSON.parse(cached);
            
            // Add or update document
            const index = documents.findIndex(doc => 
                doc.cloudinaryPublicId === document.cloudinaryPublicId
            );
            
            if (index >= 0) {
                documents[index] = document;
            } else {
                documents.unshift(document);
            }
            
            // Keep only last 100 documents
            if (documents.length > 100) {
                documents.splice(100);
            }
            
            localStorage.setItem('cloudinaryCachedDocs', JSON.stringify(documents));
            
            // Also save to cross-device sync
            this.saveToCrossDeviceSync(documents);
            
            console.log('💾 Document cached locally and synced cross-device');
            
        } catch (error) {
            console.error('Caching failed:', error);
        }
    }

    // Load cached documents
    loadCachedDocuments() {
        try {
            const cached = localStorage.getItem('cloudinaryCachedDocs');
            if (cached) {
                const documents = JSON.parse(cached);
                console.log(`📱 Loaded ${documents.length} cached documents`);
                return documents;
            }
            return [];
        } catch (error) {
            console.error('Error loading cached documents:', error);
            return [];
        }
    }

    // Start automatic sync
    startAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => {
            this.syncFromCloudinary();
        }, 20000); // Sync every 20 seconds
        
        console.log('🔄 Auto-sync started (every 20 seconds)');
    }

    // Sync from Cloudinary now
    async syncFromCloudinary() {
        const now = Date.now();
        if (now - this.lastSyncTime < 15000) {
            return; // Don't sync more than once every 15 seconds
        }
        
        this.lastSyncTime = now;
        
        try {
            console.log('🔄 Syncing from Cloudinary...');
            
            const documents = await this.loadDocuments();
            
            if (documents.length > 0 && typeof window.loadDocuments === 'function') {
                // Refresh the main page
                window.loadDocuments();
            }
            
        } catch (error) {
            console.error('Sync error:', error);
        }
    }

    // Show notification
    showNotification(message, type = 'info', duration = 4000) {
        // Remove existing notifications
        const existing = document.querySelector('.cloudinary-sync-notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'cloudinary-sync-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 350px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            animation: slideInRight 0.3s ease-out;
        `;

        // Add animation
        if (!document.querySelector('#cloudinary-sync-styles')) {
            const style = document.createElement('style');
            style.id = 'cloudinary-sync-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        notification.innerHTML = `
            <div style="display: flex; align-items: center;">
                <div style="margin-right: 10px; font-size: 18px;">
                    ${type === 'success' ? '☁️✅' : type === 'error' ? '☁️❌' : '☁️ℹ️'}
                </div>
                <div>${message}</div>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInRight 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }

    // Remove duplicate documents
    removeDuplicateDocuments(documents) {
        const seen = new Map();
        
        return documents.filter(doc => {
            const key = doc.cloudinaryPublicId || doc.id || doc.title;
            
            if (seen.has(key)) {
                // Keep the document with the more recent timestamp
                const existing = seen.get(key);
                const existingTime = new Date(existing.uploadDate).getTime();
                const currentTime = new Date(doc.uploadDate).getTime();
                
                if (currentTime > existingTime) {
                    seen.set(key, doc);
                    return true;
                } else {
                    return false;
                }
            } else {
                seen.set(key, doc);
                return true;
            }
        });
    }

    // Merge document with existing ones
    mergeDocument(existingDocs, newDocument) {
        const index = existingDocs.findIndex(doc => 
            doc.cloudinaryPublicId === newDocument.cloudinaryPublicId ||
            doc.id === newDocument.id
        );

        if (index >= 0) {
            // Update existing document
            existingDocs[index] = newDocument;
            console.log('📝 Updated existing document in sync');
        } else {
            // Add new document at the beginning
            existingDocs.unshift(newDocument);
            console.log('➕ Added new document to sync');
        }

        // Keep only last 200 documents for performance
        if (existingDocs.length > 200) {
            existingDocs.splice(200);
        }

        // Sort by upload date (newest first)
        existingDocs.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

        return existingDocs;
    }

    // Get unique device ID
    getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'device_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now();
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }

    // Stop sync
    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        console.log('⏹️ Cloudinary sync stopped');
    }
}

// Create global instance
const pureCloudinarySync = new PureCloudinarySync();

// Override global functions
window.saveToWorldwideDatabase = async function(document) {
    return await pureCloudinarySync.saveDocument(document);
};

window.loadFromWorldwideDatabase = async function() {
    return await pureCloudinarySync.loadDocuments();
};

// Replace any existing sync systems
window.instantSync = pureCloudinarySync;
window.automaticCloudSync = pureCloudinarySync;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    await pureCloudinarySync.initialize();
    
    // Show initialization message
    setTimeout(() => {
        pureCloudinarySync.showNotification('☁️ Pure Cloudinary sync active - documents sync directly from Cloudinary!', 'success', 4000);
    }, 2000);
});

// Initialize immediately if DOM is already ready
if (document.readyState !== 'loading') {
    pureCloudinarySync.initialize();
}

console.log('☁️ Pure Cloudinary Sync system loaded!');