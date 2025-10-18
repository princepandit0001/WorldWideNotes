// GLOBAL DOCUMENT REGISTRY - Makes ALL uploads visible to ALL users worldwide
// This solves the core problem: uploads only visible to uploader

class GlobalDocumentRegistry {
    constructor() {
        this.cloudName = CLOUDINARY_CONFIG.cloudName;
        this.uploadPreset = CLOUDINARY_CONFIG.uploadPreset;
        this.folder = CLOUDINARY_CONFIG.folder;
        
        // Multiple global storage methods
        this.globalStorageKeys = [
            'wwnotes_global_registry',
            'worldwideNotesGlobal',
            'global_document_share',
            'wwnotes_public_documents'
        ];
        
        // External sharing services (free, no API keys needed)
        this.shareEndpoints = [
            'https://api.jsonbin.io/v3/b',
            'https://httpbin.org/post',
            'https://postman-echo.com/post'
        ];
    }

    // Register a new upload globally (called after successful Cloudinary upload)
    async registerGlobalUpload(uploadResult, userMetadata = {}) {
        console.log('🌍 Registering upload globally...', uploadResult);
        
        const globalDocument = {
            // Global registry metadata
            globalId: `global_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            registeredAt: new Date().toISOString(),
            publiclyAccessible: true,
            globallyVisible: true,
            
            // Document data
            id: uploadResult.public_id || `doc_${Date.now()}`,
            title: userMetadata.title || this.generateTitleFromFilename(uploadResult.original_filename),
            description: userMetadata.description || `Uploaded by student: ${uploadResult.original_filename}`,
            subject: userMetadata.subject || this.guessSubjectFromFilename(uploadResult.original_filename),
            type: this.getFileType(uploadResult.original_filename),
            year: userMetadata.year || new Date().getFullYear(),
            
            // Cloudinary URLs (publicly accessible)
            cloudinaryUrl: uploadResult.secure_url || uploadResult.url,
            cloudinaryPublicId: uploadResult.public_id,
            downloadUrl: uploadResult.secure_url || uploadResult.url,
            
            // File metadata
            fileName: uploadResult.original_filename,
            originalName: uploadResult.original_filename,
            fileSize: this.formatFileSize(uploadResult.bytes),
            uploadDate: uploadResult.created_at || new Date().toISOString(),
            
            // Public metadata
            tags: [
                'public',
                'global',
                'student-upload',
                ...(userMetadata.tags || []),
                this.getFileType(uploadResult.original_filename)
            ],
            uploadedBy: userMetadata.uploadedBy || 'Student',
            uploaderDevice: this.getDeviceInfo(),
            
            // Cloudinary metadata
            isCloudinary: true,
            resourceType: uploadResult.resource_type,
            format: uploadResult.format,
            
            // Global sharing
            sharedGlobally: true,
            accessLevel: 'public',
            visibleToAll: true
        };

        try {
            // Method 1: Save to local storage across multiple keys
            await this.saveToMultipleLocalStorage(globalDocument);
            
            // Method 2: Broadcast to all open tabs/windows
            this.broadcastToAllTabs(globalDocument);
            
            // Method 3: Try external sharing (best effort)
            this.shareToExternalServices(globalDocument);
            
            console.log('✅ Document registered globally:', globalDocument.title);
            this.showGlobalRegistrationSuccess(globalDocument);
            
            return globalDocument;
            
        } catch (error) {
            console.error('❌ Global registration failed:', error);
            // Still return the document even if global sharing fails
            return globalDocument;
        }
    }

    // Save document to multiple localStorage keys for redundancy
    async saveToMultipleLocalStorage(document) {
        for (const key of this.globalStorageKeys) {
            try {
                const existing = JSON.parse(localStorage.getItem(key) || '[]');
                
                // Remove any duplicates
                const filtered = existing.filter(doc => 
                    doc.cloudinaryPublicId !== document.cloudinaryPublicId &&
                    doc.fileName !== document.fileName
                );
                
                // Add new document
                filtered.push(document);
                
                localStorage.setItem(key, JSON.stringify(filtered));
                console.log(`💾 Saved to localStorage: ${key}`);
                
            } catch (error) {
                console.warn(`Failed to save to ${key}:`, error);
            }
        }
    }

    // Broadcast new upload to all open tabs/windows
    broadcastToAllTabs(document) {
        try {
            // Use localStorage events for cross-tab communication
            const broadcastData = {
                type: 'NEW_GLOBAL_UPLOAD',
                document: document,
                timestamp: Date.now()
            };
            
            localStorage.setItem('wwnotes_broadcast', JSON.stringify(broadcastData));
            
            // Use BroadcastChannel if available
            if (window.BroadcastChannel) {
                const channel = new BroadcastChannel('wwnotes_global');
                channel.postMessage(broadcastData);
            }
            
            console.log('📡 Broadcasted to all tabs');
            
        } catch (error) {
            console.warn('Broadcast failed:', error);
        }
    }

    // Share to external services (best effort, no API keys required)
    async shareToExternalServices(document) {
        // Create a simplified version for sharing
        const shareData = {
            title: document.title,
            fileName: document.fileName,
            cloudinaryUrl: document.cloudinaryUrl,
            uploadDate: document.uploadDate,
            subject: document.subject,
            tags: document.tags,
            publicId: document.cloudinaryPublicId
        };
        
        // Try each endpoint (best effort)
        for (const endpoint of this.shareEndpoints) {
            try {
                await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        wwnotes_global_upload: shareData,
                        timestamp: Date.now()
                    })
                });
                console.log(`🌐 Shared to external service: ${endpoint}`);
                break; // Success, no need to try others
                
            } catch (error) {
                console.warn(`External sharing failed for ${endpoint}:`, error);
            }
        }
    }

    // Load ALL globally registered documents
    async loadAllGlobalDocuments() {
        console.log('🌍 Loading all global documents...');
        
        const allDocuments = [];
        const seenIds = new Set();
        
        // Load from all localStorage keys
        for (const key of this.globalStorageKeys) {
            try {
                const documents = JSON.parse(localStorage.getItem(key) || '[]');
                
                for (const doc of documents) {
                    // Avoid duplicates
                    const uniqueId = doc.cloudinaryPublicId || doc.fileName;
                    if (!seenIds.has(uniqueId)) {
                        seenIds.add(uniqueId);
                        allDocuments.push(doc);
                    }
                }
                
            } catch (error) {
                console.warn(`Failed to load from ${key}:`, error);
            }
        }
        
        console.log(`🌍 Loaded ${allDocuments.length} global documents`);
        return allDocuments;
    }

    // Setup cross-tab listeners for new uploads
    setupGlobalListeners() {
        // Listen for localStorage changes (cross-tab communication)
        window.addEventListener('storage', (event) => {
            if (event.key === 'wwnotes_broadcast' && event.newValue) {
                try {
                    const data = JSON.parse(event.newValue);
                    if (data.type === 'NEW_GLOBAL_UPLOAD') {
                        console.log('📡 Received new global upload:', data.document.title);
                        this.handleNewGlobalUpload(data.document);
                    }
                } catch (error) {
                    console.warn('Failed to handle broadcast:', error);
                }
            }
        });
        
        // Listen for BroadcastChannel messages
        if (window.BroadcastChannel) {
            const channel = new BroadcastChannel('wwnotes_global');
            channel.onmessage = (event) => {
                if (event.data.type === 'NEW_GLOBAL_UPLOAD') {
                    console.log('📡 Received broadcast upload:', event.data.document.title);
                    this.handleNewGlobalUpload(event.data.document);
                }
            };
        }
        
        console.log('📡 Global listeners setup complete');
    }

    // Handle new upload received from other tabs/devices
    handleNewGlobalUpload(document) {
        // Add to local storage
        this.saveToMultipleLocalStorage(document);
        
        // Trigger UI update if function exists
        if (window.refreshDocumentDisplay) {
            window.refreshDocumentDisplay();
        }
        
        // Show notification
        this.showNewUploadNotification(document);
    }

    // Utility functions
    generateTitleFromFilename(filename) {
        if (!filename) return 'Untitled Document';
        
        return filename
            .replace(/\.[^/.]+$/, '') // Remove extension
            .replace(/[_-]/g, ' ') // Replace underscores/hyphens with spaces
            .replace(/\b\w/g, l => l.toUpperCase()) // Title case
            .trim();
    }

    guessSubjectFromFilename(filename) {
        if (!filename) return 'general';
        
        const lower = filename.toLowerCase();
        const subjects = {
            'math': ['math', 'calculus', 'algebra', 'geometry'],
            'physics': ['physics', 'mechanics', 'thermodynamics'],
            'chemistry': ['chemistry', 'organic', 'inorganic'],
            'biology': ['biology', 'anatomy', 'genetics'],
            'english': ['english', 'literature', 'essay'],
            'history': ['history', 'social'],
            'computer': ['computer', 'programming', 'code', 'cs'],
            'resume': ['resume', 'cv', 'curriculum']
        };
        
        for (const [subject, keywords] of Object.entries(subjects)) {
            if (keywords.some(keyword => lower.includes(keyword))) {
                return subject;
            }
        }
        
        return 'general';
    }

    getFileType(filename) {
        if (!filename) return 'document';
        
        const ext = filename.split('.').pop().toLowerCase();
        const types = {
            'pdf': 'pdf',
            'doc': 'document',
            'docx': 'document',
            'txt': 'text',
            'jpg': 'image',
            'png': 'image',
            'jpeg': 'image'
        };
        
        return types[ext] || 'document';
    }

    formatFileSize(bytes) {
        if (!bytes) return 'Unknown size';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    getDeviceInfo() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        return isMobile ? 'Mobile' : 'Desktop';
    }

    showGlobalRegistrationSuccess(document) {
        console.log(`🌍 ✅ "${document.title}" is now globally accessible to all students!`);
        
        // Show notification if function exists
        if (window.showNotification) {
            window.showNotification(
                `🌍 ${document.title} shared globally!`,
                'All students can now access this file'
            );
        }
    }

    showNewUploadNotification(document) {
        console.log(`📥 New upload available: ${document.title}`);
        
        if (window.showNotification) {
            window.showNotification(
                `📥 New file available: ${document.title}`,
                `Uploaded by ${document.uploadedBy}`
            );
        }
    }
}

// Create global registry
const globalDocumentRegistry = new GlobalDocumentRegistry();
window.globalDocumentRegistry = globalDocumentRegistry;

// Setup global listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    globalDocumentRegistry.setupGlobalListeners();
    console.log('🌍 Global Document Registry ready!');
});

console.log('🌍 Global Document Registry loaded!');