/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BACKEND_SERVICES_BUGS.GS
 * Servicio para gestión de bugs
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Genera un ID único para un bug
 * Formato: BUG-1, BUG-2, BUG-3...
 * ACTUALIZADO: Usa obtenerProximoIdBug() de Config.gs (feature/bugs-trello)
 * @param {string} sheetUrl - URL del Sheet (opcional, usa currentSheetUrl si no se pasa)
 * @returns {string} ID del bug
 */
function generarIdBug(sheetUrl) {
    try {
        Logger.log("🆔 Generando ID de bug...");

        // Si no se pasa sheetUrl, intentar obtenerla del contexto
        if (!sheetUrl) {
            sheetUrl =
                PropertiesService.getScriptProperties().getProperty(
                    "currentSheetUrl"
                );
        }

        if (!sheetUrl) {
            Logger.log("⚠️ No hay sheetUrl, usando contador por defecto");
            return "BUG-" + new Date().getTime();
        }

        // Usar la función centralizada de Config.gs
        if (typeof obtenerProximoIdBug === "function") {
            return obtenerProximoIdBug(sheetUrl);
        } else {
            // Fallback al método anterior
            var contadorActual = obtenerValorConfig(
                "ultimo_bug_id",
                "0",
                sheetUrl
            );
            var nuevoContador = parseInt(contadorActual) + 1;
            guardarValorConfig(
                "ultimo_bug_id",
                nuevoContador.toString(),
                sheetUrl
            );

            var nuevoId = "BUG-" + nuevoContador;
            Logger.log("✅ ID generado (fallback): " + nuevoId);
            return nuevoId;
        }
    } catch (error) {
        Logger.log("❌ Error generando ID: " + error.toString());
        // Fallback: usar timestamp
        return "BUG-" + new Date().getTime();
    }
}

/**
 * Obtiene la hoja de Bugs, creándola si no existe
 * @param {Spreadsheet} spreadsheet - Spreadsheet de Google Sheets
 * @returns {Sheet} Hoja de Bugs
 */
function obtenerOCrearHojaBugs(spreadsheet) {
    try {
        var hoja = spreadsheet.getSheetByName("Bugs");

        if (hoja === null) {
            Logger.log("⚠️ Hoja Bugs no existe, creando...");
            // Usar la función de workspace si existe
            if (typeof crearHojaBugs === "function") {
                var resultado = { hojasCreadas: [], hojasActualizadas: [] };
                crearHojaBugs(spreadsheet, resultado);
                hoja = spreadsheet.getSheetByName("Bugs");
            } else {
                // Crear manualmente
                hoja = spreadsheet.insertSheet("Bugs");
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
                    "TrelloCardURL",
                    "Notas",
                ];
                hoja.getRange(1, 1, 1, headers.length).setValues([headers]);
            }
        }

        return hoja;
    } catch (error) {
        Logger.log("❌ Error obteniendo hoja Bugs: " + error.toString());
        throw error;
    }
}

/**
 * Crea un nuevo bug
 * @param {Object} datosBug - Datos del bug a crear
 * @returns {Object} Resultado de la operación
 */
function crearBug(datosBug) {
    try {
        Logger.log("🐛 Creando nuevo bug...");
        Logger.log("   Título: " + datosBug.titulo);

        // Validar sheetUrl
        var sheetUrl = datosBug.sheetUrl;
        if (!sheetUrl) {
            sheetUrl =
                PropertiesService.getScriptProperties().getProperty(
                    "currentSheetUrl"
                );
        }

        if (!sheetUrl) {
            return {
                success: false,
                mensaje: "No se proporcionó URL del Sheet",
            };
        }

        // Abrir spreadsheet
        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var hojaBugs = obtenerOCrearHojaBugs(spreadsheet);

        // Generar ID único
        var bugId = generarIdBug(sheetUrl);

        // Obtener usuario actual
        var usuario = Session.getActiveUser().getEmail() || "usuario@qa.com";

        // Preparar fecha
        var fechaHoy = new Date();

        // Preparar fila de datos
        var fila = [
            bugId, // ID
            datosBug.titulo || "", // Titulo
            datosBug.descripcion || "", // Descripcion
            datosBug.severidad || "Media", // Severidad
            datosBug.prioridad || "Media", // Prioridad
            "Abierto", // Estado (siempre Abierto al crear)
            datosBug.etiquetas || "", // Etiquetas
            datosBug.tieneCasoDiseñado ? "Si" : "No", // TieneCasoDiseñado
            datosBug.casosRelacionados || "", // CasosRelacionados
            datosBug.origenSinCaso || "", // OrigenSinCaso
            datosBug.precondiciones || "", // Precondiciones
            datosBug.datosPrueba || "", // DatosPrueba
            datosBug.pasosReproducir || "", // PasosReproducir
            datosBug.resultadoEsperado || "", // ResultadoEsperado
            datosBug.resultadoObtenido || "", // ResultadoObtenido
            datosBug.ambiente || "", // Ambiente
            datosBug.navegador || "", // Navegador
            datosBug.evidencias ? datosBug.evidencias.join("\n") : "", // EvidenciasURL
            fechaHoy, // FechaDeteccion
            usuario, // DetectadoPor
            datosBug.asignadoA || "", // AsignadoA
            "", // FechaResolucion
            "", // TrelloCardID
            "", // TrelloCardURL
            datosBug.notas || "", // Notas
        ];

        // Agregar fila a la hoja
        hojaBugs.appendRow(fila);

        Logger.log("✅ Bug creado en Sheet: " + bugId);
    } catch (error) {
        Logger.log("❌ Error al crear bug: " + error);
        return {
            success: false,
            mensaje: "Error al crear bug: " + error,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════
// SUBIR EVIDENCIAS A DRIVE (MEJORA 4 - permanente)
// ═══════════════════════════════════════════════════════════════════════

var evidenciasUrls = [];
var urlCarpetaEvidencias = "";

if (datosBug.evidenciasBase64 && datosBug.evidenciasBase64.length > 0) {
    Logger.log(
        "📤 Subiendo " +
            datosBug.evidenciasBase64.length +
            " evidencias a Drive..."
    );

    try {
        // Obtener o crear carpeta de evidencias
        var carpetaEvidencias = obtenerOCrearCarpetaEvidencias(spreadsheet);

        // Crear subcarpeta para este bug
        var nombreCarpetaBug =
            bugId + " - " + limpiarNombreArchivo(datosBug.titulo);
        var carpetaBug = carpetaEvidencias.createFolder(nombreCarpetaBug);

        Logger.log("📁 Carpeta creada: " + carpetaBug.getName());

        // Subir cada evidencia
        datosBug.evidenciasBase64.forEach(function (evidencia) {
            try {
                Logger.log("  📎 Subiendo: " + evidencia.nombre);

                // Decodificar Base64
                var bytes = Utilities.base64Decode(evidencia.contenidoBase64);
                var blob = Utilities.newBlob(
                    bytes,
                    evidencia.mimeType,
                    evidencia.nombre
                );

                // Crear archivo en Drive
                var archivo = carpetaBug.createFile(blob);

                // Hacer el archivo accesible con el link
                archivo.setSharing(
                    DriveApp.Access.ANYONE_WITH_LINK,
                    DriveApp.Permission.VIEW
                );

                var urlArchivo = archivo.getUrl();
                evidenciasUrls.push(urlArchivo);

                Logger.log("    ✅ Subido: " + urlArchivo);
            } catch (errorArchivo) {
                Logger.log(
                    '    ❌ Error con evidencia "' +
                        evidencia.nombre +
                        '": ' +
                        errorArchivo.toString()
                );
            }
        });

        urlCarpetaEvidencias = carpetaBug.getUrl();

        Logger.log(
            "✅ " + evidenciasUrls.length + " evidencias subidas exitosamente"
        );
        Logger.log("📂 Carpeta: " + urlCarpetaEvidencias);

        // Actualizar el bug con las URLs de evidencias
        actualizarBug(sheetUrl, bugId, {
            EvidenciasURL: evidenciasUrls.join("\n"),
        });
    } catch (errorDrive) {
        Logger.log("❌ Error subiendo evidencias: " + errorDrive.toString());
        // No detener el proceso, el bug ya está creado
    }
}

// ═══════════════════════════════════════════════════════════════════════
// INTEGRACIÓN CON TRELLO (feature/bugs-trello)
// ═══════════════════════════════════════════════════════════════════════

var resultadoTrello = {
    intentado: false,
    exito: false,
    cardUrl: "",
    cardId: "",
    error: "",
};

var mensajeFinal = "";
var trelloCardUrl = "";
var trelloCardId = "";

// Obtener configuración de Trello
var configTrello = obtenerConfigTrello(sheetUrl);

Logger.log("📋 Config Trello - Configurado: " + configTrello.configurado);

if (configTrello.configurado) {
    // Trello está configurado, intentar crear tarjeta
    Logger.log("🎫 Intentando crear tarjeta en Trello...");

    // Preparar datos completos del bug para Trello
    var bugCompleto = {
        id: bugId,
        titulo: datosBug.titulo,
        descripcion: datosBug.descripcion,
        severidad: datosBug.severidad,
        prioridad: datosBug.prioridad,
        estado: "Abierto",
        casoRelacionado: datosBug.casosRelacionados || "-",
        precondiciones: datosBug.precondiciones || "-",
        datosPrueba: datosBug.datosPrueba || "-",
        pasosReproducir: datosBug.pasosReproducir,
        resultadoEsperado: datosBug.resultadoEsperado,
        resultadoObtenido: datosBug.resultadoObtenido,
        navegador: datosBug.navegador || "-",
        ambiente: datosBug.ambiente || "-",
        evidencias: datosBug.evidencias || [],
        fechaCreacion: fechaHoy,
        reportadoPor: usuario,
    };

    // MEJORA 4: Agregar URLs de evidencias si se subieron
    if (evidenciasUrls.length > 0) {
        bugCompleto.evidenciasUrls = evidenciasUrls;
        bugCompleto.carpetaEvidencias = urlCarpetaEvidencias;
    }

    try {
        // Llamar a la función de Trello
        resultadoTrello = crearTarjetaTrello(bugCompleto, configTrello);
        resultadoTrello.intentado = true;

        if (resultadoTrello.exito) {
            // ✅ ESCENARIO 1: Éxito con Trello
            Logger.log(
                "✅ Tarjeta creada en Trello: " + resultadoTrello.cardUrl
            );

            trelloCardUrl = resultadoTrello.cardUrl;
            trelloCardId = resultadoTrello.cardId;

            // Actualizar el bug con la URL de Trello
            actualizarBug(sheetUrl, bugId, {
                LinkTrello: trelloCardUrl,
                TrelloCardID: trelloCardId,
            });

            mensajeFinal =
                "Bug " + bugId + " creado y enviado a Trello exitosamente";
        } else {
            // ❌ ESCENARIO 3: Error en Trello pero bug guardado
            Logger.log(
                "⚠️ Bug guardado pero error en Trello: " + resultadoTrello.error
            );

            // Marcar como pendiente de sincronización
            actualizarBug(sheetUrl, bugId, {
                Estado: "Pendiente sincronización Trello",
                Notas: "Error Trello: " + resultadoTrello.error,
            });

            mensajeFinal =
                "Bug " +
                bugId +
                " guardado. Error al sincronizar con Trello: " +
                resultadoTrello.error;
        }
    } catch (trelloError) {
        // ❌ ESCENARIO 3: Excepción al intentar crear en Trello
        Logger.log("💥 Excepción con Trello: " + trelloError.toString());

        resultadoTrello.intentado = true;
        resultadoTrello.exito = false;
        resultadoTrello.error = trelloError.message || trelloError.toString();

        mensajeFinal =
            "Bug " +
            bugId +
            " guardado. Error al sincronizar con Trello: " +
            resultadoTrello.error;
    }
} else {
    // ℹ️ ESCENARIO 2: Sin Trello configurado
    Logger.log("ℹ️ Trello no configurado, solo se guarda en Sheet");
    mensajeFinal = "Bug " + bugId + " guardado. Trello no configurado";
}

// ═══════════════════════════════════════════════════════════════════════
// ACTUALIZAR CASOS RELACIONADOS
// ═══════════════════════════════════════════════════════════════════════

// Si tiene casos relacionados, actualizar esos casos
if (datosBug.casosRelacionados && datosBug.casosRelacionados !== "") {
    var casosIds = datosBug.casosRelacionados.split(",").map(function (id) {
        return id.trim();
    });

    casosIds.forEach(function (casoId) {
        if (casoId) {
            actualizarBugEnCaso(spreadsheet, casoId, bugId);
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════
// RESPUESTA FINAL
// ═══════════════════════════════════════════════════════════════════════

return {
    success: true,
    data: {
        bugId: bugId,
        titulo: datosBug.titulo,
        estado: "Abierto",
        trelloCreado: resultadoTrello.exito,
        trelloUrl: trelloCardUrl,
        trelloCardId: trelloCardId,
        trelloIntentado: resultadoTrello.intentado,
        trelloError: resultadoTrello.error || "",
    },
    mensaje: mensajeFinal,
};

/**
 * Actualiza la columna de bugs en un caso
 * @param {Spreadsheet} spreadsheet - Spreadsheet
 * @param {string} casoId - ID del caso
 * @param {string} bugId - ID del bug a agregar
 */
function actualizarBugEnCaso(spreadsheet, casoId, bugId) {
    try {
        Logger.log("🔗 Vinculando bug " + bugId + " al caso " + casoId);

        // Buscar el caso en todas las hojas
        var finder =
            typeof buscarCasoEnTodasHojas === "function"
                ? buscarCasoEnTodasHojas
                : typeof buscarCasoEnTodasHojasCanon === "function"
                ? buscarCasoEnTodasHojasCanon
                : __buscarCasoEnTodasHojasFallback_Bugs;
        var resultado = finder(spreadsheet, casoId);

        if (!resultado) {
            Logger.log("⚠️ Caso no encontrado: " + casoId);
            return;
        }

        var hoja = resultado.hoja;
        var fila = resultado.fila;
        var headers = resultado.headers;

        // Obtener columna LinkBugRelacionado
        var colBug = headers.indexOf("LinkBugRelacionado") + 1;

        if (colBug === 0) {
            Logger.log("⚠️ No existe columna LinkBugRelacionado");
            return;
        }

        // Obtener bugs actuales del caso
        var bugsActuales = hoja.getRange(fila, colBug).getValue() || "";

        // Agregar nuevo bug (separado por coma si ya hay otros)
        var nuevoValor =
            bugsActuales === "" ? bugId : bugsActuales + ", " + bugId;

        // Actualizar
        hoja.getRange(fila, colBug).setValue(nuevoValor);

        Logger.log("✅ Bug vinculado al caso");
    } catch (error) {
        Logger.log("❌ Error actualizando caso: " + error.toString());
    }
}

/**
 * Lista todos los bugs con filtros opcionales
 * @param {string} sheetUrl - URL del Sheet
 * @param {Object} filtros - Filtros opcionales
 *        - busqueda: string para buscar en título/descripción
 *        - severidad: Crítica/Alta/Media/Baja
 *        - estado: Abierto/Cerrado
 *        - conCaso: true/false (tiene caso relacionado)
 * @returns {Object} Lista de bugs
 */
function listarBugs(sheetUrl, filtros) {
    try {
        Logger.log("📋 Listando bugs...");
        Logger.log("   URL: " + sheetUrl);
        Logger.log("   Filtros: " + JSON.stringify(filtros));

        if (!sheetUrl || sheetUrl === "") {
            return {
                success: false,
                mensaje: "URL del Sheet no proporcionada",
            };
        }

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var hojaBugs = spreadsheet.getSheetByName("Bugs");

        if (hojaBugs === null) {
            Logger.log("⚠️ Hoja Bugs no existe");
            return {
                success: true,
                data: {
                    bugs: [],
                    total: 0,
                },
            };
        }

        var datos = hojaBugs.getDataRange().getValues();

        if (datos.length <= 1) {
            Logger.log("⚠️ Hoja Bugs está vacía");
            return {
                success: true,
                data: {
                    bugs: [],
                    total: 0,
                },
            };
        }

        var headers = datos[0];
        var bugs = [];

        // Convertir filas a objetos
        for (var i = 1; i < datos.length; i++) {
            var bug = {};
            for (var j = 0; j < headers.length; j++) {
                bug[headers[j]] = datos[i][j];
            }
            bugs.push(bug);
        }

        Logger.log("   Total bugs antes de filtros: " + bugs.length);

        // Aplicar filtros si existen
        if (filtros) {
            bugs = aplicarFiltrosBugs(bugs, filtros);
            Logger.log("   Total bugs después de filtros: " + bugs.length);
        }

        return {
            success: true,
            data: {
                bugs: bugs,
                total: bugs.length,
            },
        };
    } catch (error) {
        Logger.log("❌ Error listando bugs: " + error.toString());
        return {
            success: false,
            mensaje: "Error al listar bugs: " + error.message,
        };
    }
}

/**
 * Aplica filtros a la lista de bugs
 * @param {Array} bugs - Array de bugs
 * @param {Object} filtros - Filtros a aplicar
 * @returns {Array} Bugs filtrados
 */
function aplicarFiltrosBugs(bugs, filtros) {
    var resultado = bugs;

    // Filtro por búsqueda en título o descripción
    if (filtros.busqueda && filtros.busqueda !== "") {
        var busqueda = filtros.busqueda.toLowerCase();
        resultado = resultado.filter(function (bug) {
            var titulo = (bug.Titulo || "").toLowerCase();
            var descripcion = (bug.Descripcion || "").toLowerCase();
            return (
                titulo.indexOf(busqueda) > -1 ||
                descripcion.indexOf(busqueda) > -1
            );
        });
    }

    // Filtro por severidad
    if (filtros.severidad && filtros.severidad !== "Todas") {
        resultado = resultado.filter(function (bug) {
            return bug.Severidad === filtros.severidad;
        });
    }

    // Filtro por estado
    if (filtros.estado && filtros.estado !== "Todos") {
        resultado = resultado.filter(function (bug) {
            return bug.Estado === filtros.estado;
        });
    }

    // Filtro por "con caso" o "sin caso"
    if (filtros.conCaso !== undefined && filtros.conCaso !== null) {
        resultado = resultado.filter(function (bug) {
            var tieneCaso =
                (bug.CasosRelacionados && bug.CasosRelacionados !== "") ||
                (bug.LinkCasoPrueba && bug.LinkCasoPrueba !== "") ||
                (bug.CasoURI && bug.CasoURI !== "");
            return filtros.conCaso ? tieneCaso : !tieneCaso;
        });
    }

    // Filtro solo bugs abiertos
    if (filtros.soloAbiertos === true) {
        resultado = resultado.filter(function (bug) {
            return bug.Estado === "Abierto" && bug.EliminadoPorUsuario !== "Si";
        });
    }

    return resultado;
}

/**
 * Obtiene el detalle completo de un bug
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} bugId - ID del bug
 * @returns {Object} Datos del bug
 */
function obtenerDetalleBug(sheetUrl, bugId) {
    try {
        Logger.log("🔍 Obteniendo detalle de bug: " + bugId);

        if (!sheetUrl || !bugId) {
            return {
                success: false,
                mensaje: "Parámetros incompletos",
            };
        }

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var hojaBugs = spreadsheet.getSheetByName("Bugs");

        if (hojaBugs === null) {
            return {
                success: false,
                mensaje: "Hoja Bugs no encontrada",
            };
        }

        var datos = hojaBugs.getDataRange().getValues();
        var headers = datos[0];

        // Buscar bug por ID
        for (var i = 1; i < datos.length; i++) {
            if (datos[i][0] === bugId) {
                var bug = {};
                for (var j = 0; j < headers.length; j++) {
                    bug[headers[j]] = datos[i][j];
                }

                Logger.log("✅ Bug encontrado");

                return {
                    success: true,
                    data: bug,
                };
            }
        }

        return {
            success: false,
            mensaje: "Bug no encontrado",
        };
    } catch (error) {
        Logger.log("❌ Error obteniendo bug: " + error.toString());
        return {
            success: false,
            mensaje: "Error al obtener bug: " + error.message,
        };
    }
}

/**
 * Obtiene todos los bugs relacionados con un caso
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} casoId - ID del caso
 * @returns {Object} Lista de bugs del caso
 */
function obtenerBugsPorCaso(sheetUrl, casoId) {
    try {
        Logger.log("🔗 Obteniendo bugs del caso: " + casoId);

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var hojaBugs = spreadsheet.getSheetByName("Bugs");

        if (hojaBugs === null) {
            return {
                success: true,
                data: {
                    bugs: [],
                    total: 0,
                },
            };
        }

        var datos = hojaBugs.getDataRange().getValues();
        var headers = datos[0];
        var bugs = [];

        // Buscar bugs que contengan este caso en CasosRelacionados
        for (var i = 1; i < datos.length; i++) {
            var casosRelacionados =
                datos[i][headers.indexOf("CasosRelacionados")] || "";

            if (casosRelacionados.indexOf(casoId) > -1) {
                var bug = {};
                for (var j = 0; j < headers.length; j++) {
                    bug[headers[j]] = datos[i][j];
                }
                bugs.push(bug);
            }
        }

        Logger.log("✅ Encontrados " + bugs.length + " bugs");

        return {
            success: true,
            data: {
                bugs: bugs,
                total: bugs.length,
            },
        };
    } catch (error) {
        Logger.log("❌ Error obteniendo bugs del caso: " + error.toString());
        return {
            success: false,
            mensaje: "Error: " + error.message,
        };
    }
}

/**
 * Actualiza un bug existente
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} bugId - ID del bug
 * @param {Object} datosActualizados - Datos a actualizar
 * @returns {Object} Resultado
 */
function actualizarBug(sheetUrl, bugId, datosActualizados) {
    try {
        Logger.log("✏️ Actualizando bug: " + bugId);
        Logger.log("   Datos: " + JSON.stringify(datosActualizados));

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var hojaBugs = spreadsheet.getSheetByName("Bugs");

        if (hojaBugs === null) {
            return {
                success: false,
                mensaje: "Hoja Bugs no encontrada",
            };
        }

        var datos = hojaBugs.getDataRange().getValues();
        var headers = datos[0];

        // Buscar fila del bug
        for (var i = 1; i < datos.length; i++) {
            if (datos[i][0] === bugId) {
                // Actualizar campos modificados
                for (var campo in datosActualizados) {
                    var colIndex = headers.indexOf(campo);
                    if (colIndex > -1) {
                        hojaBugs
                            .getRange(i + 1, colIndex + 1)
                            .setValue(datosActualizados[campo]);
                    }
                }

                Logger.log("✅ Bug actualizado");

                return {
                    success: true,
                    mensaje: "Bug actualizado exitosamente",
                };
            }
        }

        return {
            success: false,
            mensaje: "Bug no encontrado",
        };
    } catch (error) {
        Logger.log("❌ Error actualizando bug: " + error.toString());
        return {
            success: false,
            mensaje: "Error al actualizar bug: " + error.message,
        };
    }
}

/**
 * Cambia el estado de un bug
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} bugId - ID del bug
 * @param {string} nuevoEstado - Abierto o Cerrado
 * @returns {Object} Resultado
 */
function cambiarEstadoBug(sheetUrl, bugId, nuevoEstado) {
    try {
        Logger.log(
            "🔄 Cambiando estado de bug " + bugId + " a: " + nuevoEstado
        );

        var datosActualizar = {
            Estado: nuevoEstado,
        };

        // Si se cierra, agregar fecha de resolución
        if (nuevoEstado === "Cerrado") {
            datosActualizar.FechaResolucion = new Date();
        }

        // Si se reabre, limpiar fecha de resolución
        if (nuevoEstado === "Abierto") {
            datosActualizar.FechaResolucion = "";
        }

        return actualizarBug(sheetUrl, bugId, datosActualizar);
    } catch (error) {
        Logger.log("❌ Error cambiando estado: " + error.toString());
        return {
            success: false,
            mensaje: "Error al cambiar estado: " + error.message,
        };
    }
}

/**
 * Valida el cambio de estado de un bug verificando casos asociados
 * MEJORA 5: Advertir sobre casos en estado No_OK
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} bugId - ID del bug
 * @param {string} nuevoEstado - Estado al que se quiere cambiar
 * @returns {Object} Resultado con advertencias y casos afectados
 */
function validarCambioEstadoBug(sheetUrl, bugId, nuevoEstado) {
    try {
        Logger.log(
            "🔍 Validando cambio de estado de bug " +
                bugId +
                " a: " +
                nuevoEstado
        );

        // Obtener el bug
        var detalleBug = obtenerDetalleBug(sheetUrl, bugId);

        if (!detalleBug.success) {
            return {
                success: false,
                mensaje: "Bug no encontrado",
            };
        }

        var bug = detalleBug.data;
        var casosRelacionados = bug.CasosRelacionados || "";

        // Si no tiene casos relacionados, no hay problema
        if (
            !casosRelacionados ||
            casosRelacionados === "" ||
            casosRelacionados === "-"
        ) {
            return {
                success: true,
                puedeCompletar: true,
                tieneCasosAsociados: false,
                mensaje: "Sin casos asociados, puede proceder",
            };
        }

        // Separar IDs de casos
        var casosIds = casosRelacionados
            .split(",")
            .map(function (id) {
                return id.trim();
            })
            .filter(function (id) {
                return id !== "";
            });

        Logger.log("   Casos relacionados: " + casosIds.join(", "));

        // Si el nuevo estado es "Cerrado" o "Resuelto", verificar casos No_OK
        if (nuevoEstado === "Cerrado" || nuevoEstado === "Resuelto") {
            var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
            var casosEnNoOK = [];

            casosIds.forEach(function (casoId) {
                var resultado = buscarCasoEnTodasHojas(spreadsheet, casoId);

                if (resultado) {
                    var headers = resultado.headers;
                    var fila = resultado.fila;
                    var hoja = resultado.hoja;
                    var datos = hoja
                        .getRange(fila, 1, 1, headers.length)
                        .getValues()[0];

                    var colEstado = headers.indexOf("ResultadoUltimaEjecucion");

                    if (colEstado > -1) {
                        var estadoCaso = datos[colEstado];

                        if (estadoCaso === "No_OK") {
                            casosEnNoOK.push({
                                id: casoId,
                                titulo: datos[headers.indexOf("Titulo")] || "",
                                hoja: resultado.nombreHoja,
                            });
                        }
                    }
                }
            });

            Logger.log("   Casos en No_OK encontrados: " + casosEnNoOK.length);

            return {
                success: true,
                tieneCasosAsociados: true,
                casosEnNoOK: casosEnNoOK,
                requiereConfirmacion: casosEnNoOK.length > 0,
                mensaje:
                    casosEnNoOK.length > 0
                        ? "Hay " +
                          casosEnNoOK.length +
                          " caso(s) en estado No_OK relacionado(s) con este bug"
                        : "Todos los casos asociados están OK o sin ejecutar",
            };
        }

        // Para otros cambios de estado, no requiere validación especial
        return {
            success: true,
            puedeCompletar: true,
            tieneCasosAsociados: true,
            mensaje: "Puede proceder con el cambio de estado",
        };
    } catch (error) {
        Logger.log("❌ Error validando cambio de estado: " + error.toString());
        return {
            success: false,
            mensaje: "Error al validar: " + error.message,
        };
    }
}

/**
 * Actualiza los casos relacionados con un bug que se cierra/resuelve
 * MEJORA 5: Cambiar casos de No_OK a OK automáticamente
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} bugId - ID del bug
 * @param {Array} casosIds - IDs de los casos a actualizar
 * @returns {Object} Resultado
 */
function actualizarCasosAlCerrarBug(sheetUrl, bugId, casosIds) {
    try {
        Logger.log("🔄 Actualizando casos relacionados al cerrar bug " + bugId);

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var casosActualizados = [];
        var errores = [];

        casosIds.forEach(function (casoId) {
            try {
                var resultado = buscarCasoEnTodasHojas(spreadsheet, casoId);

                if (resultado) {
                    var headers = resultado.headers;
                    var fila = resultado.fila;
                    var hoja = resultado.hoja;

                    var colEstado =
                        headers.indexOf("ResultadoUltimaEjecucion") + 1;
                    var colComentarios =
                        headers.indexOf("ComentariosEjecucion") + 1;

                    if (colEstado > 0) {
                        // Cambiar estado a OK
                        hoja.getRange(fila, colEstado).setValue("OK");

                        // Agregar comentario
                        if (colComentarios > 0) {
                            var comentarioActual =
                                hoja
                                    .getRange(fila, colComentarios)
                                    .getValue() || "";
                            var nuevoComentario =
                                (comentarioActual
                                    ? comentarioActual + "\n"
                                    : "") +
                                "Bug " +
                                bugId +
                                " resuelto - Caso actualizado a OK automáticamente";
                            hoja.getRange(fila, colComentarios).setValue(
                                nuevoComentario
                            );
                        }

                        casosActualizados.push(casoId);
                        Logger.log("  ✅ Caso " + casoId + " actualizado a OK");
                    }
                }
            } catch (e) {
                Logger.log(
                    "  ⚠️ Error con caso " + casoId + ": " + e.toString()
                );
                errores.push(casoId);
            }
        });

        return {
            success: true,
            casosActualizados: casosActualizados,
            errores: errores,
            mensaje: casosActualizados.length + " caso(s) actualizado(s) a OK",
        };
    } catch (error) {
        Logger.log("❌ Error actualizando casos: " + error.toString());
        return {
            success: false,
            mensaje: "Error al actualizar casos: " + error.message,
        };
    }
}

/**
 * Valida si un caso tiene bugs abiertos
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} casoId - ID del caso
 * @returns {Object} Resultado con lista de bugs abiertos
 */
function validarBugsAbiertosDeCaso(sheetUrl, casoId) {
    try {
        Logger.log("🔍 Validando bugs abiertos del caso: " + casoId);

        var resultado = obtenerBugsPorCaso(sheetUrl, casoId);

        if (!resultado.success) {
            return {
                success: false,
                mensaje: resultado.mensaje,
            };
        }

        // Filtrar solo bugs abiertos
        var bugsAbiertos = resultado.data.bugs.filter(function (bug) {
            return bug.Estado === "Abierto" && bug.EliminadoPorUsuario !== "Si";
        });

        Logger.log("   Bugs abiertos encontrados: " + bugsAbiertos.length);

        return {
            success: true,
            data: {
                tieneBugsAbiertos: bugsAbiertos.length > 0,
                bugsAbiertos: bugsAbiertos,
                cantidad: bugsAbiertos.length,
            },
        };
    } catch (error) {
        Logger.log("❌ Error validando bugs: " + error.toString());
        return {
            success: false,
            mensaje: "Error: " + error.message,
        };
    }
}

/**
 * Vincula un bug con uno o más casos
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} bugId - ID del bug
 * @param {string} casoId - ID del caso (o IDs separados por coma)
 * @returns {Object} Resultado
 */
function vincularBugConCaso(sheetUrl, bugId, casoId) {
    try {
        Logger.log("🔗 Vinculando bug " + bugId + " con caso " + casoId);

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var hojaBugs = spreadsheet.getSheetByName("Bugs");

        if (hojaBugs === null) {
            return {
                success: false,
                mensaje: "Hoja Bugs no encontrada",
            };
        }

        var datos = hojaBugs.getDataRange().getValues();
        var headers = datos[0];

        // Buscar bug
        for (var i = 1; i < datos.length; i++) {
            if (datos[i][0] === bugId) {
                var colCasos = headers.indexOf("CasosRelacionados") + 1;

                if (colCasos === 0) {
                    return {
                        success: false,
                        mensaje: "Columna CasosRelacionados no encontrada",
                    };
                }

                // Obtener casos actuales
                var casosActuales =
                    hojaBugs.getRange(i + 1, colCasos).getValue() || "";

                // Separar casos existentes
                var listaCasos =
                    casosActuales === ""
                        ? []
                        : casosActuales.split(",").map(function (c) {
                              return c.trim();
                          });

                // Agregar nuevo caso si no existe
                var casosNuevos = casoId.split(",").map(function (c) {
                    return c.trim();
                });

                casosNuevos.forEach(function (caso) {
                    if (caso && listaCasos.indexOf(caso) === -1) {
                        listaCasos.push(caso);
                    }
                });

                // Actualizar en el bug
                var nuevoValor = listaCasos.join(", ");
                hojaBugs.getRange(i + 1, colCasos).setValue(nuevoValor);

                // Actualizar TieneCasoDiseñado
                var colTieneCaso = headers.indexOf("TieneCasoDiseñado") + 1;
                if (colTieneCaso > 0) {
                    hojaBugs.getRange(i + 1, colTieneCaso).setValue("Si");
                }

                Logger.log("✅ Bug vinculado a caso(s)");

                // Actualizar el/los caso(s) con el bug
                casosNuevos.forEach(function (caso) {
                    if (caso) {
                        actualizarBugEnCaso(spreadsheet, caso, bugId);
                    }
                });

                // Refrescar enlaces a casos (LinkCasoPrueba)
                try {
                    if (typeof actualizarLinkCasoPruebaParaBug === "function") {
                        actualizarLinkCasoPruebaParaBug(sheetUrl, bugId);
                    }
                } catch (e) {
                    Logger.log(
                        "Aviso: no se pudo actualizar LinkCasoPrueba: " + e
                    );
                }

                return {
                    success: true,
                    mensaje: "Bug vinculado exitosamente",
                    data: {
                        bugId: bugId,
                        casosRelacionados: nuevoValor,
                    },
                };
            }
        }

        return {
            success: false,
            mensaje: "Bug no encontrado",
        };
    } catch (error) {
        Logger.log("❌ Error vinculando bug: " + error.toString());
        return {
            success: false,
            mensaje: "Error al vincular bug: " + error.message,
        };
    }
}

/**
 * Desvincula un bug de un caso específico
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} bugId - ID del bug
 * @param {string} casoId - ID del caso a desvincular
 * @returns {Object} Resultado
 */
function desvincularBugDeCaso(sheetUrl, bugId, casoId) {
    try {
        Logger.log("🔓 Desvinculando bug " + bugId + " del caso " + casoId);

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var hojaBugs = spreadsheet.getSheetByName("Bugs");

        if (hojaBugs === null) {
            return {
                success: false,
                mensaje: "Hoja Bugs no encontrada",
            };
        }

        var datos = hojaBugs.getDataRange().getValues();
        var headers = datos[0];

        // Buscar bug
        for (var i = 1; i < datos.length; i++) {
            if (datos[i][0] === bugId) {
                var colCasos = headers.indexOf("CasosRelacionados") + 1;

                if (colCasos === 0) {
                    return {
                        success: false,
                        mensaje: "Columna CasosRelacionados no encontrada",
                    };
                }

                // Obtener casos actuales
                var casosActuales =
                    hojaBugs.getRange(i + 1, colCasos).getValue() || "";

                if (casosActuales === "") {
                    return {
                        success: true,
                        mensaje: "El bug no tiene casos vinculados",
                    };
                }

                // Separar y filtrar
                var listaCasos = casosActuales.split(",").map(function (c) {
                    return c.trim();
                });
                var listaNueva = listaCasos.filter(function (c) {
                    return c !== casoId;
                });

                // Actualizar
                var nuevoValor = listaNueva.join(", ");
                hojaBugs.getRange(i + 1, colCasos).setValue(nuevoValor);

                // Si no quedan casos, actualizar TieneCasoDiseñado
                if (nuevoValor === "") {
                    var colTieneCaso = headers.indexOf("TieneCasoDiseñado") + 1;
                    if (colTieneCaso > 0) {
                        hojaBugs.getRange(i + 1, colTieneCaso).setValue("No");
                    }
                }

                Logger.log("✅ Bug desvinculado del caso");

                // Actualizar el caso (quitar este bug)
                quitarBugDeCaso(spreadsheet, casoId, bugId);

                // Refrescar enlaces LinkCasoPrueba en la fila del bug
                try {
                    if (typeof actualizarLinkCasoPruebaParaBug === "function") {
                        actualizarLinkCasoPruebaParaBug(sheetUrl, bugId);
                    }
                } catch (e) {
                    Logger.log(
                        "Aviso: no se pudo actualizar LinkCasoPrueba: " + e
                    );
                }

                return {
                    success: true,
                    mensaje: "Bug desvinculado exitosamente",
                    data: {
                        bugId: bugId,
                        casosRelacionados: nuevoValor,
                    },
                };
            }
        }

        return {
            success: false,
            mensaje: "Bug no encontrado",
        };
    } catch (error) {
        Logger.log("❌ Error desvinculando bug: " + error.toString());
        return {
            success: false,
            mensaje: "Error al desvincular bug: " + error.message,
        };
    }
}

/**
 * Quita un bug de la columna LinkBugRelacionado de un caso
 * @param {Spreadsheet} spreadsheet - Spreadsheet
 * @param {string} casoId - ID del caso
 * @param {string} bugId - ID del bug a quitar
 */
function quitarBugDeCaso(spreadsheet, casoId, bugId) {
    try {
        Logger.log("🔗 Quitando bug " + bugId + " del caso " + casoId);

        // Buscar el caso
        var finder =
            typeof buscarCasoEnTodasHojas === "function"
                ? buscarCasoEnTodasHojas
                : typeof buscarCasoEnTodasHojasCanon === "function"
                ? buscarCasoEnTodasHojasCanon
                : __buscarCasoEnTodasHojasFallback_Bugs;
        var resultado = finder(spreadsheet, casoId);

        if (!resultado) {
            Logger.log("⚠️ Caso no encontrado: " + casoId);
            return;
        }

        var hoja = resultado.hoja;
        var fila = resultado.fila;
        var headers = resultado.headers;

        // Obtener columna LinkBugRelacionado
        var colBug = headers.indexOf("LinkBugRelacionado") + 1;

        if (colBug === 0) {
            Logger.log("⚠️ No existe columna LinkBugRelacionado");
            return;
        }

        // Obtener bugs actuales
        var bugsActuales = hoja.getRange(fila, colBug).getValue() || "";

        if (bugsActuales === "") {
            return;
        }

        // Separar y filtrar
        var listaBugs = bugsActuales.split(",").map(function (b) {
            return b.trim();
        });
        var listaNueva = listaBugs.filter(function (b) {
            return b !== bugId;
        });

        // Actualizar
        var nuevoValor = listaNueva.join(", ");
        hoja.getRange(fila, colBug).setValue(nuevoValor);

        Logger.log("✅ Bug quitado del caso");
    } catch (error) {
        Logger.log("❌ Error quitando bug del caso: " + error.toString());
    }
}

/**
 * Obtiene todos los casos relacionados con un bug
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} bugId - ID del bug
 * @returns {Object} Lista de casos
 */
/**
 * Obtiene todos los casos relacionados con un bug
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} bugId - ID del bug
 * @returns {Object} Lista de casos
 */
function obtenerCasosPorBug(sheetUrl, bugId) {
    try {
        Logger.log("🔗 Obteniendo casos del bug: " + bugId);

        // Primero obtener el bug para ver qué casos tiene
        var resultadoBug = obtenerDetalleBug(sheetUrl, bugId);

        if (!resultadoBug.success) {
            return resultadoBug;
        }

        var bug = resultadoBug.data;
        var casosRelacionados = bug.CasosRelacionados || "";

        if (casosRelacionados === "") {
            return {
                success: true,
                data: {
                    casos: [],
                    total: 0,
                },
            };
        }

        // Separar IDs de casos
        var casosIds = casosRelacionados.split(",").map(function (id) {
            return id.trim();
        });

        Logger.log(
            "✅ Bug tiene " + casosIds.length + " caso(s) relacionado(s)"
        );

        return {
            success: true,
            data: {
                casos: casosIds,
                total: casosIds.length,
            },
        };
    } catch (error) {
        Logger.log("❌ Error obteniendo casos del bug: " + error.toString());
        return {
            success: false,
            mensaje: "Error: " + error.message,
        };
    }
}

/**
 * Busca un caso en todas las hojas del spreadsheet
 * @param {Spreadsheet} spreadsheet - Spreadsheet
 * @param {string} casoId - ID del caso a buscar
 * @returns {Object|null} Objeto con hoja, fila y headers, o null si no se encuentra
 */
// Fallback local para evitar colisiones globales
function __buscarCasoEnTodasHojasFallback_Bugs(spreadsheet, casoId) {
    try {
        Logger.log("🔍 Buscando caso: " + casoId + " en todas las hojas");

        var todasHojas = spreadsheet.getSheets();
        var hojasExcluidas = ["Config", "Bugs", "Ejecuciones", "Regresiones"];

        for (var i = 0; i < todasHojas.length; i++) {
            var hoja = todasHojas[i];
            var nombreHoja = hoja.getName();

            // Saltar hojas del sistema
            if (hojasExcluidas.indexOf(nombreHoja) > -1) {
                continue;
            }

            var datos = hoja.getDataRange().getValues();

            if (datos.length < 2) {
                continue;
            }

            var headers = datos[0];
            var indexID = headers.indexOf("ID");

            if (indexID === -1) {
                continue;
            }

            // Buscar caso por ID
            for (var j = 1; j < datos.length; j++) {
                if (datos[j][indexID] === casoId) {
                    Logger.log(
                        "✅ Caso encontrado en hoja: " +
                            nombreHoja +
                            ", fila: " +
                            (j + 1)
                    );

                    return {
                        hoja: hoja,
                        fila: j + 1,
                        headers: headers,
                        nombreHoja: nombreHoja,
                    };
                }
            }
        }

        Logger.log("⚠️ Caso no encontrado en ninguna hoja");
        return null;
    } catch (error) {
        Logger.log("❌ Error buscando caso: " + error.toString());
        return null;
    }
}

/**
 * Función de TEST - Ejecutar desde Apps Script
 */
function testBackendBugs() {
    if (typeof __debugGuard === "function" && __debugGuard()) {
        return;
    }
    Logger.log("🧪 Iniciando test de Backend Bugs...");

    // Usar tu URL de prueba
    var testUrl =
        "https://docs.google.com/spreadsheets/d/1Z7Mh34rDsbie99inYk8XpNOyu4NN8Yafil-eFUURAxY/edit?gid=115499707#gid=115499707";

    // Test 1: Generar ID
    Logger.log("\n📝 Test 1: Generar ID");
    var id = generarIdBug(testUrl);
    Logger.log("ID generado: " + id);

    // Test 2: Crear bug
    Logger.log("\n📝 Test 2: Crear bug");
    var resultado = crearBug({
        sheetUrl: testUrl,
        titulo: "Bug de prueba",
        descripcion: "Este es un bug de prueba del sistema",
        severidad: "Alta",
        prioridad: "Media",
        precondiciones: "Usuario logueado",
        datosPrueba: "user@test.com",
        pasosReproducir: "1. Login\n2. Click en botón",
        resultadoEsperado: "Debe funcionar",
        resultadoObtenido: "Error 500",
    });
    Logger.log("Resultado: " + JSON.stringify(resultado));

    // Test 3: Vincular bug con caso (OPCIONAL - comentado por defecto)
    /*
  Logger.log('\n📝 Test 3: Vincular bug con caso');
  var casoTest = 'TC-1'; // Cambia por un ID de caso real que tengas
  var resultadoVincular = vincularBugConCaso(testUrl, 'BUG-1', casoTest);
  Logger.log('Resultado vincular: ' + JSON.stringify(resultadoVincular));

  // Test 4: Obtener bugs del caso
  Logger.log('\n📝 Test 4: Obtener bugs del caso');
  var bugsDelCaso = obtenerBugsPorCaso(testUrl, casoTest);
  Logger.log('Bugs del caso: ' + JSON.stringify(bugsDelCaso));
  */

    Logger.log("\n✅ Tests completados");
}

/**
 * Asegura columnas extra en hoja Bugs y retorna headers actualizados
 */
function __ensureBugsExtraColumns(hojaBugs) {
    var range = hojaBugs.getRange(1, 1, 1, hojaBugs.getLastColumn());
    var headers = range.getValues()[0];
    var extras = [
        "LinkCasoPrueba",
        "EliminadoPorUsuario",
        "FechaEliminacion",
        "EliminadoPor",
    ];
    var changed = false;
    extras.forEach(function (col) {
        if (headers.indexOf(col) === -1) {
            hojaBugs.insertColumnAfter(hojaBugs.getLastColumn());
            hojaBugs.getRange(1, hojaBugs.getLastColumn(), 1, 1).setValue(col);
            headers.push(col);
            changed = true;
        }
    });
    if (changed) {
        // Releer headers por si cambi� el ancho
        headers = hojaBugs
            .getRange(1, 1, 1, hojaBugs.getLastColumn())
            .getValues()[0];
    }
    return headers;
}

/**
 * Genera un link directo a la fila del caso en el Sheet
 */
function generarLinkCasoPrueba(sheetUrl, casoId) {
    try {
        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var finder =
            typeof buscarCasoEnTodasHojas === "function"
                ? buscarCasoEnTodasHojas
                : typeof buscarCasoEnTodasHojasCanon === "function"
                ? buscarCasoEnTodasHojasCanon
                : __buscarCasoEnTodasHojasFallback_Bugs;
        var res = finder(spreadsheet, casoId);
        if (!res) return "";
        var hoja = res.hoja;
        var gid = hoja.getSheetId();
        var fila = res.fila;
        var ssId = spreadsheet.getId();
        return (
            "https://docs.google.com/spreadsheets/d/" +
            ssId +
            "/edit#gid=" +
            gid +
            "&range=A" +
            fila
        );
    } catch (e) {
        Logger.log("Aviso generarLinkCasoPrueba: " + e.toString());
        return "";
    }
}

/**
 * Recalcula LinkCasoPrueba en la fila del bug (uno por l�nea si m�ltiples casos)
 */
function actualizarLinkCasoPruebaParaBug(sheetUrl, bugId) {
    var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
    var hojaBugs = spreadsheet.getSheetByName("Bugs");
    if (!hojaBugs) return;
    var headers = __ensureBugsExtraColumns(hojaBugs);
    var datos = hojaBugs.getDataRange().getValues();
    for (var i = 1; i < datos.length; i++) {
        if (datos[i][0] === bugId) {
            var idxCasos = headers.indexOf("CasosRelacionados");
            var idxLink = headers.indexOf("LinkCasoPrueba");
            var relacionados = idxCasos > -1 ? datos[i][idxCasos] || "" : "";
            if (relacionados === "") {
                hojaBugs.getRange(i + 1, idxLink + 1).setValue("");
                return;
            }
            var casos = relacionados
                .split(",")
                .map(function (s) {
                    return s.trim();
                })
                .filter(function (s) {
                    return s !== "";
                });
            var links = [];
            casos.forEach(function (id) {
                var link = generarLinkCasoPrueba(sheetUrl, id);
                if (link) links.push(link);
            });
            hojaBugs.getRange(i + 1, idxLink + 1).setValue(links.join("\n"));
            return;
        }
    }
}

/**
 * Elimina (soft delete) un bug y ajusta casos vinculados
 */
function eliminarBug(sheetUrl, bugId) {
    try {
        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var hojaBugs = spreadsheet.getSheetByName("Bugs");
        if (!hojaBugs)
            return { success: false, mensaje: "Hoja Bugs no encontrada" };
        var headers = __ensureBugsExtraColumns(hojaBugs);
        var datos = hojaBugs.getDataRange().getValues();
        var filaBug = -1;
        for (var i = 1; i < datos.length; i++) {
            if (datos[i][0] === bugId) {
                filaBug = i + 1;
                break;
            }
        }
        if (filaBug === -1)
            return { success: false, mensaje: "Bug no encontrado" };

        // Marcar eliminaci�n
        var idxEliminado = headers.indexOf("EliminadoPorUsuario") + 1;
        var idxFecha = headers.indexOf("FechaEliminacion") + 1;
        var idxPor = headers.indexOf("EliminadoPor") + 1;
        var email = (function () {
            try {
                return Session.getActiveUser().getEmail();
            } catch (e) {
                return "";
            }
        })();
        if (idxEliminado > 0)
            hojaBugs.getRange(filaBug, idxEliminado).setValue("Si");
        if (idxFecha > 0)
            hojaBugs.getRange(filaBug, idxFecha).setValue(new Date());
        if (idxPor > 0) hojaBugs.getRange(filaBug, idxPor).setValue(email);

        // Obtener casos vinculados
        var idxCasos = headers.indexOf("CasosRelacionados");
        var relacionados =
            idxCasos > -1
                ? hojaBugs.getRange(filaBug, idxCasos + 1).getValue() || ""
                : "";
        var casos = relacionados
            ? relacionados
                  .split(",")
                  .map(function (s) {
                      return s.trim();
                  })
                  .filter(function (s) {
                      return s !== "";
                  })
            : [];

        // Para cada caso: si no quedan bugs abiertos (y no eliminados), pasar a "Sin ejecutar"
        casos.forEach(function (casoId) {
            var resBugs = obtenerBugsPorCaso(sheetUrl, casoId);
            if (resBugs && resBugs.success) {
                var abiertos = (resBugs.data.bugs || []).filter(function (b) {
                    return (
                        b.ID !== bugId &&
                        b.Estado === "Abierto" &&
                        b.EliminadoPorUsuario !== "Si"
                    );
                });
                if (abiertos.length === 0) {
                    try {
                        actualizarEstadoEjecucion(sheetUrl, casoId, {
                            estadoEjecucion: "Sin ejecutar",
                            comentarios:
                                "Bug " +
                                bugId +
                                " eliminado por " +
                                (email || "usuario") +
                                " - se reinicia ejecuci�n",
                            evidencias: [],
                        });
                    } catch (e) {
                        Logger.log(
                            "Aviso actualizando caso tras eliminar bug: " + e
                        );
                    }
                }
            }
        });

        return {
            success: true,
            mensaje: "Bug eliminado (soft delete) y casos recalculados",
            data: { bugId: bugId, casosAfectados: casos },
        };
    } catch (e) {
        return {
            success: false,
            mensaje: "Error eliminando bug: " + e.message,
        };
    }
}

/**
 * Reintenta sincronizar un bug con Trello
 * Útil cuando falló la sincronización inicial
 * Rama: feature/bugs-trello
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} bugId - ID del bug
 * @returns {Object} Resultado de la operación
 */
function reintentarSincronizacionTrello(sheetUrl, bugId) {
    try {
        Logger.log("🔄 Reintentando sincronización con Trello para: " + bugId);

        // Obtener el bug
        var detalleBug = obtenerDetalleBug(sheetUrl, bugId);

        if (!detalleBug.success) {
            return {
                success: false,
                mensaje: "Bug no encontrado: " + bugId,
            };
        }

        var bug = detalleBug.data;

        // Verificar que no tenga ya una tarjeta de Trello
        if (bug.TrelloCardURL && bug.TrelloCardURL !== "") {
            return {
                success: false,
                mensaje: "El bug ya tiene una tarjeta de Trello asociada",
            };
        }

        // Obtener configuración de Trello
        var configTrello = obtenerConfigTrello(sheetUrl);

        if (!configTrello.configurado) {
            return {
                success: false,
                mensaje: "Trello no está configurado",
            };
        }

        // Preparar datos del bug para Trello
        var bugCompleto = {
            id: bug.ID,
            titulo: bug.Titulo,
            descripcion: bug.Descripcion,
            severidad: bug.Severidad,
            prioridad: bug.Prioridad,
            estado: bug.Estado,
            casoRelacionado: bug.CasosRelacionados || "-",
            precondiciones: bug.Precondiciones || "-",
            datosPrueba: bug.DatosPrueba || "-",
            pasosReproducir: bug.PasosReproducir,
            resultadoEsperado: bug.ResultadoEsperado,
            resultadoObtenido: bug.ResultadoObtenido,
            navegador: bug.Navegador || "-",
            ambiente: bug.Ambiente || "-",
            evidencias: bug.EvidenciasURL ? bug.EvidenciasURL.split("\n") : [],
            fechaCreacion: bug.FechaDeteccion,
            reportadoPor: bug.DetectadoPor,
        };

        // Intentar crear tarjeta
        var resultadoTrello = crearTarjetaTrello(bugCompleto, configTrello);

        if (resultadoTrello.exito) {
            // Actualizar bug con URL de Trello
            actualizarBug(sheetUrl, bugId, {
                TrelloCardURL: resultadoTrello.cardUrl,
                TrelloCardID: resultadoTrello.cardId,
                Estado: "Abierto",
                Notas: "Sincronizado con Trello",
            });

            Logger.log("✅ Bug sincronizado con Trello");

            return {
                success: true,
                mensaje: "Bug sincronizado exitosamente con Trello",
                data: {
                    bugId: bugId,
                    trelloUrl: resultadoTrello.cardUrl,
                },
            };
        } else {
            Logger.log("❌ Error al sincronizar: " + resultadoTrello.error);

            return {
                success: false,
                mensaje: "Error al sincronizar: " + resultadoTrello.error,
            };
        }
    } catch (error) {
        Logger.log(
            "❌ Error en reintento de sincronización: " + error.toString()
        );
        return {
            success: false,
            mensaje: "Error al reintentar sincronización: " + error.message,
        };
    }
}

/**
 * Obtiene o crea la carpeta de evidencias en Drive
 * MEJORA 4: Gestión de evidencias
 * @param {Spreadsheet} spreadsheet - Spreadsheet activo
 * @returns {Folder} Carpeta de evidencias
 */
function obtenerOCrearCarpetaEvidencias(spreadsheet) {
    try {
        // Obtener ID de carpeta desde Config
        var config = obtenerConfiguracion();
        var carpetaId = config["drive_folder_id"];

        if (carpetaId && carpetaId !== "") {
            try {
                return DriveApp.getFolderById(carpetaId);
            } catch (e) {
                Logger.log(
                    "⚠️ Carpeta configurada no existe, creando nueva..."
                );
            }
        }

        /**
         * Limpia un nombre para usarlo como nombre de carpeta/archivo
         * Remueve caracteres especiales y limita longitud
         * @param {string} texto - Texto a limpiar
         * @returns {string} Texto limpio
         */
        function limpiarNombreArchivo(texto) {
            if (!texto) return "sin_nombre";

            return texto
                .substring(0, 50) // Máximo 50 caracteres
                .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_]/g, "") // Solo alfanuméricos y espacios
                .replace(/\s+/g, "_") // Espacios a guiones bajos
                .trim();
        }

        // Crear carpeta junto al Sheet
        var archivoSheet = DriveApp.getFileById(spreadsheet.getId());
        var carpetasPadre = archivoSheet.getParents();

        var carpetaPadre = carpetasPadre.hasNext()
            ? carpetasPadre.next()
            : DriveApp.getRootFolder();

        var nombreCarpeta = spreadsheet.getName() + " - Evidencias QA";
        var carpetaEvidencias = carpetaPadre.createFolder(nombreCarpeta);

        // Guardar ID en Config para próximas veces
        guardarValorConfig("drive_folder_id", carpetaEvidencias.getId());

        Logger.log(
            "✅ Carpeta de evidencias creada: " + carpetaEvidencias.getName()
        );

        return carpetaEvidencias;
    } catch (error) {
        Logger.log(
            "❌ Error creando carpeta de evidencias: " + error.toString()
        );
        throw error;
    }
}
