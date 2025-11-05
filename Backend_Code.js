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
        return {
            email: Session.getActiveUser().getEmail() || "usuario@qa.com",
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

        // Llamar a la función de actualización de estado
        var resultado = actualizarEstadoEjecucion(
            datosEjecucion.sheetUrl,
            datosEjecucion.casoId,
            {
                estadoEjecucion: datosEjecucion.resultado,
                comentarios: datosEjecucion.observaciones || "",
                evidencias: datosEjecucion.evidencias || [],
            }
        );

        if (resultado.success) {
            Logger.log("✅ Ejecución guardada exitosamente");

            // TODO: Si hay evidencias, subirlas a Drive
            // (esto lo implementaremos después)

            return {
                success: true,
                mensaje: "Ejecución guardada exitosamente",
                data: {
                    casoId: datosEjecucion.casoId,
                    resultado: datosEjecucion.resultado,
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
