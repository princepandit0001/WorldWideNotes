// Automatic Document Sync for Worldwide Visibility
// This script helps keep the worldwide document database updated

class DocumentSyncManager {
    constructor() {
        this.databaseUrl = 'https://raw.githubusercontent.com/princepandit0001/WorldWideNotes/main/documents-database.json';
        this.lastSyncTime = localStorage.getItem('lastSyncTime') || '2025-01-01T00:00:00.000Z';
        this.pendingUploads = JSON.parse(localStorage.getItem('pendingUploads') || '[]');
    }

    // Check for new uploads that need to be synced
    checkForNewUploads() {
        const localDB = localStorage.getItem('worldWideNotesDatabase');
        if (!localDB) return;

        try {
            const data = JSON.parse(localDB);
            const newUploads = data.documents.filter(doc => 
                new Date(doc.uploadDate) > new Date(this.lastSyncTime)
            );

            if (newUploads.length > 0) {
                console.log(`🔄 Found ${newUploads.length} new uploads that need syncing`);
                this.showSyncNotification(newUploads.length);
                this.addToPendingUploads(newUploads);
            }
        } catch (error) {
            console.error('Error checking for new uploads:', error);
        }
    }

    // Add new uploads to pending list
    addToPendingUploads(uploads) {
        uploads.forEach(upload => {
            const exists = this.pendingUploads.find(p => p.cloudinaryPublicId === upload.cloudinaryPublicId);
            if (!exists) {
                this.pendingUploads.push(upload);
            }
        });
        
        localStorage.setItem('pendingUploads', JSON.stringify(this.pendingUploads));
    }

    // Show notification about uploads needing sync
    showSyncNotification(count) {
        // Create notification element
        const notification = document.createElement('div');
        notification.id = 'sync-notification';
        notification.innerHTML = `
            <div style="
                position: fixed; 
                top: 20px; 
                right: 20px; 
                background: #17a2b8; 
                color: white; 
                padding: 15px 20px; 
                border-radius: 8px; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 300px;
                font-family: Arial, sans-serif;
            ">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <i class="fas fa-sync-alt" style="margin-right: 8px;"></i>
                    <strong>New Upload${count > 1 ? 's' : ''} Ready!</strong>
                </div>
                <p style="margin: 5px 0; font-size: 14px;">
                    ${count} document${count > 1 ? 's' : ''} uploaded successfully and cached locally.
                </p>
                <div style="margin-top: 10px;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">
                        Got it
                    </button>
                    <button onclick="window.showSyncInstructions()" 
                            style="background: rgba(255,255,255,0.9); border: none; color: #17a2b8; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                        How to Sync
                    </button>
                </div>
            </div>
        `;

        // Remove existing notification
        const existing = document.getElementById('sync-notification');
        if (existing) existing.remove();

        // Add new notification
        document.body.appendChild(notification);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (document.getElementById('sync-notification')) {
                notification.remove();
            }
        }, 10000);
    }

    // Update last sync time
    updateLastSyncTime() {
        this.lastSyncTime = new Date().toISOString();
        localStorage.setItem('lastSyncTime', this.lastSyncTime);
    }

    // Get pending uploads for manual sync
    getPendingUploads() {
        return this.pendingUploads;
    }

    // Clear pending uploads after sync
    clearPendingUploads() {
        this.pendingUploads = [];
        localStorage.setItem('pendingUploads', JSON.stringify(this.pendingUploads));
        this.updateLastSyncTime();
    }

    // Generate JSON for manual update
    generateSyncJSON() {
        const localDB = localStorage.getItem('worldWideNotesDatabase');
        if (!localDB) return null;

        try {
            const data = JSON.parse(localDB);
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Error generating sync JSON:', error);
            return null;
        }
    }
}

// Show sync instructions
window.showSyncInstructions = function() {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div style="
            position: fixed; 
            top: 0; left: 0; right: 0; bottom: 0; 
            background: rgba(0,0,0,0.8); 
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
        ">
            <div style="
                background: white; 
                padding: 30px; 
                border-radius: 12px; 
                max-width: 600px;
                max-height: 80vh;
                overflow: auto;
            ">
                <h2 style="margin-top: 0; color: #333;">🌍 Making Uploads Worldwide Visible</h2>
                
                <div style="margin: 20px 0;">
                    <h3>📱 For Mobile Uploads to Show on PC:</h3>
                    <ol style="color: #666; line-height: 1.6;">
                        <li>Your upload was successful and is stored in Cloudinary ✅</li>
                        <li>The document info is cached locally on your mobile device 📱</li>
                        <li>To make it visible on PC, we need to sync the database 🔄</li>
                    </ol>
                </div>
                
                <div style="margin: 20px 0;">
                    <h3>🔧 Quick Sync Options:</h3>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                        <strong>Option 1: Wait for Auto-Sync (Coming Soon)</strong><br>
                        <small style="color: #666;">We're working on automatic syncing between devices.</small>
                    </div>
                    
                    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 10px 0;">
                        <strong>Option 2: Manual Sync (Advanced Users)</strong><br>
                        <small style="color: #666;">Copy the JSON data from browser console and update the GitHub file.</small>
                        <br><br>
                        <button onclick="window.copyDatabaseJSON()" style="background: #2196F3; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                            Copy Database JSON
                        </button>
                    </div>
                </div>
                
                <div style="margin: 20px 0;">
                    <h3>✅ Current Status:</h3>
                    <p style="color: #666;">Your documents are:</p>
                    <ul style="color: #666;">
                        <li>✅ Uploaded to Cloudinary (globally accessible files)</li>
                        <li>📱 Cached on upload device (immediate visibility)</li>
                        <li>⏳ Pending sync for worldwide visibility</li>
                    </ul>
                </div>
                
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: #4CAF50; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin-top: 20px;">
                    Got it, thanks!
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
};

// Copy database JSON to clipboard
window.copyDatabaseJSON = function() {
    const syncManager = new DocumentSyncManager();
    const json = syncManager.generateSyncJSON();
    
    if (json) {
        navigator.clipboard.writeText(json).then(() => {
            alert('✅ Database JSON copied to clipboard!\n\nNext: Go to GitHub and update documents-database.json with this content.');
        }).catch(() => {
            console.log('📋 Database JSON (copy manually):');
            console.log(json);
            alert('Database JSON logged to console. Please copy it manually.');
        });
    } else {
        alert('No database found to copy.');
    }
};

// Initialize sync manager
const documentSyncManager = new DocumentSyncManager();

// Check for new uploads when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        documentSyncManager.checkForNewUploads();
    }, 2000);
});

// Check for new uploads periodically
setInterval(() => {
    documentSyncManager.checkForNewUploads();
}, 30000); // Check every 30 seconds

console.log('🔄 Document sync manager initialized');