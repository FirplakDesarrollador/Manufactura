USE msdb;
GO

DECLARE @JobName NVARCHAR(100) = 'FIRPLAK - Semaforo SAP Sync';
DECLARE @JobId BINARY(16);

SELECT @JobId = job_id FROM msdb.dbo.sysjobs WHERE name = @JobName;

IF @JobId IS NOT NULL
BEGIN
    EXEC msdb.dbo.sp_delete_jobstep 
        @job_id = @JobId, 
        @step_id = 2;

    EXEC msdb.dbo.sp_add_jobstep 
        @job_id = @JobId, 
        @step_name = N'Paso 2: Insertar en SAP UDT @F_SEMAFORO', 
        @step_id = 2, 
        @cmdexec_success_code = 0, 
        @on_success_action = 1, 
        @on_fail_action = 2, 
        @subsystem = N'TSQL', 
        @command = N'
-- 1. Vaciar la tabla UDT
DELETE FROM [Firplak_SA].[dbo].[@F_SEMAFORO];

-- 2. Crear tabla temporal para capturar el resultado exacto del SP
CREATE TABLE #TEMP_SEMAFORO (
    Originnum NVARCHAR(50), [Nro OP] NVARCHAR(50), SKU NVARCHAR(100), [Descripción Artículo] NVARCHAR(200),
    Planta NVARCHAR(100), Familia NVARCHAR(50), [Tipo Orden] NVARCHAR(50),
    [Cant. Pendiente] NUMERIC(19,6), [Cant. Pend. Item] NUMERIC(19,6), [Cantidad total] NUMERIC(19,6),
    [Disponible PT01] NUMERIC(19,6), [Fecha Creación OP] DATE, Estado NVARCHAR(50),
    [Fecha Recomendada Liberación] DATE, [Fecha Real Liberación] DATE, [Consumo Para Liberar] NUMERIC(19,6),
    [Color Liberación Txt] NVARCHAR(20), [Color Liberación] NUMERIC(19,6), [Cumplimiento Liberación] NVARCHAR(50),
    [Fecha Entrega Lote] DATE, [Fecha Recomendada de Entrega] DATE, [Fecha Cierre OP] DATE,
    [Fecha Ideal Entrega Producción] DATE, [Consumo Amortiguador Planta] NUMERIC(19,6),
    [Color Producción Txt] NVARCHAR(20), [Color Producción] NUMERIC(19,6), [Cumplimiento Planta] NVARCHAR(50),
    [Dias Retrazo Firplak] NUMERIC(19,6), [Color Firplak Txt] NVARCHAR(20), [Color Firplak] NUMERIC(19,6),
    [Cumplimiento Firplak] NVARCHAR(50), [Fecha Prometida Entrega Item] DATE, Destino NVARCHAR(50),
    NumLote NVARCHAR(50), Molde NVARCHAR(100), [Capacidad Molde] NVARCHAR(100),
    [Fecha Carga Molde] DATE, Amortiguador NUMERIC(19,6), Cliente NVARCHAR(200)
);

-- 3. Insertar el resultado exacto del SP en la tabla temporal
INSERT INTO #TEMP_SEMAFORO
EXEC [Planos_Symphony].[dbo].[SEMAFORO];

-- 4. Insertar de la temporal al UDT de SAP
INSERT INTO [Firplak_SA].[dbo].[@F_SEMAFORO] (
    Code, Name,
    U_Originnum, U_NroOP, U_SKU, U_DescArticulo, U_Planta, U_Familia, U_TipoOrden,
    U_CantPendiente, U_CantPendItem, U_CantidadTotal, U_DisponiblePT01,
    U_FechaCreacionOP, U_Estado, U_FechaRecoLib, U_FechaRealLib,
    U_ConsumoParaLib, U_ColorLibTxt, U_ColorLib, U_CumpLib,
    U_FechaEntLote, U_FechaRecoEnt, U_FechaCierreOP, U_FechaIdealEnt,
    U_ConsumoAmort, U_ColorProdTxt, U_ColorProd, U_CumpPlanta,
    U_DiasRetrazo, U_ColorFirplakTxt, U_ColorFirplak, U_CumpFirplak,
    U_FechaPromEnt, U_Destino, U_NumLote, U_Molde,
    U_CapacidadMolde, U_FechaCargaMolde, U_Amortiguador, U_Cliente
)
SELECT 
    CAST(NEWID() AS NVARCHAR(50)), -- Code
    CAST(NEWID() AS NVARCHAR(50)), -- Name
    Originnum, [Nro OP], SKU, [Descripción Artículo], Planta, Familia, [Tipo Orden],
    [Cant. Pendiente], [Cant. Pend. Item], [Cantidad total], [Disponible PT01],
    [Fecha Creación OP], Estado, [Fecha Recomendada Liberación], [Fecha Real Liberación],
    [Consumo Para Liberar], [Color Liberación Txt], [Color Liberación], [Cumplimiento Liberación],
    [Fecha Entrega Lote], [Fecha Recomendada de Entrega], [Fecha Cierre OP], [Fecha Ideal Entrega Producción],
    [Consumo Amortiguador Planta], [Color Producción Txt], [Color Producción], [Cumplimiento Planta],
    [Dias Retrazo Firplak], [Color Firplak Txt], [Color Firplak], [Cumplimiento Firplak],
    [Fecha Prometida Entrega Item], Destino, NumLote, Molde, [Capacidad Molde],
    [Fecha Carga Molde], Amortiguador, Cliente
FROM #TEMP_SEMAFORO;

DROP TABLE #TEMP_SEMAFORO;
', 
        @database_name = N'Firplak_SA', 
        @flags = 0;

    EXEC msdb.dbo.sp_update_jobstep 
        @job_id = @JobId, 
        @step_id = 1, 
        @on_success_action = 4, 
        @on_success_step_id = 2;

    PRINT 'El Job fue actualizado exitosamente. Ahora inserta los datos exactos del SP en SAP UDT.';
END
ELSE
BEGIN
    PRINT 'No se encontró el Job FIRPLAK - Semaforo SAP Sync. Asegúrate de haberlo creado primero.';
END
GO
