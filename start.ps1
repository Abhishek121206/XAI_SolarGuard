# XAI-SolarGuard Windows PowerShell Startup Script

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "            XAI-SolarGuard Startup Launcher               " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Ensure backend artifacts exist / run trainer
Write-Host "`n[1/3] Training model & generating backend JSON artifacts..." -ForegroundColor Yellow
python backend/trainer.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Backend model training failed. Please check Python dependencies." -ForegroundColor Red
    exit 1
}

# 2. Start FastAPI Server in background
Write-Host "`n[2/3] Starting FastAPI backend server at http://127.0.0.1:8000..." -ForegroundColor Yellow
$BackendProcess = Start-Process -FilePath "python" -ArgumentList "backend/main.py" -PassThru -NoNewWindow

# 3. Launch React Vite Frontend
Write-Host "`n[3/3] Starting Vite frontend dev server at http://localhost:3000..." -ForegroundColor Yellow
Set-Location -Path "frontend"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  SolarGuard is running!" -ForegroundColor Green
Write-Host "  Backend API:  http://127.0.0.1:8000/api/summary" -ForegroundColor Green
Write-Host "  Frontend Web: http://localhost:3000" -ForegroundColor Green
Write-Host "==========================================================`n" -ForegroundColor Green

npm run dev
