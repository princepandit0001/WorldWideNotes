// One-time cleanup script - Run this in browser console if needed
// This will clear any old sample data and keep only the welcome sample

console.log('🧹 Cleaning up localStorage for production...');

// Clear old data
localStorage.removeItem('worldWideNotesDocuments');
localStorage.removeItem('worldWideNotesShared');

// Set only the welcome sample
const welcomeSample = [{
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
}];

localStorage.setItem('worldWideNotesDocuments', JSON.stringify(welcomeSample));

console.log('✅ Cleanup complete! Only welcome sample remains.');
console.log('🔄 Refresh the page to see the clean version.');