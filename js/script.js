// Document data structure
let documentsData = [];
let filteredDocuments = [];

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const typeFilter = document.getElementById('typeFilter');
const yearFilter = document.getElementById('yearFilter');
const clearFiltersBtn = document.getElementById('clearFilters');
const resultsContainer = document.getElementById('resultsContainer');
const resultsTitle = document.getElementById('resultsTitle');
const resultsCount = document.getElementById('resultsCount');
const loading = document.getElementById('loading');
const noResults = document.getElementById('noResults');
const modal = document.getElementById('documentModal');
const modalTitle = document.getElementById('modalTitle');
const modalTags = document.getElementById('modalTags');
const modalDescription = document.getElementById('modalDescription');
const downloadBtn = document.getElementById('downloadBtn');
const viewBtn = document.getElementById('viewBtn');
const closeModal = document.querySelector('.close');

// Upload Elements
const uploadTriggerBtn = document.getElementById('uploadTriggerBtn');
const uploadCard = document.getElementById('uploadCard');
const uploadModal = document.getElementById('uploadModal');
const uploadForm = document.getElementById('uploadForm');
const closeUpload = document.querySelector('.close-upload');
const cancelUpload = document.getElementById('cancelUpload');
const uploadProgress = document.getElementById('uploadProgress');
const uploadSuccess = document.getElementById('uploadSuccess');
const closeSuccessBtn = document.getElementById('closeSuccessBtn');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadDocuments();
    setupEventListeners();
    displayDocuments(documentsData);
});

// Load documents
async function loadDocuments() {
    try {
        showLoading(true);
        
        // Load from localStorage (personal uploads)
        const storedDocuments = localStorage.getItem('worldWideNotesDocuments');
        let personalDocs = storedDocuments ? JSON.parse(storedDocuments) : [];
        
        // Load shared documents (from all users)
        let sharedDocs = [];
        if (typeof loadSharedDocuments === 'function') {
            sharedDocs = loadSharedDocuments();
        }
        
        // Combine sample data, personal docs, and shared docs
        const sampleDocs = getSampleData();
        
        // Remove duplicates and combine all documents
        const allDocs = [...personalDocs, ...sharedDocs, ...sampleDocs];
        const uniqueDocs = allDocs.filter((doc, index, self) => 
            index === self.findIndex(d => d.id === doc.id)
        );
        
        documentsData = uniqueDocs;
        
        // If no documents exist, load sample data and save it
        if (documentsData.length === 0) {
            documentsData = sampleDocs;
            localStorage.setItem('worldWideNotesDocuments', JSON.stringify(documentsData));
        }
        
        filteredDocuments = [...documentsData];
        displayDocuments(filteredDocuments);
        showLoading(false);
        
        console.log(`Loaded ${documentsData.length} documents (${personalDocs.length} personal, ${sharedDocs.length} shared, ${sampleDocs.length} sample)`);
        
    } catch (error) {
        console.error('Error loading documents:', error);
        showLoading(false);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Real-time search
    searchInput.addEventListener('input', debounce(performSearch, 300));

    // Filter events
    typeFilter.addEventListener('change', performSearch);
    yearFilter.addEventListener('change', performSearch);

    // Clear filters
    clearFiltersBtn.addEventListener('click', clearFilters);

    // Modal events
    closeModal.addEventListener('click', closeDocumentModal);
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeDocumentModal();
        }
        if (e.target === uploadModal) {
            closeUploadModal();
        }
    });

    // Upload events
    uploadTriggerBtn.addEventListener('click', openUploadModal);
    uploadCard.addEventListener('click', openUploadModal);
    closeUpload.addEventListener('click', closeUploadModal);
    cancelUpload.addEventListener('click', closeUploadModal);
    closeSuccessBtn.addEventListener('click', closeUploadModal);
    
    // Form submission
    uploadForm.addEventListener('submit', handleFormSubmit);

    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDocumentModal();
            closeUploadModal();
        }
    });

    // Storage management - removed for production
}

// Perform search and filtering
function performSearch() {
    showLoading(true);
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedType = typeFilter.value;
    const selectedYear = yearFilter.value;

    filteredDocuments = documentsData.filter(doc => {
        // Text search
        const matchesSearch = searchTerm === '' || 
            doc.title.toLowerCase().includes(searchTerm) ||
            doc.description.toLowerCase().includes(searchTerm) ||
            doc.subject.toLowerCase().includes(searchTerm) ||
            doc.tags.some(tag => tag.toLowerCase().includes(searchTerm));

        // Filter matches
        const matchesType = selectedType === '' || doc.type === selectedType;
        const matchesYear = selectedYear === '' || doc.year.toString() === selectedYear;

        return matchesSearch && matchesType && matchesYear;
    });

    // Update results title
    if (searchTerm || selectedType || selectedYear) {
        resultsTitle.textContent = 'Search Results';
    } else {
        resultsTitle.textContent = 'Available Notes';
    }

    setTimeout(() => {
        displayDocuments(filteredDocuments);
        showLoading(false);
    }, 300);
}

// Display documents
function displayDocuments(documents) {
    resultsContainer.innerHTML = '';
    
    if (documents.length === 0) {
        noResults.style.display = 'block';
        resultsCount.textContent = '';
        return;
    }

    noResults.style.display = 'none';
    resultsCount.textContent = `${documents.length} note${documents.length !== 1 ? 's' : ''} available`;

    documents.forEach(doc => {
        const card = createDocumentCard(doc);
        resultsContainer.appendChild(card);
    });
}

// Create document card
function createDocumentCard(doc) {
    const card = document.createElement('div');
    card.className = 'document-card';
    card.onclick = () => openDocumentModal(doc);
    
    // Add cloud indicator for Cloudinary files
    const cloudIndicator = doc.isCloudinary ? '<i class="fas fa-cloud" title="Stored in Cloud"></i>' : '';
    const sampleIndicator = doc.isSample ? '<span class="sample-badge">SAMPLE</span>' : '';
    
    card.innerHTML = `
        <div class="card-header">
            ${cloudIndicator}
            ${sampleIndicator}
        </div>
        <h4>${doc.title}</h4>
        <p>${doc.description}</p>
        <div class="document-tags">
            <span class="tag type">${capitalizeFirst(doc.type)}</span>
            <span class="tag year">${doc.year}</span>
        </div>
        <div class="document-meta">
            <span><i class="fas fa-calendar"></i> ${formatDate(doc.uploadDate)}</span>
            <span><i class="fas fa-file"></i> ${doc.fileType.toUpperCase()}</span>
            ${doc.fileSize ? `<span><i class="fas fa-weight"></i> ${(doc.fileSize / 1024 / 1024).toFixed(1)}MB</span>` : ''}
        </div>
    `;

    return card;
}

// Open document modal
function openDocumentModal(doc) {
    modalTitle.textContent = doc.title;
    modalDescription.textContent = doc.description;
    
    // Create tags
    modalTags.innerHTML = `
        <span class="tag subject">${capitalizeFirst(doc.subject)}</span>
        <span class="tag type">${capitalizeFirst(doc.type)}</span>
        <span class="tag year">${doc.year}</span>
        ${doc.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
    `;

    // Setup download and view buttons
    downloadBtn.onclick = () => downloadDocument(doc, downloadBtn);
    viewBtn.onclick = () => viewDocument(doc);

    modal.style.display = 'block';
}

// Close document modal
function closeDocumentModal() {
    modal.style.display = 'none';
}

// Download document
async function downloadDocument(doc, buttonElement) {
    // Use the passed button element, or fall back to the modal button
    const downloadBtn = buttonElement || document.getElementById('downloadBtn');
    
    // Store original button state
    const originalText = downloadBtn.innerHTML;
    const originalDisabled = downloadBtn.disabled;
    
    try {
        // Show downloading state
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
        downloadBtn.disabled = true;
        
        // Check if it's a Cloudinary file
        if (doc.isCloudinary && doc.cloudinaryUrl) {
            console.log('Downloading Cloudinary file:', doc.title);
            await downloadFromCloudinary(doc);
            console.log('Cloudinary download completed for:', doc.title);
        }
        // Handle local storage files
        else if (doc.fileData) {
            console.log('Downloading local file:', doc.title);
            
            // Convert base64 to blob
            const response = await fetch(doc.fileData);
            const blob = await response.blob();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = doc.originalName || doc.fileName || `${doc.title}.${doc.fileType.toLowerCase()}`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            window.URL.revokeObjectURL(url);
            
            console.log('Local file downloaded successfully');
        } else {
            // Sample document without file data
            alert(`This is a sample document: "${doc.title}"\n\nSample documents are for demonstration only. To download real files, upload your own documents using the upload feature.`);
        }
        
    } catch (error) {
        console.error('Download error:', error);
        alert('Download failed: ' + error.message);
    } finally {
        // Always reset button state, no matter what happens
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = originalDisabled;
        console.log('Download button reset for:', doc.title);
    }
}

// View document
function viewDocument(doc) {
    try {
        // Check if it's a Cloudinary file
        if (doc.isCloudinary && doc.cloudinaryUrl) {
            console.log('Opening Cloudinary document:', doc.cloudinaryUrl);
            
            // Create a viewing URL that might bypass delivery restrictions
            let viewUrl = doc.cloudinaryUrl;
            
            // For PDFs, try to add viewer-friendly parameters
            if (doc.fileType && doc.fileType.toLowerCase() === 'pdf') {
                // Add parameters to optimize for viewing
                if (viewUrl.includes('/upload/')) {
                    viewUrl = viewUrl.replace('/upload/', '/upload/fl_immutable_cache/');
                }
            }
            
            // Open in new tab
            const newWindow = window.open(viewUrl, '_blank', 'noopener,noreferrer');
            
            if (!newWindow) {
                // If popup was blocked, show alternative
                alert(`Popup blocked! Please allow popups or manually open this link:\n\n${viewUrl}`);
            }
            
            return;
        }
        
        // Handle local storage files with base64 data
        if (doc.fileData) {
            // Create blob URL and open in new tab
            fetch(doc.fileData)
                .then(response => response.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const newWindow = window.open(url, '_blank');
                    
                    if (!newWindow) {
                        alert('Popup blocked! Please allow popups to view the document.');
                    }
                })
                .catch(error => {
                    console.error('Error viewing document:', error);
                    alert('Failed to open document for viewing');
                });
            return;
        }
        
        // Fallback for sample documents or files without data
        alert(`This is a sample document: "${doc.title}"\n\nTo view real documents, upload your own files using the upload feature. Uploaded files will open directly in your browser.`);
        
    } catch (error) {
        console.error('View document error:', error);
        alert('Failed to view document: ' + error.message);
    }
}

// Clear all filters
function clearFilters() {
    searchInput.value = '';
    typeFilter.value = '';
    yearFilter.value = '';
    
    filteredDocuments = [...documentsData];
    resultsTitle.textContent = 'Available Notes';
    displayDocuments(filteredDocuments);
}

// Show/hide loading
function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
    resultsContainer.style.display = show ? 'none' : 'grid';
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Sample data function
function getSampleData() {
    return [
        {
            id: 'sample_1',
            title: "Welcome to World Wide Notes",
            description: "This is a sample document to demonstrate how the platform works. Upload your own documents to share notes, previous year papers, and study materials with students worldwide. [SAMPLE DATA]",
            subject: "other",
            type: "notes",
            year: 2025,
            fileType: "PDF",
            fileName: "welcome-sample.pdf",
            originalName: "welcome-sample.pdf",
            uploadDate: "2025-01-01",
            tags: ["welcome", "demo", "sample"],
            isSample: true
        }
    ];
}

// Upload Modal Functions
function openUploadModal() {
    uploadModal.style.display = 'block';
    resetUploadForm();
}

function closeUploadModal() {
    uploadModal.style.display = 'none';
    resetUploadForm();
}

function resetUploadForm() {
    uploadForm.style.display = 'block';
    uploadProgress.style.display = 'none';
    uploadSuccess.style.display = 'none';
    uploadForm.reset();
    
    // Clear any temp data
    window.tempUploadData = null;
}



// Form Submission Handler
function handleFormSubmit(event) {
    event.preventDefault();
    
    // Validate form
    const title = document.getElementById('noteTitle').value.trim();
    const description = document.getElementById('noteDescription').value.trim();
    const subject = document.getElementById('noteSubject').value;
    const year = document.getElementById('noteYear').value;
    const university = document.getElementById('noteUniversity').value.trim();
    
    if (!title || !description || !subject || !year) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Start upload process - this will open Cloudinary widget
    uploadDocument(title, description, subject, year, university);
}

// Client-side Upload Process (with direct Cloudinary integration)
async function uploadDocument(title, description, subject, year, university) {
    try {
        console.log('Opening Cloudinary upload widget');
        
        // Initialize Cloudinary if not already done
        if (!cloudinaryWidget) {
            const initialized = initializeCloudinary();
            if (!initialized) {
                throw new Error('Failed to initialize Cloudinary. Please check your internet connection.');
            }
        }
        
        // Store form data temporarily (will be used in upload success callback)
        window.tempUploadData = { title, description, subject, year, university };
        
        // Hide form and show progress
        uploadForm.style.display = 'none';
        uploadProgress.style.display = 'block';
        
        // Open Cloudinary upload widget directly
        cloudinaryWidget.open();

    } catch (error) {
        console.error('Upload error:', error);
        
        // Show error message
        uploadProgress.style.display = 'none';
        uploadForm.style.display = 'block';
        
        alert('Upload failed: ' + error.message);
    }
}

// Helper function to read file as base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Extract tags from title and description
function extractTags(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'];
    
    const words = text.match(/\b\w+\b/g) || [];
    const tags = words
        .filter(word => word.length > 3 && !commonWords.includes(word))
        .slice(0, 5); // Limit to 5 tags
    
    return tags;
}