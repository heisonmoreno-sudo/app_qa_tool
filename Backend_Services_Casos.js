// ===================================================================
// BACKEND_SERVICES_CASOS.GS
// Servicio para gestión de casos de prueba
// VERSIÓN 3.0: IDs simplificados + Mover casos entre hojas
// ===================================================================

/**
 * Lista casos de prueba con filtros opcionales
 */
function listarCasos(sheetUrl, filtros) {
    Logger.log("════════════════════════════════════");
    Logger.log("🔵 listarCasos EJECUTÁNDOSE");
    Logger.log("🔵 URL recibida: " + sheetUrl);
    Logger.log("🔵 Filtros: " + JSON.stringify(filtros));
    Logger.log("════════════════════════════════════");

    if (
        !sheetUrl ||
        sheetUrl === "" ||
        sheetUrl === null ||
        sheetUrl === undefined
    ) {
        Logger.log("❌ CRITICAL: sheetUrl es inválida");
        return {
            success: false,
            mensaje: "URL del Sheet no proporcionada",
            error: "sheetUrl is null, undefined or empty",
        };
    }

    try {
        var spreadsheet;
        try {
            spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
            Logger.log(
                "✅ Spreadsheet abierto correctamente: " + spreadsheet.getName()
            );
        } catch (errorSpreadsheet) {
            Logger.log(
                "ERROR al abrir spreadsheet: " + errorSpreadsheet.toString()
            );
            return {
                success: false,
                mensaje:
                    "No se pudo abrir el Google Sheet. Verifica la URL y los permisos.",
            };
        }

        var todosCasos = [];

        if (filtros && filtros.excluirRegresiones) {
            Logger.log("Modo: Cargar TODOS los casos (excepto Regresiones)");

            var todasLasHojas = spreadsheet.getSheets();
            Logger.log("Total de hojas en el Sheet: " + todasLasHojas.length);

            var hojasExcluidas = [
                "Config",
                "Bugs",
                "Ejecuciones",
                "Regresiones",
            ];

            todasLasHojas.forEach(function (hoja) {
                var nombreHoja = hoja.getName();
                if (hojasExcluidas.indexOf(nombreHoja) === -1) {
                    Logger.log("Revisando hoja: " + nombreHoja);
                    var datos = hoja.getDataRange().getValues();
                    if (datos.length > 1) {
                        var headers = datos[0];
                        var indexID = headers.indexOf("ID");
                        if (indexID > -1) {
                            Logger.log(
                                "✅ Hoja de casos detectada: " +
                                    nombreHoja +
                                    " (tiene " +
                                    (datos.length - 1) +
                                    " filas)"
                            );
                            for (var i = 1; i < datos.length; i++) {
                                var caso = {};
                                for (var j = 0; j < headers.length; j++) {
                                    var valor = datos[i][j];
                                    if (valor instanceof Date) {
                                        caso[headers[j]] = valor.toISOString();
                                    } else {
                                        caso[headers[j]] = valor;
                                    }
                                }
                                todosCasos.push(caso);
                            }
                        }
                    }
                }
            });
        }

        // Excluir casos eliminados por defecto
        if (!filtros || !filtros.incluirEliminados) {
            var casosAntesExcluir = todosCasos.length;
            todosCasos = todosCasos.filter(function (caso) {
                // Soportar ambos nombres de columna: EstadoDiseño (nuevo) y Estado (legacy)
                var estado = caso.EstadoDiseño || caso.Estado;
                return estado !== "Eliminado";
            });
            Logger.log(
                "Casos después de excluir eliminados: " +
                    todosCasos.length +
                    " (antes: " +
                    casosAntesExcluir +
                    ")"
            );
        }

        if (filtros) {
            var casosAntesFiltros = todosCasos.length;
            todosCasos = aplicarFiltrosCasos(todosCasos, filtros);
            Logger.log(
                "Casos después de filtros: " +
                    todosCasos.length +
                    " (antes: " +
                    casosAntesFiltros +
                    ")"
            );
        }

        Logger.log("=== FIN listarCasos - ÉXITO ===");

        var resultado = {
            success: true,
            data: {
                casos: todosCasos,
                total: todosCasos.length,
            },
        };

        try {
            var resultadoLimpio = JSON.parse(JSON.stringify(resultado));
            Logger.log(
                "📤 Retornando al frontend: " +
                    resultadoLimpio.data.total +
                    " casos"
            );
            return resultadoLimpio;
        } catch (errorSerializacion) {
            Logger.log("⚠️ Error en serialización, retornando objeto simple");
            return {
                success: true,
                data: {
                    casos: todosCasos,
                    total: todosCasos.length,
                },
            };
        }
    } catch (error) {
        Logger.log("=== ERROR CRÍTICO en listarCasos ===");
        Logger.log("Tipo de error: " + error.name);
        Logger.log("Mensaje: " + error.message);
        Logger.log("Stack: " + error.stack);

        return {
            success: false,
            mensaje: "Error al listar casos: " + error.message,
            detalles: error.toString(),
        };
    }
}

/**
 * Aplica filtros a la lista de casos
 */
function aplicarFiltrosCasos(casos, filtros) {
    var resultado = casos;

    if (filtros.busqueda && filtros.busqueda !== "") {
        var busqueda = filtros.busqueda.toLowerCase();
        resultado = resultado.filter(function (caso) {
            var titulo = (caso.Titulo || "").toLowerCase();
            var descripcion = (caso.Descripcion || "").toLowerCase();
            return (
                titulo.indexOf(busqueda) > -1 ||
                descripcion.indexOf(busqueda) > -1
            );
        });
    }

    if (filtros.hoja && filtros.hoja !== "Todas") {
        resultado = resultado.filter(function (caso) {
            return caso.Hoja === filtros.hoja;
        });
    }

    if (filtros.prioridad && filtros.prioridad !== "Todas") {
        resultado = resultado.filter(function (caso) {
            // Normalizar para comparación (manejar con y sin acento)
            var prioridadCaso = (caso.Prioridad || "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
            var prioridadFiltro = (filtros.prioridad || "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
            return prioridadCaso === prioridadFiltro;
        });
    }

    if (filtros.estado && filtros.estado !== "Todos") {
        resultado = resultado.filter(function (caso) {
            return caso.Estado === filtros.estado;
        });
    }

    if (filtros.soloCandidatosRegresion === true) {
        resultado = resultado.filter(function (caso) {
            return (
                caso.CandidatoRegresion === "Si" ||
                caso.CandidatoRegresion === "Sí"
            );
        });
    }

    return resultado;
}

/**
 * Obtiene detalle completo de un caso específico
 */
function obtenerDetalleCaso(sheetUrl, casoId) {
    try {
        Logger.log("🔍 Obteniendo detalle de caso: " + casoId);

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var hojasExcluidas = ["Config", "Bugs", "Ejecuciones", "Regresiones"];
        var todasLasHojas = spreadsheet.getSheets();

        for (var h = 0; h < todasLasHojas.length; h++) {
            var hoja = todasLasHojas[h];
            var nombreHoja = hoja.getName();

            if (hojasExcluidas.indexOf(nombreHoja) > -1) {
                continue;
            }

            var datos = hoja.getDataRange().getValues();
            if (datos.length <= 1) continue;

            var headers = datos[0];
            var indexID = headers.indexOf("ID");

            if (indexID === -1) continue;

            for (var i = 1; i < datos.length; i++) {
                if (datos[i][indexID] === casoId) {
                    var caso = {};
                    for (var j = 0; j < headers.length; j++) {
                        var valor = datos[i][j];

                        if (valor instanceof Date) {
                            caso[headers[j]] = valor.toISOString();
                        } else {
                            caso[headers[j]] = valor;
                        }
                    }

                    Logger.log("✅ Caso encontrado en hoja: " + nombreHoja);

                    return {
                        success: true,
                        data: caso,
                    };
                }
            }
        }

        Logger.log("❌ Caso no encontrado: " + casoId);
        return {
            success: false,
            mensaje: "Caso no encontrado",
        };
    } catch (error) {
        Logger.log("❌ Error obteniendo caso: " + error.toString());
        return {
            success: false,
            mensaje: "Error al obtener caso: " + error.message,
        };
    }
}

/**
 * Actualiza un caso existente
 */
function actualizarCaso(sheetUrl, casoId, datosActualizados) {
    try {
        Logger.log("✏️ Actualizando caso: " + casoId);
        Logger.log("Datos a actualizar: " + JSON.stringify(datosActualizados));

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var hojasExcluidas = ["Config", "Bugs", "Ejecuciones", "Regresiones"];
        var todasLasHojas = spreadsheet.getSheets();

        for (var h = 0; h < todasLasHojas.length; h++) {
            var hoja = todasLasHojas[h];
            var nombreHoja = hoja.getName();

            if (hojasExcluidas.indexOf(nombreHoja) > -1) {
                continue;
            }

            var datos = hoja.getDataRange().getValues();
            if (datos.length <= 1) continue;

            var headers = datos[0];
            var indexID =
                typeof findHeaderIndex === "function"
                    ? findHeaderIndex(headers, "ID")
                    : headers.indexOf("ID");

            if (indexID === -1) continue;

            for (var i = 1; i < datos.length; i++) {
                if (datos[i][indexID] === casoId) {
                    Logger.log(
                        "✅ Caso encontrado en hoja: " +
                            nombreHoja +
                            ", fila: " +
                            (i + 1)
                    );

                    for (var campo in datosActualizados) {
                        var colIndex =
                            typeof findHeaderIndex === "function"
                                ? findHeaderIndex(headers, campo)
                                : headers.indexOf(campo);
                        if (colIndex > -1) {
                            var valor = datosActualizados[campo];

                            if (
                                campo.indexOf("Fecha") > -1 &&
                                typeof valor === "string"
                            ) {
                                try {
                                    valor = new Date(valor);
                                } catch (e) {
                                    // Mantener como string si falla
                                }
                            }

                            hoja.getRange(i + 1, colIndex + 1).setValue(valor);
                            Logger.log(
                                "  ✓ Campo actualizado: " +
                                    campo +
                                    " = " +
                                    valor
                            );
                        }
                    }

                    Logger.log("✅ Caso actualizado exitosamente");

                    return {
                        success: true,
                        mensaje: "Caso actualizado exitosamente",
                    };
                }
            }
        }

        Logger.log("❌ Caso no encontrado: " + casoId);
        return {
            success: false,
            mensaje: "Caso no encontrado",
        };
    } catch (error) {
        Logger.log("❌ Error actualizando caso: " + error.toString());
        return {
            success: false,
            mensaje: "Error al actualizar caso: " + error.message,
        };
    }
}

/**
 * NUEVA FUNCIÓN: Mueve un caso de una hoja a otra
 * Mantiene el ID pero cambia la ubicación física
 */
function moverCaso(sheetUrl, casoId, hojaDestino) {
    try {
        Logger.log("📦 Moviendo caso " + casoId + " a hoja: " + hojaDestino);

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);

        // 1. Buscar el caso en todas las hojas
        var casoCompleto = buscarCasoEnTodasLasHojas(spreadsheet, casoId);

        if (!casoCompleto) {
            Logger.log("❌ Caso no encontrado");
            return {
                success: false,
                mensaje: "Caso no encontrado",
            };
        }

        var hojaOrigen = casoCompleto.hoja;
        var filaCaso = casoCompleto.fila;
        var datosCaso = casoCompleto.datos;

        Logger.log(
            "Caso encontrado en hoja: " +
                hojaOrigen.getName() +
                ", fila: " +
                filaCaso
        );

        // 2. Verificar que hoja destino existe
        var hojaDestinoSheet = spreadsheet.getSheetByName(hojaDestino);

        if (!hojaDestinoSheet) {
            Logger.log("❌ Hoja destino no existe");
            return {
                success: false,
                mensaje: 'La hoja destino "' + hojaDestino + '" no existe',
            };
        }

        // 3. No mover si ya está en la hoja destino
        if (hojaOrigen.getName() === hojaDestino) {
            Logger.log("⚠️ El caso ya está en la hoja destino");
            return {
                success: false,
                mensaje: 'El caso ya está en la hoja "' + hojaDestino + '"',
            };
        }

        // 4. Actualizar campo "Hoja" en los datos
        var headers = hojaOrigen
            .getRange(1, 1, 1, hojaOrigen.getLastColumn())
            .getValues()[0];
        var indexHoja = headers.indexOf("Hoja");
        var indexNotas = headers.indexOf("Notas");

        if (indexHoja > -1) {
            datosCaso[indexHoja] = hojaDestino;
        }

        // 5. Agregar nota de movimiento
        if (indexNotas > -1) {
            var notaAnterior = datosCaso[indexNotas] || "";
            var fecha = new Date().toLocaleDateString("es-ES");
            var notaMovimiento =
                'Movido desde "' + hojaOrigen.getName() + '" el ' + fecha;
            datosCaso[indexNotas] = notaAnterior
                ? notaAnterior + " | " + notaMovimiento
                : notaMovimiento;
        }

        // 6. Copiar caso a hoja destino
        var headersDestino = hojaDestinoSheet
            .getRange(1, 1, 1, hojaDestinoSheet.getLastColumn())
            .getValues()[0];
        var headersOrigen = headers;
        var mapOrigen = {};
        for (var hIdx = 0; hIdx < headersOrigen.length; hIdx++) {
            mapOrigen[headersOrigen[hIdx]] = datosCaso[hIdx];
        }
        mapOrigen["Hoja"] = hojaDestino;
        var filaDestino = [];
        for (var dIdx = 0; dIdx < headersDestino.length; dIdx++) {
            var clave = headersDestino[dIdx];
            filaDestino.push(
                mapOrigen.hasOwnProperty(clave) ? mapOrigen[clave] : ""
            );
        }
        hojaDestinoSheet.appendRow(filaDestino);
        Logger.log("✓ Caso copiado a hoja destino");

        // 7. Eliminar caso de hoja origen
        hojaOrigen.deleteRow(filaCaso);
        Logger.log("✓ Caso eliminado de hoja origen");

        Logger.log("✅ Caso movido exitosamente");

        return {
            success: true,
            mensaje:
                'Caso movido exitosamente de "' +
                hojaOrigen.getName() +
                '" a "' +
                hojaDestino +
                '"',
            data: {
                casoId: casoId,
                hojaOrigen: hojaOrigen.getName(),
                hojaDestino: hojaDestino,
            },
        };
    } catch (error) {
        Logger.log("❌ Error moviendo caso: " + error.toString());
        return {
            success: false,
            mensaje: "Error al mover caso: " + error.message,
        };
    }
}

/**
 * Busca un caso en todas las hojas y retorna su ubicación
 */
function buscarCasoEnTodasLasHojas(spreadsheet, casoId) {
    var hojasExcluidas = ["Config", "Bugs", "Ejecuciones", "Regresiones"];
    var todasLasHojas = spreadsheet.getSheets();

    for (var h = 0; h < todasLasHojas.length; h++) {
        var hoja = todasLasHojas[h];

        if (hojasExcluidas.indexOf(hoja.getName()) > -1) {
            continue;
        }

        var datos = hoja.getDataRange().getValues();
        if (datos.length <= 1) continue;

        var headers = datos[0];
        var indexID = headers.indexOf("ID");

        if (indexID === -1) continue;

        for (var i = 1; i < datos.length; i++) {
            if (datos[i][indexID] === casoId) {
                return {
                    hoja: hoja,
                    fila: i + 1,
                    datos: datos[i],
                };
            }
        }
    }

    return null;
}

/**
 * Elimina un caso (soft delete)
 */
function eliminarCaso(sheetUrl, casoId) {
    try {
        Logger.log("🗑️ Eliminando caso (soft delete): " + casoId);

        var usuario = Session.getActiveUser().getEmail();
        var fechaEliminacion = new Date().toISOString();

        // Marcar como eliminado en lugar de borrar la fila
        return actualizarCaso(sheetUrl, casoId, {
            EstadoDiseño: "Eliminado",
            Estado: "Eliminado",
            Notas: "Eliminado el " + fechaEliminacion + " por " + usuario,
        });
    } catch (error) {
        Logger.log("❌ Error eliminando caso: " + error.toString());
        return {
            success: false,
            mensaje: "Error al eliminar caso: " + error.message,
        };
    }
}

/**
 * Restaura un caso eliminado
 */
function restaurarCaso(sheetUrl, casoId) {
    try {
        Logger.log("↩️ Restaurando caso: " + casoId);

        var usuario = Session.getActiveUser().getEmail();
        var fechaRestauracion = new Date().toISOString();

        return actualizarCaso(sheetUrl, casoId, {
            EstadoDiseño: "Pendiente",
            Estado: "Pendiente",
            Notas: "Restaurado el " + fechaRestauracion + " por " + usuario,
        });
    } catch (error) {
        Logger.log("❌ Error restaurando caso: " + error.toString());
        return {
            success: false,
            mensaje: "Error al restaurar caso: " + error.message,
        };
    }
}

/**
 * Crea un nuevo caso de prueba
 * ACTUALIZADO: IDs simplificados sin prefijo de hoja
 */
function crearCaso(datosCaso) {
    try {
        Logger.log("Creando caso: " + datosCaso.titulo);

        var spreadsheet = SpreadsheetApp.openByUrl(datosCaso.sheetUrl);
        var hojaConfig = spreadsheet.getSheetByName("Config");

        var nombreHojaDestino = datosCaso.hoja || "Casos";
        var hojaCasos = spreadsheet.getSheetByName(nombreHojaDestino);

        if (hojaCasos === null) {
            Logger.log(
                "Hoja " +
                    nombreHojaDestino +
                    " no existe, usando Casos por defecto"
            );
            nombreHojaDestino = "Casos";
            hojaCasos = spreadsheet.getSheetByName("Casos");
        }

        if (hojaCasos === null) {
            return {
                success: false,
                mensaje: "No se encontró la hoja de Casos",
            };
        }

        // CAMBIO: ID simplificado
        var nuevoId = generarIdCasoSimplificado(hojaConfig);
        var casoURI = generarCasoURI(spreadsheet.getId(), nuevoId);
        var usuario = Session.getActiveUser().getEmail();

        // En la función crearCaso(), REEMPLAZAR el array 'fila' por esto:

        var fila = [
            nuevoId, // A - ID
            nombreHojaDestino, // B - Hoja
            datosCaso.titulo, // C - Titulo
            datosCaso.descripcion, // D - Descripcion
            datosCaso.formatoCaso, // E - Formato
            datosCaso.prioridad, // F - Prioridad
            datosCaso.tipoPrueba || "Funcional", // G - TipoPrueba
            datosCaso.pasos || "", // H - Pasos
            datosCaso.resultadoEsperado || "", // I - ResultadoEsperado
            datosCaso.scenarioGiven || "", // J - ScenarioGiven
            datosCaso.scenarioWhen || "", // K - ScenarioWhen
            datosCaso.scenarioThen || "", // L - ScenarioThen
            datosCaso.precondiciones || "", // M - Precondiciones
            datosCaso.candidatoRegresion ? "Si" : "No", // N - CandidatoRegresion
            "Pendiente", // O - EstadoDiseño
            new Date(), // P - FechaCreacion
            usuario, // Q - CreadoPor
            "", // R - FechaUltimaEjecucion
            "Sin ejecutar", // S - ResultadoUltimaEjecucion ← CORREGIDO
            "", // T - ComentariosEjecucion (NUEVO)
            "", // U - EvidenciasURL (NUEVO)
            "", // V - Ambiente
            "", // W - Navegador
            "", // X - LinkTrelloHU
            "", // Y - LinkBugRelacionado
            casoURI, // Z - CasoURI
            "", // AA - Notas
        ];

        // Alinear fila de creación al orden de headers de la hoja destino
        var headersDestino = hojaCasos
            .getRange(1, 1, 1, hojaCasos.getLastColumn())
            .getValues()[0];
        var obj = {
            ID: nuevoId,
            Hoja: nombreHojaDestino,
            Titulo: datosCaso.titulo,
            Descripcion: datosCaso.descripcion,
            Formato: datosCaso.formatoCaso,
            Prioridad: datosCaso.prioridad,
            TipoPrueba: datosCaso.tipoPrueba || "Funcional",
            Pasos: datosCaso.pasos || "",
            ResultadoEsperado: datosCaso.resultadoEsperado || "",
            ScenarioGiven: datosCaso.scenarioGiven || "",
            ScenarioWhen: datosCaso.scenarioWhen || "",
            ScenarioThen: datosCaso.scenarioThen || "",
            Precondiciones: datosCaso.precondiciones || "",
            CandidatoRegresion: datosCaso.candidatoRegresion ? "Si" : "No",
            EstadoDiseño: datosCaso.estadoDiseño || "Pendiente",
            Estado: datosCaso.estadoDiseño || "Pendiente",
            FechaCreacion: new Date(),
            CreadoPor: usuario,
            FechaUltimaEjecucion: "",
            ResultadoUltimaEjecucion: "Sin ejecutar",
            ComentariosEjecucion: "",
            EvidenciasURL: "",
            Ambiente: "",
            Navegador: "",
            LinkTrelloHU: "",
            LinkBugRelacionado: "",
            CasoURI: casoURI,
            Notas: "",
        };
        var filaDestino = [];
        for (var d = 0; d < headersDestino.length; d++) {
            var clave = headersDestino[d];
            filaDestino.push(obj.hasOwnProperty(clave) ? obj[clave] : "");
        }
        hojaCasos.appendRow(filaDestino);

        Logger.log("Caso creado exitosamente: " + nuevoId);

        return {
            success: true,
            data: {
                idCaso: nuevoId,
                hoja: nombreHojaDestino,
                titulo: datosCaso.titulo,
            },
            mensaje: "Caso creado exitosamente",
        };
    } catch (error) {
        Logger.log("Error creando caso: " + error.toString());
        return {
            success: false,
            mensaje: "Error al crear caso: " + error.message,
        };
    }
}

/**
 * NUEVO: Genera ID simplificado (TC-1, TC-2, TC-3...)
 * Sin prefijo de hoja
 */
function generarIdCasoSimplificado(hojaConfig) {
    try {
        var spreadsheet = hojaConfig.getParent();
        var datos = hojaConfig.getDataRange().getValues();
        var claveContador = "ultimo_caso_id_global";
        var ultimoId = 0;
        var filaContador = -1;

        // Buscar contador global
        for (var i = 1; i < datos.length; i++) {
            if (datos[i][0] === claveContador) {
                ultimoId = parseInt(datos[i][1]) || 0;
                filaContador = i + 1;
                break;
            }
        }

        // Si no existe contador global, crearlo
        if (filaContador === -1) {
            hojaConfig.appendRow([
                claveContador,
                1,
                "Contador global de casos (IDs simplificados)",
            ]);
            ultimoId = 0;
            filaContador = hojaConfig.getLastRow();
        }

        // Buscar IDs existentes en todas las hojas para encontrar huecos
        var idsExistentes = {};
        var todasLasHojas = spreadsheet.getSheets();
        var hojasExcluidas = ["Config", "Bugs", "Ejecuciones"];

        for (var h = 0; h < todasLasHojas.length; h++) {
            var hoja = todasLasHojas[h];
            if (hojasExcluidas.indexOf(hoja.getName()) > -1) continue;

            var datosHoja = hoja.getDataRange().getValues();
            if (datosHoja.length <= 1) continue;

            var headers = datosHoja[0];
            var indexID = headers.indexOf("ID");
            if (indexID === -1) continue;

            for (var i = 1; i < datosHoja.length; i++) {
                var idCaso = datosHoja[i][indexID];
                if (
                    idCaso &&
                    typeof idCaso === "string" &&
                    idCaso.startsWith("TC-")
                ) {
                    var numero = parseInt(idCaso.replace("TC-", ""));
                    if (!isNaN(numero)) {
                        idsExistentes[numero] = true;
                    }
                }
            }
        }

        // Buscar el primer ID disponible (hueco)
        var nuevoNumero = null;
        for (var num = 1; num <= ultimoId; num++) {
            if (!idsExistentes[num]) {
                nuevoNumero = num;
                Logger.log("♻️ Reutilizando ID disponible: TC-" + nuevoNumero);
                break;
            }
        }

        // Si no hay huecos, usar el siguiente número
        if (nuevoNumero === null) {
            nuevoNumero = ultimoId + 1;
            hojaConfig.getRange(filaContador, 2).setValue(nuevoNumero);
            Logger.log("➕ Generando nuevo ID: TC-" + nuevoNumero);
        }

        // Formato simplificado: TC-1, TC-2, TC-3...
        return "TC-" + nuevoNumero;
    } catch (error) {
        Logger.log("Error generando ID: " + error.toString());
        // Fallback: usar timestamp
        return "TC-" + new Date().getTime();
    }
}

/**
 * Genera URI único para el caso
 */
function generarCasoURI(spreadsheetId, casoId) {
    return spreadsheetId + "/" + casoId;
}

/**
 * Obtiene lista de hojas disponibles en el Sheet
 */
function obtenerHojasDisponibles(sheetUrl) {
    try {
        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        var todasHojas = spreadsheet.getSheets();

        var hojasExcluidas = [
            "Config",
            "Casos",
            "Bugs",
            "Ejecuciones",
            "Regresiones",
        ];
        var hojasDisponibles = [];

        todasHojas.forEach(function (hoja) {
            var nombre = hoja.getName();
            if (hojasExcluidas.indexOf(nombre) === -1) {
                hojasDisponibles.push(nombre);
            }
        });

        return {
            success: true,
            data: {
                hojas: hojasDisponibles,
            },
        };
    } catch (error) {
        Logger.log("Error obteniendo hojas: " + error.toString());
        return {
            success: false,
            mensaje: "Error al obtener hojas: " + error.message,
        };
    }
}

/**
 * Crea una nueva hoja con estructura de casos
 */
function crearNuevaHoja(sheetUrl, nombreHoja) {
    try {
        Logger.log("Creando nueva hoja: " + nombreHoja);

        var spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);

        var hojaExistente = spreadsheet.getSheetByName(nombreHoja);
        if (hojaExistente !== null) {
            return {
                success: false,
                mensaje: "Ya existe una hoja con ese nombre",
            };
        }

        var nuevaHoja = spreadsheet.insertSheet(nombreHoja);

        // Copiar headers exactamente como la hoja base "Casos" para evitar desalineaciones
        var hojaBase = spreadsheet.getSheetByName("Casos");
        var headers;
        if (hojaBase) {
            headers = hojaBase
                .getRange(1, 1, 1, hojaBase.getLastColumn())
                .getValues()[0];

            // Copiar el formato completo de la fila de headers desde la hoja base
            var rangoHeadersBase = hojaBase.getRange(1, 1, 1, headers.length);
            var rangoHeadersNueva = nuevaHoja.getRange(1, 1, 1, headers.length);

            // Copiar valores
            rangoHeadersNueva.setValues([headers]);

            // Copiar todos los estilos de formato
            rangoHeadersNueva.setBackgrounds(rangoHeadersBase.getBackgrounds());
            rangoHeadersNueva.setFontColors(rangoHeadersBase.getFontColors());
            rangoHeadersNueva.setFontWeights(rangoHeadersBase.getFontWeights());
            rangoHeadersNueva.setFontSizes(rangoHeadersBase.getFontSizes());
            rangoHeadersNueva.setFontFamilies(
                rangoHeadersBase.getFontFamilies()
            );
            rangoHeadersNueva.setHorizontalAlignments(
                rangoHeadersBase.getHorizontalAlignments()
            );
            rangoHeadersNueva.setVerticalAlignments(
                rangoHeadersBase.getVerticalAlignments()
            );
            rangoHeadersNueva.setWraps(rangoHeadersBase.getWraps());
            rangoHeadersNueva.setBorder(
                true,
                true,
                true,
                true,
                true,
                true,
                "#ffffff",
                SpreadsheetApp.BorderStyle.SOLID
            );

            // Copiar ancho de columnas de la hoja base
            for (var i = 1; i <= headers.length; i++) {
                nuevaHoja.setColumnWidth(i, hojaBase.getColumnWidth(i));
            }

            // Copiar altura de fila de headers
            nuevaHoja.setRowHeight(1, hojaBase.getRowHeight(1));
        } else {
            // Fallback si no existe hoja base (compatibilidad)
            headers = [
                "ID",
                "Hoja",
                "Titulo",
                "Descripcion",
                "Formato",
                "Prioridad",
                "TipoPrueba",
                "Pasos",
                "ResultadoEsperado",
                "ScenarioGiven",
                "ScenarioWhen",
                "ScenarioThen",
                "Precondiciones",
                "CandidatoRegresion",
                "EstadoDiseño",
                "FechaCreacion",
                "CreadoPor",
                "FechaUltimaEjecucion",
                "ResultadoUltimaEjecucion",
                "ComentariosEjecucion",
                "EvidenciasURL",
                "Ambiente",
                "Navegador",
                "LinkTrelloHU",
                "LinkBugRelacionado",
                "CasoURI",
                "Notas",
            ];
            nuevaHoja.getRange(1, 1, 1, headers.length).setValues([headers]);

            // Aplicar formato consistente a los headers (igual que hoja Casos original)
            nuevaHoja
                .getRange(1, 1, 1, headers.length)
                .setBackground("#0f172a")
                .setFontColor("#ffffff")
                .setFontWeight("bold")
                .setFontSize(11)
                .setFontFamily("Nunito")
                .setHorizontalAlignment("center")
                .setVerticalAlignment("middle")
                .setWrap(false);

            // Configurar altura de fila para headers
            nuevaHoja.setRowHeight(1, 30);

            // Configurar ancho de columnas exactamente como en la hoja Casos original
            nuevaHoja.setColumnWidth(1, 100); // ID
            nuevaHoja.setColumnWidth(2, 150); // Hoja
            nuevaHoja.setColumnWidth(3, 300); // Titulo
            nuevaHoja.setColumnWidth(4, 400); // Descripcion
            nuevaHoja.setColumnWidth(19, 150); // ResultadoUltimaEjecucion
            nuevaHoja.setColumnWidth(20, 300); // ComentariosEjecucion
            nuevaHoja.setColumnWidth(21, 400); // EvidenciasURL
            nuevaHoja.setColumnWidth(22, 120); // Ambiente
            nuevaHoja.setColumnWidth(23, 120); // Navegador
            nuevaHoja.setColumnWidth(22, 400); // EvidenciasURL

            // Configurar resto de columnas con ancho estándar
            for (var i = 5; i <= 19; i++) {
                nuevaHoja.setColumnWidth(i, 200);
            }
            for (var i = 23; i <= headers.length; i++) {
                nuevaHoja.setColumnWidth(i, 200);
            }
        }

        nuevaHoja.setFrozenRows(1);
        nuevaHoja.setFrozenColumns(1);

        // Aplicar validaciones y formato condicional (badges)
        try {
            var lastRowEstimate = 2000;
            var rules = nuevaHoja.getConditionalFormatRules() || [];

            // Prioridad (columna 6: F)
            var rangoPrioridad = nuevaHoja.getRange(2, 6, lastRowEstimate);
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
            var rangoEstadoDiseño = nuevaHoja.getRange(2, 15, lastRowEstimate);
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
            var rangoResultado = nuevaHoja.getRange(2, 19, lastRowEstimate);
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
            var rangoRegresion = nuevaHoja.getRange(2, 14, lastRowEstimate);
            rules.push(
                SpreadsheetApp.newConditionalFormatRule()
                    .whenTextContains("Si")
                    .setBackground("#dbeafe")
                    .setFontColor("#1e40af")
                    .setRanges([rangoRegresion])
                    .build()
            );

            nuevaHoja.setConditionalFormatRules(rules);
            Logger.log(
                "✅ Validaciones y formato condicional aplicados a nueva hoja"
            );
        } catch (e) {
            Logger.log(
                "⚠️ No se pudo aplicar formato condicional en nueva hoja: " +
                    e.toString()
            );
        }

        Logger.log("Hoja creada exitosamente: " + nombreHoja);

        return {
            success: true,
            data: {
                nombreHoja: nombreHoja,
            },
            mensaje: "Hoja creada exitosamente",
        };
    } catch (error) {
        Logger.log("Error creando hoja: " + error.toString());
        return {
            success: false,
            mensaje: "Error al crear hoja: " + error.message,
        };
    }
}

/**
 * Migra headers de una hoja de casos al esquema de "Casos" y reordena filas.
 * Úsese una sola vez para hojas antiguas (p. ej., TRANSFER) que quedaron con otro orden.
 */
function migrarHeadersHojaCasos(sheetUrl, nombreHoja) {
    try {
        var ss = SpreadsheetApp.openByUrl(sheetUrl);
        var hojaBase = ss.getSheetByName("Casos");
        var hoja = ss.getSheetByName(nombreHoja);
        if (!hoja)
            return {
                success: false,
                mensaje: "Hoja no encontrada: " + nombreHoja,
            };
        if (!hojaBase)
            return { success: false, mensaje: 'Hoja base "Casos" no existe' };

        var headersDestino = hojaBase
            .getRange(1, 1, 1, hojaBase.getLastColumn())
            .getValues()[0];
        var datos = hoja.getDataRange().getValues();
        if (datos.length < 1) {
            hoja.getRange(1, 1, 1, headersDestino.length).setValues([
                headersDestino,
            ]);
            return { success: true, mensaje: "Headers migrados (hoja vacía)" };
        }

        var headersOrigen = datos[0];
        // Construir nuevas filas según headersDestino
        var nuevasFilas = [];
        for (var i = 1; i < datos.length; i++) {
            var fila = datos[i];
            var map = {};
            for (var j = 0; j < headersOrigen.length; j++) {
                map[headersOrigen[j]] = fila[j];
            }
            var nueva = [];
            for (var k = 0; k < headersDestino.length; k++) {
                var clave = headersDestino[k];
                nueva.push(map.hasOwnProperty(clave) ? map[clave] : "");
            }
            nuevasFilas.push(nueva);
        }

        // Sobrescribir hoja: headers destino + filas reordenadas
        hoja.clear();
        hoja.getRange(1, 1, 1, headersDestino.length).setValues([
            headersDestino,
        ]);
        if (nuevasFilas.length > 0)
            hoja.getRange(
                2,
                1,
                nuevasFilas.length,
                headersDestino.length
            ).setValues(nuevasFilas);
        hoja.setFrozenRows(1);
        hoja.setFrozenColumns(1);
        return {
            success: true,
            mensaje: "Headers migrados y filas reordenadas: " + nombreHoja,
        };
    } catch (e) {
        return {
            success: false,
            mensaje: "Error migrando headers: " + e.message,
        };
    }
}

/**
 * Actualiza el estado de ejecución de un caso
 * VERSIÓN CORREGIDA: Usa las columnas correctas del Sheet
 */
function actualizarEstadoEjecucion(sheetUrl, casoId, datosEjecucion) {
    try {
        Logger.log("⚡ Actualizando estado de ejecución de: " + casoId);
        Logger.log("Datos recibidos: " + JSON.stringify(datosEjecucion));

        const datosActualizados = {
            ResultadoUltimaEjecucion: datosEjecucion.estadoEjecucion, // ← Columna S
            ComentariosEjecucion: datosEjecucion.comentarios || "", // ← Columna T
            EvidenciasURL: datosEjecucion.evidencias.join("\n"), // ← Columna U
            Ambiente: datosEjecucion.ambiente || "", // ← Columna V
            Navegador: datosEjecucion.navegador || "", // ← Columna W
            FechaUltimaEjecucion: new Date(), // ← Columna R
        };

        // Si hay bugs vinculados, guardarlos en LinkBugRelacionado
        if (
            datosEjecucion.bugsVinculados &&
            datosEjecucion.bugsVinculados.length > 0
        ) {
            datosActualizados.LinkBugRelacionado =
                datosEjecucion.bugsVinculados.join(", ");
            Logger.log(
                "🐛 Bugs vinculados: " + datosActualizados.LinkBugRelacionado
            );
        }

        Logger.log("Actualizando campos: " + JSON.stringify(datosActualizados));

        const resultado = actualizarCaso(sheetUrl, casoId, datosActualizados);

        if (resultado.success) {
            Logger.log("✅ Estado de ejecución actualizado correctamente");
        } else {
            Logger.log("❌ Error en actualizarCaso: " + resultado.mensaje);
        }

        return resultado;
    } catch (error) {
        Logger.log(
            "❌ Error actualizando estado ejecución: " + error.toString()
        );
        return {
            success: false,
            mensaje: "Error al actualizar estado: " + error.message,
        };
    }
}

/**
 * Obtiene resumen de estados de ejecución
 * NO cuenta casos descartados
 * VERSIÓN CON LOGS DE DEBUG
 */
// Renombrado: versión canónica vive en Backend_Services_Ejecucion.js
function obtenerResumenEjecucionCasos_INTERNAL(sheetUrl) {
    try {
        Logger.log("════════════════════════════════════════════");
        Logger.log("📊 INICIO obtenerResumenEjecucion");
        Logger.log("URL recibida: " + sheetUrl);
        Logger.log("════════════════════════════════════════════");

        let spreadsheet;

        // Si no hay URL, usar el spreadsheet activo
        if (
            !sheetUrl ||
            sheetUrl === "" ||
            sheetUrl === "null" ||
            sheetUrl === "undefined"
        ) {
            Logger.log("⚠️ No hay URL válida, usando spreadsheet activo");
            spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        } else {
            Logger.log("Abriendo spreadsheet por URL...");
            spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
        }

        Logger.log("✅ Spreadsheet: " + spreadsheet.getName());

        const hojasExcluidas = ["Config", "Bugs", "Ejecuciones", "Regresiones"];
        const todasLasHojas = spreadsheet.getSheets();

        Logger.log("Total de hojas en el Sheet: " + todasLasHojas.length);

        let resumen = {
            sinEjecutar: 0,
            ejecutandos: 0,
            bloqueados: 0,
            ok: 0,
            noOk: 0,
            descartados: 0,
            total: 0,
            totalConDescartados: 0,
        };

        todasLasHojas.forEach(function (hoja) {
            const nombreHoja = hoja.getName();

            if (hojasExcluidas.indexOf(nombreHoja) > -1) {
                Logger.log("⏭️ Saltando hoja del sistema: " + nombreHoja);
                return;
            }

            Logger.log("\n📄 Procesando hoja: " + nombreHoja);

            const datos = hoja.getDataRange().getValues();

            if (datos.length <= 1) {
                Logger.log("  ⚠️ Hoja vacía (solo headers)");
                return;
            }

            const headers = datos[0];
            const indexEstadoEjecucion = headers.indexOf(
                "ResultadoUltimaEjecucion"
            );
            const indexEstadoDiseño = headers.indexOf("EstadoDiseño");
            const indexEstadoLegacy = headers.indexOf("Estado");

            Logger.log("  Headers encontrados:");
            Logger.log(
                "    - ResultadoUltimaEjecucion: columna " +
                    indexEstadoEjecucion
            );
            Logger.log("    - EstadoDiseño: columna " + indexEstadoDiseño);
            Logger.log("    - Estado (legacy): columna " + indexEstadoLegacy);

            if (indexEstadoEjecucion === -1) {
                Logger.log(
                    "  ❌ NO tiene columna ResultadoUltimaEjecucion - SALTANDO"
                );
                return;
            }

            Logger.log("  Total de filas de datos: " + (datos.length - 1));

            for (let i = 1; i < datos.length; i++) {
                Logger.log("\n  📋 Fila " + i + ":");

                // Solo contar casos que NO estén eliminados
                let estadoDiseño = "";
                if (indexEstadoDiseño > -1) {
                    estadoDiseño = datos[i][indexEstadoDiseño];
                } else if (indexEstadoLegacy > -1) {
                    estadoDiseño = datos[i][indexEstadoLegacy];
                }

                Logger.log('    EstadoDiseño: "' + estadoDiseño + '"');

                if (estadoDiseño === "Eliminado") {
                    Logger.log("    ⏭️ CASO ELIMINADO - Saltando");
                    continue;
                }

                const estadoEjecucionRaw = datos[i][indexEstadoEjecucion];
                Logger.log(
                    '    EstadoEjecucion (raw): "' + estadoEjecucionRaw + '"'
                );
                Logger.log("    Tipo: " + typeof estadoEjecucionRaw);

                // Limpiar y normalizar el estado
                let estadoEjecucion = "Sin ejecutar";
                if (estadoEjecucionRaw) {
                    estadoEjecucion = estadoEjecucionRaw.toString().trim();
                }

                Logger.log(
                    '    EstadoEjecucion (limpio): "' + estadoEjecucion + '"'
                );

                resumen.totalConDescartados++;

                switch (estadoEjecucion) {
                    case "Sin ejecutar":
                        resumen.sinEjecutar++;
                        resumen.total++;
                        Logger.log("    ✅ Contado como: Sin ejecutar");
                        break;
                    case "Ejecutando":
                        resumen.ejecutando++;
                        resumen.total++;
                        Logger.log("    ✅ Contado como: Ejecutando");
                        break;
                    case "Bloqueado":
                        resumen.bloqueados++;
                        resumen.total++;
                        Logger.log("    ✅ Contado como: Bloqueado");
                        break;
                    case "OK":
                        resumen.ok++;
                        resumen.total++;
                        Logger.log("    ✅ Contado como: OK");
                        break;
                    case "No OK":
                    case "No_OK":
                        resumen.noOk++;
                        resumen.total++;
                        Logger.log("    ✅ Contado como: No OK");
                        break;
                    case "Descartado":
                        resumen.descartados++;
                        Logger.log(
                            "    ⏭️ Contado como: Descartado (NO suma al total)"
                        );
                        break;
                    default:
                        resumen.sinEjecutar++;
                        resumen.total++;
                        Logger.log(
                            "    ⚠️ Estado no reconocido, contado como: Sin ejecutar"
                        );
                }

                Logger.log(
                    "    Resumen parcial - Total: " +
                        resumen.total +
                        ", OK: " +
                        resumen.ok
                );
            }
        });

        Logger.log("\n════════════════════════════════════════════");
        Logger.log("✅ RESUMEN FINAL:");
        Logger.log("   Total (sin descartados): " + resumen.total);
        Logger.log("   OK: " + resumen.ok);
        Logger.log("   No OK: " + resumen.noOk);
        Logger.log("   Bloqueados: " + resumen.bloqueados);
        Logger.log("   Sin ejecutar: " + resumen.sinEjecutar);
        Logger.log("   Ejecutando: " + resumen.ejecutando);
        Logger.log("   Descartados (no contados): " + resumen.descartado);
        Logger.log("════════════════════════════════════════════");

        return {
            success: true,
            data: resumen,
        };
    } catch (error) {
        Logger.log("════════════════════════════════════════════");
        Logger.log("❌ ERROR CRÍTICO en obtenerResumenEjecucion");
        Logger.log("Error: " + error.toString());
        Logger.log("Stack: " + error.stack);
        Logger.log("════════════════════════════════════════════");
        return {
            success: false,
            mensaje: "Error al obtener resumen: " + error.message,
        };
    }
}
/**
 * NUEVA FUNCIÓN: Sube un archivo de evidencia a Drive
 */
// Renombrado para evitar colisión: usar versión de Backend_services_drive.js
function subirEvidenciaADrive_Casos_INTERNAL(archivo) {
    try {
        Logger.log("📤 Subiendo evidencia a Drive: " + archivo.nombre);

        // Decodificar base64
        const contenidoBinario = Utilities.base64Decode(
            archivo.contenidoBase64
        );
        const blob = Utilities.newBlob(
            contenidoBinario,
            archivo.mimeType,
            archivo.nombre
        );

        // Obtener o crear carpeta de evidencias
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const carpetaPadre = DriveApp.getFileById(ss.getId())
            .getParents()
            .next();

        let carpetaEvidencias;
        const carpetas = carpetaPadre.getFoldersByName("Evidencias QA");

        if (carpetas.hasNext()) {
            carpetaEvidencias = carpetas.next();
        } else {
            carpetaEvidencias = carpetaPadre.createFolder("Evidencias QA");
        }

        // Subir archivo
        const archivo = carpetaEvidencias.createFile(blob);
        const url = archivo.getUrl();

        Logger.log("✅ Evidencia subida: " + url);

        return {
            success: true,
            url: url,
            fileId: archivo.getId(),
        };
    } catch (error) {
        Logger.log("❌ Error subiendo evidencia: " + error.toString());
        return {
            success: false,
            mensaje: "Error al subir archivo: " + error.message,
        };
    }
}

function testResumenDirecto() {
    if (typeof __debugGuard === "function" && __debugGuard()) {
        return;
    }
    // ⚠️ CAMBIA esta URL por la de TU Sheet
    const url = "https://docs.google.com/spreadsheets/d/TU_SHEET_ID/edit";

    const resultado = obtenerResumenEjecucion(url);
    Logger.log("📊 Resultado:");
    Logger.log(JSON.stringify(resultado, null, 2));
}
