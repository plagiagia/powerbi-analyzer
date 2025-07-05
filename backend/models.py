from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class DataAccessOptions(BaseModel):
    defaultMode: Optional[str] = None
    defaultPowerBIDataSourceVersion: Optional[str] = None

class PowerBIModel(BaseModel):
    annotations: Optional[List[Dict[str, Any]]] = None
    culture: Optional[str] = None
    cultures: Optional[List[Dict[str, Any]]] = None
    dataAccessOptions: Optional[DataAccessOptions] = None
    expressions: Optional[List[Dict[str, Any]]] = None
    queryGroups: Optional[List[Dict[str, Any]]] = None
    relationships: Optional[List[Dict[str, Any]]] = None
    roles: Optional[List[Dict[str, Any]]] = None
    sourceQueryCulture: Optional[str] = None
    tables: Optional[List[Dict[str, Any]]] = None

class PowerBIFile(BaseModel):
    compatibilityLevel: Optional[int] = None
    model: Optional[PowerBIModel] = None

class AnalysisResult(BaseModel):
    filename: str
    file_size: int
    compatibility_level: Optional[int]
    model_info: Dict[str, Any]
    summary: Dict[str, int]
    raw_data: Dict[str, Any]
