/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BACKEND_SERVICES_BUGS.GS
 * Servicio para gestión de bugs
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Genera un ID único para un bug
 * Formato: BUG-1, BUG-2, BUG-3...
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

        // Abrir spreadsheet y obtener hoja de Bugs
        var ss = SpreadsheetApp.openByUrl(sheetUrl);
        var hojaBugs = ss.getSheetByName("Bugs");

        if (!hojaBugs) {
            // Si no existe la hoja, crear el primer bug
            Logger.log("✅ Primera vez creando bug: BUG-1");
            return "BUG-1";
        }

        // Obtener todos los IDs existentes (columna A, sin header)
        var datos = hojaBugs.getDataRange().getValues();
        var idsExistentes = [];

        for (var i = 1; i < datos.length; i++) {
            // Empezar en 1 para saltar header
            var id = String(datos[i][0]).trim();
            if (id && id.indexOf("BUG-") === 0) {
                var numero = parseInt(id.replace("BUG-", ""));
                if (!isNaN(numero)) {
                    idsExistentes.push(numero);
                }
            }
        }

        if (idsExistentes.length === 0) {
            Logger.log("✅ No hay bugs, generando BUG-1");
            return "BUG-1";
        }

        // Ordenar IDs existentes
        idsExistentes.sort(function (a, b) {
            return a - b;
        });

        // Buscar el primer ID disponible (hueco en la secuencia)
        var nuevoNumero = 1;
        for (var j = 0; j < idsExistentes.length; j++) {
            if (idsExistentes[j] === nuevoNumero) {
                nuevoNumero++;
            } else if (idsExistentes[j] > nuevoNumero) {
                // Encontramos un hueco
                break;
            }
        }

        var nuevoId = "BUG-" + nuevoNumero;
        Logger.log("✅ ID generado (reutilizando huecos): " + nuevoId);
        return nuevoId;
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
                    "LinkTrello",
                    "Adjuntos",
                    "Notas",
                ];
                hoja.getRange(1, 1, 1, headers.length).setValues([headers]);

                // Aplicar formato consistente a los headers
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

                // Aplicar wrap y alineación vertical a todas las celdas de datos
                var bugDataRange = hoja.getRange(2, 1, 2000, headers.length);
                bugDataRange.setWrap(true).setVerticalAlignment("middle");

                hoja.setRowHeight(1, 30);
                hoja.setFrozenRows(1);
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

        // Validar que exista carpeta de evidencias de bugs configurada
        var carpetaBugs = obtenerValorConfig(
            "carpeta_evidencias_bugs",
            "",
            sheetUrl
        );
        if (!carpetaBugs || carpetaBugs === "") {
            Logger.log("❌ No hay carpeta de evidencias de bugs configurada");
            return {
                success: false,
                mensaje:
                    "No se puede crear bugs sin una carpeta de evidencias configurada. Por favor, configura la carpeta de evidencias de bugs en la Configuración del Sistema.",
                codigo: "NO_CARPETA_BUGS",
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
            datosBug.trelloCardId || "", // TrelloCardID
            datosBug.trelloCardURL || "", // LinkTrello
            "", // Adjuntos
            datosBug.notas || "", // Notas
        ];

        // Agregar fila a la hoja
        hojaBugs.appendRow(fila);

        Logger.log("✅ Bug creado: " + bugId);

        // Si tiene casos relacionados, actualizar esos casos
        if (datosBug.casosRelacionados && datosBug.casosRelacionados !== "") {
            var casosIds = datosBug.casosRelacionados
                .split(",")
                .map(function (id) {
                    return id.trim();
                });

            casosIds.forEach(function (casoId) {
                if (casoId) {
                    actualizarBugEnCaso(spreadsheet, casoId, bugId);
                }
            });
        }

        return {
            success: true,
            data: {
                bugId: bugId,
                titulo: datosBug.titulo,
                estado: "Abierto",
            },
            mensaje: "Bug creado exitosamente",
        };
    } catch (error) {
        Logger.log("❌ Error creando bug: " + error.toString());
        return {
            success: false,
            mensaje: "Error al crear bug: " + error.message,
        };
    }
}

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
        Logger.log("✅ Spreadsheet abierto: " + spreadsheet.getName());

        // Listar todas las hojas disponibles para debugging
        var todasLasHojas = spreadsheet.getSheets();
        var nombresHojas = todasLasHojas
            .map(function (h) {
                return h.getName();
            })
            .join(", ");
        Logger.log("📑 Hojas disponibles: " + nombresHojas);

        var hojaBugs = spreadsheet.getSheetByName("Bugs");

        if (hojaBugs === null) {
            Logger.log("⚠️ Hoja 'Bugs' no existe. Intentando crear...");

            // Intentar crear la hoja Bugs
            try {
                if (typeof obtenerOCrearHojaBugs === "function") {
                    hojaBugs = obtenerOCrearHojaBugs(spreadsheet);
                    Logger.log("✅ Hoja Bugs creada");
                } else {
                    Logger.log(
                        "❌ Función obtenerOCrearHojaBugs no disponible"
                    );
                }
            } catch (createError) {
                Logger.log(
                    "❌ Error creando hoja Bugs: " + createError.toString()
                );
            }

            // Si aún no existe, retornar lista vacía
            if (hojaBugs === null) {
                return {
                    success: true,
                    data: {
                        bugs: [],
                        total: 0,
                    },
                    mensaje: "Hoja Bugs no existe en el spreadsheet",
                };
            }
        }

        Logger.log("✅ Hoja Bugs encontrada");

        var datos = hojaBugs.getDataRange().getValues();
        Logger.log("📊 Filas totales en hoja Bugs: " + datos.length);

        if (datos.length <= 1) {
            Logger.log("⚠️ Hoja Bugs está vacía (solo headers o sin datos)");
            return {
                success: true,
                data: {
                    bugs: [],
                    total: 0,
                },
                mensaje: "Hoja Bugs no tiene datos",
            };
        }

        var headers = datos[0];
        Logger.log("📋 Headers detectados: " + headers.join(", "));
        var bugs = [];

        // Convertir filas a objetos y sanitizar datos
        for (var i = 1; i < datos.length; i++) {
            var bug = {};
            for (var j = 0; j < headers.length; j++) {
                var valor = datos[i][j];

                // Convertir undefined a null (evita problemas de serialización)
                if (valor === undefined) {
                    valor = null;
                }

                // Convertir Date a string ISO (evita problemas de serialización)
                if (valor instanceof Date) {
                    valor = valor.toISOString();
                }

                // Truncar campos de texto largo para evitar exceder límites de Apps Script
                if (typeof valor === "string" && valor.length > 1000) {
                    valor = valor.substring(0, 997) + "...";
                }

                // Sanitizar strings (remover caracteres de control que pueden romper JSON)
                if (typeof valor === "string") {
                    // Remover caracteres null, control characters, etc.
                    valor = valor.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
                }

                bug[headers[j]] = valor;
            }
            bugs.push(bug);
        }

        Logger.log("   Total bugs antes de filtros: " + bugs.length);

        // Aplicar filtros si existen
        if (filtros) {
            bugs = aplicarFiltrosBugs(bugs, filtros);
            Logger.log("   Total bugs después de filtros: " + bugs.length);
        }

        // Crear objeto de respuesta limpio y serializable
        var respuesta = {
            success: true,
            data: {
                bugs: bugs,
                total: bugs.length,
            },
        };

        // Verificar que sea serializable (test de seguridad)
        try {
            var test = JSON.stringify(respuesta);
            Logger.log(
                "✅ Respuesta serializable. Tamaño: " + test.length + " bytes"
            );
        } catch (jsonError) {
            Logger.log("⚠️ Error de serialización: " + jsonError.toString());
            // Si falla, retornar versión simplificada
            return {
                success: false,
                mensaje:
                    "Error: Los datos no pueden serializarse. Contacta al administrador.",
            };
        }

        return respuesta;
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
 * Obtiene un bug por ID y retorna su información básica incluyendo link de Trello
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} bugId - ID del bug
 * @returns {Object} Datos básicos del bug con link de Trello
 */
function obtenerBugPorId(sheetUrl, bugId) {
    try {
        Logger.log("🔍 Obteniendo bug por ID: " + bugId);

        var resultado = obtenerDetalleBug(sheetUrl, bugId);

        if (!resultado.success) {
            return resultado;
        }

        var bug = resultado.data;

        return {
            success: true,
            data: {
                id: bug.ID,
                titulo: bug.Titulo,
                linkTrello: bug.LinkTrello || "",
                trelloCardId: bug.TrelloCardId || "",
                severidad: bug.Severidad,
                estado: bug.Estado,
            },
        };
    } catch (error) {
        Logger.log("❌ Error en obtenerBugPorId: " + error.toString());
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

                    // Si no encuentra la columna exacta, intentar buscar una columna relacionada con 'trello' (fallback)
                    if (colIndex === -1) {
                        var campoLower = String(campo || "").toLowerCase();
                        if (campoLower.indexOf("trello") > -1) {
                            for (var hh = 0; hh < headers.length; hh++) {
                                if (
                                    String(headers[hh] || "")
                                        .toLowerCase()
                                        .indexOf("trello") > -1
                                ) {
                                    colIndex = hh;
                                    break;
                                }
                            }
                        }
                    }

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
 * Cambia el estado del bug y opcionalmente realiza una acción en Trello
 * @param {string} sheetUrl
 * @param {string} bugId
 * @param {string} nuevoEstado
 * @param {string} trelloAction - 'none' | 'move' | 'archive' | 'create_and_move'
 * @param {string} targetListId - ID de la lista destino (opcional)
 * @param {string} targetBoardId - ID del tablero destino (opcional, usado si se crea card)
 */
function cambiarEstadoBugConTrello(
    sheetUrl,
    bugId,
    nuevoEstado,
    trelloAction,
    targetListId,
    targetBoardId
) {
    try {
        Logger.log(
            "🔄 cambiarEstadoBugConTrello: " +
                bugId +
                " -> " +
                nuevoEstado +
                " action: " +
                trelloAction
        );

        // 1) Actualizar estado en Sheets
        var resEstado = cambiarEstadoBug(sheetUrl, bugId, nuevoEstado);
        if (!resEstado || !resEstado.success) {
            return {
                success: false,
                mensaje:
                    "No se pudo actualizar estado: " +
                    (resEstado && resEstado.mensaje ? resEstado.mensaje : ""),
            };
        }

        // 2) Si no hay acción de Trello, devolver éxito inmediato
        if (!trelloAction || trelloAction === "none") {
            return {
                success: true,
                mensaje: "Estado actualizado (sin acción Trello)",
            };
        }

        // 3) Obtener detalle del bug para saber si hay TrelloCardID
        var detalle = obtenerDetalleBug(sheetUrl, bugId);
        if (!detalle || !detalle.success) {
            return {
                success: false,
                mensaje:
                    "Estado cambiado, pero no se pudo obtener detalle del bug: " +
                    (detalle && detalle.mensaje ? detalle.mensaje : ""),
            };
        }

        var bug = detalle.data || {};
        var cardId =
            bug.TrelloCardID || bug.TrelloCardId || bug.trelloCardId || "";

        // 4) Ejecutar acción Trello
        var trelloResult = { success: true, accion: trelloAction };

        if (trelloAction === "move") {
            if (!targetListId) {
                trelloResult = {
                    success: false,
                    mensaje: "targetListId requerido para mover",
                };
            } else if (cardId && cardId !== "") {
                trelloResult = moverCardTrello(cardId, targetListId);
            } else {
                // No hay cardId: intentar crear card y luego mover no es necesario (crearCardTrello crea en la lista)
                // Para crear necesitamos targetBoardId to manage labels; si no se proporciona, pass empty and rely on Trello minimal creation
                try {
                    var datosBugParaTrello = {
                        id: bugId,
                        titulo: bug.Titulo || bug.Title || "",
                        descripcion: bug.Descripcion || bug.Descripcion || "",
                        severidad: bug.Severidad || "",
                        prioridad: bug.Prioridad || "",
                        precondiciones: bug.Precondiciones || "",
                        datosPrueba: bug.DatosPrueba || "",
                        pasosReproducir: bug.PasosReproducir || "",
                        resultadoEsperado: bug.ResultadoEsperado || "",
                        resultadoObtenido: bug.ResultadoObtenido || "",
                        ambiente: bug.Ambiente || "",
                        navegador: bug.Navegador || "",
                        etiquetas: bug.Etiquetas || "",
                        notas: bug.Notas || "",
                        evidencias: bug.Evidencias || [],
                    };

                    trelloResult = crearCardTrello(
                        datosBugParaTrello,
                        targetListId,
                        [],
                        targetBoardId || null,
                        null
                    );

                    // Si se creó la card, actualizar el bug en Sheets con TrelloCardID y URL
                    if (
                        trelloResult &&
                        trelloResult.success &&
                        trelloResult.data &&
                        trelloResult.data.cardId
                    ) {
                        try {
                            actualizarBug(sheetUrl, bugId, {
                                TrelloCardID: trelloResult.data.cardId,
                                TrelloCardURL:
                                    trelloResult.data.cardUrl ||
                                    trelloResult.data.cardShortUrl ||
                                    "",
                                LinkTrello:
                                    trelloResult.data.cardUrl ||
                                    trelloResult.data.cardShortUrl ||
                                    "",
                            });
                        } catch (e) {
                            Logger.log(
                                "⚠️ Error actualizando bug con info Trello: " +
                                    e.toString()
                            );
                        }
                    }
                } catch (e) {
                    trelloResult = {
                        success: false,
                        mensaje:
                            "Error creando card en Trello: " + e.toString(),
                    };
                }
            }
        } else if (trelloAction === "archive" || trelloAction === "archivar") {
            if (cardId && cardId !== "") {
                trelloResult = archivarCardTrello(cardId);
            } else {
                trelloResult = {
                    success: false,
                    mensaje: "No existe TrelloCardID para archivar",
                };
            }
        } else if (trelloAction === "create_and_move") {
            // alias para crear card en targetListId
            if (!targetListId) {
                trelloResult = {
                    success: false,
                    mensaje: "targetListId requerido para crear card",
                };
            } else {
                try {
                    var datosBugParaTrello2 = {
                        id: bugId,
                        titulo: bug.Titulo || "",
                        descripcion: bug.Descripcion || "",
                        severidad: bug.Severidad || "",
                        prioridad: bug.Prioridad || "",
                        etiquetas: bug.Etiquetas || "",
                    };
                    trelloResult = crearCardTrello(
                        datosBugParaTrello2,
                        targetListId,
                        [],
                        targetBoardId || null,
                        null
                    );
                    if (
                        trelloResult &&
                        trelloResult.success &&
                        trelloResult.data &&
                        trelloResult.data.cardId
                    ) {
                        try {
                            actualizarBug(sheetUrl, bugId, {
                                TrelloCardID: trelloResult.data.cardId,
                                TrelloCardURL:
                                    trelloResult.data.cardUrl ||
                                    trelloResult.data.cardShortUrl ||
                                    "",
                                LinkTrello:
                                    trelloResult.data.cardUrl ||
                                    trelloResult.data.cardShortUrl ||
                                    "",
                            });
                        } catch (e) {
                            Logger.log(
                                "⚠️ Error actualizando bug con info Trello (create): " +
                                    e.toString()
                            );
                        }
                    }
                } catch (e) {
                    trelloResult = {
                        success: false,
                        mensaje: "Error creando card: " + e.toString(),
                    };
                }
            }
        } else {
            trelloResult = {
                success: false,
                mensaje: "Acción Trello no reconocida",
            };
        }

        // Construir resultado final
        return {
            success: true,
            mensaje:
                "Estado actualizado. Acción Trello ejecutada (ver detalle).",
            trello: trelloResult,
        };
    } catch (error) {
        Logger.log("❌ Error cambiarEstadoBugConTrello: " + error.toString());
        return {
            success: false,
            mensaje: "Error cambiarEstadoBugConTrello: " + error.message,
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
            return { success: false, mensaje: resultado.mensaje };
        }
        var bugs = resultado.data || [];
        var abiertos = [];
        bugs.forEach(function (b) {
            var estado = (b.Estado || b.estado || "").toString().toUpperCase();
            if (estado !== "CERRADO") {
                abiertos.push(b);
            }
        });
        return {
            success: true,
            data: abiertos,
            cantidadAbiertos: abiertos.length,
        };
    } catch (e) {
        Logger.log("❌ Error validarBugsAbiertosDeCaso: " + e.toString());
        return {
            success: false,
            mensaje: "Error validarBugsAbiertosDeCaso: " + e.message,
        };
    }
}
function obtenerCasosNoOkPorBug(sheetUrl, bugId) {
    try {
        Logger.log("🔍 obtenerCasosNoOkPorBug para bug: " + bugId);
        var detalle = obtenerDetalleBug(sheetUrl, bugId);
        if (!detalle || !detalle.success) {
            return {
                success: false,
                mensaje: "No se pudo obtener detalle del bug",
            };
        }
        var bug = detalle.data || {};
        var relacionadosRaw =
            bug.CasosRelacionados || bug.casosRelacionados || "";
        if (!relacionadosRaw || relacionadosRaw.trim() === "") {
            return {
                success: true,
                data: {
                    totalRelacionados: 0,
                    casosNoOk: [],
                },
                mensaje: "Bug sin casos relacionados",
            };
        }
        var ids = relacionadosRaw
            .split(",")
            .map(function (x) {
                return x.trim();
            })
            .filter(function (x) {
                return x !== "";
            });
        if (!ids.length) {
            return {
                success: true,
                data: { totalRelacionados: 0, casosNoOk: [] },
                mensaje: "Bug sin casos relacionados válidos",
            };
        }

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var hojasExcluidas = ["Config", "Bugs", "Ejecuciones", "Regresiones"]; // mismas exclusiones que actualizarCaso
        var sheets = spreadsheet.getSheets();
        var casosNoOk = [];
        var idsSet = {};
        ids.forEach(function (id) {
            idsSet[id] = true;
        });

        sheets.forEach(function (hoja) {
            var nombreHoja = hoja.getName();
            if (hojasExcluidas.indexOf(nombreHoja) > -1) return;
            var datos = hoja.getDataRange().getValues();
            if (datos.length <= 1) return;
            var headers = datos[0];
            var idxID = headers.indexOf("ID");
            if (idxID === -1) return;
            var idxTitulo = headers.indexOf("Titulo");
            if (idxTitulo === -1) idxTitulo = headers.indexOf("Título");
            var idxResultado = headers.indexOf("ResultadoUltimaEjecucion");
            if (idxResultado === -1)
                idxResultado = headers.indexOf("ResultadoÚltimaEjecucion");

            for (var i = 1; i < datos.length; i++) {
                var idCaso = datos[i][idxID];
                if (!idsSet[idCaso]) continue;
                var resultado = idxResultado > -1 ? datos[i][idxResultado] : "";
                var tituloCaso =
                    idxTitulo > -1 ? datos[i][idxTitulo] : "(Sin título)";
                // Considerar no OK si distinto de 'OK'
                if ((resultado + "").toUpperCase() !== "OK") {
                    casosNoOk.push({
                        ID: idCaso,
                        Titulo: tituloCaso,
                        ResultadoUltimaEjecucion: resultado || "Sin ejecutar",
                        Hoja: nombreHoja,
                    });
                }
            }
        });

        return {
            success: true,
            data: {
                totalRelacionados: ids.length,
                casosNoOk: casosNoOk,
            },
            mensaje: "Casos no OK obtenidos",
        };
    } catch (e) {
        Logger.log("❌ Error obtenerCasosNoOkPorBug: " + e.toString());
        return { success: false, mensaje: "Error: " + e.message };
    }
}

/**
 * Marca en 'OK' los casos indicados (array de IDs) actualizando ResultadoUltimaEjecucion y FechaUltimaEjecucion.
 */
function marcarCasosOk(sheetUrl, casoIds) {
    try {
        Logger.log("🔄 marcarCasosOk: " + JSON.stringify(casoIds));
        if (!casoIds || !casoIds.length) {
            return {
                success: true,
                data: { actualizados: 0 },
                mensaje: "Sin casos a actualizar",
            };
        }
        var actualizados = 0;
        casoIds.forEach(function (cid) {
            if (!cid) return;
            var r = actualizarCaso(sheetUrl, cid, {
                ResultadoUltimaEjecucion: "OK",
                FechaUltimaEjecucion: new Date(),
            });
            if (r && r.success) actualizados++;
        });
        return {
            success: true,
            data: { actualizados: actualizados, solicitados: casoIds.length },
            mensaje: "Casos marcados OK",
        };
    } catch (e) {
        Logger.log("❌ Error marcarCasosOk: " + e.toString());
        return { success: false, mensaje: "Error: " + e.message };
    }
}

/**
 * Valida si un caso tiene bugs abiertos
 * @param {string} sheetUrl - URL del Sheet
 * @param {string} casoId - ID del caso
 * @returns {Object} Resultado con lista de bugs abiertos
 */
function validarBugsAbiertosDeCaso_INTERNAL(sheetUrl, casoId) {
    try {
        Logger.log("🔍 Validando bugs abiertos del caso: " + casoId);
        var resultado = obtenerBugsPorCaso(sheetUrl, casoId);
        if (!resultado.success) {
            return { success: false, mensaje: resultado.mensaje };
        }
        var bugs = resultado.data || [];
        var abiertos = [];
        bugs.forEach(function (b) {
            var estado = (b.Estado || b.estado || "").toString().toUpperCase();
            if (estado !== "CERRADO") {
                abiertos.push(b);
            }
        });
        return {
            success: true,
            data: abiertos,
            cantidadAbiertos: abiertos.length,
        };
    } catch (e) {
        Logger.log("❌ Error validarBugsAbiertosDeCaso: " + e.toString());
        return { success: false, mensaje: "Error: " + e.message };
    }
}

/**
 * Obtiene bugs asociados a un caso de prueba
 */
function obtenerBugsPorCaso(sheetUrl, casoId) {
    try {
        Logger.log("🔍 Obteniendo bugs del caso: " + casoId);
        var resultado = listarBugs(sheetUrl);
        if (!resultado.success) {
            return resultado;
        }

        var todosLosBugs = resultado.data.bugs || [];
        var bugsDelCaso = todosLosBugs.filter(function (bug) {
            var casosRel = bug.CasosRelacionados || "";
            if (!casosRel) return false;
            var ids = casosRel.split(",").map(function (id) {
                return id.trim();
            });
            return ids.indexOf(casoId) > -1;
        });

        // Filtrar solo bugs abiertos
        var bugsAbiertos = bugsDelCaso.filter(function (bug) {
            return bug.Estado === "Abierto" && bug.EliminadoPorUsuario !== "Si";
        });

        Logger.log("   Bugs abiertos encontrados: " + bugsAbiertos.length);

        return {
            success: true,
            data: {
                tieneBugsAbiertos: bugsAbiertos.length > 0,
                bugsAbiertos: bugsAbiertos,
                cantidad: bugsAbiertos.length,
                bugs: bugsDelCaso,
            },
        };
    } catch (error) {
        Logger.log("❌ Error obteniendo bugs por caso: " + error.toString());
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
