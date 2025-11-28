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
                usuarioId: userData.id || null,
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
function crearCardTrello(datosBug, listId, labelIds, boardId, memberId) {
    try {
        Logger.log("🎴 Creando card en Trello...");
        Logger.log("   Lista: " + listId);
        Logger.log("   Bug: " + datosBug.titulo);

        if (!listId || !boardId) {
            return {
                success: false,
                mensaje: "ID de lista y tablero son requeridos",
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
        };

        // Gestionar etiquetas
        var finalLabelIds = labelIds || [];

        // Crear/aplicar etiquetas para Severidad y Prioridad (coloridas y visibles)
        var etiquetasEspeciales = [];

        // Severidad: Bloqueante (black/negro), Crítica (red), Alta (orange), Media (yellow), Baja (blue)
        if (datosBug.severidad) {
            var colorSeveridad = "blue";
            if (datosBug.severidad === "Bloqueante") colorSeveridad = "black";
            else if (datosBug.severidad === "Crítica") colorSeveridad = "red";
            else if (datosBug.severidad === "Alta") colorSeveridad = "orange";
            else if (datosBug.severidad === "Media") colorSeveridad = "yellow";

            etiquetasEspeciales.push({
                nombre: "SEV: " + datosBug.severidad,
                color: colorSeveridad,
            });
        }

        // Prioridad: Crítica (red), Alta (orange), Media (yellow), Baja (lime)
        if (datosBug.prioridad) {
            var colorPrioridad = "lime";
            if (datosBug.prioridad === "Crítica") colorPrioridad = "red";
            else if (datosBug.prioridad === "Alta") colorPrioridad = "orange";
            else if (datosBug.prioridad === "Media") colorPrioridad = "yellow";

            etiquetasEspeciales.push({
                nombre: "PRI: " + datosBug.prioridad,
                color: colorPrioridad,
            });
        }

        // Obtener todas las etiquetas del tablero una sola vez
        var etiquetasRes = listarEtiquetasTrello(boardId);
        var etiquetasExistentes =
            etiquetasRes && etiquetasRes.success ? etiquetasRes.data : [];

        // Procesar etiquetas especiales (Severidad y Prioridad)
        etiquetasEspeciales.forEach(function (espec) {
            var existe = etiquetasExistentes.find(function (e) {
                return e.name.toLowerCase() === espec.nombre.toLowerCase();
            });

            if (existe) {
                if (!finalLabelIds.includes(existe.id))
                    finalLabelIds.push(existe.id);
            } else {
                var nuevaEtiqueta = crearEtiquetaTrello(
                    boardId,
                    espec.nombre,
                    espec.color
                );
                if (
                    nuevaEtiqueta &&
                    nuevaEtiqueta.success &&
                    nuevaEtiqueta.data
                ) {
                    finalLabelIds.push(nuevaEtiqueta.data.id);
                }
            }
        });

        // Si hay etiquetas adicionales del usuario, asegurarnos que existan
        if (datosBug.etiquetas) {
            var etiquetasArr = datosBug.etiquetas
                .split(",")
                .map(function (e) {
                    return e.trim();
                })
                .filter(Boolean);

            // Para cada etiqueta del bug
            etiquetasArr.forEach(function (etiquetaNombre) {
                // Buscar si ya existe
                var etiquetaExistente = etiquetasExistentes.find(function (e) {
                    return (
                        e.name.toLowerCase() === etiquetaNombre.toLowerCase()
                    );
                });

                if (etiquetaExistente) {
                    // Si existe, usar su ID
                    if (!finalLabelIds.includes(etiquetaExistente.id)) {
                        finalLabelIds.push(etiquetaExistente.id);
                    }
                } else {
                    // Si no existe, crearla
                    var nuevaEtiqueta = crearEtiquetaTrello(
                        boardId,
                        etiquetaNombre,
                        "purple"
                    );
                    if (
                        nuevaEtiqueta &&
                        nuevaEtiqueta.success &&
                        nuevaEtiqueta.data
                    ) {
                        finalLabelIds.push(nuevaEtiqueta.data.id);
                    }
                }
            });
        }

        // Agregar etiquetas a la card
        if (finalLabelIds.length > 0) {
            payload.idLabels = finalLabelIds.join(",");
        }

        // Agregar miembros si se recibió memberId
        try {
            if (memberId) {
                // Trello acepta idMembers como lista separada por comas
                payload.idMembers = String(memberId);
            }
        } catch (e) {
            Logger.log("⚠️ No se aplicó memberId a payload: " + e.toString());
        }

        // Asegurar que todos los bugs tengan una etiqueta "Bug"
        try {
            // Buscar etiqueta que contenga "Bug" en su nombre
            var etiquetaBugExistente = etiquetasExistentes.find(function (e) {
                return e.name && e.name.toLowerCase().indexOf("bug") > -1;
            });

            if (etiquetaBugExistente) {
                // Si existe, usarla
                if (!finalLabelIds.includes(etiquetaBugExistente.id)) {
                    finalLabelIds.push(etiquetaBugExistente.id);
                    Logger.log(
                        "✅ Usando etiqueta Bug existente: " +
                            etiquetaBugExistente.name
                    );
                }
            } else {
                // Si no existe, crear una etiqueta "Bug" de color rojo
                Logger.log("🏷️ Creando etiqueta 'Bug' en el tablero...");
                var nuevaEtiquetaBug = crearEtiquetaTrello(
                    boardId,
                    "Bug",
                    "red"
                );
                if (
                    nuevaEtiquetaBug &&
                    nuevaEtiquetaBug.success &&
                    nuevaEtiquetaBug.data &&
                    nuevaEtiquetaBug.data.id
                ) {
                    finalLabelIds.push(nuevaEtiquetaBug.data.id);
                    Logger.log("✅ Etiqueta 'Bug' creada y aplicada");
                }
            }

            // Actualizar payload con todas las etiquetas
            if (finalLabelIds.length > 0) {
                payload.idLabels = finalLabelIds.join(",");
            }
        } catch (e) {
            Logger.log("⚠️ No se pudo asegurar etiqueta Bug: " + e.toString());
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

        Logger.log(
            "✅ Card creada: " +
                (cardData.shortUrl || cardData.url || cardData.id)
        );

        // Estrategia de cover: intentar 2 métodos progresivamente
        var coverAplicado = false;

        // Método 1: Intentar cover rojo por color API (PUT)
        try {
            Logger.log("🎨 Método 1: Aplicando cover rojo por color API...");
            var coverUrl =
                "https://api.trello.com/1/cards/" + cardData.id + "/cover";

            var coverPayload = {
                key: credenciales.apiKey,
                token: credenciales.token,
                color: "red",
                value: JSON.stringify({
                    color: "red",
                }),
            };

            var coverResp = UrlFetchApp.fetch(coverUrl, {
                method: "put",
                payload: coverPayload,
                muteHttpExceptions: true,
            });

            if (coverResp.getResponseCode() === 200) {
                Logger.log("✅ Cover rojo aplicado exitosamente");
                coverAplicado = true;
            } else {
                Logger.log(
                    "⚠️ Cover no aplicado - HTTP " +
                        coverResp.getResponseCode() +
                        ": " +
                        coverResp.getContentText()
                );
            }
        } catch (e) {
            Logger.log("⚠️ Método 1 falló: " + e.toString());
        }

        // Método 2: Fallback con sticker rojo si el cover no funcionó
        if (!coverAplicado) {
            try {
                Logger.log("🎨 Método 2: Intentando añadir sticker rojo...");
                var stickerUrl =
                    "https://api.trello.com/1/cards/" +
                    cardData.id +
                    "/stickers";

                var stickerPayload = {
                    key: credenciales.apiKey,
                    token: credenciales.token,
                    image: "warning",
                    top: 0,
                    left: 0,
                    zIndex: 1,
                    rotate: 0,
                };

                var stickerResp = UrlFetchApp.fetch(stickerUrl, {
                    method: "post",
                    payload: stickerPayload,
                    muteHttpExceptions: true,
                });

                if (stickerResp.getResponseCode() === 200) {
                    Logger.log("✅ Sticker aplicado como alternativa");
                    coverAplicado = true;
                }
            } catch (e) {
                Logger.log("⚠️ Método 2 falló: " + e.toString());
            }
        }

        if (!coverAplicado) {
            Logger.log(
                "⚠️ No se pudo aplicar cover visual. La card tendrá etiquetas de color para identificación."
            );
        }

        return {
            success: true,
            data: {
                cardId: cardData.id,
                cardShortUrl: cardData.shortUrl,
                cardUrl: cardData.url || cardData.shortUrl,
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

// NOTE: generarImagenRojaBug removed — image attachments are disabled per user request.

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

    // Severidad y Prioridad: representadas mediante etiquetas en la tarjeta
    // (omitimos duplicar como texto para evitar redundancia)

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

    // Ambiente/versión (solo mostrar si hay datos)
    if (
        (datosBug.ambiente && datosBug.ambiente.trim() !== "") ||
        (datosBug.navegador && datosBug.navegador.trim() !== "")
    ) {
        desc += "## 🖥️ Ambiente/versión:\n";
        if (datosBug.ambiente && datosBug.ambiente.trim() !== "") {
            desc += "**Ambiente:** " + datosBug.ambiente + "\n";
        }
        if (datosBug.navegador && datosBug.navegador.trim() !== "") {
            desc += "**Navegador:** " + datosBug.navegador + "\n";
        }
        desc += "\n";
    }

    // 🚶 Pasos para reproducir (solo si hay datos)
    if (datosBug.pasosReproducir && datosBug.pasosReproducir.trim() !== "") {
        desc += "## 🚶 Pasos para reproducir:\n";
        desc += datosBug.pasosReproducir + "\n\n";
    }

    // 🎯 Resultado esperado (solo si hay datos)
    if (
        datosBug.resultadoEsperado &&
        datosBug.resultadoEsperado.trim() !== ""
    ) {
        desc += "## 🎯 Resultado esperado:\n";
        desc += datosBug.resultadoEsperado + "\n\n";
    }

    // 💥 Resultado obtenido (solo si hay datos)
    if (
        datosBug.resultadoObtenido &&
        datosBug.resultadoObtenido.trim() !== ""
    ) {
        desc += "## 💥 Resultado obtenido:\n";
        desc += datosBug.resultadoObtenido + "\n\n";
    }

    // Evidencias
    if (
        (datosBug.evidencias && datosBug.evidencias.length > 0) ||
        (datosBug.evidenciasURL && datosBug.evidenciasURL.trim() !== "")
    ) {
        desc += "## 📎 Evidencias:\n";

        var evidenciasList = [];
        if (datosBug.evidencias && datosBug.evidencias.length > 0) {
            evidenciasList = datosBug.evidencias.slice();
        } else if (
            datosBug.evidenciasURL &&
            datosBug.evidenciasURL.trim() !== ""
        ) {
            evidenciasList = datosBug.evidenciasURL
                .split("\n")
                .map(function (s) {
                    return s.trim();
                })
                .filter(Boolean);
        }

        evidenciasList.forEach(function (item, index) {
            var texto = String(item || "").trim();
            // Si parece una URL válida, crear link; si no, mostrar como texto
            if (/^https?:\/\//i.test(texto)) {
                desc +=
                    index +
                    1 +
                    ". [Link al BUG " +
                    (index + 1) +
                    "](" +
                    texto +
                    ")\n";
            } else {
                desc += index + 1 + ". " + texto + "\n";
            }
        });
        desc += "\n";
    }

    // Información adicional
    var infoAdicional = "";
    if (datosBug.detectadoPor && datosBug.detectadoPor.trim() !== "") {
        infoAdicional += "**Detectado por:** " + datosBug.detectadoPor + "\n";
    }
    if (datosBug.fechaDeteccion) {
        var fechaFormateada =
            typeof datosBug.fechaDeteccion === "string"
                ? datosBug.fechaDeteccion
                : new Date(datosBug.fechaDeteccion).toLocaleDateString("es-ES");
        infoAdicional += "**Fecha detección:** " + fechaFormateada + "\n";
    }
    if (
        datosBug.casosRelacionados &&
        datosBug.casosRelacionados.trim() !== ""
    ) {
        infoAdicional +=
            "**Caso de prueba:** " + datosBug.casosRelacionados + "\n";
    }

    // Solo agregar separador y información si hay algo que mostrar
    if (infoAdicional !== "") {
        desc += "---\n";
        desc += infoAdicional;
    }

    return desc;
}

/**
 * Crea una nueva etiqueta en un tablero de Trello
 * @param {string} boardId - ID del tablero
 * @param {string} name - Nombre de la etiqueta
 * @param {string} color - Color de la etiqueta (opcional)
 * @returns {Object} Resultado con la etiqueta creada
 */
function crearEtiquetaTrello(boardId, name, color) {
    try {
        Logger.log("🏷️ Creando etiqueta en Trello...");
        Logger.log("   Tablero: " + boardId);
        Logger.log("   Nombre: " + name);

        if (!boardId || !name) {
            return {
                success: false,
                mensaje: "ID del tablero y nombre son requeridos",
            };
        }

        var credenciales = obtenerCredencialesTrello();
        if (!credenciales) {
            return {
                success: false,
                mensaje: "No hay credenciales configuradas",
            };
        }

        var url = "https://api.trello.com/1/labels";
        var payload = {
            name: name,
            idBoard: boardId,
            color: color || "blue",
            key: credenciales.apiKey,
            token: credenciales.token,
        };

        var response = UrlFetchApp.fetch(url, {
            method: "post",
            payload: payload,
            muteHttpExceptions: true,
        });

        if (response.getResponseCode() !== 200) {
            Logger.log(
                "❌ Error respuesta Trello: " + response.getContentText()
            );
            return {
                success: false,
                mensaje:
                    "Error al crear etiqueta: " + response.getContentText(),
            };
        }

        var labelData = JSON.parse(response.getContentText());
        Logger.log("✅ Etiqueta creada: " + labelData.id);

        return {
            success: true,
            data: {
                id: labelData.id,
                name: labelData.name,
                color: labelData.color,
            },
            mensaje: "Etiqueta creada exitosamente",
        };
    } catch (error) {
        Logger.log("❌ Error creando etiqueta: " + error.toString());
        return {
            success: false,
            mensaje: "Error al crear etiqueta: " + error.message,
        };
    }
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

/**
 * Mueve una card existente a otra lista (idList)
 * @param {string} cardId - ID de la card en Trello
 * @param {string} targetListId - ID de la lista destino
 * @returns {Object} Resultado de la operación
 */
function moverCardTrello(cardId, targetListId) {
    try {
        Logger.log("🔀 Moviendo card " + cardId + " a lista " + targetListId);

        if (!cardId || !targetListId) {
            return {
                success: false,
                mensaje: "cardId y targetListId son requeridos",
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
            "https://api.trello.com/1/cards/" +
            encodeURIComponent(cardId) +
            "?key=" +
            credenciales.apiKey +
            "&token=" +
            credenciales.token +
            "&idList=" +
            encodeURIComponent(targetListId);

        var options = { method: "put", muteHttpExceptions: true };
        var resp = UrlFetchApp.fetch(url, options);

        if (resp.getResponseCode() !== 200) {
            Logger.log("❌ Error moviendo card: " + resp.getContentText());
            return {
                success: false,
                mensaje: "Error moviendo card: " + resp.getContentText(),
            };
        }

        var data = JSON.parse(resp.getContentText());
        Logger.log("✅ Card movida: " + data.id);
        return {
            success: true,
            data: { id: data.id, shortUrl: data.shortUrl || data.url },
        };
    } catch (error) {
        Logger.log("❌ Exception moverCardTrello: " + error.toString());
        return {
            success: false,
            mensaje: "Exception moverCardTrello: " + error.message,
        };
    }
}

/**
 * Archiva (cierra) una card en Trello
 * @param {string} cardId - ID de la card
 * @returns {Object} Resultado de la operación
 */
function archivarCardTrello(cardId) {
    try {
        Logger.log("🗄️ Archivando card " + cardId);

        if (!cardId) {
            return { success: false, mensaje: "cardId es requerido" };
        }

        var credenciales = obtenerCredencialesTrello();
        if (!credenciales) {
            return {
                success: false,
                mensaje: "No hay credenciales configuradas",
            };
        }

        var url =
            "https://api.trello.com/1/cards/" +
            encodeURIComponent(cardId) +
            "/closed?key=" +
            credenciales.apiKey +
            "&token=" +
            credenciales.token +
            "&value=true";

        var options = { method: "put", muteHttpExceptions: true };
        var resp = UrlFetchApp.fetch(url, options);

        if (resp.getResponseCode() !== 200) {
            Logger.log("❌ Error archivando card: " + resp.getContentText());
            return {
                success: false,
                mensaje: "Error archivando card: " + resp.getContentText(),
            };
        }

        var data = JSON.parse(resp.getContentText());
        Logger.log("✅ Card archivada: " + data.id);
        return { success: true, data: { id: data.id } };
    } catch (error) {
        Logger.log("❌ Exception archivarCardTrello: " + error.toString());
        return {
            success: false,
            mensaje: "Exception archivarCardTrello: " + error.message,
        };
    }
}
