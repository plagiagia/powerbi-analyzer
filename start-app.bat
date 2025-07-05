@echo off
echo Starting Power BI Model Analyzer...
echo.
echo Frontend will open at: http://localhost:3000
echo Backend API available at: http://localhost:8000
echo.
echo Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:3000
echo.
echo Application started! If browser doesn't open automatically, 
echo manually navigate to: http://localhost:3000
echo.
pause
