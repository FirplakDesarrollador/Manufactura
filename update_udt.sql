-- 1. Vaciar la tabla UDT
DELETE FROM [Firplak_SA].[dbo].[@F_SEMAFORO];

-- 2. Insertar los datos del SP directamente en el UDT
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
    CAST([Originnum] AS NVARCHAR(50)),
    CAST([Nro OP] AS NVARCHAR(50)),
    CAST([SKU] AS NVARCHAR(100)),
    CAST([Descripción Artículo] AS NVARCHAR(200)),
    CAST([Planta] AS NVARCHAR(100)),
    CAST([Familia] AS NVARCHAR(50)),
    CAST([Tipo Orden] AS NVARCHAR(50)),
    CAST([Cant. Pendiente] AS NUMERIC(19,6)),
    CAST([Cant. Pend. Item] AS NUMERIC(19,6)),
    CAST([Cantidad total] AS NUMERIC(19,6)),
    CAST([Disponible PT01] AS NUMERIC(19,6)),
    CAST([Fecha Creación OP] AS DATE),
    CAST([Estado] AS NVARCHAR(50)),
    CAST([Fecha Recomendada Liberación] AS DATE),
    CAST([Fecha Real Liberación] AS DATE),
    CAST([Consumo Para Liberar] AS NUMERIC(19,6)),
    CAST([Color Liberación Txt] AS NVARCHAR(20)),
    CAST([Color Liberación] AS NUMERIC(19,6)),
    CAST([Cumplimiento Liberación] AS NVARCHAR(50)),
    CAST([Fecha Entrega Lote] AS DATE),
    CAST([Fecha Recomendada de Entrega] AS DATE),
    CAST([Fecha Cierre OP] AS DATE),
    CAST([Fecha Ideal Entrega Producción] AS DATE),
    CAST([Consumo Amortiguador Planta] AS NUMERIC(19,6)),
    CAST([Color Producción Txt] AS NVARCHAR(20)),
    CAST([Color Producción] AS NUMERIC(19,6)),
    CAST([Cumplimiento Planta] AS NVARCHAR(50)),
    CAST([Dias Retrazo Firplak] AS NUMERIC(19,6)),
    CAST([Color Firplak Txt] AS NVARCHAR(20)),
    CAST([Color Firplak] AS NUMERIC(19,6)),
    CAST([Cumplimiento Firplak] AS NVARCHAR(50)),
    CAST([Fecha Prometida Entrega Item] AS DATE),
    CAST([Destino] AS NVARCHAR(50)),
    CAST([NumLote] AS NVARCHAR(50)),
    CAST([Molde] AS NVARCHAR(100)),
    CAST([Capacidad Molde] AS NVARCHAR(100)),
    CAST([Fecha Carga Molde] AS DATE),
    CAST([Amortiguador] AS NUMERIC(19,6)),
    CAST([Cliente] AS NVARCHAR(200))
FROM [Firplak_SA].[dbo].[SEMAFORO_SNAPSHOT];
