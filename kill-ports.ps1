# Script para limpar portas ocupadas pelo Next.js
# Uso: .\kill-ports.ps1

Write-Host "Verificando portas ocupadas pelo Next.js (3000-3010)..." -ForegroundColor Yellow

# Lista de portas para verificar
$ports = 3000..3010

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $procId = $conn.OwningProcess
            if ($procId -gt 0) {
                $processObj = Get-Process -Id $procId -ErrorAction SilentlyContinue
                if ($processObj) {
                    Write-Host "Porta $port ocupada pelo processo $($processObj.ProcessName) (PID: $procId)" -ForegroundColor Red
                    if ($processObj.ProcessName -eq "node") {
                        Write-Host "Matando processo Node.js na porta $port..." -ForegroundColor Yellow
                        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                        Write-Host "Processo morto com sucesso!" -ForegroundColor Green
                    }
                }
            }
        }
    } else {
        Write-Host "Porta $port livre" -ForegroundColor Green
    }
}

Write-Host "Verificação concluída!" -ForegroundColor Cyan
