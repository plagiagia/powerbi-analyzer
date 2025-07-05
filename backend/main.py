from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import uuid
from analyzer import PowerBIAnalyzer
from models import AnalysisResult

app = FastAPI(
    title="Power BI Model Analyzer",
    description="A web application to analyze Power BI model.json files",
    version="1.0.0"
)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the analyzer
analyzer = PowerBIAnalyzer()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Store analysis results in memory (in production, use a database)
analysis_cache = {}

@app.get("/")
async def root():
    return {"message": "Power BI Model Analyzer API", "version": "1.0.0"}

@app.post("/upload", response_model=dict)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload and analyze a Power BI model.json file
    """
    print(f"[UPLOAD] Received file: {file.filename}, content-type: {file.content_type}")
    
    # Validate file type
    if not file.filename.endswith('.json'):
        print(f"[UPLOAD] Error: Invalid file type - {file.filename}")
        raise HTTPException(status_code=400, detail="Only JSON files are allowed")
    
    # Check file size (limit to 50MB)
    file_size = 0
    content = await file.read()
    file_size = len(content)
    
    print(f"[UPLOAD] File size: {file_size} bytes")
    
    if file_size > 50 * 1024 * 1024:  # 50MB limit
        print(f"[UPLOAD] Error: File too large - {file_size} bytes")
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB")
    
    if file_size == 0:
        print(f"[UPLOAD] Error: Empty file")
        raise HTTPException(status_code=400, detail="Empty file")
    
    try:
        # Generate unique ID for this analysis
        analysis_id = str(uuid.uuid4())
        print(f"[UPLOAD] Generated analysis ID: {analysis_id}")
        
        # Decode file content
        file_content = content.decode('utf-8')
        print(f"[UPLOAD] File decoded successfully, length: {len(file_content)}")
        
        # Analyze the model
        print(f"[UPLOAD] Starting analysis...")
        result = analyzer.analyze_model(file_content, file.filename, file_size)
        print(f"[UPLOAD] Analysis completed successfully")
        
        # Store result in cache
        analysis_cache[analysis_id] = result
        print(f"[UPLOAD] Result stored in cache")
        
        return {
            "analysis_id": analysis_id,
            "message": "File uploaded and analyzed successfully",
            "filename": file.filename,
            "file_size": file_size
        }
        
    except UnicodeDecodeError as e:
        print(f"[UPLOAD] Unicode decode error: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid file encoding. Please ensure the file is UTF-8 encoded")
    except ValueError as e:
        print(f"[UPLOAD] Value error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[UPLOAD] Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/analyze/{analysis_id}", response_model=AnalysisResult)
async def get_analysis(analysis_id: str):
    """
    Get analysis results by ID
    """
    print(f"[ANALYZE] Requested analysis ID: {analysis_id}")
    print(f"[ANALYZE] Available IDs in cache: {list(analysis_cache.keys())}")
    
    if analysis_id not in analysis_cache:
        print(f"[ANALYZE] Error: Analysis ID not found in cache")
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    print(f"[ANALYZE] Returning analysis results")
    return analysis_cache[analysis_id]

@app.get("/analyze/{analysis_id}/summary")
async def get_analysis_summary(analysis_id: str):
    """
    Get a summary of the analysis results
    """
    if analysis_id not in analysis_cache:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    result = analysis_cache[analysis_id]
    
    return {
        "filename": result.filename,
        "file_size": result.file_size,
        "compatibility_level": result.compatibility_level,
        "summary": result.summary,
        "model_culture": result.model_info.get("culture"),
        "source_query_culture": result.model_info.get("sourceQueryCulture"),
        "data_access_mode": result.model_info.get("dataAccessOptions", {}).get("defaultMode")
    }

@app.get("/analyze/{analysis_id}/tables")
async def get_tables_info(analysis_id: str):
    """
    Get detailed table information
    """
    if analysis_id not in analysis_cache:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    result = analysis_cache[analysis_id]
    return {
        "tables": result.model_info.get("tables", []),
        "count": result.summary.get("tables_count", 0)
    }

@app.get("/analyze/{analysis_id}/relationships")
async def get_relationships_info(analysis_id: str):
    """
    Get detailed relationship information
    """
    if analysis_id not in analysis_cache:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    result = analysis_cache[analysis_id]
    return {
        "relationships": result.model_info.get("relationships", []),
        "count": result.summary.get("relationships_count", 0)
    }

@app.get("/analyze/{analysis_id}/raw")
async def get_raw_data(analysis_id: str):
    """
    Get the raw JSON data
    """
    if analysis_id not in analysis_cache:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    result = analysis_cache[analysis_id]
    return result.raw_data

@app.delete("/analyze/{analysis_id}")
async def delete_analysis(analysis_id: str):
    """
    Delete analysis results from cache
    """
    if analysis_id not in analysis_cache:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    del analysis_cache[analysis_id]
    return {"message": "Analysis deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
