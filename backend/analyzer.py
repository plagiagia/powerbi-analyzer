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
        """Analyze tables and extract key information, including measure lineage"""
        analyzed_tables = []

        # Step 1: Collect all measures across all tables
        all_measures = []
        for table in tables:
            for measure in table.get("measures", []):
                all_measures.append({
                    "table": table.get("name", "Unknown"),
                    "name": measure.get("name", "Unknown"),
                    "expression": measure.get("expression", ""),
                })

        # Step 2: Build a mapping of measure name (with table) to its expression
        measure_fullnames = []
        name_to_fullnames = {}  # name (case-insensitive) -> list of Table[Measure]
        for m in all_measures:
            fullname = f"{m['table']}[{m['name']}]"
            measure_fullnames.append(fullname)
            key = m['name'].strip().lower()
            if key not in name_to_fullnames:
                name_to_fullnames[key] = []
            name_to_fullnames[key].append(fullname)

        # Step 3: For each measure, find which other measures it references
        import re
        measure_references = {}  # fullname -> set of referenced fullnames
        for m in all_measures:
            fullname = f"{m['table']}[{m['name']}]"
            expr = m["expression"]
            if isinstance(expr, list):
                expr = "\n".join(str(line) for line in expr)
            elif expr is None:
                expr = ""
            refs = set()
            for candidate in measure_fullnames:
                if candidate == fullname:
                    continue
                table, name = candidate.split("[", 1)
                name = name.rstrip("]")
                # Table[Measure]
                if re.search(rf"\b{re.escape(table)}\[{re.escape(name)}\]", expr, re.IGNORECASE):
                    refs.add(candidate)
            # Now handle unqualified [Measure] references
            # Find all [SomeName] in the expression
            unqualified_refs = set(re.findall(r"\[([^\[\]]+)\]", expr))
            for ref_name in unqualified_refs:
                key = ref_name.strip().lower()
                if key in name_to_fullnames and len(name_to_fullnames[key]) == 1:
                    # Only one measure with this name, safe to link
                    refs.add(name_to_fullnames[key][0])
            measure_references[fullname] = refs

        # Step 4: Build reverse mapping: for each measure, who references it
        referenced_by = {fullname: set() for fullname in measure_fullnames}
        for src, targets in measure_references.items():
            for tgt in targets:
                referenced_by[tgt].add(src)

        # Step 5: Build analyzed_tables with lineage info
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

            # Add measure details with lineage info
            if "measures" in table:
                table_measures = []
                for measure in table["measures"]:
                    m_name = measure.get("name", "Unknown")
                    fullname = f"{table.get('name', 'Unknown')}[{m_name}]"
                    refs = sorted(list(measure_references.get(fullname, set())))
                    refd_by = sorted(list(referenced_by.get(fullname, set())))
                    # For debugging: show joined expression and all candidate names
                    expr_val = measure.get("expression", "")
                    if isinstance(expr_val, list):
                        expr_debug = "\n".join(str(line) for line in expr_val)
                    else:
                        expr_debug = str(expr_val)
                    table_measures.append({
                        "name": m_name,
                        "expression": measure.get("expression", ""),
                        "isHidden": measure.get("isHidden", False),
                        "references": refs,        # List of Table[Measure] this measure references
                        "referencedBy": refd_by,   # List of Table[Measure] that reference this measure
                        "_debug_expression": expr_debug,
                        "_debug_candidates": measure_fullnames
                    })
                table_info["measures"] = table_measures

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
