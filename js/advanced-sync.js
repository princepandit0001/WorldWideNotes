// METHOD 1: Real-time Database using Firebase Firestore
// This provides instant worldwide sync without any manual steps

class FirebaseSync {
    constructor() {
        this.db = null;
        this.initialized = false;
    }

    // Initialize Firebase (you'll need to add your config)
    async initialize() {
        try {
            // Check if Firebase is loaded
            if (typeof firebase === 'undefined') {
                console.log('Firebase not loaded, falling back to other methods');
                return false;
            }

            // Initialize Firebase with your config
            if (!firebase.apps.length) {
                firebase.initializeApp({
                    apiKey: "your-api-key",
                    authDomain: "your-project.firebaseapp.com",
                    projectId: "your-project-id",
                    storageBucket: "your-project.appspot.com",
                    messagingSenderId: "your-sender-id",
                    appId: "your-app-id"
                });
            }

            this.db = firebase.firestore();
            this.initialized = true;
            console.log('✅ Firebase initialized for real-time sync');
            return true;
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            return false;
        }
    }

    // Save document to Firebase (instant worldwide sync)
    async saveDocument(document) {
        if (!this.initialized) return false;

        try {
            await this.db.collection('documents').doc(document.cloudinaryPublicId).set({
                ...document,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ Document saved to Firebase - instantly worldwide!');
            return true;
        } catch (error) {
            console.error('❌ Firebase save error:', error);
            return false;
        }
    }

    // Load all documents from Firebase
    async loadDocuments() {
        if (!this.initialized) return [];

        try {
            const snapshot = await this.db.collection('documents').orderBy('uploadDate', 'desc').get();
            const documents = [];
            
            snapshot.forEach(doc => {
                documents.push({ id: doc.id, ...doc.data() });
            });

            console.log(`✅ Loaded ${documents.length} documents from Firebase`);
            return documents;
        } catch (error) {
            console.error('❌ Firebase load error:', error);
            return [];
        }
    }

    // Listen for real-time updates
    onDocumentsChange(callback) {
        if (!this.initialized) return null;

        return this.db.collection('documents').onSnapshot(snapshot => {
            const documents = [];
            snapshot.forEach(doc => {
                documents.push({ id: doc.id, ...doc.data() });
            });
            callback(documents);
        });
    }
}

// METHOD 2: Simple API using JSONBin.io (Free, No Setup)
class JSONBinSync {
    constructor() {
        this.binId = '67125abc8bad4953b0120b04'; // Create a bin at jsonbin.io
        this.apiKey = '$2a$10$your-api-key'; // Get free API key from jsonbin.io
        this.baseUrl = 'https://api.jsonbin.io/v3/b';
    }

    async saveDocument(document) {
        try {
            // Get existing documents
            let documents = await this.loadDocuments();
            
            // Add or update document
            const existingIndex = documents.findIndex(doc => 
                doc.cloudinaryPublicId === document.cloudinaryPublicId
            );
            
            if (existingIndex >= 0) {
                documents[existingIndex] = document;
            } else {
                documents.unshift(document);
            }

            // Save to JSONBin
            const response = await fetch(`${this.baseUrl}/${this.binId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.apiKey
                },
                body: JSON.stringify({
                    documents: documents,
                    lastUpdated: new Date().toISOString(),
                    totalCount: documents.length
                })
            });

            if (response.ok) {
                console.log('✅ Document saved to JSONBin - instantly worldwide!');
                return true;
            } else {
                throw new Error(`JSONBin save failed: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ JSONBin save error:', error);
            return false;
        }
    }

    async loadDocuments() {
        try {
            const response = await fetch(`${this.baseUrl}/${this.binId}/latest`, {
                headers: {
                    'X-Master-Key': this.apiKey
                }
            });

            if (response.ok) {
                const data = await response.json();
                const documents = data.record.documents || [];
                console.log(`✅ Loaded ${documents.length} documents from JSONBin`);
                return documents;
            } else {
                console.log('No documents found in JSONBin');
                return [];
            }
        } catch (error) {
            console.error('❌ JSONBin load error:', error);
            return [];
        }
    }
}

// METHOD 3: Using Supabase (PostgreSQL database with real-time sync)
class SupabaseSync {
    constructor() {
        this.supabase = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            if (typeof supabase === 'undefined') {
                console.log('Supabase not loaded, falling back to other methods');
                return false;
            }

            this.supabase = supabase.createClient(
                'https://your-project.supabase.co',
                'your-anon-key'
            );

            this.initialized = true;
            console.log('✅ Supabase initialized for real-time sync');
            return true;
        } catch (error) {
            console.error('❌ Supabase initialization failed:', error);
            return false;
        }
    }

    async saveDocument(document) {
        if (!this.initialized) return false;

        try {
            const { data, error } = await this.supabase
                .from('documents')
                .upsert([document]);

            if (error) throw error;

            console.log('✅ Document saved to Supabase - instantly worldwide!');
            return true;
        } catch (error) {
            console.error('❌ Supabase save error:', error);
            return false;
        }
    }

    async loadDocuments() {
        if (!this.initialized) return [];

        try {
            const { data, error } = await this.supabase
                .from('documents')
                .select('*')
                .order('uploadDate', { ascending: false });

            if (error) throw error;

            console.log(`✅ Loaded ${data.length} documents from Supabase`);
            return data;
        } catch (error) {
            console.error('❌ Supabase load error:', error);
            return [];
        }
    }

    // Real-time subscription
    subscribeToChanges(callback) {
        if (!this.initialized) return null;

        return this.supabase
            .channel('documents')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, callback)
            .subscribe();
    }
}

// METHOD 4: Simple GitHub API (Automatic commits)
class GitHubAPISync {
    constructor() {
        this.owner = 'princepandit0001';
        this.repo = 'WorldWideNotes';
        this.path = 'documents-database.json';
        this.token = 'github_pat_your_token'; // Generate at github.com/settings/tokens
    }

    async saveDocument(document) {
        try {
            // Get current file
            const currentFile = await this.getCurrentFile();
            let documents = currentFile.data.documents || [];
            
            // Add or update document
            const existingIndex = documents.findIndex(doc => 
                doc.cloudinaryPublicId === document.cloudinaryPublicId
            );
            
            if (existingIndex >= 0) {
                documents[existingIndex] = document;
            } else {
                documents.unshift(document);
            }

            const newData = {
                documents: documents,
                lastUpdated: new Date().toISOString(),
                totalCount: documents.length
            };

            // Update file on GitHub
            const response = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Add document: ${document.title}`,
                    content: btoa(JSON.stringify(newData, null, 2)),
                    sha: currentFile.sha
                })
            });

            if (response.ok) {
                console.log('✅ Document saved via GitHub API - worldwide in 30 seconds!');
                return true;
            } else {
                throw new Error(`GitHub API failed: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ GitHub API save error:', error);
            return false;
        }
    }

    async getCurrentFile() {
        const response = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.path}`);
        const fileData = await response.json();
        
        return {
            sha: fileData.sha,
            data: JSON.parse(atob(fileData.content))
        };
    }
}

// METHOD 5: Browser P2P using WebRTC (Experimental)
class P2PSync {
    constructor() {
        this.peers = new Map();
        this.localDocuments = [];
    }

    // This would create a peer-to-peer network where devices share documents directly
    // More complex to implement but completely decentralized
    
    async initP2P() {
        // WebRTC implementation for direct device-to-device sync
        console.log('P2P sync would enable direct device sharing');
    }
}

// Export all sync methods
window.SyncMethods = {
    FirebaseSync,
    JSONBinSync,
    SupabaseSync,
    GitHubAPISync,
    P2PSync
};

console.log('🔄 Advanced sync methods loaded!');