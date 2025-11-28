// ===================================================================
// BACKEND_SERVICES_WORKSPACE.GS
// Servicio para gestión y configuración de workspaces
// ACTUALIZADO: Validación de nombres duplicados (case insensitive)
// ===================================================================

/**
 * Verifica si un Sheet tiene la configuración necesaria
 * @param {string} sheetUrl - URL del Google Sheet
 * @returns {Object} Estado de la configuración
 */
function verificarConfiguracionSheet(sheetUrl) {
    try {
        Logger.log("Verificando configuracion del Sheet: " + sheetUrl);

        // Intentar abrir el Sheet
        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var nombreSheet = spreadsheet.getName();

        // Verificar hojas requeridas
        var hojasRequeridas = [
            "Config",
            "Casos",
            "Bugs",
            "Ejecuciones",
            "Regresiones",
        ];
        var hojasExistentes = spreadsheet.getSheets().map(function (sheet) {
            return sheet.getName();
        });

        var hojasFaltantes = [];
        hojasRequeridas.forEach(function (hoja) {
            if (hojasExistentes.indexOf(hoja) === -1) {
                hojasFaltantes.push(hoja);
            }
        });

        // Verificar si Config tiene los campos necesarios
        var configCompleta = false;
        var hojaConfig = spreadsheet.getSheetByName("Config");

        if (hojaConfig !== null) {
            var datosConfig = hojaConfig.getDataRange().getValues();
            configCompleta = datosConfig.length > 1; // Tiene mas que solo headers
        }

        return {
            success: true,
            nombreSheet: nombreSheet,
            tieneConfig: hojasFaltantes.length === 0 && configCompleta,
            hojasExistentes: hojasExistentes,
            hojasFaltantes: hojasFaltantes,
            necesitaConfiguracion: hojasFaltantes.length > 0 || !configCompleta,
            mensaje:
                hojasFaltantes.length > 0
                    ? "El Sheet necesita configuracion. Faltan hojas: " +
                      hojasFaltantes.join(", ")
                    : "Sheet configurado correctamente",
        };
    } catch (error) {
        Logger.log("Error verificando Sheet: " + error.toString());

        // Verificar tipo de error
        if (error.toString().indexOf("perhaps it does not exist") > -1) {
            return {
                success: false,
                error: "No se pudo acceder al Sheet. Verifica la URL o que tengas permisos.",
            };
        }

        return {
            success: false,
            error: "Error al verificar Sheet: " + error.message,
        };
    }
}

/**
 * Configura automáticamente un Sheet nuevo o incompleto
 * @param {string} sheetUrl - URL del Google Sheet
 * @returns {Object} Resultado de la configuración
 */
function configurarWorkspace(sheetUrl) {
    try {
        Logger.log("Iniciando configuracion de workspace: " + sheetUrl);

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var resultado = {
            success: true,
            hojasCreadas: [],
            hojasActualizadas: [],
            errores: [],
        };

        // 1. Crear/Verificar hoja Config
        resultado = ws_crearHojaConfig(spreadsheet, resultado);

        // 2. Crear/Verificar hoja Casos
        resultado = crearHojaCasos(spreadsheet, resultado);

        // 3. Crear/Verificar hoja Bugs
        resultado = crearHojaBugs(spreadsheet, resultado);

        // 4. Crear/Verificar hoja Ejecuciones
        resultado = crearHojaEjecuciones(spreadsheet, resultado);

        // 5. Crear/Verificar hoja Regresiones
        resultado = crearHojaRegresiones(spreadsheet, resultado);

        // 6. Eliminar hoja por defecto si existe y esta vacia
        eliminarHojaPorDefecto(spreadsheet);

        Logger.log(
            "Configuracion completada. Hojas creadas: " +
                resultado.hojasCreadas.length
        );

        // Aplicar formato consistente a todas las hojas: encabezados en una linea
        // y datos con text wrapping. Esto asegura que el estilo se propague
        // incluso si alguna hoja ya existía.
        try {
            mejorarFormatoTodasHojas(spreadsheet);
        } catch (e) {
            Logger.log("⚠️ No se pudo aplicar formato global: " + e.toString());
        }

        resultado.mensaje =
            "Workspace configurado exitosamente. Creadas: " +
            resultado.hojasCreadas.length +
            " hojas";

        return resultado;
    } catch (error) {
        Logger.log("Error configurando workspace: " + error.toString());
        return {
            success: false,
            error: "Error al configurar workspace: " + error.message,
        };
    }
}

/**
 * Crea o actualiza la hoja de configuración
 */
function ws_crearHojaConfig(spreadsheet, resultado) {
    var nombreHoja = "Config";
    var hoja = spreadsheet.getSheetByName(nombreHoja);

    if (hoja === null) {
        hoja = spreadsheet.insertSheet(nombreHoja);
        resultado.hojasCreadas.push(nombreHoja);
    } else {
        resultado.hojasActualizadas.push(nombreHoja);
    }

    // Headers
    var headers = ["Clave", "Valor", "Descripcion"];

    // Datos iniciales
    var datos = [
        ["workspace_nombre", spreadsheet.getName(), "Nombre del workspace"],
        ["workspace_creado", new Date().toISOString(), "Fecha de creacion"],
        ["workspace_version", "1.0", "Version del sistema"],
        ["workspace_activo", "SI", "Estado del workspace"],
        ["ultimo_caso_id", "0", "Ultimo ID de caso generado"],
        ["ultimo_bug_id", "0", "Ultimo ID de bug generado"],
        ["trello_board_url", "", "URL del board de Trello (opcional)"],
        ["trello_api_key", "", "API Key de Trello (opcional)"],
        ["trello_token", "", "Token de Trello (opcional)"],
    ];

    // Escribir datos solo si la hoja esta vacia
    if (hoja.getLastRow() === 0) {
        hoja.getRange(1, 1, 1, headers.length).setValues([headers]);
        hoja.getRange(2, 1, datos.length, datos[0].length).setValues(datos);

        // Formato de headers: aplicar estilo consistente
        var headerRange = hoja.getRange(1, 1, 1, headers.length);
        headerRange
            .setBackground("#0f172a")
            .setFontColor("#ffffff")
            .setFontWeight("bold")
            .setFontSize(11)
            .setFontFamily("Nunito")
            .setHorizontalAlignment("center")
            .setVerticalAlignment("middle")
            .setWrap(true);

        hoja.setColumnWidth(1, 200);
        hoja.setColumnWidth(2, 300);
        hoja.setColumnWidth(3, 300);

        hoja.setRowHeight(1, 30);
        hoja.setFrozenRows(1);
    }

    return resultado;
}

/**
 * Crea o actualiza la hoja de Casos
 * VERSIÓN CORREGIDA: Headers en el orden correcto del Sheet
 */
function crearHojaCasos(spreadsheet, resultado) {
    var nombreHoja = "Casos";
    var hoja = spreadsheet.getSheetByName(nombreHoja);

    if (hoja === null) {
        hoja = spreadsheet.insertSheet(nombreHoja);
        resultado.hojasCreadas.push(nombreHoja);
    } else {
        resultado.hojasActualizadas.push(nombreHoja);
    }

    // Headers CORREGIDOS - en el orden que espera el sistema
    var headers = [
        "ID", // A
        "Hoja", // B
        "Titulo", // C
        "Descripcion", // D
        "Formato", // E
        "Prioridad", // F
        "TipoPrueba", // G
        "Pasos", // H
        "ResultadoEsperado", // I
        "ScenarioGiven", // J
        "ScenarioWhen", // K
        "ScenarioThen", // L
        "Precondiciones", // M
        "CandidatoRegresion", // N
        "EstadoDiseño", // O - Estado del diseño del caso
        "FechaCreacion", // P
        "CreadoPor", // Q
        "FechaUltimaEjecucion", // R
        "ResultadoUltimaEjecucion", // S - Estado de ejecución (OK, No OK, etc.)
        "ComentariosEjecucion", // T - NUEVO
        "EvidenciasURL", // U - NUEVO
        "Ambiente", // V - Ambiente de ejecución
        "Navegador", // W - Navegador usado en ejecución
        "LinkTrelloHU", // X
        "LinkBugRelacionado", // Y
        "CasoURI", // Z
        "Notas", // AA
    ];

    // Escribir headers solo si esta vacia
    if (hoja.getLastRow() === 0) {
        hoja.getRange(1, 1, 1, headers.length).setValues([headers]);

        // Formato de headers: aplicar estilo consistente
        var headerRange = hoja.getRange(1, 1, 1, headers.length);
        headerRange
            .setBackground("#0f172a")
            .setFontColor("#ffffff")
            .setFontWeight("bold")
            .setFontSize(11)
            .setFontFamily("Nunito")
            .setHorizontalAlignment("center")
            .setVerticalAlignment("middle")
            .setWrap(true);

        // Anchos de columnass
        hoja.setColumnWidth(1, 100); // ID
        hoja.setColumnWidth(2, 150); // Hoja
        hoja.setColumnWidth(3, 300); // Titulo
        hoja.setColumnWidth(4, 400); // Descripcion
        hoja.setColumnWidth(19, 150); // ResultadoUltimaEjecucion
        hoja.setColumnWidth(20, 300); // ComentariosEjecucion
        hoja.setColumnWidth(21, 400); // EvidenciasURL
        hoja.setColumnWidth(22, 120); // Ambiente
        hoja.setColumnWidth(23, 120); // Navegador

        hoja.setRowHeight(1, 30);
        hoja.setFrozenRows(1);
        hoja.setFrozenColumns(1);

        // Aplicar wrap y alineación vertical centrada a todas las celdas de datos
        var casosDataRange = hoja.getRange(2, 1, 2000, headers.length);
        casosDataRange.setWrap(true).setVerticalAlignment("middle");

        // Agregar validaciones y formato condicional
        try {
            var lastRowEstimate = 2000;
            var rules = hoja.getConditionalFormatRules() || [];

            // Prioridad (columna 6: F)
            var rangoPrioridad = hoja.getRange(2, 6, lastRowEstimate);
            var validPrio = SpreadsheetApp.newDataValidation()
                .requireValueInList(["Crítica", "Alta", "Media", "Baja"], true)
                .setAllowInvalid(false)
                .build();
            rangoPrioridad.setDataValidation(validPrio);

            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Crítica")
                    .setBackground("#fecaca")
                    .setFontColor("#7f1d1d")
                    .setRanges([rangoPrioridad])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Alta")
                    .setBackground("#fee2e2")
                    .setFontColor("#991b1b")
                    .setRanges([rangoPrioridad])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Media")
                    .setBackground("#fef3c7")
                    .setFontColor("#92400e")
                    .setRanges([rangoPrioridad])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Baja")
                    .setBackground("#d1fae5")
                    .setFontColor("#065f46")
                    .setRanges([rangoPrioridad])
                    .build()
            );

            // EstadoDiseño (columna 15: O)
            var rangoEstadoDiseño = hoja.getRange(2, 15, lastRowEstimate);
            var validEstDiseño = SpreadsheetApp.newDataValidation()
                .requireValueInList(
                    ["Pendiente", "En Progreso", "Completado", "Eliminado"],
                    true
                )
                .setAllowInvalid(false)
                .build();
            rangoEstadoDiseño.setDataValidation(validEstDiseño);

            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Completado")
                    .setBackground("#d1fae5")
                    .setFontColor("#065f46")
                    .setRanges([rangoEstadoDiseño])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Pendiente")
                    .setBackground("#fef3c7")
                    .setFontColor("#92400e")
                    .setRanges([rangoEstadoDiseño])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("En Progreso")
                    .setBackground("#dbeafe")
                    .setFontColor("#1e40af")
                    .setRanges([rangoEstadoDiseño])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Eliminado")
                    .setBackground("#fee2e2")
                    .setFontColor("#991b1b")
                    .setRanges([rangoEstadoDiseño])
                    .build()
            );

            // ResultadoUltimaEjecucion (columna 19: S)
            var rangoResultado = hoja.getRange(2, 19, lastRowEstimate);
            var validResultado = SpreadsheetApp.newDataValidation()
                .requireValueInList(
                    [
                        "OK",
                        "No OK",
                        "No_OK",
                        "Ejecutando",
                        "Bloqueado",
                        "Descartado",
                        "Sin ejecutar",
                    ],
                    true
                )
                .setAllowInvalid(false)
                .build();
            rangoResultado.setDataValidation(validResultado);

            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("OK")
                    .setBackground("#d1fae5")
                    .setFontColor("#065f46")
                    .setRanges([rangoResultado])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("No OK")
                    .setBackground("#fee2e2")
                    .setFontColor("#991b1b")
                    .setRanges([rangoResultado])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("No_OK")
                    .setBackground("#fee2e2")
                    .setFontColor("#991b1b")
                    .setRanges([rangoResultado])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Ejecutando")
                    .setBackground("#fed7aa")
                    .setFontColor("#92400e")
                    .setRanges([rangoResultado])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Bloqueado")
                    .setBackground("#fef3c7")
                    .setFontColor("#92400e")
                    .setRanges([rangoResultado])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Descartado")
                    .setBackground("#f1f5f9")
                    .setFontColor("#94a3b8")
                    .setRanges([rangoResultado])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Sin ejecutar")
                    .setBackground("#f1f5f9")
                    .setFontColor("#64748b")
                    .setRanges([rangoResultado])
                    .build()
            );

            // CandidatoRegresion (columna 14: N) - Si/Sí
            var rangoRegresion = hoja.getRange(2, 14, lastRowEstimate);
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextContains("Si")
                    .setBackground("#dbeafe")
                    .setFontColor("#1e40af")
                    .setRanges([rangoRegresion])
                    .build()
            );

            hoja.setConditionalFormatRules(rules);
        } catch (e) {
            Logger.log(
                "⚠️ No se pudo aplicar formato condicional en Casos: " +
                    e.toString()
            );
        }
    }

    return resultado;
}

/**
 * Crea o actualiza la hoja de Bugs
 */
function crearHojaBugs(spreadsheet, resultado) {
    var nombreHoja = "Bugs";
    var hoja = spreadsheet.getSheetByName(nombreHoja);

    if (hoja === null) {
        hoja = spreadsheet.insertSheet(nombreHoja);
        resultado.hojasCreadas.push(nombreHoja);
    } else {
        resultado.hojasActualizadas.push(nombreHoja);
    }

    // Headers - UNIFICADO con Backend_Services_Bugs.js
    var headers = [
        "ID",
        "Titulo",
        "Descripcion",
        "Severidad",
        "Prioridad",
        "Estado",
        "Etiquetas",
        "TieneCasoDiseñado",
        "CasosRelacionados",
        "OrigenSinCaso",
        "Precondiciones",
        "DatosPrueba",
        "PasosReproducir",
        "ResultadoEsperado",
        "ResultadoObtenido",
        "Ambiente",
        "Navegador",
        "EvidenciasURL",
        "FechaDeteccion",
        "DetectadoPor",
        "AsignadoA",
        "FechaResolucion",
        "TrelloCardID",
        "LinkTrello",
        "Adjuntos",
        "Notas",
    ];

    // Escribir headers solo si esta vacia
    if (hoja.getLastRow() === 0) {
        hoja.getRange(1, 1, 1, headers.length).setValues([headers]);

        // Formato de headers: aplicar estilo consistente
        var headerRange = hoja.getRange(1, 1, 1, headers.length);
        headerRange
            .setBackground("#0f172a")
            .setFontColor("#ffffff")
            .setFontWeight("bold")
            .setFontSize(11)
            .setFontFamily("Nunito")
            .setHorizontalAlignment("center")
            .setVerticalAlignment("middle")
            .setWrap(true);

        // Configurar anchos de columnas para mejor legibilidad
        hoja.setColumnWidth(1, 100); // ID
        hoja.setColumnWidth(2, 250); // Titulo
        hoja.setColumnWidth(3, 350); // Descripcion
        hoja.setColumnWidth(4, 110); // Severidad
        hoja.setColumnWidth(5, 110); // Prioridad
        hoja.setColumnWidth(6, 110); // Estado
        hoja.setColumnWidth(7, 150); // Etiquetas
        hoja.setColumnWidth(8, 120); // TieneCasoDiseñado
        hoja.setColumnWidth(9, 150); // CasosRelacionados
        hoja.setColumnWidth(10, 120); // OrigenSinCaso
        hoja.setColumnWidth(11, 200); // Precondiciones
        hoja.setColumnWidth(12, 200); // DatosPrueba
        hoja.setColumnWidth(13, 250); // PasosReproducir
        hoja.setColumnWidth(14, 250); // ResultadoEsperado
        hoja.setColumnWidth(15, 250); // ResultadoObtenido
        hoja.setColumnWidth(16, 120); // Ambiente
        hoja.setColumnWidth(17, 120); // Navegador
        hoja.setColumnWidth(18, 350); // EvidenciasURL
        hoja.setColumnWidth(19, 120); // FechaDeteccion
        hoja.setColumnWidth(20, 150); // DetectadoPor
        hoja.setColumnWidth(21, 120); // AsignadoA
        hoja.setColumnWidth(22, 120); // FechaResolucion
        hoja.setColumnWidth(23, 120); // TrelloCardID
        hoja.setColumnWidth(24, 200); // LinkTrello
        hoja.setColumnWidth(25, 150); // Adjuntos
        hoja.setColumnWidth(26, 300); // Notas

        // Congelación de filas y columnas para navegación
        hoja.setFrozenRows(1);
        hoja.setFrozenColumns(1);

        // Aplicar formato de texto envuelto y alineación vertical centrada a todas las celdas
        var bugDataRange = hoja.getRange(2, 1, 2000, 26);
        bugDataRange.setWrap(true).setVerticalAlignment("middle");

        // Ajustar altura de filas para acomodar contenido envuelto
        hoja.setRowHeight(1, 30);

        // Agregar validaciones y formato condicional para Severidad / Prioridad
        try {
            // Validaciones: Severidad (col 4) y Prioridad (col 5)
            var lastRowEstimate = 2000;
            var rangoSeveridad = hoja.getRange(2, 4, lastRowEstimate);
            var rangoPrioridad = hoja.getRange(2, 5, lastRowEstimate);

            var validSev = SpreadsheetApp.newDataValidation()
                .requireValueInList(
                    ["Bloqueante", "Crítica", "Alta", "Media", "Baja"],
                    true
                )
                .setAllowInvalid(false)
                .build();

            var validPrio = SpreadsheetApp.newDataValidation()
                .requireValueInList(["Crítica", "Alta", "Media", "Baja"], true)
                .setAllowInvalid(false)
                .build();

            rangoSeveridad.setDataValidation(validSev);
            rangoPrioridad.setDataValidation(validPrio);

            // Reglas de formato condicional
            var rules = hoja.getConditionalFormatRules() || [];

            var rangeSev = hoja.getRange(2, 4, lastRowEstimate);
            var rangePrio = hoja.getRange(2, 5, lastRowEstimate);

            // Severidad: Bloqueante (rojo intenso), Crítica (rojo), Alta (naranja), Media (amarillo), Baja (verde)
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Bloqueante")
                    .setBackground("#fca5a5")
                    .setFontColor("#7f1d1d")
                    .setRanges([rangeSev])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Crítica")
                    .setBackground("#fee2e2")
                    .setFontColor("#7f1d1d")
                    .setRanges([rangeSev])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Alta")
                    .setBackground("#fff7ed")
                    .setFontColor("#92400e")
                    .setRanges([rangeSev])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Media")
                    .setBackground("#fef3c7")
                    .setFontColor("#92400e")
                    .setRanges([rangeSev])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Baja")
                    .setBackground("#ecfdf5")
                    .setFontColor("#065f46")
                    .setRanges([rangeSev])
                    .build()
            );

            // Prioridad: aplicar las mismas tonalidades
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Crítica")
                    .setBackground("#fee2e2")
                    .setFontColor("#7f1d1d")
                    .setRanges([rangePrio])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Alta")
                    .setBackground("#fff7ed")
                    .setFontColor("#92400e")
                    .setRanges([rangePrio])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Media")
                    .setBackground("#fef3c7")
                    .setFontColor("#92400e")
                    .setRanges([rangePrio])
                    .build()
            );
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextEqualTo("Baja")
                    .setBackground("#ecfdf5")
                    .setFontColor("#065f46")
                    .setRanges([rangePrio])
                    .build()
            );

            hoja.setConditionalFormatRules(rules);
        } catch (e) {
            Logger.log(
                "⚠️ No se pudo aplicar validaciones/formatos de Bugs: " +
                    e.toString()
            );
        }
    }

    return resultado;
}

/**
 * Crea o actualiza la hoja de Ejecuciones
 */
function crearHojaEjecuciones(spreadsheet, resultado) {
    var nombreHoja = "Ejecuciones";
    var hoja = spreadsheet.getSheetByName(nombreHoja);

    if (hoja === null) {
        hoja = spreadsheet.insertSheet(nombreHoja);
        resultado.hojasCreadas.push(nombreHoja);
    } else {
        resultado.hojasActualizadas.push(nombreHoja);
    }

    // Headers
    var headers = [
        "ID",
        "CasoID",
        "CasoTitulo",
        "FechaEjecucion",
        "EjecutadoPor",
        "Resultado",
        "Observaciones",
        "Ambiente",
        "Navegador",
        "TiempoEjecucion",
        "EvidenciaURL",
        "BugGenerado",
        "BugID",
    ];

    // Escribir headers solo si esta vacia
    if (hoja.getLastRow() === 0) {
        hoja.getRange(1, 1, 1, headers.length).setValues([headers]);

        // Formato de headers: aplicar estilo consistente
        var headerRange = hoja.getRange(1, 1, 1, headers.length);
        headerRange
            .setBackground("#0f172a")
            .setFontColor("#ffffff")
            .setFontWeight("bold")
            .setFontSize(11)
            .setFontFamily("Nunito")
            .setHorizontalAlignment("center")
            .setVerticalAlignment("middle")
            .setWrap(true);

        hoja.setRowHeight(1, 30);
        hoja.setFrozenRows(1);
    }

    return resultado;
}

/**
 * Crea o actualiza la hoja de Regresiones
 */
function crearHojaRegresiones(spreadsheet, resultado) {
    var nombreHoja = "Regresiones";
    var hoja = spreadsheet.getSheetByName(nombreHoja);

    if (hoja === null) {
        hoja = spreadsheet.insertSheet(nombreHoja);
        resultado.hojasCreadas.push(nombreHoja);
    } else {
        resultado.hojasActualizadas.push(nombreHoja);
    }

    // Headers
    var headers = [
        "ID",
        "Nombre",
        "Descripcion",
        "FechaCreacion",
        "CreadoPor",
        "CasosIncluidos",
        "TotalCasos",
        "Estado",
        "UltimaEjecucion",
        "ResultadoUltimaEjecucion",
        "Notas",
    ];

    // Escribir headers solo si esta vacia
    if (hoja.getLastRow() === 0) {
        hoja.getRange(1, 1, 1, headers.length).setValues([headers]);

        // Formato de headers: aplicar estilo consistente
        var headerRange = hoja.getRange(1, 1, 1, headers.length);
        headerRange
            .setBackground("#0f172a")
            .setFontColor("#ffffff")
            .setFontWeight("bold")
            .setFontSize(11)
            .setFontFamily("Nunito")
            .setHorizontalAlignment("center")
            .setVerticalAlignment("middle")
            .setWrap(true);

        hoja.setColumnWidth(1, 100);
        hoja.setColumnWidth(2, 300);
        hoja.setColumnWidth(3, 400);

        hoja.setRowHeight(1, 30);
        hoja.setFrozenRows(1);
    }

    return resultado;
}

/**
 * Elimina la hoja por defecto "Hoja 1" si existe y está vacía
 */
function eliminarHojaPorDefecto(spreadsheet) {
    try {
        var hojaDefault = spreadsheet.getSheetByName("Hoja 1");

        if (hojaDefault !== null && hojaDefault.getLastRow() <= 1) {
            // Solo eliminar si hay mas de una hoja
            if (spreadsheet.getSheets().length > 1) {
                spreadsheet.deleteSheet(hojaDefault);
                Logger.log("Hoja por defecto eliminada");
            }
        }
    } catch (error) {
        Logger.log("No se pudo eliminar hoja por defecto: " + error.toString());
    }
}

/**
 * ERROR 5 FIX: Valida si ya existe un workspace con ese nombre (case insensitive)
 * @param {string} nombreWorkspace - Nombre a validar
 * @returns {boolean} true si ya existe
 */
function existeWorkspaceConNombre(nombreWorkspace) {
    try {
        var nombreNormalizado = nombreWorkspace.toLowerCase().trim();

        // Buscar en Drive todos los Spreadsheets
        var files = DriveApp.getFilesByType(MimeType.GOOGLE_SHEETS);

        while (files.hasNext()) {
            var file = files.next();
            var nombreExistente = file.getName().toLowerCase().trim();

            if (nombreExistente === nombreNormalizado) {
                return true;
            }
        }

        return false;
    } catch (error) {
        Logger.log("Error verificando nombres: " + error.toString());
        return false;
    }
}

/**
 * ERROR 5 FIX: Genera un nombre único si ya existe
 * @param {string} nombreBase - Nombre base deseado
 * @returns {string} Nombre único
 */
function generarNombreUnico(nombreBase) {
    var contador = 1;
    var nombreFinal = nombreBase;

    while (existeWorkspaceConNombre(nombreFinal)) {
        contador++;
        nombreFinal = nombreBase + " (" + contador + ")";
    }

    return nombreFinal;
}

/**
 * Crea un nuevo Google Sheet con configuración completa
 * @param {string} nombreWorkspace - Nombre del workspace
 * @returns {Object} URL y detalles del nuevo Sheet
 */
function crearNuevoWorkspace(nombreWorkspace, parentDriveUrl, nombreCarpeta) {
    try {
        Logger.log("Creando nuevo workspace: " + nombreWorkspace);

        // ERROR 5 FIX: Validar y ajustar nombre si es necesario
        var nombreFinal = nombreWorkspace || "QA Workspace";

        // Verificar si el nombre ya existe
        if (existeWorkspaceConNombre(nombreFinal)) {
            nombreFinal = generarNombreUnico(nombreFinal);
            Logger.log("Nombre ajustado para evitar duplicado: " + nombreFinal);
        }

        // Determinar el nombre de la carpeta del workspace
        var nombreCarpetaFinal =
            nombreCarpeta && nombreCarpeta.trim() !== ""
                ? nombreCarpeta.trim()
                : nombreFinal;

        // Crear carpeta en Drive donde alojaremos el workspace y subcarpetas
        var workspaceFolder = null;
        try {
            if (parentDriveUrl && parentDriveUrl !== "") {
                // Extraer ID de carpeta si es una URL
                var folderIdMatch = parentDriveUrl.match(/[-\w]{25,}/);
                if (folderIdMatch && folderIdMatch[0]) {
                    var parentFolderId = folderIdMatch[0];
                    var parentFolder = DriveApp.getFolderById(parentFolderId);
                    workspaceFolder =
                        parentFolder.createFolder(nombreCarpetaFinal);
                } else {
                    // Si no se pudo extraer, intentar crear en raíz nombrada
                    workspaceFolder = DriveApp.createFolder(nombreCarpetaFinal);
                }
            } else {
                // Crear carpeta en la raíz de Drive
                workspaceFolder = DriveApp.createFolder(nombreCarpetaFinal);
            }
        } catch (err) {
            Logger.log(
                "⚠️ No se pudo crear carpeta en Drive: " + err.toString()
            );
            // Fallback: continuar creando el Sheet en Drive raíz
            workspaceFolder = null;
        }

        // Crear nuevo spreadsheet
        var nuevoSheet = SpreadsheetApp.create(nombreFinal);
        var sheetUrl = nuevoSheet.getUrl();

        Logger.log("Nuevo Sheet creado: " + sheetUrl);

        // Si se creó workspaceFolder, mover el archivo del Sheet dentro de esa carpeta
        try {
            if (workspaceFolder) {
                var file = DriveApp.getFileById(nuevoSheet.getId());
                // Añadir a carpeta
                workspaceFolder.addFile(file);
                // Remover del root para que no quede duplicado en Mi unidad
                try {
                    DriveApp.getRootFolder().removeFile(file);
                } catch (e) {
                    // algunos entornos no permiten removeFile; ignorar
                }
            }
        } catch (errMove) {
            Logger.log(
                "⚠️ No se pudo mover el Sheet a la carpeta: " +
                    errMove.toString()
            );
        }

        // Configurar el workspace (crear hojas y estructura interna)
        var resultadoConfig = configurarWorkspace(sheetUrl);

        if (resultadoConfig.success) {
            // Si se crearon carpetas en Drive, crear estructura de evidencias dentro
            var ejecFolderUrl = null;
            var bugsFolderUrl = null;
            try {
                if (workspaceFolder) {
                    var evidFolder = workspaceFolder.createFolder("Evidencias");
                    var ejecFolder = evidFolder.createFolder("Ejecuciones");
                    var bugsFolder = evidFolder.createFolder("Bugs");
                    ejecFolderUrl = ejecFolder.getUrl
                        ? ejecFolder.getUrl()
                        : "https://drive.google.com/drive/folders/" +
                          ejecFolder.getId();
                    bugsFolderUrl = bugsFolder.getUrl
                        ? bugsFolder.getUrl()
                        : "https://drive.google.com/drive/folders/" +
                          bugsFolder.getId();
                }
            } catch (errFolders) {
                Logger.log(
                    "⚠️ Error creando subcarpetas de evidencias: " +
                        errFolders.toString()
                );
            }

            // Escribir rutas de carpetas en la hoja Config del nuevo Sheet
            try {
                var ss = SpreadsheetApp.openByUrl(sheetUrl);
                var hojaConfig = ss.getSheetByName("Config");
                if (hojaConfig) {
                    // Helper para actualizar/insertar clave
                    function upsertConfig(key, value, descripcion) {
                        var datos = hojaConfig.getDataRange().getValues();
                        var found = false;
                        for (var r = 1; r < datos.length; r++) {
                            if (String(datos[r][0]) === key) {
                                hojaConfig.getRange(r + 1, 2).setValue(value);
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            hojaConfig.appendRow([
                                key,
                                value,
                                descripcion || "",
                            ]);
                        }
                    }

                    if (workspaceFolder) {
                        var workspaceUrl = workspaceFolder.getUrl
                            ? workspaceFolder.getUrl()
                            : "https://drive.google.com/drive/folders/" +
                              workspaceFolder.getId();
                        upsertConfig(
                            "carpeta_workspace_drive",
                            workspaceUrl,
                            "Carpeta Drive del workspace"
                        );
                    }
                    if (ejecFolderUrl)
                        upsertConfig(
                            "carpeta_evidencias_ejecuciones",
                            ejecFolderUrl,
                            "Carpeta de evidencias de ejecuciones"
                        );
                    if (bugsFolderUrl)
                        upsertConfig(
                            "carpeta_evidencias_bugs",
                            bugsFolderUrl,
                            "Carpeta de evidencias de bugs"
                        );
                }
            } catch (errCfg) {
                Logger.log(
                    "⚠️ No se pudo actualizar Config con carpetas: " +
                        errCfg.toString()
                );
            }
            return {
                success: true,
                sheetUrl: sheetUrl,
                nombreSheet: nuevoSheet.getName(),
                nombreOriginal: nombreWorkspace,
                nombreFinal: nombreFinal,
                fueRenombrado: nombreWorkspace !== nombreFinal,
                mensaje:
                    nombreWorkspace !== nombreFinal
                        ? 'Workspace creado como "' +
                          nombreFinal +
                          '" (el nombre original ya existía)'
                        : "Workspace creado y configurado exitosamente",
                detalles: resultadoConfig,
            };
        } else {
            return {
                success: false,
                error:
                    "Sheet creado pero fallo la configuracion: " +
                    resultadoConfig.error,
            };
        }
    } catch (error) {
        Logger.log("Error creando workspace: " + error.toString());
        return {
            success: false,
            error: "Error al crear workspace: " + error.message,
        };
    }
}

/**
 * Obtiene información de configuración del workspace
 * @param {string} sheetUrl - URL del Sheet
 * @returns {Object} Datos de configuración
 */
function obtenerConfigWorkspace(sheetUrl) {
    try {
        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var hojaConfig = spreadsheet.getSheetByName("Config");

        if (hojaConfig === null) {
            return {
                success: false,
                error: "No se encontro la hoja Config",
            };
        }

        var datos = hojaConfig.getDataRange().getValues();
        var config = {};

        // Convertir datos a objeto
        for (var i = 1; i < datos.length; i++) {
            config[datos[i][0]] = datos[i][1];
        }

        return {
            success: true,
            config: config,
            nombreWorkspace: spreadsheet.getName(),
        };
    } catch (error) {
        return {
            success: false,
            error: "Error obteniendo config: " + error.message,
        };
    }
}

/**
 * Aplica un formato consistente a todas las hojas del spreadsheet:
 * - Normaliza encabezados (quita saltos de linea para que queden oneline)
 * - Encabezados: fondo oscuro, texto blanco, negrita, sin wrap
 * - Datos (filas) con wrap activado para permitir multilinea en celdas
 * - Congela la primera fila y ajusta alturas/anchos mínimos
 * @param {Spreadsheet} spreadsheet
 */
function mejorarFormatoTodasHojas(spreadsheet) {
    try {
        var sheets = spreadsheet.getSheets();
        sheets.forEach(function (sheet) {
            try {
                var lastCol = Math.max(1, sheet.getLastColumn());

                // Normalizar headers: quitar saltos de linea y trimming
                var headerRange = sheet.getRange(1, 1, 1, lastCol);
                var headerValues = headerRange.getValues()[0] || [];
                var newHeaders = headerValues.map(function (h) {
                    return (h || "").toString().replace(/\r?\n/g, " ").trim();
                });
                headerRange.setValues([newHeaders]);

                // Formato de header: una linea, wrap activado, centrado
                headerRange
                    .setWrap(true)
                    .setBackground("#1a365d")
                    .setFontColor("#ffffff")
                    .setFontWeight("bold")
                    .setFontSize(11)
                    .setHorizontalAlignment("center")
                    .setVerticalAlignment("middle");

                sheet.setFrozenRows(1);
                sheet.setRowHeight(1, 30);

                // Activar wrap y alineación vertical en datos (filas inferiores)
                var lastRow = sheet.getLastRow();
                if (lastRow > 1) {
                    var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
                    dataRange.setWrap(true).setVerticalAlignment("middle");
                }

                // Auto-ajustar columnas cuando sea posible y asegurar ancho mínimo
                // Mejor: calcular un ancho basado en la longitud del header para
                // que los títulos se vean completos. Esto evita que textos largos
                // queden cortados.
                for (var c = 1; c <= lastCol; c++) {
                    try {
                        // Primero intentar auto-resize para contenido
                        sheet.autoResizeColumn(c);
                    } catch (e) {
                        // ignore
                    }

                    try {
                        var currentWidth = sheet.getColumnWidth(c) || 120;
                        var headerText = (newHeaders[c - 1] || "").toString();
                        // Estimar ancho deseado: base + por caracter
                        var estimated = Math.max(
                            180,
                            headerText.length * 10 + 40
                        );
                        // No reducir si autoResize ya produjo un ancho mayor
                        var finalWidth = Math.max(currentWidth, estimated);
                        // En columnas tipo ID o numéricas muy cortas, mantener razonable
                        if (
                            headerText.toLowerCase() === "id" &&
                            finalWidth > 160
                        ) {
                            finalWidth = 140;
                        }
                        sheet.setColumnWidth(c, finalWidth);
                    } catch (e) {
                        // ignore
                    }
                }
            } catch (inner) {
                Logger.log(
                    "Error aplicando formato en hoja " +
                        sheet.getName() +
                        ": " +
                        inner.toString()
                );
            }
        });
        return { success: true };
    } catch (error) {
        Logger.log("Error en mejorarFormatoTodasHojas: " + error.toString());
        return { success: false, error: error.toString() };
    }
}
