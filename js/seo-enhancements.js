// SEO Enhancement Script - Add to main JavaScript for dynamic SEO improvements

// Dynamic Schema Markup for Documents
function addDocumentSchema(document) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": document.title,
        "description": document.description,
        "author": {
            "@type": "Person",
            "name": document.uploadedBy || "Anonymous Student"
        },
        "datePublished": document.uploadDate,
        "educationalUse": document.type,
        "educationalLevel": "University",
        "inLanguage": "en",
        "keywords": document.tags.join(", "),
        "learningResourceType": document.type,
        "subject": document.subject,
        "publisher": {
            "@type": "Organization",
            "name": "World Wide Notes"
        }
    };
    
    // Add schema to page
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
}

// Dynamic Meta Tags for Search Results
function updatePageMeta(title, description, keywords) {
    // Update title
    document.title = title + " | World Wide Notes";
    
    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        metaDesc.setAttribute('content', description);
    }
    
    // Update keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
        metaKeywords.setAttribute('content', keywords);
    }
    
    // Update Open Graph
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
        ogTitle.setAttribute('content', title + " | World Wide Notes");
    }
    
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
        ogDesc.setAttribute('content', description);
    }
}

// Breadcrumb Schema
function addBreadcrumbSchema(items) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": item.url
        }))
    };
    
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
}

// Search Result Enhancement
function enhanceSearchResults() {
    // Add search result count and timing
    const results = document.querySelectorAll('.document-card');
    const searchTime = new Date().toLocaleTimeString();
    
    // Could add search result statistics
    console.log(`Search completed at ${searchTime}, found ${results.length} results`);
}

// Export functions for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        addDocumentSchema,
        updatePageMeta,
        addBreadcrumbSchema,
        enhanceSearchResults
    };
}