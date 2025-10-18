// Cloudinary Integration Functions

// Initialize Cloudinary
let cloudinaryWidget;

// Initialize Cloudinary widget
function initializeCloudinary() {
    if (typeof cloudinary === 'undefined') {
        console.error('Cloudinary SDK not loaded. Please check your internet connection.');
        return false;
    }

    try {
        cloudinaryWidget = cloudinary.createUploadWidget({
            cloudName: CLOUDINARY_CONFIG.cloudName,
            uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
            folder: CLOUDINARY_CONFIG.folder,
            resourceType: CLOUDINARY_CONFIG.resourceType,
            clientAllowedFormats: CLOUDINARY_CONFIG.allowedFormats,
            maxFileSize: CLOUDINARY_CONFIG.maxFileSize,
            multiple: false,
            cropping: false,
            sources: ['local', 'url', 'camera'],
            showAdvancedOptions: false,
            showInsecurePreview: false,
            defaultSource: 'local',
            theme: 'white',
            text: {
                en: {
                    or: "Or",
                    back: "Back",
                    advanced: "Advanced",
                    close: "Close",
                    no_results: "No Results",
                    search_placeholder: "Search files",
                    menu: {
                        files: "My Files",
                        web: "Web Address",
                        camera: "Camera"
                    },
                    local: {
                        browse: "Browse Files",
                        dd_title_single: "Drag and Drop your file here",
                        dd_title_multi: "Drag and Drop files here",
                        drop_title_single: "Drop file to upload",
                        drop_title_multiple: "Drop files to upload"
                    }
                }
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
                    inactiveTabIcon: "#0E2F5A",
                    error: "#F44235",
                    inProgress: "#3498db",
                    complete: "#20B832",
                    sourceBg: "#E4EBF1"
                },
                fonts: {
                    default: null,
                    "'Poppins', sans-serif": {
                        url: "https://fonts.googleapis.com/css?family=Poppins",
                        active: true
                    }
                }
            }
        }, (error, result) => {
            if (!error && result && result.event === "success") {
                handleCloudinaryUploadSuccess(result.info);
            } else if (error) {
                console.error('Cloudinary upload error:', error);
                handleCloudinaryUploadError(error);
            }
        });

        return true;
    } catch (error) {
        console.error('Error initializing Cloudinary:', error);
        return false;
    }
}

// Handle successful Cloudinary upload
function handleCloudinaryUploadSuccess(uploadResult) {
    try {
        console.log('File uploaded to Cloudinary:', uploadResult);
        
        // Get form data from stored temp data
        const tempData = window.tempUploadData;
        if (!tempData) {
            throw new Error('Upload form data not found');
        }
        
        const { title, description, subject, year, university } = tempData;
        
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
            tags: [],
            uploadedBy: 'Anonymous', // You can add user system later
            isCloudinary: true
        };

        // Save to storage (localStorage for now, can be replaced with Firebase)
        saveDocumentToStorage(newDocument);
        
        // Update display
        documentsData.unshift(newDocument);
        filteredDocuments = [...documentsData];
        displayDocuments(filteredDocuments);
        
        // Show success message
        const uploadProgress = document.getElementById('uploadProgress');
        const uploadSuccess = document.getElementById('uploadSuccess');
        
        uploadProgress.style.display = 'none';
        uploadSuccess.style.display = 'block';
        
        // Clean up temp data
        window.tempUploadData = null;
        
        console.log('Document saved successfully:', newDocument);
        
    } catch (error) {
        console.error('Error processing upload:', error);
        handleCloudinaryUploadError(error);
    }
}

// Handle Cloudinary upload error
function handleCloudinaryUploadError(error) {
    console.error('Cloudinary upload error:', error);
    
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadForm = document.getElementById('uploadForm');
    
    uploadProgress.style.display = 'none';
    uploadForm.style.display = 'block';
    
    alert('Upload failed: ' + (error.message || 'Unknown error occurred'));
}

// Save document to storage (with cloud sync capability)
function saveDocumentToStorage(document) {
    try {
        // Get existing documents
        const storedDocuments = localStorage.getItem('worldWideNotesDocuments');
        let documents = storedDocuments ? JSON.parse(storedDocuments) : [];
        
        // Add new document
        documents.unshift(document);
        
        // Save to localStorage (for current session)
        localStorage.setItem('worldWideNotesDocuments', JSON.stringify(documents));
        
        // Also try to sync to a shared storage (for production)
        syncToSharedStorage(document);
        
        return true;
    } catch (error) {
        console.error('Error saving document:', error);
        return false;
    }
}

// Sync to shared storage (for cross-user sharing)
async function syncToSharedStorage(document) {
    try {
        // For now, we'll use localStorage
        // In production, this could be:
        // - Firebase Firestore
        // - Supabase
        // - A simple JSON API
        // - GitHub repository (via API)
        
        console.log('Document saved for sharing:', document.title);
        
        // Store in a shared documents list
        const sharedDocs = localStorage.getItem('worldWideNotesShared') || '[]';
        const shared = JSON.parse(sharedDocs);
        shared.unshift(document);
        
        // Keep only last 100 documents to prevent storage overflow
        if (shared.length > 100) {
            shared.splice(100);
        }
        
        localStorage.setItem('worldWideNotesShared', JSON.stringify(shared));
        
    } catch (error) {
        console.error('Error syncing to shared storage:', error);
    }
}

// Load documents from shared storage
function loadSharedDocuments() {
    try {
        const shared = localStorage.getItem('worldWideNotesShared');
        return shared ? JSON.parse(shared) : [];
    } catch (error) {
        console.error('Error loading shared documents:', error);
        return [];
    }
}

// Download from Cloudinary
async function downloadFromCloudinary(docData) {
    try {
        if (!docData.cloudinaryUrl) {
            throw new Error('Cloudinary URL not available');
        }

        console.log('Downloading from Cloudinary:', docData.cloudinaryUrl);

        // Get alternative URLs to try
        const downloadUrls = createAlternativeDownloadUrl(docData.cloudinaryUrl);
        console.log('Trying download URLs:', downloadUrls);

        // Try each URL until one works
        for (let i = 0; i < downloadUrls.length; i++) {
            const downloadUrl = downloadUrls[i];
            console.log(`Trying download method ${i + 1}:`, downloadUrl);
            
            try {
                // Method 1: Try direct fetch
                const response = await fetch(downloadUrl, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Accept': '*/*',
                    }
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    console.log('File blob created, size:', blob.size);
                    
                    // Create download link
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = docData.originalName || docData.fileName || `${docData.title}.${docData.fileType.toLowerCase()}`;
                    
                    // Trigger download
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Clean up
                    window.URL.revokeObjectURL(url);
                    
                    console.log('Cloudinary file downloaded successfully via fetch:', docData.title);
                    return;
                }
            } catch (fetchError) {
                console.log(`Fetch method ${i + 1} failed:`, fetchError.message);
                continue; // Try next URL
            }
        }

        // Method 2: Direct browser download (bypasses CORS) - try all URLs
        console.log('All fetch methods failed, trying direct browser download');
        
        // Use the first alternative URL (with fl_attachment) for direct download
        const directDownloadUrl = downloadUrls.length > 1 ? downloadUrls[1] : downloadUrls[0];
        
        const link = document.createElement('a');
        link.href = directDownloadUrl;
        link.download = docData.originalName || docData.fileName || `${docData.title}.${docData.fileType.toLowerCase()}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        // Add a fallback message
        console.log('Opening direct download link. If blocked, user will see the URL.');
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Cloudinary file download initiated via direct link:', docData.title);        // Show user a message about potential delivery restrictions
        setTimeout(() => {
            if (confirm('If the download didn\'t work, your files might be blocked for delivery in Cloudinary.\n\nWould you like to see instructions on how to fix this?')) {
                alert('Please check the file "FIX_DELIVERY_BLOCK.md" in your project folder for detailed instructions on how to enable public access in your Cloudinary dashboard.');
            }
        }, 2000);
        
    } catch (error) {
        console.error('Cloudinary download error:', error);
        throw error; // Re-throw so the calling function can handle it
    }
}

// Check if Cloudinary is configured
function isCloudinaryConfigured() {
    return CLOUDINARY_CONFIG.cloudName === 'dpfrv7kmo' && 
           CLOUDINARY_CONFIG.uploadPreset === 'wwnotespreset';
}

// Create alternative download link with different parameters
function createAlternativeDownloadUrl(originalUrl) {
    try {
        // Try different URL formats to bypass delivery restrictions
        const alternatives = [];
        
        // Original URL
        alternatives.push(originalUrl);
        
        // Add fl_attachment for forced download
        if (originalUrl.includes('/upload/')) {
            alternatives.push(originalUrl.replace('/upload/', '/upload/fl_attachment/'));
        }
        
        // Add quality and format optimizations
        if (originalUrl.includes('/upload/')) {
            alternatives.push(originalUrl.replace('/upload/', '/upload/q_auto,f_auto/'));
        }
        
        // Raw URL format
        if (originalUrl.includes('/image/upload/')) {
            alternatives.push(originalUrl.replace('/image/upload/', '/raw/upload/'));
        }
        
        return alternatives;
    } catch (error) {
        console.error('Error creating alternative URLs:', error);
        return [originalUrl];
    }
}

// Fallback to local storage if Cloudinary not configured
function uploadToLocalStorage(title, description, subject, year, university, file) {
    return readFileAsBase64(file).then(fileData => {
        const newDocument = {
            id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: title,
            description: description,
            subject: subject,
            type: 'notes',
            year: parseInt(year),
            university: university || '',
            fileType: file.name.split('.').pop().toUpperCase(),
            fileName: file.name,
            originalName: file.name,
            fileData: fileData,
            fileSize: file.size,
            uploadDate: new Date().toISOString(),
            tags: [],
            isCloudinary: false
        };

        saveDocumentToStorage(newDocument);
        return newDocument;
    });
}