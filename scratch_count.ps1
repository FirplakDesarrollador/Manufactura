$ErrorActionPreference = "Stop"
try {
    Write-Output "Conectando y ejecutando la consulta en SQL Server..."
    $data = Invoke-Sqlcmd -ServerInstance "itplakinfo" -Database "Planos_Symphony" -Username "sa" -Password "Firplak_Sap2012#" -Query "EXEC [Planos_Symphony].[dbo].[SEMAFORO]" -QueryTimeout 300
    
    if ($null -eq $data) {
        Write-Output "La consulta no devolvió registros (0 filas)."
    } else {
        $count = @($data).Count
        Write-Output "Total de registros devueltos: $count"
    }
} catch {
    Write-Error "Error al ejecutar: $_"
}
