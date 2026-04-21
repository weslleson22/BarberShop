# Script para limpar portas ocupadas pelo Next.js
# Uso: .\kill-ports.ps1

Write-Host "Verificando portas ocupadas pelo Next.js (3000-3010)..." -ForegroundColor Yellow

# Lista de portas para verificar
$ports = 3000..3010

foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($process) {
        $pid = $process.OwningProcess
        $processName = (Get-Process -Id $pid -ErrorAction SilentlyContinue).ProcessName
        Write-Host "Porta $port ocupada pelo processo $processName (PID: $pid)" -ForegroundColor Red
        
        # Matar o processo se for Node.js
        if ($processName -eq "node") {
            Write-Host "Matando processo Node.js na porta $port..." -ForegroundColor Yellow
            Stop-Process -Id $pid -Force
            Write-Host "Processo morto com sucesso!" -ForegroundColor Green
        }
    } else {
        Write-Host "Porta $port livre" -ForegroundColor Green
    }
}

Write-Host "Verificação concluída!" -ForegroundColor Cyan
