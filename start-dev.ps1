# Script para iniciar o servidor Next.js com verificação de portas
# Uso: .\start-dev.ps1 [porta]

param(
    [int]$Port = 3007
)

Write-Host "Iniciando servidor Next.js na porta $Port..." -ForegroundColor Cyan

# Verificar se a porta está ocupada
$process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($process) {
    $pid = $process.OwningProcess
    $processName = (Get-Process -Id $pid -ErrorAction SilentlyContinue).ProcessName
    Write-Host "Porta $Port está ocupada pelo processo $processName (PID: $pid)" -ForegroundColor Red
    
    if ($processName -eq "node") {
        Write-Host "Matando processo Node.js existente..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force
        Write-Host "Processo morto. Aguardando 2 segundos..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    } else {
        Write-Host "Porta ocupada por outro processo. Use outra porta." -ForegroundColor Red
        exit 1
    }
}

# Iniciar o servidor Next.js
Write-Host "Iniciando Next.js na porta $Port..." -ForegroundColor Green
npx next dev -p $Port
