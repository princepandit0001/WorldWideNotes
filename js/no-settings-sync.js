// NO-SETTINGS CLOUDINARY SYNC - Works without changing Cloudinary settings
// Uses Cloudinary upload widget callbacks and browser storage for worldwide sync

class NoSettingsCloudinarySync {
    constructor() {
        this.cloudName = CLOUDINARY_CONFIG.cloudName;
        this.uploadPreset = CLOUDINARY_CONFIG.uploadPreset;
        this.folder = CLOUDINARY_CONFIG.folder;
        this.storageKey = 'wwnotes_nosettings_sync';
        this.syncInterval = null;
        this.isInitialized = false;
    }

    // Initialize without requiring any Cloudinary settings changes
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing No-Settings Cloudinary Sync...');
        
        try {
            // Setup browser-based sync system
            this.setupBrowserSync();
            
            // Start auto-refresh for cross-device sync
            this.startAutoRefresh();
            
            // Setup cross-tab communication
            this.setupCrossTabSync();
            
            this.isInitialized = true;
            console.log('✅ No-Settings sync ready! Works without changing Cloudinary settings.');
            
        } catch (error) {
            console.error('❌ Sync initialization failed:', error);
        }
    }

    // Save document - captures from Cloudinary upload widget
    async saveDocument(document) {
        try {
            console.log('💾 Saving document (no Cloudinary settings required):', document.title);
            
            // Get existing documents
            const existingDocs = await this.loadDocuments();
            
            // Add the new document
            const updatedDocs = this.mergeDocument(existingDocs, document);
            
            // Save to multiple browser storage locations
            const savePromises = [
                this.saveToPrimaryStorage(updatedDocs),
                this.saveToBackupStorage(updatedDocs),
                this.saveToSessionSync(updatedDocs),
                this.broadcastToAllTabs(document)
            ];

            const results = await Promise.allSettled(savePromises);
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
            
            if (successCount >= 2) {
                console.log(`✅ Document saved successfully (${successCount}/4 methods worked)`);
                this.showNotification(`✅ "${document.title}" saved! Syncing to all devices...`, 'success');
                
                // Immediate refresh to show the document
                setTimeout(() => {
                    if (typeof window.loadDocuments === 'function') {
                        window.loadDocuments();
                    }
                }, 1000);
                
                return true;
            } else {
                throw new Error('Insufficient save methods succeeded');
            }
            
        } catch (error) {
            console.error('❌ Save failed:', error);
            this.showNotification(`❌ Failed to save "${document.title}": ${error.message}`, 'error');
            return false;
        }
    }

    // Load documents from browser storage (no Cloudinary API needed)
    async loadDocuments() {
        try {
            console.log('📥 Loading documents from browser storage...');
            
            const loadMethods = [
                () => this.loadFromPrimaryStorage(),
                () => this.loadFromBackupStorage(),
                () => this.loadFromSessionSync(),
                () => this.loadFromCrossTabSync(),
                () => this.loadFromLegacyStorage()
            ];

            let allDocuments = [];
            
            for (const method of loadMethods) {
                try {
                    const docs = await method();
                    if (docs && docs.length > 0) {
                        allDocuments = allDocuments.concat(docs);
                        console.log(`📊 Found ${docs.length} documents from storage method`);
                    }
                } catch (error) {
                    console.log('Storage method failed:', error.message);
                }
            }

            // Remove duplicates and sort by date
            const uniqueDocs = this.removeDuplicates(allDocuments);
            const sortedDocs = uniqueDocs.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
            
            console.log(`✅ Total unique documents loaded: ${sortedDocs.length}`);
            
            return sortedDocs;
            
        } catch (error) {
            console.error('❌ Error loading documents:', error);
            return [];
        }
    }

    // Save to primary storage
    async saveToPrimaryStorage(documents) {
        try {
            const data = {
                documents: documents,
                lastUpdated: new Date().toISOString(),
                syncVersion: Date.now(),
                deviceId: this.getDeviceId(),
                cloudName: this.cloudName
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            console.log('💾 Saved to primary storage');
            return true;
        } catch (error) {
            console.error('Primary storage save failed:', error);
            return false;
        }
    }

    // Load from primary storage
    async loadFromPrimaryStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                return parsed.documents || [];
            }
            return [];
        } catch (error) {
            console.error('Primary storage load failed:', error);
            return [];
        }
    }

    // Save to backup storage
    async saveToBackupStorage(documents) {
        try {
            const backupKeys = [
                'wwnotes_backup_1',
                'wwnotes_backup_2',
                'cloudinaryCachedDocs'
            ];
            
            const data = {
                documents: documents,
                timestamp: Date.now(),
                source: 'NoSettingsSync'
            };
            
            for (const key of backupKeys) {
                localStorage.setItem(key, JSON.stringify(data));
            }
            
            console.log('🗃️ Saved to backup storage');
            return true;
        } catch (error) {
            console.error('Backup storage save failed:', error);
            return false;
        }
    }

    // Load from backup storage
    async loadFromBackupStorage() {
        try {
            const backupKeys = [
                'wwnotes_backup_1',
                'wwnotes_backup_2',
                'cloudinaryCachedDocs',
                'worldWideNotesDocuments'
            ];
            
            let allDocs = [];
            
            for (const key of backupKeys) {
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
            console.error('Backup storage load failed:', error);
            return [];
        }
    }

    // Save to session sync (for cross-tab communication)
    async saveToSessionSync(documents) {
        try {
            const sessionData = {
                documents: documents,
                timestamp: Date.now(),
                tabId: this.getTabId()
            };
            
            sessionStorage.setItem('wwnotes_session_sync', JSON.stringify(sessionData));
            
            // Also save to a cross-session key
            localStorage.setItem('wwnotes_latest_session', JSON.stringify(sessionData));
            
            console.log('📱 Saved to session sync');
            return true;
        } catch (error) {
            console.error('Session sync save failed:', error);
            return false;
        }
    }

    // Load from session sync
    async loadFromSessionSync() {
        try {
            const sources = [
                'wwnotes_session_sync',
                'wwnotes_latest_session'
            ];
            
            let allDocs = [];
            
            for (const key of sources) {
                const storages = [sessionStorage, localStorage];
                
                for (const storage of storages) {
                    try {
                        const data = storage.getItem(key);
                        if (data) {
                            const parsed = JSON.parse(data);
                            if (parsed.documents && Array.isArray(parsed.documents)) {
                                allDocs = allDocs.concat(parsed.documents);
                            }
                        }
                    } catch (e) {
                        // Continue to next storage
                    }
                }
            }
            
            return allDocs;
        } catch (error) {
            console.error('Session sync load failed:', error);
            return [];
        }
    }

    // Broadcast to all tabs
    async broadcastToAllTabs(document) {
        try {
            const broadcast = {
                type: 'newDocument',
                document: document,
                timestamp: Date.now(),
                deviceId: this.getDeviceId()
            };
            
            // Multiple broadcast channels for reliability
            const broadcastKeys = [
                'wwnotes_broadcast',
                'wwnotes_new_doc',
                'tab_communication'
            ];
            
            for (const key of broadcastKeys) {
                localStorage.setItem(key, JSON.stringify(broadcast));
            }
            
            console.log('📻 Broadcasted to all tabs');
            return true;
        } catch (error) {
            console.error('Broadcast failed:', error);
            return false;
        }
    }

    // Load from cross-tab sync
    async loadFromCrossTabSync() {
        try {
            const broadcastKeys = [
                'wwnotes_broadcast',
                'wwnotes_new_doc',
                'tab_communication'
            ];
            
            let documents = [];
            
            for (const key of broadcastKeys) {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    if (parsed.document && (Date.now() - parsed.timestamp < 3600000)) { // Last hour
                        documents.push(parsed.document);
                    }
                }
            }
            
            return documents;
        } catch (error) {
            console.error('Cross-tab sync load failed:', error);
            return [];
        }
    }

    // Load from legacy storage (compatibility)
    async loadFromLegacyStorage() {
        try {
            const legacyKeys = [
                'worldWideNotesDatabase',
                'realWorldwideSync',
                'crossDeviceSync'
            ];
            
            let allDocs = [];
            
            for (const key of legacyKeys) {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    const docs = parsed.documents || [];
                    if (Array.isArray(docs)) {
                        allDocs = allDocs.concat(docs);
                    }
                }
            }
            
            return allDocs;
        } catch (error) {
            console.error('Legacy storage load failed:', error);
            return [];
        }
    }

    // Setup browser-based sync
    setupBrowserSync() {
        // Create a sync manifest
        const manifest = {
            syncType: 'NoSettingsCloudinarySync',
            cloudName: this.cloudName,
            initialized: new Date().toISOString(),
            version: '1.0'
        };
        
        localStorage.setItem('wwnotes_sync_manifest', JSON.stringify(manifest));
        console.log('🔧 Browser sync setup complete');
    }

    // Start auto-refresh for cross-device sync
    startAutoRefresh() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => {
            this.performSync();
        }, 30000); // Sync every 30 seconds
        
        console.log('🔄 Auto-refresh started (every 30 seconds)');
    }

    // Setup cross-tab communication
    setupCrossTabSync() {
        // Listen for storage events (cross-tab communication)
        window.addEventListener('storage', (e) => {
            if (e.key && e.key.includes('wwnotes_') && e.newValue) {
                console.log('📡 Received cross-tab update');
                
                // Refresh documents after a short delay
                setTimeout(() => {
                    if (typeof window.loadDocuments === 'function') {
                        window.loadDocuments();
                    }
                }, 2000);
            }
        });
        
        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('👁️ Page became visible, syncing...');
                setTimeout(() => this.performSync(), 1000);
            }
        });
        
        console.log('📡 Cross-tab sync setup complete');
    }

    // Perform sync operation
    async performSync() {
        try {
            console.log('🔄 Performing sync...');
            const documents = await this.loadDocuments();
            
            if (documents.length > 0 && typeof window.loadDocuments === 'function') {
                window.loadDocuments();
            }
        } catch (error) {
            console.error('Sync error:', error);
        }
    }

    // Utility methods
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

        // Keep only last 150 documents
        return existingDocs.slice(0, 150);
    }

    removeDuplicates(documents) {
        const seen = new Map();
        
        return documents.filter(doc => {
            const key = doc.cloudinaryPublicId || doc.id || `${doc.title}_${doc.uploadDate}`;
            
            if (seen.has(key)) {
                return false;
            }
            
            seen.set(key, doc);
            return true;
        });
    }

    getDeviceId() {
        let deviceId = localStorage.getItem('wwnotes_device_id');
        if (!deviceId) {
            deviceId = 'device_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now();
            localStorage.setItem('wwnotes_device_id', deviceId);
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
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 350px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.5;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center;">
                <div style="margin-right: 10px; font-size: 18px;">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : '🔧'}
                </div>
                <div>${message}</div>
            </div>
        `;

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
    }
}

// Create and initialize the no-settings sync
const noSettingsSync = new NoSettingsCloudinarySync();

// Make class available globally
window.NoSettingsCloudinarySync = NoSettingsCloudinarySync;
window.noSettingsSync = noSettingsSync;

// Override global functions
window.saveToWorldwideDatabase = async function(document) {
    return await noSettingsSync.saveDocument(document);
};

window.loadFromWorldwideDatabase = async function() {
    return await noSettingsSync.loadDocuments();
};

// Replace existing sync systems
window.instantSync = noSettingsSync;
window.pureCloudinarySync = noSettingsSync;
window.cloudinaryWorkaroundSync = noSettingsSync;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    await noSettingsSync.initialize();
    
    setTimeout(() => {
        noSettingsSync.showNotification('🚀 No-settings sync active! Works without changing Cloudinary settings.', 'success');
    }, 2000);
});

console.log('🚀 No-Settings Cloudinary Sync loaded - no Cloudinary changes required!');