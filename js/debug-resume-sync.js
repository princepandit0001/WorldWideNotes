// DEBUG RESUME SYNC - Find out exactly why resume isn't syncing
console.log('🔍 Debug Resume Sync System Loading...');

class ResumeDebugger {
    constructor() {
        this.cloudName = CLOUDINARY_CONFIG.cloudName;
        this.folder = CLOUDINARY_CONFIG.folder;
        this.debugLog = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        this.debugLog.push(logEntry);
        
        const color = {
            'info': '#2196F3',
            'success': '#4CAF50',
            'warning': '#FF9800',
            'error': '#f44336'
        }[type] || '#333';
        
        console.log(`%c${logEntry}`, `color: ${color}; font-weight: bold;`);
        
        // Update debug display if it exists
        this.updateDebugDisplay();
    }

    updateDebugDisplay() {
        const debugElement = document.getElementById('debugLog');
        if (debugElement) {
            debugElement.innerHTML = this.debugLog.map(log => 
                `<div style="margin: 2px 0; font-family: monospace; font-size: 12px;">${log}</div>`
            ).join('');
            debugElement.scrollTop = debugElement.scrollHeight;
        }
    }

    // Check what data exists in different storage locations
    checkAllStorageLocations() {
        this.log('🔍 Checking all storage locations for resume data...', 'info');
        
        // Check localStorage
        const localStorageKeys = Object.keys(localStorage);
        const localResumeData = localStorageKeys.filter(key => 
            key.toLowerCase().includes('resume') || 
            key.toLowerCase().includes('document') ||
            key.toLowerCase().includes('cloudinary')
        );
        
        if (localResumeData.length > 0) {
            this.log(`📱 Found ${localResumeData.length} potential resume keys in localStorage:`, 'success');
            localResumeData.forEach(key => {
                const data = localStorage.getItem(key);
                this.log(`  - ${key}: ${data ? data.substring(0, 100) + '...' : 'null'}`, 'info');
            });
        } else {
            this.log('📱 No resume data found in localStorage', 'warning');
        }

        // Check sessionStorage
        const sessionStorageKeys = Object.keys(sessionStorage);
        const sessionResumeData = sessionStorageKeys.filter(key => 
            key.toLowerCase().includes('resume') || 
            key.toLowerCase().includes('document') ||
            key.toLowerCase().includes('cloudinary')
        );
        
        if (sessionResumeData.length > 0) {
            this.log(`🗂️ Found ${sessionResumeData.length} potential resume keys in sessionStorage:`, 'success');
            sessionResumeData.forEach(key => {
                const data = sessionStorage.getItem(key);
                this.log(`  - ${key}: ${data ? data.substring(0, 100) + '...' : 'null'}`, 'info');
            });
        } else {
            this.log('🗂️ No resume data found in sessionStorage', 'warning');
        }

        // Check if IndexedDB has any data
        this.checkIndexedDB();
    }

    async checkIndexedDB() {
        try {
            const databases = await indexedDB.databases();
            this.log(`💾 Found ${databases.length} IndexedDB databases`, 'info');
            
            databases.forEach(db => {
                this.log(`  - Database: ${db.name} (version ${db.version})`, 'info');
            });
        } catch (error) {
            this.log(`❌ Could not check IndexedDB: ${error.message}`, 'error');
        }
    }

    // Test direct Cloudinary URLs with different patterns
    async testDirectCloudinaryAccess() {
        this.log('🌐 Testing direct Cloudinary access patterns...', 'info');
        
        const testPatterns = [
            // Common resume names
            'resume.pdf', 'cv.pdf', 'resume.doc', 'cv.doc', 'resume.docx', 'cv.docx',
            'Resume.pdf', 'CV.pdf', 'RESUME.pdf', 'Resume.PDF',
            
            // With folder
            `${this.folder}/resume.pdf`, `${this.folder}/cv.pdf`,
            `${this.folder}/Resume.pdf`, `${this.folder}/CV.pdf`,
            
            // Date-based patterns (2025)
            'resume_2025.pdf', 'cv_2025.pdf', 'resume_2024.pdf', 'cv_2024.pdf',
            `${this.folder}/resume_2025.pdf`, `${this.folder}/cv_2025.pdf`,
            
            // Common variations
            'my_resume.pdf', 'my_cv.pdf', 'resume_final.pdf', 'cv_final.pdf',
            'resume_latest.pdf', 'cv_latest.pdf', 'new_resume.pdf', 'new_cv.pdf',
            `${this.folder}/my_resume.pdf`, `${this.folder}/resume_final.pdf`,
            
            // Mobile-specific patterns
            'mobile_resume.pdf', 'phone_resume.pdf', 'upload_resume.pdf',
            `${this.folder}/mobile_resume.pdf`, `${this.folder}/phone_resume.pdf`
        ];

        const foundFiles = [];
        
        for (const pattern of testPatterns) {
            try {
                const testUrl = `https://res.cloudinary.com/${this.cloudName}/raw/upload/${pattern}`;
                
                // Try HEAD request first
                const response = await fetch(testUrl, { 
                    method: 'HEAD',
                    mode: 'no-cors'
                });
                
                // Since we can't check response status with no-cors, try a different approach
                const testResult = await this.testFileExists(testUrl, pattern);
                
                if (testResult) {
                    foundFiles.push(testResult);
                    this.log(`✅ FOUND FILE: ${pattern} -> ${testUrl}`, 'success');
                }
                
                // Small delay to be respectful
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                // Expected for non-existent files
            }
        }
        
        if (foundFiles.length > 0) {
            this.log(`🎉 Found ${foundFiles.length} files!`, 'success');
            return foundFiles;
        } else {
            this.log('❌ No files found with direct URL testing', 'error');
            return [];
        }
    }

    // Test if a file exists using multiple methods
    async testFileExists(url, filename) {
        return new Promise((resolve) => {
            // Method 1: Try with iframe
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.style.width = '1px';
            iframe.style.height = '1px';
            
            let resolved = false;
            
            iframe.onload = () => {
                if (!resolved) {
                    resolved = true;
                    if (iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                    resolve({
                        filename,
                        url,
                        method: 'iframe'
                    });
                }
            };
            
            iframe.onerror = () => {
                if (!resolved) {
                    resolved = true;
                    if (iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                    resolve(null);
                }
            };
            
            // Timeout after 3 seconds
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    if (iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                    resolve(null);
                }
            }, 3000);
            
            iframe.src = url;
            document.body.appendChild(iframe);
        });
    }

    // Create a URL that mobile can use to share resume data with laptop
    generateDataSharingCode() {
        this.log('📱 Generating data sharing code...', 'info');
        
        const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const shareData = {
            timestamp: Date.now(),
            device: 'generating',
            code: shareCode,
            expires: Date.now() + (1000 * 60 * 30) // 30 minutes
        };
        
        localStorage.setItem(`share_code_${shareCode}`, JSON.stringify(shareData));
        
        this.log(`📤 Share code generated: ${shareCode}`, 'success');
        this.log(`📱 Mobile user should enter this code to share resume data`, 'info');
        
        return shareCode;
    }

    // Receive data from mobile using share code
    async receiveSharedData(shareCode) {
        this.log(`📥 Attempting to receive data with code: ${shareCode}`, 'info');
        
        const shareKey = `share_code_${shareCode}`;
        const shareData = localStorage.getItem(shareKey);
        
        if (!shareData) {
            this.log(`❌ No data found for code: ${shareCode}`, 'error');
            return null;
        }
        
        const data = JSON.parse(shareData);
        
        if (data.expires < Date.now()) {
            this.log(`⏰ Share code expired: ${shareCode}`, 'warning');
            localStorage.removeItem(shareKey);
            return null;
        }
        
        if (data.resumeData) {
            this.log(`✅ Found resume data in share code!`, 'success');
            return data.resumeData;
        } else {
            this.log(`⏳ Waiting for mobile to upload data...`, 'info');
            return null;
        }
    }

    // Show all debug information
    async runFullDiagnostics() {
        this.log('🚀 Starting full resume sync diagnostics...', 'info');
        
        // Clear previous logs
        this.debugLog = [];
        
        // Check all storage locations
        this.checkAllStorageLocations();
        
        // Test direct Cloudinary access
        const foundFiles = await this.testDirectCloudinaryAccess();
        
        // Check if sync system is working
        if (window.noSettingsSync) {
            this.log('✅ No-settings sync system is loaded', 'success');
            
            const documents = await window.noSettingsSync.getAllDocuments();
            this.log(`📄 Current documents in sync system: ${documents.length}`, 'info');
            
            const resumeDocs = documents.filter(doc => 
                doc.title.toLowerCase().includes('resume') || 
                doc.fileName.toLowerCase().includes('resume') ||
                doc.tags?.includes('resume')
            );
            
            if (resumeDocs.length > 0) {
                this.log(`📋 Found ${resumeDocs.length} resume document(s) in sync system:`, 'success');
                resumeDocs.forEach(doc => {
                    this.log(`  - ${doc.title} (${doc.fileName})`, 'info');
                });
            } else {
                this.log('📋 No resume documents found in sync system', 'warning');
            }
        } else {
            this.log('❌ No-settings sync system not loaded', 'error');
        }
        
        this.log('🏁 Diagnostics complete', 'info');
        
        return {
            foundFiles,
            debugLog: this.debugLog
        };
    }
}

// Create global debugger
const resumeDebugger = new ResumeDebugger();
window.resumeDebugger = resumeDebugger;

// Auto-run diagnostics when loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('🔍 Running automatic resume diagnostics...');
        resumeDebugger.runFullDiagnostics();
    }, 3000);
});

console.log('🔍 Debug Resume Sync System Ready!');