// Cloudinary Integration for Worldwide Document Access
// This ensures all uploads are visible to everyone globally

let cloudinaryWidget;

// Initialize Cloudinary widget for uploads
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
            tags: uploadResult.tags || [],
            uploadedBy: 'Anonymous',
            isCloudinary: true,
            isWorldwide: true
        };

        // Save to localStorage (for caching)
        saveDocumentToLocalStorage(newDocument);
        
        // Add to current display
        documentsData.unshift(newDocument);
        filteredDocuments = [...documentsData];
        displayDocuments(filteredDocuments);
        
        // Show success message
        showUploadSuccess();
        
        // Clean up temp data
        window.tempUploadData = null;
        
        console.log('Document saved and now visible worldwide:', newDocument);
        
    } catch (error) {
        console.error('Error processing upload:', error);
        handleCloudinaryUploadError(error);
    }
}

// Save document to localStorage for caching
function saveDocumentToLocalStorage(document) {
    try {
        const storedDocuments = localStorage.getItem('worldWideNotesDocuments');
        let documents = storedDocuments ? JSON.parse(storedDocuments) : [];
        
        // Check for duplicates
        const existingIndex = documents.findIndex(doc => 
            doc.cloudinaryPublicId === document.cloudinaryPublicId
        );
        
        if (existingIndex >= 0) {
            documents[existingIndex] = document;
        } else {
            documents.unshift(document);
        }
        
        // Keep only last 100 documents
        if (documents.length > 100) {
            documents.splice(100);
        }
        
        localStorage.setItem('worldWideNotesDocuments', JSON.stringify(documents));
        console.log('Document cached locally for offline access');
        
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
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
    console.log('Starting worldwide upload:', { title, description, subject, year, university });
    
    // Store metadata for upload
    window.tempUploadData = {
        title: title || 'Untitled Document',
        description: description || '',
        subject: subject || 'other',
        year: year || new Date().getFullYear(),
        university: university || '',
        uploadDate: new Date().toISOString()
    };
    
    // Initialize Cloudinary if not already done
    if (!cloudinaryWidget) {
        const initialized = initializeCloudinary();
        if (!initialized) {
            throw new Error('Failed to initialize Cloudinary');
        }
    }
    
    // Open upload widget
    cloudinaryWidget.open();
}

// Download from Cloudinary
async function downloadFromCloudinary(docData) {
    try {
        if (!docData.cloudinaryUrl) {
            throw new Error('Cloudinary URL not available');
        }

        console.log('Downloading from Cloudinary:', docData.cloudinaryUrl);

        // Try direct download
        const link = document.createElement('a');
        link.href = docData.cloudinaryUrl;
        link.download = docData.originalName || docData.fileName || `${docData.title}.${docData.fileType.toLowerCase()}`;
        link.target = '_blank';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Cloudinary file download initiated:', docData.title);
        
    } catch (error) {
        console.error('Cloudinary download error:', error);
        throw error;
    }
}

// Fetch all documents from Cloudinary for worldwide access
async function fetchAllCloudinaryDocuments() {
    try {
        console.log('🌍 Fetching ALL documents from Cloudinary worldwide...');
        
        const cloudName = CLOUDINARY_CONFIG.cloudName;
        const folder = CLOUDINARY_CONFIG.folder;
        
        if (!cloudName || !folder) {
            console.log('Cloudinary config incomplete, skipping global fetch');
            return [];
        }
        
        // Try to fetch from Cloudinary folder listing
        const listUrl = `https://res.cloudinary.com/${cloudName}/raw/list/${folder}.json`;
        const response = await fetch(listUrl);
        
        if (response.ok) {
            const data = await response.json();
            const resources = data.resources || [];
            
            console.log(`Found ${resources.length} files in Cloudinary folder`);
            
            // Convert to document format
            const documents = resources.map(resource => {
                const filename = resource.public_id.split('/').pop();
                const title = filename.replace(/[_-]/g, ' ').replace(/\.[^/.]+$/, '').replace(/\b\w/g, l => l.toUpperCase());
                
                return {
                    id: `cloudinary_${resource.public_id}`,
                    title: title,
                    description: resource.context?.description || `Document: ${filename}`,
                    subject: resource.context?.subject || guessSubjectFromFilename(filename),
                    type: 'notes',
                    year: parseInt(resource.context?.year || new Date().getFullYear()),
                    university: resource.context?.university || '',
                    fileType: (resource.format || 'pdf').toUpperCase(),
                    fileName: filename,
                    originalName: filename,
                    cloudinaryUrl: resource.secure_url,
                    cloudinaryPublicId: resource.public_id,
                    fileSize: resource.bytes || 0,
                    uploadDate: resource.created_at || new Date().toISOString(),
                    tags: resource.tags || [],
                    uploadedBy: 'Anonymous',
                    isCloudinary: true,
                    isWorldwide: true
                };
            });
            
            return documents;
            
        } else {
            console.log('Cloudinary folder listing not available (status:', response.status, ')');
            console.log('Note: You may need to enable public folder listing in Cloudinary settings');
            return [];
        }
        
    } catch (error) {
        console.log('Error fetching from Cloudinary:', error.message);
        return [];
    }
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