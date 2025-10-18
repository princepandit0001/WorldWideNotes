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
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
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

// Load documents data with worldwide access
async function loadDocuments() {
    try {
        showLoading(true);
        console.log('🌍 Loading documents with worldwide access...');

        // Primary: Fetch ALL documents from Cloudinary (worldwide)
        let cloudinaryDocs = [];
        if (typeof fetchAllCloudinaryDocuments === 'function') {
            cloudinaryDocs = await fetchAllCloudinaryDocuments();
        }

        // Secondary: Load cached documents from localStorage
        let localDocs = [];
        try {
            const storedDocuments = localStorage.getItem('worldWideNotesDocuments');
            if (storedDocuments) {
                localDocs = JSON.parse(storedDocuments);
            }
        } catch (localError) {
            console.log('Error loading local cache:', localError.message);
        }

        // Tertiary: Sample data as fallback
        const sampleDocs = getSampleData();

        // Combine all sources and remove duplicates
        const allDocs = [...cloudinaryDocs, ...localDocs, ...sampleDocs];
        const uniqueDocs = allDocs.filter((doc, index, self) =>
            index === self.findIndex(d => 
                (d.cloudinaryPublicId && doc.cloudinaryPublicId && d.cloudinaryPublicId === doc.cloudinaryPublicId) || 
                (d.id && doc.id && d.id === doc.id)
            )
        );

        // Sort by upload date (newest first)
        uniqueDocs.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

        documentsData = uniqueDocs.length > 0 ? uniqueDocs : sampleDocs;
        filteredDocuments = [...documentsData];
        
        console.log(`✅ Loaded ${documentsData.length} documents worldwide:
        - Cloudinary: ${cloudinaryDocs.length}
        - Local cache: ${localDocs.length}
        - Sample: ${sampleDocs.length}
        - Total unique: ${uniqueDocs.length}`);
        
        displayDocuments(filteredDocuments);
        showLoading(false);
        
    } catch (error) {
        console.error('Error loading documents:', error);
        // Fallback to sample data
        documentsData = getSampleData();
        filteredDocuments = [...documentsData];
        displayDocuments(filteredDocuments);
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
    
    // File input events
    fileInput.addEventListener('change', handleFileSelect);
    
    // Form submission
    uploadForm.addEventListener('submit', handleFormSubmit);

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

// Sample data function
function getSampleData() {
    return [
        {
            id: 1,
            title: "Calculus I - Limits and Derivatives",
            description: "Comprehensive notes covering limits, continuity, and basic derivatives with examples and practice problems.",
            subject: "mathematics",
            type: "notes",
            year: 2024,
            fileType: "pdf",
            fileName: "calculus-1-notes.pdf",
            filePath: "documents/math/calculus-1-notes.pdf",
            uploadDate: "2024-01-15",
            tags: ["calculus", "derivatives", "limits"]
        },
        {
            id: 2,
            title: "Physics Midterm 2023",
            description: "Previous year midterm examination paper for Physics covering mechanics and thermodynamics.",
            subject: "physics",
            type: "previous-papers",
            year: 2023,
            fileType: "pdf",
            fileName: "physics-midterm-2023.pdf",
            filePath: "documents/physics/physics-midterm-2023.pdf",
            uploadDate: "2023-11-20",
            tags: ["mechanics", "thermodynamics", "midterm"]
        },
        {
            id: 3,
            title: "Organic Chemistry Lab Manual",
            description: "Complete laboratory manual for organic chemistry experiments with safety guidelines and procedures.",
            subject: "chemistry",
            type: "notes",
            year: 2024,
            fileType: "pdf",
            fileName: "organic-chem-lab.pdf",
            filePath: "documents/chemistry/organic-chem-lab.pdf",
            uploadDate: "2024-02-10",
            tags: ["laboratory", "experiments", "safety"]
        },
        {
            id: 4,
            title: "Data Structures Assignment 3",
            description: "Programming assignment on binary trees and graph algorithms with test cases and submission guidelines.",
            subject: "computer-science",
            type: "assignments",
            year: 2024,
            fileType: "pdf",
            fileName: "ds-assignment-3.pdf",
            filePath: "documents/cs/ds-assignment-3.pdf",
            uploadDate: "2024-03-05",
            tags: ["programming", "algorithms", "trees", "graphs"]
        },
        {
            id: 5,
            title: "English Literature Final 2022",
            description: "Final examination paper covering Shakespeare, Victorian literature, and modern poetry analysis.",
            subject: "english",
            type: "previous-papers",
            year: 2022,
            fileType: "pdf",
            fileName: "english-final-2022.pdf",
            filePath: "documents/english/english-final-2022.pdf",
            uploadDate: "2022-12-15",
            tags: ["shakespeare", "poetry", "analysis"]
        },
        {
            id: 6,
            title: "World War II History Notes",
            description: "Detailed notes on World War II causes, major battles, and consequences with timeline and maps.",
            subject: "history",
            type: "notes",
            year: 2024,
            fileType: "pdf",
            fileName: "wwii-history-notes.pdf",
            filePath: "documents/history/wwii-history-notes.pdf",
            uploadDate: "2024-01-28",
            tags: ["world-war", "battles", "timeline"]
        },
        {
            id: 7,
            title: "Biology Syllabus 2024",
            description: "Complete syllabus for Biology course including topics, grading scheme, and examination schedule.",
            subject: "biology",
            type: "syllabus",
            year: 2024,
            fileType: "pdf",
            fileName: "biology-syllabus-2024.pdf",
            filePath: "documents/biology/biology-syllabus-2024.pdf",
            uploadDate: "2024-01-02",
            tags: ["curriculum", "grading", "schedule"]
        },
        {
            id: 8,
            title: "Linear Algebra Final 2023",
            description: "Previous year final exam covering vector spaces, eigenvalues, and matrix transformations.",
            subject: "mathematics",
            type: "previous-papers",
            year: 2023,
            fileType: "pdf",
            fileName: "linear-algebra-final-2023.pdf",
            filePath: "documents/math/linear-algebra-final-2023.pdf",
            uploadDate: "2023-12-20",
            tags: ["vectors", "matrices", "eigenvalues"]
        },
        {
            id: 9,
            title: "Python Programming Tutorial",
            description: "Beginner-friendly Python programming notes with examples, exercises, and best practices.",
            subject: "computer-science",
            type: "notes",
            year: 2024,
            fileType: "pdf",
            fileName: "python-tutorial.pdf",
            filePath: "documents/cs/python-tutorial.pdf",
            uploadDate: "2024-02-20",
            tags: ["python", "programming", "tutorial"]
        },
        {
            id: 10,
            title: "Chemical Bonding Quiz",
            description: "Practice quiz on chemical bonding covering ionic, covalent, and metallic bonds with solutions.",
            subject: "chemistry",
            type: "assignments",
            year: 2024,
            fileType: "pdf",
            fileName: "chemical-bonding-quiz.pdf",
            filePath: "documents/chemistry/chemical-bonding-quiz.pdf",
            uploadDate: "2024-03-12",
            tags: ["bonding", "ionic", "covalent", "quiz"]
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
    fileInfo.classList.remove('show');
    fileInfo.innerHTML = '';
}

// File Selection Handler
function handleFileSelect(event) {
    const file = event.target.files[0];
    
    if (file) {
        // Check file size (15MB = 15 * 1024 * 1024 bytes)
        const maxSize = 15 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('File size exceeds 15MB limit. Please choose a smaller file.');
            fileInput.value = '';
            fileInfo.classList.remove('show');
            return;
        }
        
        // Check file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please select a PDF, DOC, or DOCX file.');
            fileInput.value = '';
            fileInfo.classList.remove('show');
            return;
        }
        
        // Display file info
        const fileSize = (file.size / (1024 * 1024)).toFixed(2);
        fileInfo.innerHTML = `
            <i class="fas fa-file-alt"></i>
            <strong>${file.name}</strong> (${fileSize} MB)
        `;
        fileInfo.classList.add('show');
    }
}

// Form Submission Handler for Worldwide Upload
function handleFormSubmit(event) {
    event.preventDefault();
    
    // Validate form
    const title = document.getElementById('noteTitle').value.trim();
    const description = document.getElementById('noteDescription').value.trim();
    const subject = document.getElementById('noteSubject').value;
    const year = document.getElementById('noteYear').value;
    const university = document.getElementById('noteUniversity')?.value?.trim() || '';
    const file = fileInput.files[0];
    
    if (!title || !description || !subject || !year || !file) {
        alert('Please fill in all required fields and select a file.');
        return;
    }
    
    // Check if Cloudinary is available
    if (typeof uploadDocument !== 'function') {
        alert('Upload system not ready. Please refresh the page and try again.');
        return;
    }
    
    try {
        // Show upload progress
        uploadForm.style.display = 'none';
        uploadProgress.style.display = 'block';
        
        console.log('🌍 Starting worldwide upload:', title);
        
        // Use Cloudinary worldwide upload
        uploadDocument(title, description, subject, year, university);
        
    } catch (error) {
        console.error('Upload initiation error:', error);
        
        // Reset form display
        uploadProgress.style.display = 'none';
        uploadForm.style.display = 'block';
        
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