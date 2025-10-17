# Student Document Portal

A simple, responsive website for students to search and access study materials including notes, previous year papers, assignments, and syllabi.

## Features

- **Search Functionality**: Search by title, subject, description, or tags
- **Advanced Filtering**: Filter by subject, document type, and year
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Document Modal**: Preview document details before downloading
- **Real-time Search**: Search results update as you type
- **Clean UI**: Modern, student-friendly interface

## File Structure

```
student-portal/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # Styling and responsive design
├── js/
│   └── script.js       # JavaScript functionality
├── data/
│   └── documents.json  # Document database
├── documents/          # Folder for actual document files
│   ├── math/
│   ├── physics/
│   ├── chemistry/
│   ├── cs/
│   ├── english/
│   ├── history/
│   └── biology/
└── README.md          # This file
```

## How to Use

1. Open `index.html` in a web browser
2. Use the search bar to find specific documents
3. Apply filters to narrow down results by subject, type, or year
4. Click on any document card to view details
5. Download or view documents from the modal popup

## Adding New Documents

To add new documents to the portal:

1. **Add document files**: Place PDF files in the appropriate subject folder under `/documents/`

2. **Update JSON data**: Add new entries to `/data/documents.json` with the following structure:

```json
{
    "id": 16,
    "title": "Document Title",
    "description": "Brief description of the document",
    "subject": "subject-name",
    "type": "notes|previous-papers|assignments|syllabus",
    "year": 2024,
    "fileType": "pdf",
    "fileName": "filename.pdf",
    "filePath": "documents/subject/filename.pdf",
    "uploadDate": "2024-03-25",
    "tags": ["tag1", "tag2", "tag3"]
}
```

## Subjects Available

- Mathematics
- Physics
- Chemistry
- Computer Science
- English
- History
- Biology

## Document Types

- **Notes**: Study notes and lecture materials
- **Previous Papers**: Past examination papers
- **Assignments**: Homework and project assignments
- **Syllabus**: Course outlines and curricula

## Technology Stack

- **HTML5**: Structure and semantics
- **CSS3**: Styling, animations, and responsive design
- **JavaScript (ES6+)**: Functionality and interactivity
- **Font Awesome**: Icons
- **JSON**: Data storage

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Setup for Development

1. Clone or download the project files
2. Open the project folder in your code editor
3. Start a local server (optional, for testing JSON loading)
4. Open `index.html` in your browser

## Future Enhancements

- User authentication and personalized bookmarks
- File upload functionality for students and teachers
- Advanced search with filters for file size, date ranges
- Dark mode theme
- Document preview without download
- Rating and review system for documents
- Download statistics and popular documents section

## License

This project is open source and available under the MIT License.

## Support

For issues or questions, please contact the development team or create an issue in the project repository.