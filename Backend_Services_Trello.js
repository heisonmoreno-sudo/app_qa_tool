/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BACKEND_SERVICES_TRELLO.JS
 * Servicio para integración con Trello API
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Guarda las credenciales de Trello de forma segura
 * @param {string} apiKey - API Key de Trello
 * @param {string} token - Token de autenticación de Trello
 * @returns {Object} Resultado de la operación
 */
function guardarCredencialesTrello(apiKey, token) {
    try {
        Logger.log("🔐 Guardando credenciales de Trello...");

        if (!apiKey || !token) {
            return {
                success: false,
                mensaje: "API Key y Token son requeridos",
            };
        }

        // Guardar en PropertiesService (seguro y persistente)
        var properties = PropertiesService.getUserProperties();
        properties.setProperty("TRELLO_API_KEY", apiKey);
        properties.setProperty("TRELLO_TOKEN", token);

        Logger.log("✅ Credenciales guardadas exitosamente");

        return {
            success: true,
            mensaje: "Credenciales guardadas correctamente",
        };
    } catch (error) {
        Logger.log("❌ Error guardando credenciales: " + error.toString());
        return {
            success: false,
            mensaje: "Error al guardar credenciales: " + error.message,
        };
    }
}

/**
 * Obtiene las credenciales de Trello guardadas
 * @returns {Object} { apiKey, token } o null si no existen
 */
function obtenerCredencialesTrello() {
    try {
        var properties = PropertiesService.getUserProperties();
        var apiKey = properties.getProperty("TRELLO_API_KEY");
        var token = properties.getProperty("TRELLO_TOKEN");

        if (!apiKey || !token) {
            return null;
        }

        return {
            apiKey: apiKey,
            token: token,
        };
    } catch (error) {
        Logger.log("❌ Error obteniendo credenciales: " + error.toString());
        return null;
    }
}

/**
 * Verifica si las credenciales de Trello están configuradas
 * @returns {Object} Resultado con estado de configuración
 */
function verificarCredencialesTrello() {
    try {
        var credenciales = obtenerCredencialesTrello();

        if (!credenciales) {
            return {
                success: false,
                configurado: false,
                mensaje: "No hay credenciales configuradas",
            };
        }

        // Verificar que las credenciales funcionen haciendo una llamada simple
        var url =
            "https://api.trello.com/1/members/me?key=" +
            credenciales.apiKey +
            "&token=" +
            credenciales.token;

        var response = UrlFetchApp.fetch(url, {
            method: "get",
            muteHttpExceptions: true,
        });

        if (response.getResponseCode() === 200) {
            var userData = JSON.parse(response.getContentText());
            return {
                success: true,
                configurado: true,
                usuario: userData.fullName || userData.username,
                mensaje: "Credenciales válidas",
            };
        } else {
            return {
                success: false,
                configurado: false,
                mensaje: "Credenciales inválidas o expiradas",
            };
        }
    } catch (error) {
        Logger.log("❌ Error verificando credenciales: " + error.toString());
        return {
            success: false,
            configurado: false,
            mensaje: "Error al verificar credenciales: " + error.message,
        };
    }
}

/**
 * Lista todos los tableros a los que el usuario tiene acceso
 * @returns {Object} Lista de tableros
 */
function listarTablerosTrello() {
    try {
        Logger.log("📋 Listando tableros de Trello...");

        var credenciales = obtenerCredencialesTrello();
        if (!credenciales) {
            return {
                success: false,
                mensaje: "No hay credenciales configuradas",
            };
        }

        var url =
            "https://api.trello.com/1/members/me/boards?key=" +
            credenciales.apiKey +
            "&token=" +
            credenciales.token +
            "&filter=open&fields=id,name,desc,closed";

        var response = UrlFetchApp.fetch(url, {
            method: "get",
            muteHttpExceptions: true,
        });

        if (response.getResponseCode() !== 200) {
            return {
                success: false,
                mensaje:
                    "Error al obtener tableros: " + response.getContentText(),
            };
        }

        var tableros = JSON.parse(response.getContentText());

        Logger.log("✅ Tableros obtenidos: " + tableros.length);

        return {
            success: true,
            data: tableros.map(function (board) {
                return {
                    id: board.id,
                    name: board.name,
                    desc: board.desc || "",
                };
            }),
        };
    } catch (error) {
        Logger.log("❌ Error listando tableros: " + error.toString());
        return {
            success: false,
            mensaje: "Error al listar tableros: " + error.message,
        };
    }
}

/**
 * Lista todas las listas (columnas) de un tablero específico
 * @param {string} boardId - ID del tablero de Trello
 * @returns {Object} Lista de listas/columnas
 */
function listarListasTrello(boardId) {
    try {
        Logger.log("📝 Listando listas del tablero: " + boardId);

        if (!boardId) {
            return {
                success: false,
                mensaje: "ID del tablero es requerido",
            };
        }

        var credenciales = obtenerCredencialesTrello();
        if (!credenciales) {
            return {
                success: false,
                mensaje: "No hay credenciales configuradas",
            };
        }

        var url =
            "https://api.trello.com/1/boards/" +
            boardId +
            "/lists?key=" +
            credenciales.apiKey +
            "&token=" +
            credenciales.token +
            "&filter=open&fields=id,name,pos";

        var response = UrlFetchApp.fetch(url, {
            method: "get",
            muteHttpExceptions: true,
        });

        if (response.getResponseCode() !== 200) {
            return {
                success: false,
                mensaje:
                    "Error al obtener listas: " + response.getContentText(),
            };
        }

        var listas = JSON.parse(response.getContentText());

        // Ordenar por posición
        listas.sort(function (a, b) {
            return a.pos - b.pos;
        });

        Logger.log("✅ Listas obtenidas: " + listas.length);

        return {
            success: true,
            data: listas.map(function (list) {
                return {
                    id: list.id,
                    name: list.name,
                };
            }),
        };
    } catch (error) {
        Logger.log("❌ Error listando listas: " + error.toString());
        return {
            success: false,
            mensaje: "Error al listar listas: " + error.message,
        };
    }
}

/**
 * Obtiene las etiquetas (labels) de un tablero específico
 * @param {string} boardId - ID del tablero de Trello
 * @returns {Object} Lista de etiquetas
 */
function listarEtiquetasTrello(boardId) {
    try {
        Logger.log("🏷️ Listando etiquetas del tablero: " + boardId);

        if (!boardId) {
            return {
                success: false,
                mensaje: "ID del tablero es requerido",
            };
        }

        var credenciales = obtenerCredencialesTrello();
        if (!credenciales) {
            return {
                success: false,
                mensaje: "No hay credenciales configuradas",
            };
        }

        var url =
            "https://api.trello.com/1/boards/" +
            boardId +
            "/labels?key=" +
            credenciales.apiKey +
            "&token=" +
            credenciales.token;

        var response = UrlFetchApp.fetch(url, {
            method: "get",
            muteHttpExceptions: true,
        });

        if (response.getResponseCode() !== 200) {
            return {
                success: false,
                mensaje:
                    "Error al obtener etiquetas: " + response.getContentText(),
            };
        }

        var etiquetas = JSON.parse(response.getContentText());

        Logger.log("✅ Etiquetas obtenidas: " + etiquetas.length);

        return {
            success: true,
            data: etiquetas.map(function (label) {
                return {
                    id: label.id,
                    name: label.name,
                    color: label.color,
                };
            }),
        };
    } catch (error) {
        Logger.log("❌ Error listando etiquetas: " + error.toString());
        return {
            success: false,
            mensaje: "Error al listar etiquetas: " + error.message,
        };
    }
}

/**
 * Crea una card en Trello con la información del bug
 * @param {Object} datosBug - Datos del bug
 * @param {string} listId - ID de la lista donde crear la card
 * @param {Array} labelIds - IDs de las etiquetas a aplicar
 * @returns {Object} Resultado de la operación con URL de la card
 */
function crearCardTrello(datosBug, listId, labelIds) {
    try {
        Logger.log("🎴 Creando card en Trello...");
        Logger.log("   Lista: " + listId);
        Logger.log("   Bug: " + datosBug.titulo);

        if (!listId) {
            return {
                success: false,
                mensaje: "ID de lista es requerido",
            };
        }

        var credenciales = obtenerCredencialesTrello();
        if (!credenciales) {
            return {
                success: false,
                mensaje: "No hay credenciales configuradas",
            };
        }

        // Construir el nombre de la card
        var nombre = datosBug.id ? "[" + datosBug.id + "] " : "";
        nombre += datosBug.titulo;

        // Construir la descripción en formato markdown
        var descripcion = construirDescripcionTrello(datosBug);

        // Preparar los parámetros
        var payload = {
            name: nombre,
            desc: descripcion,
            idList: listId,
            pos: "top", // Colocar al inicio de la lista
            key: credenciales.apiKey,
            token: credenciales.token,
            // Siempre cover rojo para bugs
            cover: JSON.stringify({
                color: "red",
            }),
        };

        // Agregar etiquetas si hay
        if (labelIds && labelIds.length > 0) {
            payload.idLabels = labelIds.join(",");
        }

        var url = "https://api.trello.com/1/cards";

        var options = {
            method: "post",
            payload: payload,
            muteHttpExceptions: true,
        };

        var response = UrlFetchApp.fetch(url, options);

        if (response.getResponseCode() !== 200) {
            Logger.log(
                "❌ Error respuesta Trello: " + response.getContentText()
            );
            return {
                success: false,
                mensaje: "Error al crear card: " + response.getContentText(),
            };
        }

        var cardData = JSON.parse(response.getContentText());

        Logger.log("✅ Card creada: " + cardData.shortUrl);

        return {
            success: true,
            data: {
                cardId: cardData.id,
                cardUrl: cardData.shortUrl,
                cardName: cardData.name,
            },
            mensaje: "Card creada exitosamente en Trello",
        };
    } catch (error) {
        Logger.log("❌ Error creando card: " + error.toString());
        return {
            success: false,
            mensaje: "Error al crear card: " + error.message,
        };
    }
}

/**
 * Construye la descripción de la card en formato markdown
 * @param {Object} datosBug - Datos del bug
 * @returns {string} Descripción formateada
 */
function construirDescripcionTrello(datosBug) {
    var desc = "";

    // 🐞 Resumen del defecto
    desc += "## 🐞 Resumen del defecto:\n";
    desc += (datosBug.descripcion || datosBug.titulo) + "\n\n";

    // Severidad y Prioridad
    desc +=
        "**Severidad:** " + (datosBug.severidad || "No especificada") + "\n";
    desc +=
        "**Prioridad:** " + (datosBug.prioridad || "No especificada") + "\n\n";

    // ⚙️ Precondiciones (opcional)
    if (datosBug.precondiciones && datosBug.precondiciones.trim() !== "") {
        desc += "## ⚙️ Precondiciones:\n";
        desc += datosBug.precondiciones + "\n\n";
    }

    // 🧪 Datos de prueba (opcional)
    if (datosBug.datosPrueba && datosBug.datosPrueba.trim() !== "") {
        desc += "## 🧪 Datos de prueba:\n";
        desc += datosBug.datosPrueba + "\n\n";
    }

    // Ambiente/versión
    desc += "## 🖥️ Ambiente/versión:\n";
    desc += "**Ambiente:** " + (datosBug.ambiente || "No especificado") + "\n";
    if (datosBug.navegador) {
        desc += "**Navegador:** " + datosBug.navegador + "\n";
    }
    desc += "\n";

    // 🚶 Pasos para reproducir
    desc += "## 🚶 Pasos para reproducir:\n";
    if (datosBug.pasosReproducir) {
        desc += datosBug.pasosReproducir + "\n\n";
    } else {
        desc += "1. \n2. \n3. \n\n";
    }

    // 🎯 Resultado esperado
    desc += "## 🎯 Resultado esperado:\n";
    desc += (datosBug.resultadoEsperado || "No especificado") + "\n\n";

    // 💥 Resultado obtenido
    desc += "## 💥 Resultado obtenido:\n";
    desc += (datosBug.resultadoObtenido || "No especificado") + "\n\n";

    // Evidencias
    if (datosBug.evidenciasURL && datosBug.evidenciasURL.trim() !== "") {
        desc += "## 📎 Evidencias:\n";
        desc += datosBug.evidenciasURL + "\n\n";
    }

    // Información adicional
    desc += "---\n";
    desc += "**Detectado por:** " + (datosBug.detectadoPor || "QA Team") + "\n";
    desc +=
        "**Fecha detección:** " +
        (datosBug.fechaDeteccion || new Date().toLocaleDateString("es-ES")) +
        "\n";

    // Caso relacionado
    if (
        datosBug.casosRelacionados &&
        datosBug.casosRelacionados.trim() !== ""
    ) {
        desc += "**Caso de prueba:** " + datosBug.casosRelacionados + "\n";
    }

    return desc;
}

/**
 * Prueba la conexión con Trello
 * @returns {Object} Resultado de la prueba
 */
function probarConexionTrello() {
    try {
        Logger.log("🧪 Probando conexión con Trello...");

        var credenciales = obtenerCredencialesTrello();
        if (!credenciales) {
            return {
                success: false,
                mensaje:
                    "No hay credenciales configuradas. Por favor configura tu API Key y Token.",
            };
        }

        var url =
            "https://api.trello.com/1/members/me?key=" +
            credenciales.apiKey +
            "&token=" +
            credenciales.token;

        var response = UrlFetchApp.fetch(url, {
            method: "get",
            muteHttpExceptions: true,
        });

        if (response.getResponseCode() === 200) {
            var userData = JSON.parse(response.getContentText());
            return {
                success: true,
                mensaje: "Conexión exitosa con Trello!",
                data: {
                    usuario: userData.fullName || userData.username,
                    email: userData.email || "N/A",
                },
            };
        } else {
            return {
                success: false,
                mensaje: "Error de autenticación. Verifica tus credenciales.",
            };
        }
    } catch (error) {
        Logger.log("❌ Error probando conexión: " + error.toString());
        return {
            success: false,
            mensaje: "Error al conectar con Trello: " + error.message,
        };
    }
}
