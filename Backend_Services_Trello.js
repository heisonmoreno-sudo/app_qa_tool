/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BACKEND_SERVICES_TRELLO.GS
 * Servicio para integración con Trello API
 * Rama: feature/bugs-trello
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES DE TRELLO
// ═══════════════════════════════════════════════════════════════════════════

var TRELLO_API_BASE = "https://api.trello.com/1";

var TRELLO_LABEL_COLORS = {
    Crítica: "red",
    Alta: "orange",
    Media: "yellow",
    Baja: "green",
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES PRINCIPALES - CREAR TARJETA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Crea una tarjeta en Trello desde un bug
 * @param {Object} bug - Objeto con datos del bug
 * @param {Object} configTrello - Configuración de Trello (apiKey, token, listId)
 * @returns {Object} Resultado de la operación
 */
function crearTarjetaTrello(bug, configTrello) {
    try {
        Logger.log("🎫 Creando tarjeta en Trello...");
        Logger.log("   Bug ID: " + bug.id);

        // Validar configuración
        if (!configTrello || !configTrello.apiKey || !configTrello.token) {
            Logger.log("⚠️ Configuración de Trello incompleta");
            return {
                exito: false,
                intentado: true,
                error: "Configuración de Trello incompleta (falta API Key o Token)",
            };
        }

        if (!configTrello.listId) {
            Logger.log("⚠️ No se especificó lista de destino en Trello");
            return {
                exito: false,
                intentado: true,
                error: "No se especificó lista de destino en Trello",
            };
        }

        // Preparar datos de la tarjeta
        var nombre = "[" + bug.id + "] " + truncarTexto(bug.titulo, 200);
        var descripcion = formatearDescripcionTrello(bug);

        // Construir URL de la API
        var url = TRELLO_API_BASE + "/cards";

        var payload = {
            key: configTrello.apiKey,
            token: configTrello.token,
            idList: configTrello.listId,
            name: nombre,
            desc: descripcion,
            pos: "top", // Agregar al inicio de la lista
        };

        var options = {
            method: "post",
            payload: payload,
            muteHttpExceptions: true,
        };

        Logger.log("📤 Enviando request a Trello...");

        var response = UrlFetchApp.fetch(url, options);
        var responseCode = response.getResponseCode();
        var responseText = response.getContentText();

        Logger.log("   Response code: " + responseCode);

        if (responseCode === 200) {
            var cardData = JSON.parse(responseText);
            var cardId = cardData.id;
            var cardUrl = cardData.shortUrl;

            Logger.log("✅ Tarjeta creada: " + cardUrl);

            // Agregar etiqueta de severidad
            try {
                agregarEtiquetaSeveridad(cardId, bug.severidad, configTrello);
            } catch (labelError) {
                Logger.log(
                    "⚠️ No se pudo agregar etiqueta: " + labelError.toString()
                );
            }

            // Agregar comentario con metadatos
            try {
                agregarComentarioMetadatos(cardId, bug, configTrello);
            } catch (commentError) {
                Logger.log(
                    "⚠️ No se pudo agregar comentario: " +
                        commentError.toString()
                );
            }

            return {
                exito: true,
                intentado: true,
                cardId: cardId,
                cardUrl: cardUrl,
                mensaje: "Tarjeta creada exitosamente en Trello",
            };
        } else {
            // Error de API
            Logger.log("❌ Error de Trello API: " + responseCode);
            Logger.log("   Response: " + responseText);

            var errorMsg = "Error de Trello API (" + responseCode + ")";

            try {
                var errorData = JSON.parse(responseText);
                if (errorData.message) {
                    errorMsg = errorData.message;
                }
            } catch (e) {
                errorMsg += ": " + responseText.substring(0, 100);
            }

            return {
                exito: false,
                intentado: true,
                error: errorMsg,
            };
        }
    } catch (error) {
        Logger.log(
            "❌ Excepción creando tarjeta en Trello: " + error.toString()
        );

        var errorMsg = error.message || error.toString();

        // Detectar tipos de error comunes
        if (errorMsg.indexOf("Invalid key") > -1) {
            errorMsg = "API Key de Trello inválida";
        } else if (errorMsg.indexOf("unauthorized") > -1) {
            errorMsg = "Token de Trello inválido o sin permisos";
        } else if (errorMsg.indexOf("timeout") > -1) {
            errorMsg = "Timeout al conectar con Trello";
        }

        return {
            exito: false,
            intentado: true,
            error: errorMsg,
        };
    }
}

/**
 * Formatea la descripción del bug para Trello con formato Markdown
 * @param {Object} bug - Objeto con datos del bug
 * @returns {string} Descripción formateada
 */
function formatearDescripcionTrello(bug) {
    var desc = "";

    // Encabezado
    desc += "🐛 **Bug reportado desde QA Management System**\n\n";
    desc += "---\n\n";

    // Severidad y prioridad
    desc += "**🔴 Severidad:** " + bug.severidad + "\n";
    desc += "**⚡ Prioridad:** " + bug.prioridad + "\n";

    // Caso relacionado
    if (
        bug.casoRelacionado &&
        bug.casoRelacionado !== "-" &&
        bug.casoRelacionado !== ""
    ) {
        desc += "**📋 Caso relacionado:** " + bug.casoRelacionado + "\n";
    }

    desc += "\n---\n\n";

    // Descripción del problema
    desc += "## 📝 Descripción del problema\n\n";
    desc += bug.descripcion + "\n\n";

    // Precondiciones
    if (bug.precondiciones && bug.precondiciones !== "-") {
        desc += "## ✅ Precondiciones\n\n";
        desc += bug.precondiciones + "\n\n";
    }

    // Datos de prueba
    if (bug.datosPrueba && bug.datosPrueba !== "-") {
        desc += "## 🔢 Datos de prueba\n\n";
        desc += bug.datosPrueba + "\n\n";
    }

    // Pasos para reproducir
    desc += "## 👣 Pasos para reproducir\n\n";
    desc += bug.pasosReproducir + "\n\n";

    // Resultados
    desc += "## 📊 Resultados\n\n";
    desc += "**✅ Resultado esperado:**\n";
    desc += bug.resultadoEsperado + "\n\n";
    desc += "**❌ Resultado obtenido:**\n";
    desc += bug.resultadoObtenido + "\n\n";

    // Información adicional
    if (bug.navegador || bug.ambiente) {
        desc += "## 🌐 Información adicional\n\n";
        if (bug.navegador && bug.navegador !== "-") {
            desc += "- **Navegador:** " + bug.navegador + "\n";
        }
        if (bug.ambiente && bug.ambiente !== "-") {
            desc += "- **Ambiente:** " + bug.ambiente + "\n";
        }
        desc += "\n";
    }

    // Evidencias
    if (
        bug.evidencias &&
        Array.isArray(bug.evidencias) &&
        bug.evidencias.length > 0
    ) {
        desc += "## 📎 Evidencias\n\n";
        bug.evidencias.forEach(function (evidencia) {
            desc += "- " + evidencia + "\n";
        });
        desc += "\n";
    }

    // Footer
    desc += "---\n\n";
    desc += "_Reportado por: " + bug.reportadoPor + "_\n";
    desc += "_Fecha: " + bug.fechaCreacion + "_\n";

    return desc;
}

/**
 * Agrega una etiqueta de color según la severidad del bug
 * @param {string} cardId - ID de la tarjeta en Trello
 * @param {string} severidad - Severidad del bug
 * @param {Object} configTrello - Configuración de Trello
 */
function agregarEtiquetaSeveridad(cardId, severidad, configTrello) {
    try {
        var color = TRELLO_LABEL_COLORS[severidad] || "yellow";

        var url = TRELLO_API_BASE + "/cards/" + cardId + "/labels";

        var payload = {
            key: configTrello.apiKey,
            token: configTrello.token,
            color: color,
            name: severidad,
        };

        var options = {
            method: "post",
            payload: payload,
            muteHttpExceptions: true,
        };

        UrlFetchApp.fetch(url, options);
        Logger.log(
            "✅ Etiqueta de severidad agregada: " +
                severidad +
                " (" +
                color +
                ")"
        );
    } catch (error) {
        Logger.log("⚠️ Error agregando etiqueta: " + error.toString());
    }
}

/**
 * Agrega un comentario con metadatos del bug
 * @param {string} cardId - ID de la tarjeta en Trello
 * @param {Object} bug - Objeto con datos del bug
 * @param {Object} configTrello - Configuración de Trello
 */
function agregarComentarioMetadatos(cardId, bug, configTrello) {
    try {
        var comentario = "📊 **Bug registrado en QA Management System**\n\n";
        comentario += "- **ID:** " + bug.id + "\n";
        comentario += "- **Estado:** " + bug.estado + "\n";
        if (bug.casoRelacionado && bug.casoRelacionado !== "-") {
            comentario +=
                "- **Caso relacionado:** " + bug.casoRelacionado + "\n";
        }
        comentario += "- **Fecha reporte:** " + bug.fechaCreacion + "\n";
        comentario += "- **Reportado por:** " + bug.reportadoPor + "\n";

        var url = TRELLO_API_BASE + "/cards/" + cardId + "/actions/comments";

        var payload = {
            key: configTrello.apiKey,
            token: configTrello.token,
            text: comentario,
        };

        var options = {
            method: "post",
            payload: payload,
            muteHttpExceptions: true,
        };

        UrlFetchApp.fetch(url, options);
        Logger.log("✅ Comentario con metadatos agregado");
    } catch (error) {
        Logger.log("⚠️ Error agregando comentario: " + error.toString());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE CONFIGURACIÓN - OBTENER BOARDS Y LISTAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtiene todos los boards de Trello del usuario
 * @param {string} apiKey - API Key de Trello
 * @param {string} token - Token de Trello
 * @returns {Object} Lista de boards o error
 */
function obtenerBoardsTrello(apiKey, token) {
    try {
        Logger.log("📋 Obteniendo boards de Trello...");

        if (!apiKey || !token) {
            return respuestaError(
                "Faltan credenciales",
                "API Key y Token son requeridos"
            );
        }

        var url =
            TRELLO_API_BASE +
            "/members/me/boards?key=" +
            apiKey +
            "&token=" +
            token;

        var options = {
            method: "get",
            muteHttpExceptions: true,
        };

        var response = UrlFetchApp.fetch(url, options);
        var responseCode = response.getResponseCode();

        if (responseCode === 200) {
            var boards = JSON.parse(response.getContentText());

            // Filtrar solo boards abiertos
            var boardsAbiertos = boards.filter(function (board) {
                return !board.closed;
            });

            Logger.log("✅ Boards obtenidos: " + boardsAbiertos.length);

            return respuestaExito(
                boardsAbiertos,
                "Boards obtenidos exitosamente"
            );
        } else if (responseCode === 401) {
            return respuestaError(
                "Credenciales inválidas",
                "API Key o Token incorrectos"
            );
        } else {
            return respuestaError(
                "Error de API",
                "Trello API retornó código: " + responseCode
            );
        }
    } catch (error) {
        Logger.log("❌ Error obteniendo boards: " + error.toString());
        return respuestaError(error.message, "Error al conectar con Trello");
    }
}

/**
 * Obtiene todas las listas de un board específico
 * @param {string} apiKey - API Key de Trello
 * @param {string} token - Token de Trello
 * @param {string} boardId - ID del board
 * @returns {Object} Lista de listas o error
 */
function obtenerListasTrello(apiKey, token, boardId) {
    try {
        Logger.log("📝 Obteniendo listas del board: " + boardId);

        if (!apiKey || !token || !boardId) {
            return respuestaError(
                "Parámetros incompletos",
                "Se requieren API Key, Token y Board ID"
            );
        }

        var url =
            TRELLO_API_BASE +
            "/boards/" +
            boardId +
            "/lists?key=" +
            apiKey +
            "&token=" +
            token;

        var options = {
            method: "get",
            muteHttpExceptions: true,
        };

        var response = UrlFetchApp.fetch(url, options);
        var responseCode = response.getResponseCode();

        if (responseCode === 200) {
            var listas = JSON.parse(response.getContentText());

            // Filtrar solo listas abiertas
            var listasAbiertas = listas.filter(function (lista) {
                return !lista.closed;
            });

            Logger.log("✅ Listas obtenidas: " + listasAbiertas.length);

            return respuestaExito(
                listasAbiertas,
                "Listas obtenidas exitosamente"
            );
        } else if (responseCode === 401) {
            return respuestaError(
                "Credenciales inválidas",
                "API Key o Token incorrectos"
            );
        } else if (responseCode === 404) {
            return respuestaError(
                "Board no encontrado",
                "El board no existe o no tienes acceso"
            );
        } else {
            return respuestaError(
                "Error de API",
                "Trello API retornó código: " + responseCode
            );
        }
    } catch (error) {
        Logger.log("❌ Error obteniendo listas: " + error.toString());
        return respuestaError(error.message, "Error al conectar con Trello");
    }
}

/**
 * Valida las credenciales de Trello haciendo un test de conexión
 * @param {string} apiKey - API Key de Trello
 * @param {string} token - Token de Trello
 * @returns {Object} Resultado de la validación
 */
function validarCredencialesTrello(apiKey, token) {
    try {
        Logger.log("🔐 Validando credenciales de Trello...");

        if (!apiKey || !token) {
            return respuestaError(
                "Credenciales vacías",
                "API Key y Token son requeridos"
            );
        }

        // Intentar obtener información del usuario
        var url =
            TRELLO_API_BASE + "/members/me?key=" + apiKey + "&token=" + token;

        var options = {
            method: "get",
            muteHttpExceptions: true,
        };

        var response = UrlFetchApp.fetch(url, options);
        var responseCode = response.getResponseCode();

        if (responseCode === 200) {
            var userData = JSON.parse(response.getContentText());

            Logger.log(
                "✅ Credenciales válidas. Usuario: " + userData.username
            );

            return respuestaExito(
                {
                    valido: true,
                    usuario: userData.username,
                    nombre: userData.fullName,
                },
                "Credenciales válidas"
            );
        } else if (responseCode === 401) {
            Logger.log("❌ Credenciales inválidas");
            return respuestaError(
                "Credenciales inválidas",
                "API Key o Token incorrectos"
            );
        } else {
            return respuestaError(
                "Error de validación",
                "Trello API retornó código: " + responseCode
            );
        }
    } catch (error) {
        Logger.log("❌ Error validando credenciales: " + error.toString());
        return respuestaError(error.message, "Error al validar credenciales");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE ACTUALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Actualiza el estado de una tarjeta en Trello (mover a otra lista)
 * @param {string} cardId - ID de la tarjeta
 * @param {string} nuevoListId - ID de la lista destino
 * @param {Object} configTrello - Configuración de Trello
 * @returns {Object} Resultado
 */
function moverTarjetaTrello(cardId, nuevoListId, configTrello) {
    try {
        Logger.log("🔄 Moviendo tarjeta en Trello: " + cardId);

        var url = TRELLO_API_BASE + "/cards/" + cardId;

        var payload = {
            key: configTrello.apiKey,
            token: configTrello.token,
            idList: nuevoListId,
        };

        var options = {
            method: "put",
            payload: payload,
            muteHttpExceptions: true,
        };

        var response = UrlFetchApp.fetch(url, options);
        var responseCode = response.getResponseCode();

        if (responseCode === 200) {
            Logger.log("✅ Tarjeta movida exitosamente");
            return respuestaExito({}, "Tarjeta movida exitosamente");
        } else {
            return respuestaError("Error al mover", "Código: " + responseCode);
        }
    } catch (error) {
        Logger.log("❌ Error moviendo tarjeta: " + error.toString());
        return respuestaError(error.message, "Error al mover tarjeta");
    }
}

/**
 * Agrega un comentario a una tarjeta existente
 * @param {string} cardId - ID de la tarjeta
 * @param {string} comentario - Texto del comentario
 * @param {Object} configTrello - Configuración de Trello
 * @returns {Object} Resultado
 */
function agregarComentarioTarjeta(cardId, comentario, configTrello) {
    try {
        Logger.log("💬 Agregando comentario a tarjeta: " + cardId);

        var url = TRELLO_API_BASE + "/cards/" + cardId + "/actions/comments";

        var payload = {
            key: configTrello.apiKey,
            token: configTrello.token,
            text: comentario,
        };

        var options = {
            method: "post",
            payload: payload,
            muteHttpExceptions: true,
        };

        var response = UrlFetchApp.fetch(url, options);
        var responseCode = response.getResponseCode();

        if (responseCode === 200) {
            Logger.log("✅ Comentario agregado");
            return respuestaExito({}, "Comentario agregado exitosamente");
        } else {
            return respuestaError(
                "Error al comentar",
                "Código: " + responseCode
            );
        }
    } catch (error) {
        Logger.log("❌ Error agregando comentario: " + error.toString());
        return respuestaError(error.message, "Error al agregar comentario");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE TEST
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Función de test - Ejecutar desde Apps Script
 */
function testTrelloAPI() {
    if (typeof __debugGuard === "function" && __debugGuard()) {
        return;
    }

    Logger.log("🧪 Iniciando test de Trello API...");

    // REEMPLAZAR CON TUS CREDENCIALES DE TEST
    var testApiKey = "TU_API_KEY_AQUI";
    var testToken = "TU_TOKEN_AQUI";

    if (testApiKey === "TU_API_KEY_AQUI") {
        Logger.log(
            "⚠️ Configura tus credenciales de Trello en la función testTrelloAPI()"
        );
        return;
    }

    // Test 1: Validar credenciales
    Logger.log("\n📝 Test 1: Validar credenciales");
    var validacion = validarCredencialesTrello(testApiKey, testToken);
    Logger.log("Resultado: " + JSON.stringify(validacion));

    // Test 2: Obtener boards
    Logger.log("\n📝 Test 2: Obtener boards");
    var boards = obtenerBoardsTrello(testApiKey, testToken);
    Logger.log("Resultado: " + JSON.stringify(boards));

    if (boards.success && boards.data.length > 0) {
        // Test 3: Obtener listas del primer board
        Logger.log("\n📝 Test 3: Obtener listas");
        var boardId = boards.data[0].id;
        var listas = obtenerListasTrello(testApiKey, testToken, boardId);
        Logger.log("Resultado: " + JSON.stringify(listas));
    }

    Logger.log("\n✅ Tests completados");
}
