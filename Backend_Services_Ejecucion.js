/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BACKEND_SERVICES_EJECUCION.GS
 * Servicio para gestión de ejecución de casos
 * VERSIÓN 2.0: Usa ResultadoUltimaEjecucion en lugar de EstadoEjecucion
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ✅ CONFIGURACIÓN: URL del Sheet para tests
var TEST_SHEET_URL =
    "https://docs.google.com/spreadsheets/d/1CoF0jVZhEAHaQ8hAU5NWayLYBU2knIhwuGf9tE007JY/edit?gid=1971123513#gid=1971123513";

/**
 * Actualiza el estado de ejecución de un caso
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} casoId - ID del caso
 * @param {Object} datosEjecucion - Datos de la ejecución
 *   - estadoEjecucion: string (Sin ejecutar, Ejecutando, OK, No_OK, Bloqueado, Descartado)
 *   - comentarios: string
 *   - evidencias: array de URLs
 * @returns {Object} Resultado
 */
// Renombrado para evitar colisión: versión canónica en Backend_Services_Casos.js
function actualizarEstadoEjecucion_Ejecuciones_INTERNAL(
    sheetUrl,
    casoId,
    datosEjecucion
) {
    try {
        Logger.log("🔄 Actualizando estado de ejecución para caso: " + casoId);
        Logger.log("📦 Datos: " + JSON.stringify(datosEjecucion));

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);

        // Buscar el caso en todas las hojas
        var finder =
            typeof buscarCasoEnTodasHojas === "function"
                ? buscarCasoEnTodasHojas
                : typeof buscarCasoEnTodasHojasCanon === "function"
                ? buscarCasoEnTodasHojasCanon
                : __buscarCasoEnTodasHojasFallback;
        var resultado = finder(spreadsheet, casoId);

        if (!resultado) {
            Logger.log("❌ Caso no encontrado: " + casoId);
            return {
                success: false,
                mensaje: "Caso no encontrado: " + casoId,
            };
        }

        var hoja = resultado.hoja;
        var fila = resultado.fila;
        var headers = resultado.headers;

        Logger.log(
            "✅ Caso encontrado en hoja: " + hoja.getName() + ", fila: " + fila
        );

        // ✅ CAMBIO: Usar ResultadoUltimaEjecucion
        var colEstadoEjecucion =
            headers.indexOf("ResultadoUltimaEjecucion") + 1;
        var colFechaUltimaEjecucion =
            headers.indexOf("FechaUltimaEjecucion") + 1;
        var colComentariosEjecucion =
            headers.indexOf("ComentariosEjecucion") + 1;
        var colEvidenciasURL = headers.indexOf("EvidenciasURL") + 1;
        var colNotas = headers.indexOf("Notas") + 1;

        // Actualizar resultado de ejecución
        if (colEstadoEjecucion > 0) {
            hoja.getRange(fila, colEstadoEjecucion).setValue(
                datosEjecucion.estadoEjecucion
            );
            Logger.log(
                "  ✓ ResultadoUltimaEjecucion actualizado: " +
                    datosEjecucion.estadoEjecucion
            );
        }

        // Actualizar fecha de última ejecución
        if (colFechaUltimaEjecucion > 0) {
            hoja.getRange(fila, colFechaUltimaEjecucion).setValue(new Date());
            Logger.log("  ✓ Fecha de ejecución actualizada");
        }

        // Actualizar comentarios (usar Notas si no existe ComentariosEjecucion)
        if (datosEjecucion.comentarios) {
            if (colComentariosEjecucion > 0) {
                hoja.getRange(fila, colComentariosEjecucion).setValue(
                    datosEjecucion.comentarios
                );
                Logger.log(
                    "  ✓ Comentarios actualizados en ComentariosEjecucion"
                );
            } else if (colNotas > 0) {
                // Fallback: usar columna Notas
                var notasActuales =
                    hoja.getRange(fila, colNotas).getValue() || "";
                var nuevasNotas = notasActuales
                    ? notasActuales +
                      "\n\n[Ejecución " +
                      new Date().toLocaleString() +
                      "]\n" +
                      datosEjecucion.comentarios
                    : datosEjecucion.comentarios;
                hoja.getRange(fila, colNotas).setValue(nuevasNotas);
                Logger.log("  ✓ Comentarios agregados a Notas");
            }
        }

        // Actualizar evidencias (separadas por salto de línea)
        if (
            colEvidenciasURL > 0 &&
            datosEjecucion.evidencias &&
            datosEjecucion.evidencias.length > 0
        ) {
            var evidenciasTexto = datosEjecucion.evidencias.join("\n");
            hoja.getRange(fila, colEvidenciasURL).setValue(evidenciasTexto);
            Logger.log(
                "  ✓ Evidencias actualizadas: " +
                    datosEjecucion.evidencias.length +
                    " archivo(s)"
            );
        }

        Logger.log("✅ Estado de ejecución actualizado exitosamente");

        return {
            success: true,
            mensaje: "Estado actualizado correctamente",
            data: {
                casoId: casoId,
                estadoEjecucion: datosEjecucion.estadoEjecucion,
                hoja: hoja.getName(),
            },
        };
    } catch (error) {
        Logger.log(
            "❌ Error actualizando estado de ejecución: " + error.toString()
        );
        return {
            success: false,
            mensaje: "Error al actualizar estado: " + error.message,
        };
    }
}

/**
 * Busca un caso por ID en todas las hojas del spreadsheet
 * @param {Spreadsheet} spreadsheet
 * @param {string} casoId
 * @returns {Object|null} {hoja, fila, headers}
 */
// Fallback local no exportado para no colisionar en el ámbito global
function __buscarCasoEnTodasHojasFallback(spreadsheet, casoId) {
    var hojas = spreadsheet.getSheets();
    var hojasExcluidas = ["Config", "Bugs", "Ejecuciones", "Regresiones"];

    Logger.log("🔍 Buscando caso " + casoId + " en todas las hojas...");

    for (var i = 0; i < hojas.length; i++) {
        var hoja = hojas[i];
        var nombreHoja = hoja.getName();

        // Skip hojas del sistema
        if (hojasExcluidas.indexOf(nombreHoja) > -1) {
            continue;
        }

        var datos = hoja.getDataRange().getValues();

        if (datos.length < 2) continue; // Sin datos

        var headers = datos[0];
        var colID = headers.indexOf("ID");

        if (colID === -1) continue; // No tiene columna ID

        // Buscar el caso
        for (var j = 1; j < datos.length; j++) {
            if (datos[j][colID] === casoId) {
                Logger.log("✅ Caso encontrado en hoja: " + nombreHoja);
                return {
                    hoja: hoja,
                    fila: j + 1,
                    headers: headers,
                };
            }
        }
    }

    Logger.log("❌ Caso no encontrado en ninguna hoja");
    return null;
}

/**
 * Sube una evidencia a Google Drive
 * @param {Object} archivoData - {nombre, contenidoBase64, mimeType}
 * @returns {Object} {success, url}
 */
// Renombrado para evitar colisión: versión canónica en Backend_services_drive.js
function subirEvidenciaADrive_Ejecucion_INTERNAL(archivoData) {
    try {
        Logger.log("📤 Subiendo evidencia a Drive: " + archivoData.nombre);

        // Obtener carpeta de evidencias desde Config
        var config = obtenerConfiguracion();
        var carpetaId = config["carpeta_evidencias_id"];

        if (!carpetaId || carpetaId === "") {
            Logger.log("⚠️ No hay carpeta de evidencias configurada");
            return {
                success: false,
                mensaje:
                    "No se ha configurado la carpeta de evidencias en Config",
            };
        }

        // Obtener carpeta
        var carpeta = DriveApp.getFolderById(carpetaId);

        // Decodificar base64 y crear archivo
        var contenidoDecodificado = Utilities.base64Decode(
            archivoData.contenidoBase64
        );
        var blob = Utilities.newBlob(
            contenidoDecodificado,
            archivoData.mimeType,
            archivoData.nombre
        );

        // Crear archivo en Drive
        var archivo = carpeta.createFile(blob);

        // Hacer público (opcional, según necesidad)
        // archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        var url = archivo.getUrl();

        Logger.log("✅ Evidencia subida exitosamente: " + url);

        return {
            success: true,
            url: url,
            nombre: archivoData.nombre,
        };
    } catch (error) {
        Logger.log("❌ Error subiendo evidencia: " + error.toString());
        return {
            success: false,
            mensaje: "Error al subir archivo: " + error.message,
        };
    }
}

/**
 * Obtiene resumen de ejecución de todos los casos
 * ✅ CAMBIO: Usa ResultadoUltimaEjecucion en lugar de EstadoEjecucion
 * @param {string} sheetUrl - URL del Sheet
 * @returns {Object} Estadísticas de ejecución
 */
function obtenerResumenEjecucion(sheetUrl) {
    try {
        Logger.log("📊 Obteniendo resumen de ejecución...");

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var hojas = spreadsheet.getSheets();
        var hojasExcluidas = ["Config", "Bugs", "Ejecuciones", "Regresiones"];

        var resumen = {
            total: 0,
            sinEjecutar: 0,
            ejecutando: 0,
            bloqueados: 0,
            ok: 0,
            noOk: 0,
            descartados: 0,
        };

        for (var i = 0; i < hojas.length; i++) {
            var hoja = hojas[i];
            var nombreHoja = hoja.getName();

            if (hojasExcluidas.indexOf(nombreHoja) > -1) continue;

            var datos = hoja.getDataRange().getValues();

            if (datos.length < 2) continue;

            var headers = datos[0];

            // ✅ CAMBIO: Buscar ResultadoUltimaEjecucion
            var colResultado = headers.indexOf("ResultadoUltimaEjecucion");

            if (colResultado === -1) continue;

            // Contar por estado
            for (var j = 1; j < datos.length; j++) {
                var estado = datos[j][colResultado];

                // Si está vacío, considerarlo "Sin ejecutar"
                if (!estado || estado === "" || estado === "Sin ejecutar") {
                    estado = "Sin ejecutar";
                }

                resumen.total++;

                switch (estado) {
                    case "Sin ejecutar":
                        resumen.sinEjecutar++;
                        break;
                    case "Ejecutando":
                        resumen.ejecutando++;
                        break;
                    case "Bloqueado":
                        resumen.bloqueados++;
                        break;
                    case "OK":
                        resumen.ok++;
                        break;
                    case "No_OK":
                        resumen.noOk++;
                        break;
                    case "Descartado":
                        resumen.descartados++;
                        break;
                    default:
                        resumen.sinEjecutar++;
                }
            }
        }

        // Calcular porcentaje de éxito
        resumen.porcentaje =
            resumen.total > 0
                ? Math.round((resumen.ok / resumen.total) * 100)
                : 0;

        Logger.log("✅ Resumen obtenido: " + resumen.total + " casos totales");
        Logger.log("  - Sin ejecutar: " + resumen.sinEjecutar);
        Logger.log("  - Ejecutando: " + resumen.ejecutando);
        Logger.log("  - Bloqueados: " + resumen.bloqueados);
        Logger.log("  - OK: " + resumen.ok);
        Logger.log("  - No_OK: " + resumen.noOk);
        Logger.log("  - Descartados: " + resumen.descartados);
        Logger.log("  - % Éxito: " + resumen.porcentaje + "%");

        return {
            success: true,
            data: resumen,
        };
    } catch (error) {
        Logger.log("❌ Error obteniendo resumen: " + error.toString());
        return {
            success: false,
            mensaje: "Error al obtener resumen: " + error.message,
        };
    }
}

/**
 * Función de DEBUG - Lista TODOS los casos que encuentra
 */
function debugListarCasos() {
    if (typeof __debugGuard === "function" && __debugGuard()) {
        return;
    }
    // ✅ TU URL REAL
    var sheetUrl =
        "https://docs.google.com/spreadsheets/d/1CoF0jVZhEAHaQ8hAU5NWayLYBU2knIhwuGf9tE007JY/edit?gid=1971123513#gid=1971123513";

    try {
        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var hojas = spreadsheet.getSheets();
        var hojasExcluidas = ["Config", "Bugs", "Ejecuciones", "Regresiones"];

        Logger.log("═══════════════════════════════════════════════");
        Logger.log("🔍 DEBUG: LISTANDO TODOS LOS CASOS");
        Logger.log("═══════════════════════════════════════════════");
        Logger.log("Total de hojas: " + hojas.length);
        Logger.log("");

        var totalCasos = 0;

        for (var i = 0; i < hojas.length; i++) {
            var hoja = hojas[i];
            var nombreHoja = hoja.getName();

            Logger.log("📄 Hoja: " + nombreHoja);

            // ¿Está excluida?
            if (hojasExcluidas.indexOf(nombreHoja) > -1) {
                Logger.log("   ⏭️  EXCLUIDA (hoja del sistema)");
                Logger.log("");
                continue;
            }

            var datos = hoja.getDataRange().getValues();

            if (datos.length < 2) {
                Logger.log("   ⚠️  SIN DATOS (solo headers o vacía)");
                Logger.log("");
                continue;
            }

            var headers = datos[0];
            var colID = headers.indexOf("ID");
            var colResultadoUltimaEjecucion = headers.indexOf(
                "ResultadoUltimaEjecucion"
            );

            Logger.log("   Headers: " + JSON.stringify(headers));
            Logger.log("   Índice columna ID: " + colID);
            Logger.log(
                "   Índice columna ResultadoUltimaEjecucion: " +
                    colResultadoUltimaEjecucion
            );

            if (colID === -1) {
                Logger.log('   ❌ NO TIENE COLUMNA "ID"');
                Logger.log("");
                continue;
            }

            // Listar casos
            Logger.log("   ✅ Casos encontrados:");
            for (var j = 1; j < datos.length; j++) {
                var casoId = datos[j][colID];
                if (casoId && casoId !== "") {
                    totalCasos++;
                    Logger.log("      • ID: " + casoId);

                    if (colResultadoUltimaEjecucion > -1) {
                        var resultadoEjec =
                            datos[j][colResultadoUltimaEjecucion] ||
                            "Sin ejecutar";
                        Logger.log(
                            "        ResultadoUltimaEjecucion: " + resultadoEjec
                        );
                    } else {
                        Logger.log(
                            "        ⚠️ No tiene columna ResultadoUltimaEjecucion"
                        );
                    }
                }
            }
            Logger.log("");
        }

        Logger.log("═══════════════════════════════════════════════");
        Logger.log("📊 TOTAL DE CASOS ENCONTRADOS: " + totalCasos);
        Logger.log("═══════════════════════════════════════════════");
    } catch (error) {
        Logger.log("💥 ERROR: " + error.toString());
    }
}

function testEjecucion() {
    if (typeof __debugGuard === "function" && __debugGuard()) {
        return;
    }
    Logger.log("═══════════════════════════════════════════════");
    Logger.log("🧪 TEST DE EJECUCIÓN");
    Logger.log("═══════════════════════════════════════════════");

    // ✅ TU URL REAL
    var sheetUrl =
        "https://docs.google.com/spreadsheets/d/1CoF0jVZhEAHaQ8hAU5NWayLYBU2knIhwuGf9tE007JY/edit?gid=1971123513#gid=1971123513";

    // Test 1: Obtener resumen
    Logger.log("\n📊 Test 1: Obtener Resumen de Ejecución");
    Logger.log("───────────────────────────────────────────────");
    var resumen = obtenerResumenEjecucion(sheetUrl);
    Logger.log("Resultado: " + JSON.stringify(resumen, null, 2));

    // Test 2: Actualizar estado de un caso
    Logger.log("\n🔄 Test 2: Actualizar Estado de Ejecución");
    Logger.log("───────────────────────────────────────────────");

    // ✅ CAMBIO: Usar TC-1 que es el que existe
    var resultado = actualizarEstadoEjecucion(sheetUrl, "TC-1", {
        estadoEjecucion: "No_OK", // Cambiar a No_OK para ver si actualiza
        comentarios: "Test ejecutado desde Apps Script - Cambio de estado",
        evidencias: ["https://drive.google.com/file/d/ejemplo123"],
    });
    Logger.log("Resultado: " + JSON.stringify(resultado, null, 2));

    Logger.log("\n═══════════════════════════════════════════════");
    Logger.log("✅ TEST COMPLETADO");
    Logger.log("═══════════════════════════════════════════════");
}

/**
 * Elimina una evidencia específica de un caso
 * NO elimina el archivo de Drive, solo la URL de la Sheet
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} casoId - ID del caso
 * @param {string} urlEvidencia - URL de la evidencia a eliminar
 * @returns {Object} Resultado
 */
function eliminarEvidenciaDeCaso(sheetUrl, casoId, urlEvidencia) {
    try {
        Logger.log("🗑️ Eliminando evidencia del caso: " + casoId);
        Logger.log("   URL a eliminar: " + urlEvidencia);

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);

        // Buscar el caso en todas las hojas
        var resultado = buscarCasoEnTodasHojas(spreadsheet, casoId);

        if (!resultado) {
            Logger.log("❌ Caso no encontrado: " + casoId);
            return {
                success: false,
                mensaje: "Caso no encontrado: " + casoId,
            };
        }

        var hoja = resultado.hoja;
        var fila = resultado.fila;
        var headers = resultado.headers;

        Logger.log(
            "✅ Caso encontrado en hoja: " + hoja.getName() + ", fila: " + fila
        );

        // Obtener columna de evidencias
        var colEvidencias = headers.indexOf("EvidenciasURL") + 1;

        if (colEvidencias === 0) {
            Logger.log("⚠️ No existe columna EvidenciasURL");
            return {
                success: false,
                mensaje: "No existe columna EvidenciasURL",
            };
        }

        // Obtener evidencias actuales
        var evidenciasActuales =
            hoja.getRange(fila, colEvidencias).getValue() || "";

        if (!evidenciasActuales || evidenciasActuales === "") {
            Logger.log("⚠️ El caso no tiene evidencias");
            return {
                success: true,
                mensaje: "El caso no tiene evidencias",
                data: {
                    evidenciasActualizadas: "",
                },
            };
        }

        // Separar evidencias (están separadas por saltos de línea)
        var arrayEvidencias = evidenciasActuales
            .split("\n")
            .map(function (url) {
                return url.trim();
            })
            .filter(function (url) {
                return url !== "";
            });

        Logger.log("   Evidencias antes: " + arrayEvidencias.length);

        // Filtrar la evidencia a eliminar
        var evidenciasNuevas = arrayEvidencias.filter(function (url) {
            return url !== urlEvidencia;
        });

        Logger.log("   Evidencias después: " + evidenciasNuevas.length);

        // Unir nuevamente con saltos de línea
        var nuevoValor = evidenciasNuevas.join("\n");

        // Actualizar en Sheet
        hoja.getRange(fila, colEvidencias).setValue(nuevoValor);

        Logger.log("✅ Evidencia eliminada exitosamente");

        return {
            success: true,
            mensaje: "Evidencia eliminada correctamente",
            data: {
                casoId: casoId,
                evidenciasActualizadas: nuevoValor,
                totalEvidencias: evidenciasNuevas.length,
            },
        };
    } catch (error) {
        Logger.log("❌ Error eliminando evidencia: " + error.toString());
        return {
            success: false,
            mensaje: "Error al eliminar evidencia: " + error.message,
        };
    }
}

// Versión robusta (canónica) de resumen usando utilidades de headers si están disponibles
function obtenerResumenEjecucion(sheetUrl) {
    try {
        Logger.log("Resumen de ejecución (robusto)");

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var hojas = spreadsheet.getSheets();
        var hojasExcluidas = ["Config", "Bugs", "Ejecuciones", "Regresiones"];

        var resumen = {
            total: 0,
            sinEjecutar: 0,
            ejecutando: 0,
            bloqueados: 0,
            ok: 0,
            noOk: 0,
            descartados: 0,
            porcentaje: 0,
        };

        for (var i = 0; i < hojas.length; i++) {
            var hoja = hojas[i];
            var nombreHoja = hoja.getName();
            if (hojasExcluidas.indexOf(nombreHoja) > -1) continue;

            var datos = hoja.getDataRange().getValues();
            if (datos.length < 2) continue;

            var headers = datos[0];
            var colResultado =
                typeof findHeaderIndex === "function"
                    ? findHeaderIndex(headers, "ResultadoUltimaEjecucion")
                    : headers.indexOf("ResultadoUltimaEjecucion");

            // Fallback a legacy
            if (colResultado === -1) {
                colResultado = headers.indexOf("EstadoEjecucion");
                if (colResultado === -1)
                    colResultado = headers.indexOf("EstadoEjecución");
            }

            if (colResultado === -1) continue; // sin columna de resultado

            var colEstadoDiseno = -1;
            if (typeof findHeaderIndex === "function") {
                colEstadoDiseno = findHeaderIndex(headers, "EstadoDiseno");
            }
            if (colEstadoDiseno === -1) {
                colEstadoDiseno = headers.indexOf("EstadoDiseño");
                if (colEstadoDiseno === -1)
                    colEstadoDiseno = headers.indexOf("Estado");
            }

            for (var r = 1; r < datos.length; r++) {
                var estadoDiseno =
                    colEstadoDiseno > -1 ? datos[r][colEstadoDiseno] || "" : "";
                if (estadoDiseno === "Eliminado") continue; // no contar eliminados

                var estado = datos[r][colResultado];
                if (!estado || estado === "") estado = "Sin ejecutar";

                switch (estado) {
                    case "Sin ejecutar":
                        resumen.sinEjecutar++;
                        resumen.total++;
                        break;
                    case "Ejecutando":
                        resumen.ejecutando++;
                        resumen.total++;
                        break;
                    case "Bloqueado":
                        resumen.bloqueados++;
                        resumen.total++;
                        break;
                    case "OK":
                        resumen.ok++;
                        resumen.total++;
                        break;
                    case "No_OK":
                        resumen.noOk++;
                        resumen.total++;
                        break;
                    case "Descartado":
                        resumen.descartados++;
                        break; // no suma total
                    default:
                        resumen.sinEjecutar++;
                        resumen.total++;
                }
            }
        }

        resumen.porcentaje =
            resumen.total > 0
                ? Math.round((resumen.ok / resumen.total) * 100)
                : 0;
        return { success: true, data: resumen };
    } catch (error) {
        Logger.log("Error resumen robusto: " + error.toString());
        return {
            success: false,
            mensaje: "Error al obtener resumen: " + error.message,
        };
    }
}
