import json
from typing import Dict, Any, List
from models import PowerBIFile, AnalysisResult

class PowerBIAnalyzer:
    def __init__(self):
        pass
    
    def analyze_model(self, file_content: str, filename: str, file_size: int) -> AnalysisResult:
        """
        Analyze a Power BI model JSON file and extract structured information
        """
        try:
            # Parse the JSON content
            raw_data = json.loads(file_content)
            
            # Validate against our Pydantic model
            powerbi_file = PowerBIFile(**raw_data)
            
            # Extract basic information
            compatibility_level = powerbi_file.compatibilityLevel
            model = powerbi_file.model
            
            # Build model info dictionary
            model_info = {}
            summary = {}
            
            if model:
                # Basic model properties
                model_info["culture"] = model.culture
                model_info["sourceQueryCulture"] = model.sourceQueryCulture
                
                # Data access options
                if model.dataAccessOptions:
                    model_info["dataAccessOptions"] = {
                        "defaultMode": model.dataAccessOptions.defaultMode,
                        "defaultPowerBIDataSourceVersion": model.dataAccessOptions.defaultPowerBIDataSourceVersion
                    }
                
                # Count various elements for summary
                summary["tables_count"] = len(model.tables) if model.tables else 0
                summary["relationships_count"] = len(model.relationships) if model.relationships else 0
                summary["expressions_count"] = len(model.expressions) if model.expressions else 0
                summary["roles_count"] = len(model.roles) if model.roles else 0
                summary["query_groups_count"] = len(model.queryGroups) if model.queryGroups else 0
                summary["annotations_count"] = len(model.annotations) if model.annotations else 0
                summary["cultures_count"] = len(model.cultures) if model.cultures else 0
                
                # Extract detailed information for each section
                if model.tables:
                    model_info["tables"] = self._analyze_tables(model.tables)
                
                if model.relationships:
                    model_info["relationships"] = self._analyze_relationships(model.relationships)
                
                if model.expressions:
                    model_info["expressions"] = self._analyze_expressions(model.expressions)
                
                if model.roles:
                    model_info["roles"] = self._analyze_roles(model.roles)
                
                if model.annotations:
                    model_info["annotations"] = model.annotations
                
                if model.cultures:
                    model_info["cultures"] = model.cultures
                
                if model.queryGroups:
                    model_info["queryGroups"] = model.queryGroups
            
            return AnalysisResult(
                filename=filename,
                file_size=file_size,
                compatibility_level=compatibility_level,
                model_info=model_info,
                summary=summary,
                raw_data=raw_data
            )
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error analyzing model: {str(e)}")
    
    def _analyze_tables(self, tables: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze tables and extract key information"""
        analyzed_tables = []
        for table in tables:
            table_info = {
                "name": table.get("name", "Unknown"),
                "columns_count": len(table.get("columns", [])),
                "measures_count": len(table.get("measures", [])),
                "partitions_count": len(table.get("partitions", [])),
                "hierarchies_count": len(table.get("hierarchies", [])),
            }
            
            # Add column details if available
            if "columns" in table:
                table_info["columns"] = [
                    {
                        "name": col.get("name", "Unknown"),
                        "dataType": col.get("dataType", "Unknown"),
                        "isHidden": col.get("isHidden", False),
                        "isKey": col.get("isKey", False)
                    }
                    for col in table["columns"]
                ]
            
            # Add measure details if available
            if "measures" in table:
                table_info["measures"] = [
                    {
                        "name": measure.get("name", "Unknown"),
                        "expression": measure.get("expression", ""),
                        "isHidden": measure.get("isHidden", False)
                    }
                    for measure in table["measures"]
                ]
            
            analyzed_tables.append(table_info)
        
        return analyzed_tables
    
    def _analyze_relationships(self, relationships: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze relationships between tables"""
        analyzed_relationships = []
        for rel in relationships:
            rel_info = {
                "name": rel.get("name", "Unknown"),
                "fromTable": rel.get("fromTable", "Unknown"),
                "fromColumn": rel.get("fromColumn", "Unknown"),
                "toTable": rel.get("toTable", "Unknown"),
                "toColumn": rel.get("toColumn", "Unknown"),
                "crossFilteringBehavior": rel.get("crossFilteringBehavior", "Unknown"),
                "isActive": rel.get("isActive", True),
                "cardinality": rel.get("cardinality", "Unknown")
            }
            analyzed_relationships.append(rel_info)
        
        return analyzed_relationships
    
    def _analyze_expressions(self, expressions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze DAX expressions"""
        analyzed_expressions = []
        for expr in expressions:
            expr_info = {
                "name": expr.get("name", "Unknown"),
                "kind": expr.get("kind", "Unknown"),
                "expression": expr.get("expression", "")
            }
            analyzed_expressions.append(expr_info)
        
        return analyzed_expressions
    
    def _analyze_roles(self, roles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze security roles"""
        analyzed_roles = []
        for role in roles:
            role_info = {
                "name": role.get("name", "Unknown"),
                "description": role.get("description", ""),
                "members_count": len(role.get("members", [])),
                "table_permissions_count": len(role.get("tablePermissions", []))
            }
            
            if "tablePermissions" in role:
                role_info["tablePermissions"] = [
                    {
                        "name": perm.get("name", "Unknown"),
                        "filterExpression": perm.get("filterExpression", "")
                    }
                    for perm in role["tablePermissions"]
                ]
            
            analyzed_roles.append(role_info)
        
        return analyzed_roles
