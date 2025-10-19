// Cloudinary Integration for Worldwide Document Access
// This ensures all uploads are visible to everyone globally

let cloudinaryWidget;

// Initialize Cloudinary widget for uploads
function initializeCloudinary() {
    console.log('🔧 initializeCloudinary called');
    
    if (typeof cloudinary === 'undefined') {
        console.error('❌ Cloudinary SDK not loaded. Please check your internet connection.');
        return false;
    }
    
    console.log('✅ Cloudinary SDK found, creating upload widget...');

    try {
        cloudinaryWidget = cloudinary.createUploadWidget({
            cloudName: CLOUDINARY_CONFIG.cloudName,
            uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
            folder: CLOUDINARY_CONFIG.folder,
            resourceType: CLOUDINARY_CONFIG.resourceType,
            clientAllowedFormats: CLOUDINARY_CONFIG.allowedFormats,
            maxFileSize: CLOUDINARY_CONFIG.maxFileSize,
            multiple: false,
            sources: ['local', 'url', 'camera'],
            showAdvancedOptions: false,
            defaultSource: 'local',
            theme: 'white',
            
            // Store metadata with the file for worldwide access
            context: function() {
                const metadata = window.tempUploadData || {};
                return {
                    title: metadata.title || 'Untitled Document',
                    description: metadata.description || '',
                    subject: metadata.subject || 'other',
                    year: metadata.year || new Date().getFullYear(),
                    university: metadata.university || '',
                    uploadDate: new Date().toISOString(),
                    source: 'WorldWideNotes'
                };
            },
            
            // Add tags for categorization
            tags: function() {
                const metadata = window.tempUploadData || {};
                const tags = ['world-wide-notes'];
                
                if (metadata.subject) tags.push(metadata.subject);
                if (metadata.year) tags.push(`year-${metadata.year}`);
                
                return tags;
            },
            
            styles: {
                palette: {
                    window: "#FFFFFF",
                    windowBorder: "#3498db",
                    tabIcon: "#3498db",
                    menuIcons: "#5A616A",
                    textDark: "#000000",
                    textLight: "#FFFFFF",
                    link: "#3498db",
                    action: "#3498db",
                    error: "#F44235",
                    inProgress: "#3498db",
                    complete: "#20B832",
                    sourceBg: "#E4EBF1"
                }
            }
        }, (error, result) => {
            console.log('📡 Cloudinary widget callback:', { error, result });
            
            if (!error && result && result.event === "success") {
                console.log('✅ Upload successful, processing result...');
                handleCloudinaryUploadSuccess(result.info);
            } else if (error) {
                console.error('❌ Cloudinary upload error:', error);
                handleCloudinaryUploadError(error);
            } else if (result) {
                console.log('ℹ️ Cloudinary event:', result.event);
            }
        });

        console.log('✅ Cloudinary widget created successfully');
        return true;
    } catch (error) {
        console.error('Error initializing Cloudinary:', error);
        return false;
    }
}

// Handle successful Cloudinary upload
async function handleCloudinaryUploadSuccess(uploadResult) {
    try {
        console.log('✅ File uploaded to Cloudinary:', uploadResult);
        
        const tempData = window.tempUploadData;
        if (!tempData) {
            throw new Error('Upload form data not found');
        }
        
        const { title, description, subject, year, university } = tempData;
        
        // 🌍 REGISTER UPLOAD GLOBALLY VIA JSONBIN - Visible to ALL users worldwide!
        if (window.jsonBinGlobalStorage) {
            console.log('🌍 Registering upload to JSONBin global storage...');
            const globalDocument = await window.jsonBinGlobalStorage.registerUpload(uploadResult, {
                title,
                description,
                subject,
                year,
                university,
                uploadedBy: 'Student',
                tags: [subject, `year-${year}`, 'student-upload']
            });
            
            if (globalDocument) {
                console.log('🌍 ✅ Upload saved to JSONBin! Now visible to ALL students worldwide.');
            }
        }
        
        // No local registry fallback; JSONBin is the single source of truth

        // Create document object with Cloudinary data
        const newDocument = {
            id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: title,
            description: description,
            subject: subject,
            type: 'notes',
            year: parseInt(year),
            university: university || '',
            fileType: uploadResult.format.toUpperCase(),
            fileName: uploadResult.original_filename,
            originalName: uploadResult.original_filename,
            cloudinaryUrl: uploadResult.secure_url,
            cloudinaryPublicId: uploadResult.public_id,
            fileSize: uploadResult.bytes,
            uploadDate: new Date().toISOString(),
            tags: uploadResult.tags || [],
            uploadedBy: 'Anonymous',
            isCloudinary: true,
            isWorldwide: true
        };

        console.log('📄 Created document object:', newDocument);

        // Do not write to any local caches or alternate databases
        
        // Add to current display
        if (typeof documentsData !== 'undefined' && typeof displayDocuments === 'function') {
            documentsData.unshift(newDocument);
            filteredDocuments = [...documentsData];
            displayDocuments(filteredDocuments);
        }
        
        // Show success message
        showUploadSuccess();
        
        // Clean up temp data
        window.tempUploadData = null;
        
    console.log('🌍 Document saved and now visible worldwide via JSONBin:', newDocument.title);
        
    } catch (error) {
        console.error('❌ Error processing upload:', error);
        handleCloudinaryUploadError(error);
    }
}


// Handle upload errors
function handleCloudinaryUploadError(error) {
    console.error('Upload error:', error);
    
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadForm = document.getElementById('uploadForm');
    
    if (uploadProgress) uploadProgress.style.display = 'none';
    if (uploadForm) uploadForm.style.display = 'block';
    
    alert('Upload failed: ' + (error.message || 'Unknown error occurred'));
}

// Show upload success
function showUploadSuccess() {
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadSuccess = document.getElementById('uploadSuccess');
    
    if (uploadProgress) uploadProgress.style.display = 'none';
    if (uploadSuccess) {
        uploadSuccess.style.display = 'block';
        uploadSuccess.innerHTML = `
            <div class="success-message">
                <i class="fas fa-check-circle"></i>
                <h3>Upload Successful!</h3>
                <p>Your document has been uploaded and is now accessible worldwide!</p>
                <p>Anyone can now search for and download this document from any device.</p>
            </div>
        `;
    }
}

// Upload document function called from the form
function uploadDocument(title, description, subject, year, university) {
    console.log('🚀 uploadDocument called with:', { title, description, subject, year, university });
    
    // Check if Cloudinary SDK is loaded
    if (typeof cloudinary === 'undefined') {
        console.error('❌ Cloudinary SDK not loaded!');
        alert('Cloudinary upload system not ready. Please refresh the page and try again.');
        return;
    }
    
    console.log('✅ Cloudinary SDK is available');
    
    // Store metadata for upload
    window.tempUploadData = {
        title: title || 'Untitled Document',
        description: description || '',
        subject: subject || 'other',
        year: year || new Date().getFullYear(),
        university: university || '',
        uploadDate: new Date().toISOString()
    };
    
    console.log('📋 Stored upload metadata:', window.tempUploadData);
    
    // Initialize Cloudinary if not already done
    if (!cloudinaryWidget) {
        console.log('🔧 Initializing Cloudinary widget...');
        const initialized = initializeCloudinary();
        if (!initialized) {
            console.error('❌ Failed to initialize Cloudinary widget');
            throw new Error('Failed to initialize Cloudinary');
        }
        console.log('✅ Cloudinary widget initialized successfully');
    }
    
    console.log('📤 Opening Cloudinary upload widget...');
    
    // Open upload widget
    try {
        cloudinaryWidget.open();
        console.log('✅ Cloudinary widget opened successfully');
    } catch (error) {
        console.error('❌ Error opening Cloudinary widget:', error);
        alert('Failed to open upload dialog: ' + error.message);
    }
}

// Build a Cloudinary URL that forces download via fl_attachment
function buildAttachmentUrl(baseUrl, filename) {
    try {
        if (!baseUrl) return '';
        const idx = baseUrl.indexOf('/upload/');
        if (idx === -1) return baseUrl; // not a standard upload URL
        const before = baseUrl.substring(0, idx + '/upload/'.length);
        const after = baseUrl.substring(idx + '/upload/'.length);
        const safeName = (filename || 'download').replace(/[^A-Za-z0-9._-]/g, '_');
        // Insert fl_attachment with filename before any existing transformations/path
        return `${before}fl_attachment:${encodeURIComponent(safeName)}/${after}`;
    } catch (_) {
        return baseUrl;
    }
}

// Download from Cloudinary (force browser save dialog)
async function downloadFromCloudinary(docData) {
    try {
        if (!docData.cloudinaryUrl) {
            throw new Error('Cloudinary URL not available');
        }

        const filename = docData.originalName || docData.fileName || (docData.title ? `${docData.title}` : 'download');
        const forcedUrl = buildAttachmentUrl(docData.cloudinaryUrl, filename);
        console.log('Downloading from Cloudinary (attachment):', forcedUrl);

        const link = document.createElement('a');
        link.href = forcedUrl;
        link.rel = 'noopener noreferrer';
        link.download = filename; // may be ignored cross-origin, server header will enforce
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Cloudinary file download initiated:', filename);
        
    } catch (error) {
        console.error('Cloudinary download error:', error);
        throw error;
    }
}

// Fetch all documents from Cloudinary - DISABLED to prevent 401 errors
async function fetchAllCloudinaryDocuments() {
    // This function is disabled because it causes 401 errors on free Cloudinary accounts
    // The no-settings sync system handles document synchronization instead
    console.log('ℹ️ Cloudinary folder listing disabled (prevents 401 errors)');
    console.log('ℹ️ Using no-settings sync system for document synchronization');
    return [];
}

// Guess subject from filename
function guessSubjectFromFilename(filename) {
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

// Check if Cloudinary is configured
function isCloudinaryConfigured() {
    return CLOUDINARY_CONFIG && 
           CLOUDINARY_CONFIG.cloudName && 
           CLOUDINARY_CONFIG.uploadPreset;
}

// Test function for debugging
function testCloudinarySetup() {
    console.log('🧪 Testing Cloudinary setup...');
    console.log('Config:', CLOUDINARY_CONFIG);
    console.log('SDK loaded:', typeof cloudinary !== 'undefined');
    console.log('Upload function available:', typeof uploadDocument === 'function');
    
    if (typeof cloudinary !== 'undefined') {
        console.log('✅ Cloudinary SDK is ready');
        try {
            const testWidget = cloudinary.createUploadWidget({
                cloudName: CLOUDINARY_CONFIG.cloudName,
                uploadPreset: CLOUDINARY_CONFIG.uploadPreset
            }, (error, result) => {
                console.log('Test widget callback:', error, result);
            });
            console.log('✅ Test widget created successfully');
        } catch (error) {
            console.error('❌ Error creating test widget:', error);
        }
    } else {
        console.error('❌ Cloudinary SDK not available');
    }
}

// Auto-run setup test when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        testCloudinarySetup();
    }, 1000);
});