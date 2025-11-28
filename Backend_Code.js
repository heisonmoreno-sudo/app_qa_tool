/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BACKEND_CODE.GS
 * Punto de entrada principal del sistema
 * ═══════════════════════════════════════════════════════════════════════════
 */

function doGet(e) {
    try {
        var userEmail = Session.getActiveUser().getEmail();

        if (!userEmail || userEmail === "") {
            userEmail = "usuario@qa.com";
        }

        var template = HtmlService.createTemplateFromFile("Frontend_Index");
        template.userEmail = userEmail;

        return template
            .evaluate()
            .setTitle("QA Management System")
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
            .addMetaTag("viewport", "width=device-width, initial-scale=1");
    } catch (error) {
        Logger.log("❌ Error en doGet: " + error.toString());
        return mostrarError("Error al cargar la aplicación: " + error.message);
    }
}

function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function mostrarError(mensaje) {
    var html =
        '<html><body style="font-family: Arial; padding: 40px; text-align: center;">';
    html += '<h1 style="color: #DC2626;">Error</h1>';
    html += "<p>" + mensaje + "</p>";
    html += '<p><a href="javascript:location.reload()">Recargar página</a></p>';
    html += "</body></html>";

    return HtmlService.createHtmlOutput(html);
}

function obtenerUsuario() {
    try {
        var email = Session.getActiveUser().getEmail() || "usuario@qa.com";
        var photoUrl = null;

        // Intentar obtener la foto de perfil
        try {
            var person = People.People.get("people/me", {
                personFields: "photos",
            });
            if (person && person.photos && person.photos.length > 0) {
                photoUrl = person.photos[0].url;
            }
        } catch (photoError) {
            Logger.log(
                "⚠️ No se pudo obtener foto de perfil: " + photoError.toString()
            );
        }

        return {
            email: email,
            photoUrl: photoUrl,
            success: true,
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
        };
    }
}

function testBackend() {
    try {
        Logger.log("🧪 Test Backend ejecutado");
        var email = Session.getActiveUser().getEmail() || "usuario@qa.com";

        return {
            success: true,
            mensaje: "Backend funcionando correctamente!",
            timestamp: new Date().toISOString(),
            user: email,
        };
    } catch (error) {
        Logger.log("❌ Error en testBackend: " + error.toString());
        return {
            success: false,
            mensaje: "Error en el backend: " + error.message,
        };
    }
}

function registrarError(funcion, error, datos) {
    try {
        var mensaje = "ERROR en " + funcion + ": " + error.toString();
        if (datos) {
            mensaje += " | Datos: " + JSON.stringify(datos);
        }
        Logger.log(mensaje);
    } catch (e) {
        Logger.log("Error al registrar error: " + e.toString());
    }
}

function registrarAccion(funcion, accion, datos) {
    try {
        var mensaje = funcion + " - " + accion;
        if (datos) {
            mensaje += " | " + JSON.stringify(datos);
        }
        Logger.log(mensaje);
    } catch (e) {
        // Silencioso si falla
    }
}

/**
 * Prepara el sheetUrl para que esté disponible en otras funciones
 */
function prepararSheetUrl(sheetUrl) {
    try {
        PropertiesService.getScriptProperties().setProperty(
            "currentSheetUrl",
            sheetUrl
        );
        return { success: true };
    } catch (error) {
        Logger.log("Error preparando sheetUrl: " + error.toString());
        return { success: false };
    }
}

/**
 * API wrapper: api_obtenerDetalleBug
 * Expone la funcionalidad de obtenerDetalleBug para google.script.run sin
 * colisionar con la implementación en Backend_Services_Bugs.js.
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} bugId - ID del bug a obtener
 * @returns {Object} Resultado con datos del bug o error
 */
function api_obtenerDetalleBug(sheetUrl, bugId) {
    try {
        Logger.log("[API] api_obtenerDetalleBug iniciado");
        Logger.log("  - sheetUrl: " + sheetUrl);
        Logger.log("  - bugId: " + bugId);

        // Validar parámetros
        if (!sheetUrl || !bugId) {
            var msg =
                "Parámetros incompletos: sheetUrl=" +
                !!sheetUrl +
                ", bugId=" +
                !!bugId;
            Logger.log("[API] ERROR: " + msg);
            return {
                success: false,
                mensaje: msg,
            };
        }

        // Verificar que la implementación real exista
        if (typeof obtenerDetalleBug !== "function") {
            Logger.log("[API] ERROR: obtenerDetalleBug no está definida");
            return {
                success: false,
                mensaje: "Función no disponible en backend",
            };
        }

        Logger.log("[API] Llamando a obtenerDetalleBug...");
        var resultado = obtenerDetalleBug(sheetUrl, bugId);
        Logger.log("[API] Resultado: " + JSON.stringify(resultado));

        // Retornar resultado (debe tener success:true si fue exitoso)
        return (
            resultado || {
                success: false,
                mensaje: "Función retornó null/undefined",
            }
        );
    } catch (e) {
        var errorMsg =
            "[API] Excepción en api_obtenerDetalleBug: " + e.toString();
        Logger.log(errorMsg);
        if (e.stack) Logger.log("Stack: " + e.stack);
        return {
            success: false,
            mensaje: "Error: " + e.message,
        };
    }
}

/**
 * API wrapper: listarBugs
 * Evita colisiones de nombres y garantiza retorno no nulo
 */
function api_listarBugs(sheetUrl, filtros) {
    try {
        Logger.log(
            "[API] listarBugs called. url=" +
                sheetUrl +
                " filtros=" +
                JSON.stringify(filtros || {})
        );

        // Verificar que la función listarBugs esté disponible
        if (
            typeof this.listarBugs !== "function" &&
            typeof listarBugs !== "function"
        ) {
            Logger.log("[API] ERROR: listarBugs no está definida");
            return {
                success: false,
                mensaje:
                    "Función listarBugs no disponible. Verifica el deployment.",
            };
        }

        // Llamar a listarBugs con try-catch específico
        var res;
        try {
            res = listarBugs(sheetUrl, filtros || {});
        } catch (callError) {
            Logger.log(
                "[API] Error al llamar listarBugs: " + callError.toString()
            );
            return {
                success: false,
                mensaje: "Error llamando a listarBugs: " + callError.message,
            };
        }

        if (res === null || res === undefined) {
            Logger.log("[API] listarBugs returned null/undefined");
            return {
                success: false,
                mensaje: "listarBugs devolvió null/undefined",
            };
        }

        Logger.log(
            "[API] listarBugs success. Total bugs: " +
                (res.data ? res.data.total : 0)
        );
        return res;
    } catch (e) {
        Logger.log("[API] Error general en api_listarBugs: " + e.toString());
        Logger.log("[API] Stack: " + e.stack);
        return { success: false, mensaje: "Error listar bugs: " + e.message };
    }
}

/**
 * Función de TEST para verificar si listarBugs funciona
 */
function testListarBugs(sheetUrl) {
    Logger.log("=== TEST listarBugs ===");
    Logger.log("URL recibida: " + sheetUrl);
    Logger.log("Tipo de listarBugs: " + typeof listarBugs);

    try {
        var resultado = listarBugs(sheetUrl, {});
        Logger.log("Resultado tipo: " + typeof resultado);
        Logger.log("Resultado: " + JSON.stringify(resultado));
        return resultado;
    } catch (e) {
        Logger.log("ERROR en test: " + e.toString());
        Logger.log("Stack: " + e.stack);
        return { success: false, error: e.message, stack: e.stack };
    }
}

/**
 * Guarda una ejecución de caso
 * @param {Object} datosEjecucion - Datos de la ejecución
 * @returns {Object} Resultado
 */
function guardarEjecucion(datosEjecucion) {
    try {
        Logger.log("💾 Guardando ejecución de caso: " + datosEjecucion.casoId);

        // Validar que vengan los datos necesarios
        if (!datosEjecucion.sheetUrl) {
            return {
                success: false,
                mensaje: "No se proporcionó URL del Sheet",
            };
        }

        if (!datosEjecucion.casoId) {
            return {
                success: false,
                mensaje: "No se proporcionó ID del caso",
            };
        }

        if (!datosEjecucion.resultado) {
            return {
                success: false,
                mensaje: "No se proporcionó resultado de la ejecución",
            };
        }

        // Si hay evidencias, subirlas primero a Drive
        var urlsEvidencias = [];
        if (datosEjecucion.evidencias && datosEjecucion.evidencias.length > 0) {
            Logger.log(
                "📤 Subiendo " +
                    datosEjecucion.evidencias.length +
                    " evidencia(s) a Drive..."
            );

            // Preparar archivos para subida batch
            var archivosParaSubir = datosEjecucion.evidencias.map(function (
                evidencia
            ) {
                return {
                    nombre: evidencia.nombre || evidencia,
                    contenidoBase64: evidencia.contenidoBase64 || "",
                    mimeType: evidencia.mimeType || "application/octet-stream",
                };
            });

            // Subir evidencias usando la función batch
            var resultadoSubida = subirEvidenciasBatch(
                archivosParaSubir,
                datosEjecucion.sheetUrl,
                "ejecucion",
                datosEjecucion.casoId,
                datosEjecucion.casoTitulo || datosEjecucion.casoId,
                ""
            );

            if (
                resultadoSubida &&
                resultadoSubida.success &&
                resultadoSubida.results
            ) {
                // Recopilar URLs exitosas
                resultadoSubida.results.forEach(function (res) {
                    if (res.success && res.url) {
                        urlsEvidencias.push(res.url);
                        Logger.log("  ✓ Evidencia subida: " + res.nombre);
                    } else {
                        Logger.log(
                            "  ✗ Error subiendo: " +
                                (res.nombre || "archivo") +
                                " - " +
                                (res.mensaje || "desconocido")
                        );
                    }
                });

                Logger.log(
                    "✅ Total evidencias subidas exitosamente: " +
                        urlsEvidencias.length +
                        "/" +
                        archivosParaSubir.length
                );
            } else {
                Logger.log("⚠️ Error en subida batch de evidencias");
            }
        }

        // Llamar a la función de actualización de estado con las URLs
        var resultado = actualizarEstadoEjecucion(
            datosEjecucion.sheetUrl,
            datosEjecucion.casoId,
            {
                estadoEjecucion: datosEjecucion.resultado,
                comentarios: datosEjecucion.observaciones || "",
                evidencias: urlsEvidencias, // Ahora son URLs, no nombres
                ambiente: datosEjecucion.ambiente || "",
                navegador: datosEjecucion.navegador || "",
                bugsVinculados: datosEjecucion.bugsVinculados || [],
            }
        );

        if (resultado.success) {
            Logger.log("✅ Ejecución guardada exitosamente");

            return {
                success: true,
                mensaje: "Ejecución guardada exitosamente",
                data: {
                    casoId: datosEjecucion.casoId,
                    resultado: datosEjecucion.resultado,
                    evidenciasSubidas: urlsEvidencias.length,
                },
            };
        } else {
            return resultado;
        }
    } catch (error) {
        Logger.log("❌ Error guardando ejecución: " + error.toString());
        return {
            success: false,
            mensaje: "Error al guardar ejecución: " + error.message,
        };
    }
}

/**
 * Función diagnóstica para troubleshooting de edición de bugs
 * Retorna información sobre el estado actual del sistema
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} bugId - ID del bug a verificar (opcional)
 * @returns {Object} Información diagnóstica
 */
function diagnosticarEditarBug(sheetUrl, bugId) {
    try {
        Logger.log("🔍 Iniciando diagnóstico de edición de bugs");

        var diagnostico = {
            timestamp: new Date().toISOString(),
            sheetUrl: sheetUrl,
            bugId: bugId,
            checks: {},
        };

        // 1. Verificar acceso al Sheet
        try {
            var ss = SpreadsheetApp.openByUrl(sheetUrl);
            diagnostico.checks.sheetAccess = {
                success: true,
                sheetName: ss.getName(),
            };
        } catch (e) {
            diagnostico.checks.sheetAccess = {
                success: false,
                error: e.toString(),
            };
        }

        // 2. Verificar hoja Bugs
        try {
            var ss = SpreadsheetApp.openByUrl(sheetUrl);
            var hojasBugs = ss.getSheetByName("Bugs");
            if (hojasBugs) {
                diagnostico.checks.bugsSheet = {
                    success: true,
                    lastRow: hojasBugs.getLastRow(),
                    lastColumn: hojasBugs.getLastColumn(),
                };
            } else {
                diagnostico.checks.bugsSheet = {
                    success: false,
                    error: "Hoja Bugs no encontrada",
                };
            }
        } catch (e) {
            diagnostico.checks.bugsSheet = {
                success: false,
                error: e.toString(),
            };
        }

        // 3. Si se proporciona bugId, verificar si existe
        if (bugId) {
            try {
                var resultado = obtenerDetalleBug(sheetUrl, bugId);
                diagnostico.checks.bugExists = {
                    success: resultado.success,
                    mensaje: resultado.mensaje,
                    foundBug: resultado.success ? resultado.data : null,
                };
            } catch (e) {
                diagnostico.checks.bugExists = {
                    success: false,
                    error: e.toString(),
                };
            }
        }

        // 4. Verificar que obtenerDetalleBug esté disponible
        diagnostico.checks.functionAvailable = {
            obtenerDetalleBug: typeof obtenerDetalleBug === "function",
            api_obtenerDetalleBug: typeof api_obtenerDetalleBug === "function",
        };

        Logger.log("✅ Diagnóstico completado: " + JSON.stringify(diagnostico));

        return {
            success: true,
            diagnostico: diagnostico,
        };
    } catch (error) {
        Logger.log("❌ Error en diagnóstico: " + error.toString());
        return {
            success: false,
            error: error.message,
        };
    }
}
