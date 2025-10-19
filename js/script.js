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
});

// Load documents data with worldwide access
async function loadDocuments() {
    try {
        showLoading(true);
        console.log('🌍 Loading documents from JSONBin (global source of truth)...');

        let worldwideDocs = [];
        if (window.jsonBinGlobalStorage) {
            worldwideDocs = await window.jsonBinGlobalStorage.loadAllGlobalDocuments();
            console.log(`🌍 ✅ Loaded ${worldwideDocs.length} documents from JSONBin global storage`);
        } else {
            console.warn('JSONBin storage module not available');
        }

        // De-duplicate by Cloudinary public ID or fallback to id
        const uniqueDocs = (worldwideDocs || []).filter((doc, index, self) =>
            index === self.findIndex(d => 
                (d.cloudinaryPublicId && doc.cloudinaryPublicId && d.cloudinaryPublicId === doc.cloudinaryPublicId) ||
                (d.id && doc.id && d.id === doc.id)
            )
        );

        // Sort by upload date (newest first)
        uniqueDocs.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

        documentsData = uniqueDocs;
        filteredDocuments = [...documentsData];

        displayDocuments(filteredDocuments);
        showLoading(false);

    } catch (error) {
        console.error('❌ Error loading documents:', error);
        documentsData = [];
        filteredDocuments = [];
        displayDocuments(filteredDocuments);
        showLoading(false);
    }
}

// Global function for refreshing document display (called by global registry)
window.refreshDocumentDisplay = function() {
    console.log('🔄 Refreshing document display...');
    loadDocuments();
};

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
    
    // Upload button click
    const uploadNotesBtn = document.getElementById('uploadNotesBtn');
    if (uploadNotesBtn) {
        uploadNotesBtn.addEventListener('click', handleUploadButtonClick);
    }

    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDocumentModal();
            closeUploadModal();
        }
    });
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

    const tags = doc.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    
    card.innerHTML = `
        <h4>${doc.title}</h4>
        <p>${doc.description}</p>
        <div class="document-tags">
            <span class="tag subject">${capitalizeFirst(doc.subject)}</span>
            <span class="tag type">${capitalizeFirst(doc.type)}</span>
            <span class="tag year">${doc.year}</span>
            ${tags}
        </div>
        <div class="document-meta">
            <span><i class="fas fa-calendar"></i> ${formatDate(doc.uploadDate)}</span>
            <span><i class="fas fa-file"></i> ${doc.fileType.toUpperCase()}</span>
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
    downloadBtn.onclick = () => downloadDocument(doc);
    viewBtn.onclick = () => viewDocument(doc);

    modal.style.display = 'block';
}

// Close document modal
function closeDocumentModal() {
    modal.style.display = 'none';
}

// Download document
async function downloadDocument(doc) {
    try {
        // Check if it's a Cloudinary document
        if (doc.isCloudinary && doc.cloudinaryUrl && typeof downloadFromCloudinary === 'function') {
            console.log('Downloading from Cloudinary:', doc.title);
            await downloadFromCloudinary(doc);
        } else if (doc.filePath) {
            // Fallback for local files
            const link = document.createElement('a');
            link.href = doc.filePath;
            link.download = doc.fileName;
            link.click();
        } else {
            // No download link available
            alert(`Sorry, download not available for: ${doc.title}`);
        }
    } catch (error) {
        console.error('Download error:', error);
        alert(`Download failed: ${error.message}`);
    }
}

// View document
function viewDocument(doc) {
    try {
        if (doc.cloudinaryUrl) {
            // Open Cloudinary URL in new tab
            window.open(doc.cloudinaryUrl, '_blank');
        } else if (doc.filePath) {
            // Fallback for local files
            window.open(doc.filePath, '_blank');
        } else {
            alert(`Sorry, preview not available for: ${doc.title}`);
        }
    } catch (error) {
        console.error('View error:', error);
        alert(`Preview failed: ${error.message}`);
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
    const uploadForm = document.getElementById('uploadForm');
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadSuccess = document.getElementById('uploadSuccess');
    
    if (uploadForm) {
        uploadForm.style.display = 'block';
        uploadForm.reset();
    }
    if (uploadProgress) uploadProgress.style.display = 'none';
    if (uploadSuccess) uploadSuccess.style.display = 'none';
}

// Handle Upload Button Click - Validates form and opens Cloudinary widget
function handleUploadButtonClick() {
    // Validate form fields
    const title = document.getElementById('noteTitle').value.trim();
    const description = document.getElementById('noteDescription').value.trim();
    const subject = document.getElementById('noteSubject').value;
    const year = document.getElementById('noteYear').value;
    const university = document.getElementById('noteUniversity')?.value?.trim() || '';
    
    // Check required fields
    if (!title) {
        alert('Please enter a title for your notes.');
        document.getElementById('noteTitle').focus();
        return;
    }
    
    if (!description) {
        alert('Please enter a description for your notes.');
        document.getElementById('noteDescription').focus();
        return;
    }
    
    if (!subject) {
        alert('Please select a subject.');
        document.getElementById('noteSubject').focus();
        return;
    }
    
    if (!year) {
        alert('Please select a year.');
        document.getElementById('noteYear').focus();
        return;
    }
    
    // Check if Cloudinary upload function is available
    if (typeof uploadDocument !== 'function') {
        alert('Upload system not ready. Please refresh the page and try again.');
        return;
    }
    
    try {
        console.log('🌍 Starting worldwide upload process:', title);
        
        // Show upload progress
        const uploadForm = document.getElementById('uploadForm');
        const uploadProgress = document.getElementById('uploadProgress');
        
        if (uploadForm) uploadForm.style.display = 'none';
        if (uploadProgress) uploadProgress.style.display = 'block';
        
        // Call Cloudinary upload function with form data
        uploadDocument(title, description, subject, year, university);
        
    } catch (error) {
        console.error('Upload initiation error:', error);
        
        // Reset form display
        const uploadForm = document.getElementById('uploadForm');
        const uploadProgress = document.getElementById('uploadProgress');
        
        if (uploadProgress) uploadProgress.style.display = 'none';
        if (uploadForm) uploadForm.style.display = 'block';
        
        alert('Upload failed to start: ' + error.message);
    }
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