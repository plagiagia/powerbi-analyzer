// Configuration
const API_BASE_URL = 'http://localhost:8000';

// Global variables
let currentAnalysisId = null;
let currentAnalysisData = null;

// DOM elements
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const uploadProgress = document.getElementById('upload-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const uploadSection = document.getElementById('upload-section');
const resultsSection = document.getElementById('results-section');
const errorSection = document.getElementById('error-section');
const errorMessage = document.getElementById('error-message');
const newAnalysisBtn = document.getElementById('new-analysis-btn');
const retryBtn = document.getElementById('retry-btn');
const summaryGrid = document.getElementById('summary-grid');

 // Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    // Restore analysis if present in localStorage
    const savedAnalysisId = localStorage.getItem('analysisId');
    if (savedAnalysisId) {
        currentAnalysisId = savedAnalysisId;
        loadAnalysisResults();
    }
});

function initializeEventListeners() {
    // File upload events
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Button events
    newAnalysisBtn.addEventListener('click', resetToUpload);
    retryBtn.addEventListener('click', resetToUpload);
    
    // Tab events
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

// File handling functions
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        uploadFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        uploadFile(files[0]);
    }
}

// Upload and analysis functions
async function uploadFile(file) {
    // Validate file
    if (!file.name.endsWith('.json')) {
        showError('Please select a JSON file.');
        return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
        showError('File is too large. Maximum size is 50MB.');
        return;
    }
    
    // Show progress
    showProgress();
    
    try {
        console.log('Starting file upload...', file.name, file.size);
        const formData = new FormData();
        formData.append('file', file);
        
        console.log('Sending request to:', `${API_BASE_URL}/upload`);
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        console.log('Upload response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Upload error response:', errorData);
            throw new Error(errorData.detail || 'Upload failed');
        }
        
        const result = await response.json();
        console.log('Upload successful:', result);
        currentAnalysisId = result.analysis_id;
        // Save analysisId to localStorage for persistence
        localStorage.setItem('analysisId', currentAnalysisId);

        // Load analysis results
        await loadAnalysisResults();
        
    } catch (error) {
        console.error('Upload error:', error);
        showError(error.message || 'Failed to upload and analyze file');
    }
}

async function loadAnalysisResults() {
    try {
        console.log('Loading analysis results for ID:', currentAnalysisId);
        // Load full analysis data
        const response = await fetch(`${API_BASE_URL}/analyze/${currentAnalysisId}`);
        
        console.log('Analysis response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Analysis error response:', errorText);
            throw new Error('Failed to load analysis results');
        }
        
        currentAnalysisData = await response.json();
        console.log('Analysis data loaded:', currentAnalysisData);
        
        // Display results
        displayResults();
        
    } catch (error) {
        console.error('Analysis loading error:', error);
        showError('Failed to load analysis results: ' + error.message);
    }
}

// Display functions
function displayResults() {
    hideAllSections();
    resultsSection.style.display = 'block';
    
    // Display summary cards
    displaySummaryCards();
    
    // Display detailed content for each tab
    displayOverviewTab();
    displayTablesTab();
    displayMeasuresTab();
    displayRelationshipsTab(); // Will use default grouping
    displayExpressionsTab();
    displayRolesTab();
    displayRawTab();

    // Set up relationships grouping selector event
    const groupingSelect = document.getElementById('relationship-grouping-select');
    if (groupingSelect) {
        groupingSelect.value = "fromTable";
        groupingSelect.onchange = function () {
            displayRelationshipsTab(this.value);
        };
    }

    // Set up measures search input event (only once)
    const measuresSearchInput = document.getElementById('measures-search-input');
    if (measuresSearchInput && !measuresSearchInput._listenerSet) {
        measuresSearchInput.addEventListener('input', function(e) {
            displayMeasuresTab(e.target.value);
        });
        measuresSearchInput._listenerSet = true;
    }
}

function displaySummaryCards() {
    const summary = currentAnalysisData.summary;
    const modelInfo = currentAnalysisData.model_info;
    
    summaryGrid.innerHTML = `
        <div class="summary-card primary">
            <h3>${summary.tables_count || 0}</h3>
            <p>Tables</p>
        </div>
        <div class="summary-card success">
            <h3>${summary.relationships_count || 0}</h3>
            <p>Relationships</p>
        </div>
        <div class="summary-card info">
            <h3>${summary.expressions_count || 0}</h3>
            <p>Expressions</p>
        </div>
        <div class="summary-card warning">
            <h3>${summary.roles_count || 0}</h3>
            <p>Security Roles</p>
        </div>
        <div class="summary-card primary">
            <h3>${currentAnalysisData.compatibility_level || 'N/A'}</h3>
            <p>Compatibility Level</p>
        </div>
        <div class="summary-card success">
            <h3>${formatFileSize(currentAnalysisData.file_size)}</h3>
            <p>File Size</p>
        </div>
    `;
}

function displayOverviewTab() {
    const modelInfo = currentAnalysisData.model_info;
    const summary = currentAnalysisData.summary;
    
    // Extract Power BI Desktop version and Time Intelligence status from annotations
    let pbiDesktopVersion = 'N/A';
    let timeIntelligenceEnabled = 'N/A';
    
    if (modelInfo.annotations && Array.isArray(modelInfo.annotations)) {
        const versionAnnotation = modelInfo.annotations.find(ann => ann.name === 'PBIDesktopVersion');
        const timeIntellAnnotation = modelInfo.annotations.find(ann => ann.name === '__PBI_TimeIntelligenceEnabled');
        
        if (versionAnnotation) {
            pbiDesktopVersion = versionAnnotation.value;
        }
        
        if (timeIntellAnnotation) {
            timeIntelligenceEnabled = timeIntellAnnotation.value === '1' ? 'Enabled' : 'Disabled';
        }
    }
    
    const overviewContent = document.getElementById('overview-content');
    overviewContent.innerHTML = `
        <div class="info-grid">
            <div class="info-card">
                <h4>File Information</h4>
                <p>Filename: <span class="value">${currentAnalysisData.filename}</span></p>
                <p>File Size: <span class="value">${formatFileSize(currentAnalysisData.file_size)}</span></p>
                <p>Compatibility Level: <span class="value">${currentAnalysisData.compatibility_level || 'N/A'}</span></p>
            </div>
            <div class="info-card">
                <h4>Power BI Environment</h4>
                <p>Desktop Version: <span class="value">${pbiDesktopVersion}</span></p>
                <p>Time Intelligence: <span class="value">${timeIntelligenceEnabled}</span></p>
                <p>Culture: <span class="value">${modelInfo.culture || 'N/A'}</span></p>
                <p>Source Query Culture: <span class="value">${modelInfo.sourceQueryCulture || 'N/A'}</span></p>
            </div>
            <div class="info-card">
                <h4>Model Components</h4>
                <p>Tables: <span class="value">${summary.tables_count || 0}</span></p>
                <p>Relationships: <span class="value">${summary.relationships_count || 0}</span></p>
                <p>Expressions: <span class="value">${summary.expressions_count || 0}</span></p>
                <p>Security Roles: <span class="value">${summary.roles_count || 0}</span></p>
            </div>
        </div>
    `;
}

function highlightMatch(text, searchTerm) {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

function displayTablesTab(filter = "") {
    const tables = currentAnalysisData.model_info.tables || [];
    const tablesContent = document.getElementById('tables-content');
    const searchTerm = filter.trim().toLowerCase();

    // Filter tables and columns
    let filteredTables = tables.map((table, index) => {
        // Check if table name matches
        const tableNameMatch = table.name.toLowerCase().includes(searchTerm);
        // Filter columns by name
        let filteredColumns = [];
        if (table.columns && table.columns.length > 0) {
            filteredColumns = table.columns.filter(col =>
                col.name.toLowerCase().includes(searchTerm)
            );
        }
        // If table name matches or any column matches, include the table
        if (searchTerm === "" || tableNameMatch || filteredColumns.length > 0) {
            // If table name doesn't match, but columns do, show only matching columns
            return {
                ...table,
                columns: tableNameMatch ? table.columns : filteredColumns,
                showAllColumns: tableNameMatch
            };
        }
        return null;
    }).filter(Boolean);

    if (filteredTables.length === 0) {
        tablesContent.innerHTML = '<p>No tables or columns match your search.</p>';
        return;
    }

    let html = `<h3>Tables Overview (${filteredTables.length} shown${searchTerm ? " - filtered" : ""})</h3>`;

    filteredTables.forEach((table, index) => {
        const tableNameHtml = highlightMatch(table.name, searchTerm);
        html += `
            <div class="expandable" id="table-${index}">
                <div class="expandable-header" onclick="toggleExpandable('table-${index}')">
                    <h4>${tableNameHtml} (${table.columns_count} columns, ${table.measures_count} measures)</h4>
                    <span class="expandable-toggle">▼</span>
                </div>
                <div class="expandable-content">
                    <div class="info-grid">
                        <div class="info-card">
                            <h4>Table Statistics</h4>
                            <p>Columns: <span class="value">${table.columns_count}</span></p>
                            <p>Measures: <span class="value">${table.measures_count}</span></p>
                            <p>Partitions: <span class="value">${table.partitions_count}</span></p>
                            <p>Hierarchies: <span class="value">${table.hierarchies_count}</span></p>
                        </div>
                    </div>
                    
                    ${table.columns && table.columns.length > 0 ? `
                        <h5>Columns</h5>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Data Type</th>
                                    <th>Hidden</th>
                                    <th>Key</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${table.columns.map(col => `
                                    <tr>
                                        <td>${highlightMatch(col.name, searchTerm)}</td>
                                        <td>${col.dataType}</td>
                                        <td>${col.isHidden ? 'Yes' : 'No'}</td>
                                        <td>${col.isKey ? 'Yes' : 'No'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : (searchTerm && !table.showAllColumns ? '<p>No columns match your search.</p>' : '')}
                    
                    ${table.measures && table.measures.length > 0 ? `
                        <h5>Measures</h5>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Expression</th>
                                    <th>Hidden</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${table.measures.map(measure => `
                                    <tr>
                                        <td>${measure.name}</td>
                                        <td><code>${(measure.expression || '').toString().substring(0, 100)}${(measure.expression || '').toString().length > 100 ? '...' : ''}</code></td>
                                        <td>${measure.isHidden ? 'Yes' : 'No'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : ''}
                    
                </div>
            </div>
        `;
    });

    tablesContent.innerHTML = html;
}


/**
 * Display all measures from all tables in a searchable, expandable list.
 */
let measuresSortState = window.measuresSortState || { column: "table", direction: "asc" };

function displayMeasuresTab(filter = "") {
    const tables = currentAnalysisData.model_info.tables || [];
    const measuresContent = document.getElementById('measures-content');
    // If no filter provided, use the current value in the input
    let searchTerm = filter;
    if (typeof searchTerm !== "string") searchTerm = "";
    searchTerm = searchTerm.trim().toLowerCase();

    // Aggregate all measures with table info
    let allMeasures = [];
    tables.forEach(table => {
        if (Array.isArray(table.measures)) {
            table.measures.forEach(measure => {
                allMeasures.push({
                    ...measure,
                    table: table.name || "Unknown"
                });
            });
        }
    });

    // Filtering logic: similar to tables tab
    let filteredMeasures = allMeasures.map((m, idx) => {
        // Normalize expression to string for search/filter/highlight
        let exprStr = "";
        if (Array.isArray(m.expression)) {
            exprStr = m.expression.join("\n");
        } else if (typeof m.expression === "string") {
            exprStr = m.expression;
        } else if (m.expression !== undefined && m.expression !== null) {
            exprStr = String(m.expression);
        }
        const nameMatch = m.name && m.name.toLowerCase().includes(searchTerm);
        const tableMatch = m.table && m.table.toLowerCase().includes(searchTerm);
        const exprMatch = exprStr.toLowerCase().includes(searchTerm);
        if (searchTerm === "" || nameMatch || tableMatch || exprMatch) {
            return { ...m, idx, _exprStr: exprStr };
        }
        return null;
    }).filter(Boolean);

    // Sorting logic
    if (measuresSortState && measuresSortState.column) {
        filteredMeasures.sort((a, b) => {
            let valA = a[measuresSortState.column] || "";
            let valB = b[measuresSortState.column] || "";
            valA = typeof valA === "string" ? valA.toLowerCase() : valA;
            valB = typeof valB === "string" ? valB.toLowerCase() : valB;
            if (valA < valB) return measuresSortState.direction === "asc" ? -1 : 1;
            if (valA > valB) return measuresSortState.direction === "asc" ? 1 : -1;
            return 0;
        });
    }

    if (filteredMeasures.length === 0) {
        measuresContent.innerHTML = '<p>No measures found matching your search.</p>';
        return;
    }

    let html = `<h3>Measures Overview (${filteredMeasures.length} shown${searchTerm ? " - filtered" : ""})</h3>`;
    html += `<table class="data-table">
        <thead>
            <tr>
                <th id="measures-table-header" style="cursor:pointer;">Table ${measuresSortState.column === "table" ? (measuresSortState.direction === "asc" ? "▲" : "▼") : ""}</th>
                <th>Name</th>
                <th>Hidden</th>
                <th>DAX Expression</th>
                <th>Referenced By</th>
            </tr>
        </thead>
        <tbody>
    `;

    filteredMeasures.forEach((m) => {
        // Use normalized expression string for display
        const expr = m._exprStr || "";
        const truncated = expr.length > 100 ? expr.substring(0, 100) + "..." : expr;
        const isExpandable = expr.length > 100;
        const exprId = `measure-expr-${m.idx}`;
        // Prepare Referenced By lineage
        let referencedBy = Array.isArray(m.referencedBy) && m.referencedBy.length > 0
            ? m.referencedBy.join(", ")
            : "—";
        html += `
            <tr>
                <td>${highlightMatch(m.table, searchTerm)}</td>
                <td>${highlightMatch(m.name, searchTerm)}</td>
                <td>${m.isHidden ? 'Yes' : 'No'}</td>
                <td>
                    <div class="measure-expression">
                        <code id="${exprId}-short">${highlightMatch(truncated, searchTerm)}</code>
                        ${isExpandable ? `<a href="#" class="expand-link" data-expr-id="${exprId}">Show more</a>` : ""}
                        <code id="${exprId}-full" style="display:none;">${highlightMatch(expr, searchTerm)}</code>
                    </div>
                </td>
                <td>${referencedBy}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    measuresContent.innerHTML = html;

    // Add expand/collapse event listeners
    const expandLinks = measuresContent.querySelectorAll('.expand-link');
    expandLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const exprId = this.getAttribute('data-expr-id');
            const shortCode = document.getElementById(exprId + "-short");
            const fullCode = document.getElementById(exprId + "-full");
            if (shortCode.style.display !== "none") {
                shortCode.style.display = "none";
                fullCode.style.display = "inline";
                this.textContent = "Show less";
            } else {
                shortCode.style.display = "inline";
                fullCode.style.display = "none";
                this.textContent = "Show more";
            }
        });
    });

    // Add sorting event listener for Table column
    const tableHeader = document.getElementById('measures-table-header');
    if (tableHeader) {
        tableHeader.onclick = function() {
            if (measuresSortState.column === "table") {
                measuresSortState.direction = measuresSortState.direction === "asc" ? "desc" : "asc";
            } else {
                measuresSortState.column = "table";
                measuresSortState.direction = "asc";
            }
            window.measuresSortState = measuresSortState;
            displayMeasuresTab(searchTerm);
        };
    }
}

// Add search event listener for tables search input
document.addEventListener('DOMContentLoaded', function() {
    const tablesSearchInput = document.getElementById('tables-search-input');
    if (tablesSearchInput) {
        tablesSearchInput.addEventListener('input', function(e) {
            displayTablesTab(e.target.value);
        });
    }
});

function displayRelationshipsTab(groupBy = "fromTable") {
    const relationships = currentAnalysisData.model_info.relationships || [];
    const relationshipsContent = document.getElementById('relationships-content');

    if (relationships.length === 0) {
        relationshipsContent.innerHTML = '<p>No relationships found in the model.</p>';
        return;
    }

    // Group relationships by selected property
    const grouped = {};
    relationships.forEach(rel => {
        const key = groupBy === "toTable" ? rel.toTable : rel.fromTable;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(rel);
    });

    let html = `<h3>Relationships Overview (${relationships.length} total, grouped by ${groupBy === "toTable" ? "To Table" : "From Table"})</h3>`;

    Object.keys(grouped).sort().forEach(tableName => {
        html += `
            <div class="relationship-section">
                <h4 class="relationship-table-header">${tableName}</h4>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Cardinality</th>
                                <th>Active</th>
                                <th>Cross Filtering</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        grouped[tableName].forEach(rel => {
            html += `
                <tr>
                    <td>${rel.name}</td>
                    <td>${rel.fromTable}.${rel.fromColumn}</td>
                    <td>${rel.toTable}.${rel.toColumn}</td>
                    <td>${rel.cardinality}</td>
                    <td>${rel.isActive ? 'Yes' : 'No'}</td>
                    <td>${rel.crossFilteringBehavior}</td>
                </tr>
            `;
        });
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    relationshipsContent.innerHTML = html;
}

function displayExpressionsTab() {
    const expressions = currentAnalysisData.model_info.expressions || [];
    const expressionsContent = document.getElementById('expressions-content');
    
    if (expressions.length === 0) {
        expressionsContent.innerHTML = '<p>No expressions found in the model.</p>';
        return;
    }
    
    let html = `<h3>Expressions Overview (${expressions.length} total)</h3>`;
    
    expressions.forEach((expr, index) => {
        html += `
            <div class="expandable" id="expression-${index}">
                <div class="expandable-header" onclick="toggleExpandable('expression-${index}')">
                    <h4>${expr.name} (${expr.kind})</h4>
                    <span class="expandable-toggle">▼</span>
                </div>
                <div class="expandable-content">
                    <div class="info-card">
                        <h4>Expression Details</h4>
                        <p>Name: <span class="value">${expr.name}</span></p>
                        <p>Kind: <span class="value">${expr.kind}</span></p>
                    </div>
                    <h5>Expression Code</h5>
                    <div class="json-viewer">
                        <pre><code>${expr.expression}</code></pre>
                    </div>
                </div>
            </div>
        `;
    });
    
    expressionsContent.innerHTML = html;
}

function displayRolesTab() {
    const roles = currentAnalysisData.model_info.roles || [];
    const rolesContent = document.getElementById('roles-content');
    
    if (roles.length === 0) {
        rolesContent.innerHTML = '<p>No security roles found in the model.</p>';
        return;
    }
    
    let html = `<h3>Security Roles Overview (${roles.length} total)</h3>`;
    
    roles.forEach((role, index) => {
        html += `
            <div class="expandable" id="role-${index}">
                <div class="expandable-header" onclick="toggleExpandable('role-${index}')">
                    <h4>${role.name} (${role.members_count} members, ${role.table_permissions_count} permissions)</h4>
                    <span class="expandable-toggle">▼</span>
                </div>
                <div class="expandable-content">
                    <div class="info-card">
                        <h4>Role Details</h4>
                        <p>Name: <span class="value">${role.name}</span></p>
                        <p>Description: <span class="value">${role.description || 'N/A'}</span></p>
                        <p>Members: <span class="value">${role.members_count}</span></p>
                        <p>Table Permissions: <span class="value">${role.table_permissions_count}</span></p>
                    </div>
                    
                    ${role.tablePermissions && role.tablePermissions.length > 0 ? `
                        <h5>Table Permissions</h5>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Table</th>
                                    <th>Filter Expression</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${role.tablePermissions.map(perm => `
                                    <tr>
                                        <td>${perm.name}</td>
                                        <td><code>${perm.filterExpression}</code></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    rolesContent.innerHTML = html;
}

function displayRawTab() {
    const rawContent = document.getElementById('raw-content');
    rawContent.innerHTML = `
        <h3>Raw JSON Data</h3>
        <div class="json-viewer">
            <pre><code>${JSON.stringify(currentAnalysisData.raw_data, null, 2)}</code></pre>
        </div>
    `;
}

// Utility functions
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // If switching to measures tab, refresh its content (preserve search)
    if (tabName === "measures") {
        const measuresSearchInput = document.getElementById('measures-search-input');
        displayMeasuresTab(measuresSearchInput ? measuresSearchInput.value : "");
    }
}

function toggleExpandable(id) {
    const element = document.getElementById(id);
    element.classList.toggle('expanded');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showProgress() {
    hideAllSections();
    uploadProgress.style.display = 'block';
    progressFill.style.width = '100%';
}

function showError(message) {
    hideAllSections();
    errorSection.style.display = 'block';
    errorMessage.textContent = message;
}

function hideAllSections() {
    uploadSection.style.display = 'none';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
    uploadProgress.style.display = 'none';
}

function resetToUpload() {
    currentAnalysisId = null;
    currentAnalysisData = null;
    fileInput.value = '';
    progressFill.style.width = '0%';
    // Remove persisted analysisId from localStorage
    localStorage.removeItem('analysisId');
    
    hideAllSections();
    uploadSection.style.display = 'block';
}
