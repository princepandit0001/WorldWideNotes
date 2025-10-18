// RESUME DETECTOR - Specifically finds resume files in Cloudinary
// This will help find your specific resume upload

class ResumeDetector {
    constructor() {
        this.cloudName = CLOUDINARY_CONFIG.cloudName;
        this.folder = CLOUDINARY_CONFIG.folder;
        this.resumePatterns = [
            'resume',
            'cv',
            'curriculum',
            'vitae',
            'profile'
        ];
        this.extensions = ['pdf', 'doc', 'docx', 'txt'];
    }

    // Find resume files specifically
    async findResume() {
        console.log('📋 Searching for resume files...');
        
        const foundResumes = [];
        
        try {
            // Try different combinations of resume patterns
            for (const pattern of this.resumePatterns) {
                for (const ext of this.extensions) {
                    const variations = [
                        `${pattern}.${ext}`,
                        `${pattern}_${new Date().getFullYear()}.${ext}`,
                        `${pattern}_latest.${ext}`,
                        `${pattern}_final.${ext}`,
                        `${pattern}_updated.${ext}`,
                        `my_${pattern}.${ext}`,
                        `new_${pattern}.${ext}`
                    ];
                    
                    for (const variation of variations) {
                        const publicId = `${this.folder}/${variation}`;
                        const resume = await this.testResumeFile(publicId);
                        
                        if (resume) {
                            foundResumes.push(resume);
                            console.log('📋 Found resume:', variation);
                        }
                        
                        // Small delay to be respectful to the server
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
            }
            
            // Also try with timestamps
            await this.tryTimestampedResumes(foundResumes);
            
            return foundResumes;
            
        } catch (error) {
            console.error('Resume detection failed:', error);
            return foundResumes;
        }
    }

    // Try timestamped resume variations
    async tryTimestampedResumes(foundResumes) {
        const now = new Date();
        const timestamps = [
            now.toISOString().split('T')[0], // 2024-10-18
            now.toISOString().split('T')[0].replace(/-/g, ''), // 20241018
            `${now.getFullYear()}_${(now.getMonth() + 1).toString().padStart(2, '0')}`, // 2024_10
            `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}` // 20241018
        ];
        
        for (const timestamp of timestamps) {
            for (const pattern of this.resumePatterns) {
                for (const ext of this.extensions) {
                    const variations = [
                        `${pattern}_${timestamp}.${ext}`,
                        `${timestamp}_${pattern}.${ext}`,
                        `resume_${timestamp}.${ext}`
                    ];
                    
                    for (const variation of variations) {
                        const publicId = `${this.folder}/${variation}`;
                        const resume = await this.testResumeFile(publicId);
                        
                        if (resume) {
                            foundResumes.push(resume);
                            console.log('📋 Found timestamped resume:', variation);
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
            }
        }
    }

    // Test if a specific resume file exists
    async testResumeFile(publicId) {
        try {
            const testUrl = `https://res.cloudinary.com/${this.cloudName}/raw/upload/${publicId}`;
            
            // Use HEAD request to test existence
            const response = await fetch(testUrl, { 
                method: 'HEAD',
                mode: 'no-cors' // This helps avoid CORS issues
            });
            
            // For no-cors mode, we can't check response.ok, so we try a different approach
            // Let's try to create an image element to test if the URL loads
            return new Promise((resolve) => {
                const testElement = document.createElement('iframe');
                testElement.style.display = 'none';
                testElement.style.width = '1px';
                testElement.style.height = '1px';
                
                testElement.onload = () => {
                    document.body.removeChild(testElement);
                    
                    // Create resume document object
                    const filename = publicId.split('/').pop();
                    const resume = {
                        id: `resume_${publicId.replace(/[^a-zA-Z0-9]/g, '_')}`,
                        title: `Resume: ${this.formatFilename(filename)}`,
                        description: 'Resume document found in Cloudinary',
                        subject: 'resume',
                        type: 'resume',
                        year: new Date().getFullYear(),
                        cloudinaryUrl: testUrl,
                        cloudinaryPublicId: publicId,
                        fileName: filename,
                        originalName: filename,
                        fileSize: 'Unknown',
                        uploadDate: new Date().toISOString(),
                        tags: ['resume', 'cv', 'found'],
                        uploadedBy: 'Resume Detector',
                        isCloudinary: true,
                        isResume: true
                    };
                    
                    resolve(resume);
                };
                
                testElement.onerror = () => {
                    if (testElement.parentNode) {
                        document.body.removeChild(testElement);
                    }
                    resolve(null);
                };
                
                testElement.src = testUrl;
                document.body.appendChild(testElement);
                
                // Timeout after 5 seconds
                setTimeout(() => {
                    if (testElement.parentNode) {
                        document.body.removeChild(testElement);
                    }
                    resolve(null);
                }, 5000);
            });
            
        } catch (error) {
            console.log(`Resume test failed for ${publicId}:`, error.message);
            return null;
        }
    }

    // Format filename for display
    formatFilename(filename) {
        return filename
            .replace(/[_-]/g, ' ')
            .replace(/\.[^/.]+$/, '')
            .replace(/\b\w/g, l => l.toUpperCase())
            .trim();
    }

    // Quick resume search using direct URL construction
    async quickResumeSearch() {
        console.log('⚡ Quick resume search...');
        
        const quickPatterns = [
            `${this.folder}/resume.pdf`,
            `${this.folder}/cv.pdf`,
            `${this.folder}/resume.doc`,
            `${this.folder}/cv.doc`,
            `${this.folder}/resume.docx`,
            `${this.folder}/cv.docx`
        ];
        
        const foundResumes = [];
        
        for (const publicId of quickPatterns) {
            try {
                const testUrl = `https://res.cloudinary.com/${this.cloudName}/raw/upload/${publicId}`;
                
                // Try to access the URL directly
                const response = await fetch(testUrl, { method: 'HEAD' });
                
                if (response.status === 200) {
                    const filename = publicId.split('/').pop();
                    const resume = {
                        id: `quick_resume_${Date.now()}`,
                        title: `Resume: ${this.formatFilename(filename)}`,
                        description: 'Resume found via quick search',
                        subject: 'resume',
                        type: 'resume',
                        year: new Date().getFullYear(),
                        cloudinaryUrl: testUrl,
                        cloudinaryPublicId: publicId,
                        fileName: filename,
                        originalName: filename,
                        fileSize: 'Unknown',
                        uploadDate: new Date().toISOString(),
                        tags: ['resume', 'quick-found'],
                        uploadedBy: 'Quick Search',
                        isCloudinary: true,
                        isResume: true
                    };
                    
                    foundResumes.push(resume);
                    console.log('⚡ Quick found resume:', filename);
                }
                
            } catch (error) {
                // Expected for non-existent files
            }
        }
        
        return foundResumes;
    }
}

// Create global resume detector
const resumeDetector = new ResumeDetector();
window.resumeDetector = resumeDetector;

// Auto-search for resumes when loaded
document.addEventListener('DOMContentLoaded', async function() {
    setTimeout(async () => {
        console.log('📋 Auto-searching for resume files...');
        
        try {
            // Try quick search first
            const quickResumes = await resumeDetector.quickResumeSearch();
            
            if (quickResumes.length > 0) {
                console.log(`📋 Found ${quickResumes.length} resume(s) via quick search!`);
                
                // Add to sync system
                if (window.noSettingsSync) {
                    for (const resume of quickResumes) {
                        await window.noSettingsSync.saveDocument(resume);
                    }
                }
                
                // Show notification
                if (window.noSettingsSync) {
                    window.noSettingsSync.showNotification(`📋 Found ${quickResumes.length} resume file(s)!`, 'success');
                }
            } else {
                console.log('📋 No resumes found in quick search, trying comprehensive search...');
                
                // Try comprehensive search
                const allResumes = await resumeDetector.findResume();
                
                if (allResumes.length > 0) {
                    console.log(`📋 Found ${allResumes.length} resume(s) via comprehensive search!`);
                    
                    // Add to sync system
                    if (window.noSettingsSync) {
                        for (const resume of allResumes) {
                            await window.noSettingsSync.saveDocument(resume);
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('Resume auto-search failed:', error);
        }
    }, 5000); // Start after 5 seconds
});

console.log('📋 Resume Detector loaded!');