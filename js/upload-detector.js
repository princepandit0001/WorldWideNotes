// CLOUDINARY UPLOAD DETECTOR - Detects uploads via widget callbacks
// This captures documents as they're uploaded and syncs them worldwide

class CloudinaryUploadDetector {
    constructor() {
        this.cloudName = CLOUDINARY_CONFIG.cloudName;
        this.uploadPreset = CLOUDINARY_CONFIG.uploadPreset;
        this.folder = CLOUDINARY_CONFIG.folder;
        this.detectedUploads = new Map();
        this.storageKey = 'wwnotes_detected_uploads';
        this.isInitialized = false;
    }

    // Initialize the upload detector
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🔍 Initializing Cloudinary Upload Detector...');
        
        try {
            // Load previously detected uploads
            await this.loadDetectedUploads();
            
            // Set up Cloudinary widget monitoring
            this.setupWidgetMonitoring();
            
            // Set up upload detection via URL patterns
            this.setupUploadDetection();
            
            // Try to detect existing uploads
            await this.detectExistingUploads();
            
            this.isInitialized = true;
            console.log('✅ Upload detector initialized successfully!');
            
        } catch (error) {
            console.error('❌ Upload detector initialization failed:', error);
        }
    }

    // Setup Cloudinary widget monitoring
    setupWidgetMonitoring() {
        // Monitor for Cloudinary widget success events
        const originalCreateUploadWidget = window.cloudinary?.createUploadWidget;
        
        if (originalCreateUploadWidget) {
            window.cloudinary.createUploadWidget = (...args) => {
                const widget = originalCreateUploadWidget.apply(window.cloudinary, args);
                
                // Wrap the original callback to capture uploads
                const originalCallback = args[1];
                args[1] = (error, result) => {
                    if (!error && result && result.event === "success") {
                        console.log('🔍 Detected upload via widget:', result.info.public_id);
                        this.captureUpload(result.info);
                    }
                    
                    // Call original callback
                    if (originalCallback) {
                        originalCallback(error, result);
                    }
                };
                
                return widget;
            };
            
            console.log('📡 Cloudinary widget monitoring setup');
        }
    }

    // Setup upload detection via URL patterns
    setupUploadDetection() {
        // Monitor fetch requests for Cloudinary uploads
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            const url = args[0];
            
            // Check if it's a Cloudinary upload or resource URL
            if (typeof url === 'string' && url.includes('cloudinary.com')) {
                console.log('🔍 Detected Cloudinary request:', url);
                
                // If it's our cloud and folder, try to extract info
                if (url.includes(this.cloudName) && url.includes(this.folder)) {
                    this.analyzeCloudinaryUrl(url);
                }
            }
            
            return originalFetch(...args);
        };
        
        console.log('🔍 URL pattern detection setup');
    }

    // Analyze Cloudinary URLs to detect uploads
    analyzeCloudinaryUrl(url) {
        try {
            // Extract public_id from URL patterns like:
            // https://res.cloudinary.com/dpfrv7kmo/raw/upload/world-wide-notes/filename.pdf
            const match = url.match(/\/upload\/([^\/]+\/[^\/\?]+)/);
            if (match) {
                const publicId = match[1];
                console.log('🔍 Detected potential upload from URL:', publicId);
                
                // Create a basic document object
                this.detectUploadFromUrl(url, publicId);
            }
        } catch (error) {
            console.error('URL analysis failed:', error);
        }
    }

    // Detect upload from URL analysis
    detectUploadFromUrl(url, publicId) {
        try {
            const filename = publicId.split('/').pop();
            const title = this.generateTitleFromFilename(filename);
            
            const detectedDoc = {
                id: `detected_${publicId.replace(/[^a-zA-Z0-9]/g, '_')}`,
                title: title,
                description: `Document detected from Cloudinary: ${filename}`,
                subject: this.guessSubjectFromFilename(filename),
                type: 'notes',
                year: new Date().getFullYear(),
                cloudinaryUrl: url,
                cloudinaryPublicId: publicId,
                fileName: filename,
                originalName: filename,
                fileSize: 'Unknown',
                uploadDate: new Date().toISOString(),
                tags: ['detected', 'cloudinary'],
                uploadedBy: 'Detected Upload',
                isCloudinary: true,
                isDetected: true
            };
            
            this.addDetectedUpload(detectedDoc);
            
        } catch (error) {
            console.error('Upload detection from URL failed:', error);
        }
    }

    // Capture upload from widget callback
    captureUpload(uploadInfo) {
        try {
            const filename = uploadInfo.original_filename || uploadInfo.public_id.split('/').pop();
            const title = this.generateTitleFromFilename(filename);
            
            const document = {
                id: `upload_${uploadInfo.public_id.replace(/[^a-zA-Z0-9]/g, '_')}`,
                title: title,
                description: `Document uploaded to Cloudinary: ${filename}`,
                subject: this.guessSubjectFromFilename(filename),
                type: 'notes',
                year: new Date().getFullYear(),
                cloudinaryUrl: uploadInfo.secure_url,
                cloudinaryPublicId: uploadInfo.public_id,
                fileName: filename,
                originalName: uploadInfo.original_filename || filename,
                fileSize: this.formatBytes(uploadInfo.bytes || 0),
                uploadDate: uploadInfo.created_at || new Date().toISOString(),
                tags: uploadInfo.tags || ['upload'],
                uploadedBy: 'Widget Upload',
                isCloudinary: true,
                isCaptured: true
            };
            
            console.log('📤 Captured upload:', document.title);
            this.addDetectedUpload(document);
            
            // Notify the sync system
            if (window.noSettingsSync) {
                window.noSettingsSync.saveDocument(document);
            }
            
        } catch (error) {
            console.error('Upload capture failed:', error);
        }
    }

    // Try to detect existing uploads by testing common patterns
    async detectExistingUploads() {
        console.log('🔍 Attempting to detect existing uploads...');
        
        try {
            // Try to detect uploads by testing common file extensions and names
            const commonPatterns = [
                'resume',
                'cv',
                'notes',
                'document',
                'file',
                'upload'
            ];
            
            const commonExtensions = ['pdf', 'doc', 'docx', 'txt'];
            
            for (const pattern of commonPatterns) {
                for (const ext of commonExtensions) {
                    await this.testCloudinaryFile(`${this.folder}/${pattern}.${ext}`);
                    await this.testCloudinaryFile(`${this.folder}/${pattern}_${Date.now()}.${ext}`);
                }
            }
            
            // Also try to detect files uploaded today
            const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
            for (const ext of commonExtensions) {
                await this.testCloudinaryFile(`${this.folder}/doc_${today}.${ext}`);
            }
            
        } catch (error) {
            console.error('Existing upload detection failed:', error);
        }
    }

    // Test if a specific Cloudinary file exists
    async testCloudinaryFile(publicId) {
        try {
            const testUrl = `https://res.cloudinary.com/${this.cloudName}/raw/upload/${publicId}`;
            
            // Use HEAD request to test if file exists without downloading
            const response = await fetch(testUrl, { method: 'HEAD' });
            
            if (response.ok) {
                console.log('🔍 Found existing upload:', publicId);
                
                // Create document object for found file
                const filename = publicId.split('/').pop();
                const detectedDoc = {
                    id: `found_${publicId.replace(/[^a-zA-Z0-9]/g, '_')}`,
                    title: this.generateTitleFromFilename(filename),
                    description: `Existing document found in Cloudinary: ${filename}`,
                    subject: this.guessSubjectFromFilename(filename),
                    type: 'notes',
                    year: new Date().getFullYear(),
                    cloudinaryUrl: testUrl.replace('/raw/upload/', '/raw/upload/'),
                    cloudinaryPublicId: publicId,
                    fileName: filename,
                    originalName: filename,
                    fileSize: 'Unknown',
                    uploadDate: new Date().toISOString(),
                    tags: ['found', 'existing'],
                    uploadedBy: 'Detected Existing',
                    isCloudinary: true,
                    isFound: true
                };
                
                this.addDetectedUpload(detectedDoc);
                
                // Notify sync system
                if (window.noSettingsSync) {
                    window.noSettingsSync.saveDocument(detectedDoc);
                }
            }
            
        } catch (error) {
            // Expected for non-existent files
        }
    }

    // Add detected upload to storage
    addDetectedUpload(document) {
        try {
            this.detectedUploads.set(document.cloudinaryPublicId, document);
            this.saveDetectedUploads();
            
            console.log('✅ Added detected upload:', document.title);
            
            // Trigger page refresh to show new document
            setTimeout(() => {
                if (typeof window.loadDocuments === 'function') {
                    window.loadDocuments();
                }
            }, 1000);
            
        } catch (error) {
            console.error('Failed to add detected upload:', error);
        }
    }

    // Save detected uploads to storage
    saveDetectedUploads() {
        try {
            const uploadsArray = Array.from(this.detectedUploads.values());
            const data = {
                uploads: uploadsArray,
                lastUpdated: new Date().toISOString(),
                totalCount: uploadsArray.length
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            
            // Also save to backup location
            localStorage.setItem('wwnotes_backup_detected', JSON.stringify(data));
            
            console.log(`💾 Saved ${uploadsArray.length} detected uploads`);
            
        } catch (error) {
            console.error('Failed to save detected uploads:', error);
        }
    }

    // Load detected uploads from storage
    async loadDetectedUploads() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                const uploads = parsed.uploads || [];
                
                uploads.forEach(upload => {
                    this.detectedUploads.set(upload.cloudinaryPublicId, upload);
                });
                
                console.log(`📥 Loaded ${uploads.length} previously detected uploads`);
                return uploads;
            }
            
            return [];
        } catch (error) {
            console.error('Failed to load detected uploads:', error);
            return [];
        }
    }

    // Get all detected uploads
    getAllDetectedUploads() {
        return Array.from(this.detectedUploads.values());
    }

    // Manual detection trigger for specific file
    async manualDetectFile(filename) {
        console.log('🔍 Manual detection for:', filename);
        
        const possibleIds = [
            `${this.folder}/${filename}`,
            `${this.folder}/${filename.toLowerCase()}`,
            `${this.folder}/${filename.replace(/\s+/g, '_')}`,
            `${this.folder}/${filename.replace(/\s+/g, '-')}`
        ];
        
        for (const publicId of possibleIds) {
            await this.testCloudinaryFile(publicId);
        }
    }

    // Utility methods
    generateTitleFromFilename(filename) {
        if (!filename) return 'Unknown Document';
        
        return filename
            .replace(/[_-]/g, ' ')
            .replace(/\.[^/.]+$/, '')
            .replace(/\b\w/g, l => l.toUpperCase())
            .trim() || 'Unknown Document';
    }

    guessSubjectFromFilename(filename) {
        if (!filename) return 'other';
        
        const lower = filename.toLowerCase();
        
        if (lower.includes('resume') || lower.includes('cv')) {
            return 'resume';
        } else if (lower.includes('math') || lower.includes('calculus')) {
            return 'mathematics';
        } else if (lower.includes('physics')) {
            return 'physics';
        } else if (lower.includes('chemistry')) {
            return 'chemistry';
        } else if (lower.includes('computer') || lower.includes('programming')) {
            return 'computer-science';
        } else if (lower.includes('english') || lower.includes('literature')) {
            return 'english';
        } else if (lower.includes('history')) {
            return 'history';
        } else if (lower.includes('biology')) {
            return 'biology';
        }
        
        return 'other';
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Create and initialize the upload detector
const uploadDetector = new CloudinaryUploadDetector();

// Add to global scope for testing
window.uploadDetector = uploadDetector;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    await uploadDetector.initialize();
    
    // Show notification
    setTimeout(() => {
        if (window.noSettingsSync) {
            window.noSettingsSync.showNotification('🔍 Upload detector active - scanning for existing files!', 'success');
        }
    }, 3000);
});

console.log('🔍 Cloudinary Upload Detector loaded!');