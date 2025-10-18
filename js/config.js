// Cloudinary Configuration
const CLOUDINARY_CONFIG = {
    cloudName: 'dpfrv7kmo', // Your Cloudinary cloud name
    uploadPreset: 'wwnotespreset', // Your upload preset
    apiKey: '', // Not needed for unsigned uploads
    folder: 'world-wide-notes', // Folder name in Cloudinary
    resourceType: 'auto', // Automatically detect file type
    allowedFormats: ['pdf', 'doc', 'docx'], // Allowed file formats
    maxFileSize: 15000000, // 15MB in bytes
    clientAllowedFormats: ['pdf', 'doc', 'docx'],
    maxImageFileSize: 15000000
};

// Firebase Configuration (for storing document metadata)
// You need to replace these with your actual Firebase credentials
const FIREBASE_CONFIG = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Instructions for setup:
/*
CLOUDINARY SETUP:
1. Go to https://cloudinary.com and create a free account
2. After login, go to Dashboard
3. Copy your Cloud Name, API Key from the dashboard
4. Go to Settings > Upload > Upload Presets
5. Create a new upload preset (unsigned) named 'world_wide_notes_preset'
6. Set folder to 'world-wide-notes'
7. Set resource type to 'auto'
8. Set allowed formats to 'pdf,doc,docx'
9. Replace the values above with your actual credentials

FIREBASE SETUP (Alternative to localStorage for metadata):
1. Go to https://firebase.google.com
2. Create a new project
3. Enable Firestore Database
4. Get your config from Project Settings > General > Your apps
5. Replace the values above with your actual Firebase config

ALTERNATIVE: You can also use Supabase (https://supabase.com) instead of Firebase
*/