# Power BI Model Analyzer

A web application that helps Power BI developers analyze their model.json files by providing detailed insights into the model structure, tables, relationships, expressions, and security roles.

## Features

- **File Upload**: Drag-and-drop or browse to upload Power BI model.json files
- **Comprehensive Analysis**: Analyzes all aspects of the Power BI model including:
  - Model metadata (compatibility level, culture settings)
  - Tables with columns and measures details
  - Relationships between tables
  - DAX expressions
  - Security roles and permissions
  - Raw JSON data viewer
- **Interactive Interface**: Tabbed interface with expandable sections for detailed exploration
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Backend**: Python with FastAPI
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Data Validation**: Pydantic models
- **File Processing**: JSON parsing and analysis

## Project Structure

```
powerbi-analyzer/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── models.py            # Pydantic data models
│   ├── analyzer.py          # Core analysis logic
│   ├── requirements.txt     # Python dependencies
│   └── uploads/             # Temporary file storage (created automatically)
├── frontend/
│   ├── index.html           # Main HTML page
│   ├── styles.css           # CSS styling
│   └── script.js            # JavaScript functionality
└── README.md               # This file
```

## Installation and Setup

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd powerbi-analyzer/backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the FastAPI server:
   ```bash
   python main.py
   ```
   
   Or using uvicorn directly:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

The backend API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd powerbi-analyzer/frontend
   ```

2. Open `index.html` in a web browser, or serve it using a simple HTTP server:

   **Using Python:**
   ```bash
   python -m http.server 3000
   ```
   
   **Using Node.js (if you have it installed):**
   ```bash
   npx serve .
   ```

The frontend will be available at `http://localhost:3000` (or the port you specified)

## Usage

1. **Start the Backend**: Make sure the FastAPI server is running on `http://localhost:8000`

2. **Open the Frontend**: Access the web application in your browser

3. **Upload a Model File**: 
   - Drag and drop a Power BI model.json file onto the upload area
   - Or click "browse files" to select a file
   - Supported file types: JSON files up to 50MB

4. **Analyze Results**: Once uploaded, the application will display:
   - **Overview**: Summary cards and basic model information
   - **Tables**: Detailed table structure with columns and measures
   - **Relationships**: Model relationships and their properties
   - **Expressions**: DAX expressions and calculated columns
   - **Roles**: Security roles and table permissions
   - **Raw Data**: Complete JSON structure for advanced users

## API Endpoints

The backend provides the following REST API endpoints:

- `GET /` - API information
- `POST /upload` - Upload and analyze a model.json file
- `GET /analyze/{analysis_id}` - Get complete analysis results
- `GET /analyze/{analysis_id}/summary` - Get analysis summary
- `GET /analyze/{analysis_id}/tables` - Get table information
- `GET /analyze/{analysis_id}/relationships` - Get relationship information
- `GET /analyze/{analysis_id}/raw` - Get raw JSON data
- `DELETE /analyze/{analysis_id}` - Delete analysis from cache

## Development

### Adding New Analysis Features

1. **Backend**: Extend the `PowerBIAnalyzer` class in `analyzer.py`
2. **Models**: Update Pydantic models in `models.py` if needed
3. **API**: Add new endpoints in `main.py`
4. **Frontend**: Update the JavaScript in `script.js` to display new data

### Customization

- **Styling**: Modify `styles.css` to change the appearance
- **Analysis Logic**: Extend `analyzer.py` to add more sophisticated analysis
- **Data Models**: Update `models.py` to support additional Power BI features

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure the backend is running and CORS is properly configured
2. **File Upload Fails**: Check file size (max 50MB) and ensure it's a valid JSON file
3. **Analysis Errors**: Verify the JSON structure matches Power BI model format

### Error Messages

- "Only JSON files are allowed" - Upload a .json file
- "File too large" - Reduce file size or increase the limit in `main.py`
- "Invalid JSON format" - Ensure the file contains valid JSON
- "Analysis not found" - The analysis may have expired from cache

## Future Enhancements

- **Database Storage**: Replace in-memory cache with persistent storage
- **Model Comparison**: Compare different versions of the same model
- **Export Features**: Export analysis results to PDF or Excel
- **Validation Rules**: Add Power BI best practices validation
- **Visualization**: Add charts and graphs for model insights
- **Authentication**: Add user authentication and file management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.
