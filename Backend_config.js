/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BACKEND_CONFIG.GS
 * Gestión de configuración del sistema
 * VERSIÓN CORREGIDA: Sin spread operator (compatible con Apps Script)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Obtiene la configuración completa del sistema desde la hoja Config
 * @returns {Object} Objeto con toda la configuración
 */
function obtenerConfiguracion() {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const configSheet = ss.getSheetByName("Config");

        if (!configSheet) {
            Logger.log("⚠️ Hoja Config no existe, creando...");
            crearHojaConfig();
            return obtenerConfiguracionPorDefecto();
        }

        // Leer todos los datos de configuración
        const datos = configSheet.getDataRange().getValues();
        const config = {};

        // Saltar header (fila 0) y procesar el resto
        for (let i = 1; i < datos.length; i++) {
            const clave = datos[i][0];
            const valor = datos[i][1];

            if (clave) {
                // Solo si hay clave
                config[clave] = valor;
            }
        }

        Logger.log(
            "✅ Configuración cargada: " + Object.keys(config).length + " items"
        );
        return config;
    } catch (error) {
        Logger.log("❌ Error al obtener configuración: " + error.message);
        return obtenerConfiguracionPorDefecto();
    }
}

/**
 * Guarda la configuración en la hoja Config
 * VERSION CON SOPORTE PARA sheetUrl
 * @param {Object} config - Objeto con pares clave-valor a guardar
 * @param {string} sheetUrl - URL del Sheet (opcional)
 * @returns {boolean} true si se guardó correctamente
 */
function guardarConfiguracion(config, sheetUrl) {
    Logger.log("   ┌─────────────────────────────────────────────────────");
    Logger.log("   │ INICIO guardarConfiguracion()");
    Logger.log("   ├─────────────────────────────────────────────────────");

    try {
        Logger.log("   │ 🔹 Config recibida: " + JSON.stringify(config));
        Logger.log(
            "   │ 🔹 sheetUrl recibida: " + (sheetUrl || "null - usará active")
        );

        let ss;

        // Si hay URL, abrir por URL, sino usar el activo
        if (sheetUrl) {
            Logger.log("   │ 🔹 Abriendo Sheet por URL...");
            ss = SpreadsheetApp.openByUrl(sheetUrl);
        } else {
            Logger.log("   │ 🔹 Obteniendo Spreadsheet activo...");
            ss = SpreadsheetApp.getActiveSpreadsheet();
        }

        if (!ss) {
            Logger.log("   │ ❌ ERROR: No se pudo obtener el Spreadsheet");
            return false;
        }

        Logger.log("   │    ✓ Spreadsheet: " + ss.getName());
        Logger.log("   │    ✓ ID: " + ss.getId());

        Logger.log("   │");
        Logger.log("   │ 🔹 Buscando hoja Config...");
        let configSheet = ss.getSheetByName("Config");
        Logger.log("   │    Config existe: " + (configSheet !== null));

        if (!configSheet) {
            Logger.log("   │    ⚠️  Creando hoja Config...");
            configSheet = crearHojaConfig(sheetUrl);
            Logger.log("   │    ✓ Hoja creada");
        }

        Logger.log("   │");
        Logger.log("   │ 🔹 Obteniendo configuración actual...");
        const configActual = obtenerConfiguracion(sheetUrl);
        Logger.log(
            "   │    Config actual keys: " + Object.keys(configActual).length
        );

        Logger.log("   │");
        Logger.log("   │ 🔹 Mergeando configuraciones...");
        const configFinal = {};

        // Copiar config actual
        let copiadosActual = 0;
        for (const key in configActual) {
            if (configActual.hasOwnProperty(key)) {
                configFinal[key] = configActual[key];
                copiadosActual++;
            }
        }
        Logger.log("   │    ✓ Copiados de config actual: " + copiadosActual);

        // Agregar/sobrescribir con nueva config
        let copiadosNuevos = 0;
        for (const key in config) {
            if (config.hasOwnProperty(key)) {
                configFinal[key] = config[key];
                copiadosNuevos++;
            }
        }
        Logger.log("   │    ✓ Agregados de config nueva: " + copiadosNuevos);
        Logger.log(
            "   │    ✓ Total en configFinal: " + Object.keys(configFinal).length
        );

        Logger.log("   │");
        Logger.log("   │ 🔹 Limpiando datos existentes...");
        const ultimaFila = configSheet.getLastRow();
        Logger.log("   │    Última fila: " + ultimaFila);

        if (ultimaFila > 1) {
            configSheet.getRange(2, 1, ultimaFila - 1, 3).clearContent();
            Logger.log("   │    ✓ Filas 2-" + ultimaFila + " limpiadas");
        }

        Logger.log("   │");
        Logger.log("   │ 🔹 Preparando datos para escribir...");
        const datos = [];
        for (const clave in configFinal) {
            if (configFinal.hasOwnProperty(clave)) {
                datos.push([clave, configFinal[clave], ""]);
            }
        }
        Logger.log("   │    Filas a escribir: " + datos.length);

        if (datos.length > 0) {
            Logger.log("   │ 🔹 Escribiendo en Sheet...");
            configSheet.getRange(2, 1, datos.length, 3).setValues(datos);
            Logger.log("   │    ✓ Escritura exitosa");
        } else {
            Logger.log("   │    ⚠️  No hay datos para escribir");
        }

        Logger.log("   │");
        Logger.log("   │ ✅ ÉXITO - Configuración guardada");
        Logger.log("   └─────────────────────────────────────────────────────");

        return true;
    } catch (error) {
        Logger.log("   │");
        Logger.log("   │ 💥 EXCEPCIÓN EN guardarConfiguracion():");
        Logger.log("   │    Error: " + error.toString());
        Logger.log("   │    Mensaje: " + error.message);
        Logger.log("   │    Stack: ");
        Logger.log(error.stack);
        Logger.log("   └─────────────────────────────────────────────────────");

        return false;
    }
}
/**
 * Obtiene un valor específico de configuración
 * @param {string} clave - La clave a buscar
 * @param {any} valorPorDefecto - Valor a retornar si no existe la clave
 * @param {string} sheetUrl - URL del Sheet (opcional)
 * @returns {any} El valor de la configuración o el valor por defecto
 */
function obtenerValorConfig(clave, valorPorDefecto, sheetUrl) {
    if (valorPorDefecto === undefined) {
        valorPorDefecto = null;
    }

    try {
        const config = obtenerConfiguracion(sheetUrl);
        return config[clave] !== undefined ? config[clave] : valorPorDefecto;
    } catch (error) {
        Logger.log("⚠️ Error al obtener valor de config: " + error.message);
        return valorPorDefecto;
    }
}

/**
 * Guarda un valor específico de configuración
 * @param {string} clave - La clave
 * @param {any} valor - El valor
 * @returns {boolean} true si se guardó correctamente
 */
function guardarValorConfig(clave, valor) {
    const config = {};
    config[clave] = valor;
    return guardarConfiguracion(config);
}

/**
 * Crea la hoja Config si no existe
 * @returns {Sheet} La hoja Config creada
 */
function crearHojaConfig() {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const configSheet = ss.insertSheet("Config", 0); // Insertar como primera hoja

        // Crear headers
        const headers = [["Clave", "Valor", "Descripción"]];
        configSheet.getRange(1, 1, 1, 3).setValues(headers);

        // Formato de headers
        const headerRange = configSheet.getRange(1, 1, 1, 3);
        headerRange.setBackground("#4285f4");
        headerRange.setFontColor("#ffffff");
        headerRange.setFontWeight("bold");
        headerRange.setHorizontalAlignment("center");

        // Ajustar anchos
        configSheet.setColumnWidth(1, 250); // Clave
        configSheet.setColumnWidth(2, 300); // Valor
        configSheet.setColumnWidth(3, 300); // Descripción

        // Crear configuración inicial
        const configInicial = [
            ["workspace_nombre", spreadsheet.getName(), "Nombre del workspace"],
            ["workspace_creado", new Date().toISOString(), "Fecha de creación"],
            ["workspace_version", "1.0", "Versión del sistema"],
            ["workspace_activo", "SI", "Estado del workspace"],
            ["ultimo_caso_id", "0", "Contador global de casos"],
            ["ultimo_bug_id", "0", "Contador global de bugs"],
            ["trello_api_key", "", "API Key de Trello (32 caracteres)"],
            ["trello_token", "", "Token de Trello (64 caracteres)"],
            ["trello_board_id", "", "ID del tablero de Trello"],
            ["trello_list_id", "", "ID de la lista de Trello para bugs"],
            ["trello_board_url", "", "URL del tablero de Trello"],
            ["trello_board_name", "", "Nombre del tablero de Trello"],
            ["trello_list_name", "", "Nombre de la lista de Trello"],
            ["drive_folder_id", "", "ID de carpeta de evidencias en Drive"],
        ];

        configSheet
            .getRange(2, 1, configInicial.length, 3)
            .setValues(configInicial);

        Logger.log("✅ Hoja Config creada con éxito");
        return configSheet;
    } catch (error) {
        Logger.log("❌ Error al crear hoja Config: " + error.message);
        throw error;
    }
}

/**
 * Obtiene la configuración completa del sistema desde la hoja Config
 * @param {string} sheetUrl - URL del Sheet (opcional)
 * @returns {Object} Objeto con toda la configuración
 */
function obtenerConfiguracion(sheetUrl) {
    try {
        let ss;

        // Si hay URL, abrir por URL, sino usar el activo
        if (sheetUrl) {
            ss = SpreadsheetApp.openByUrl(sheetUrl);
        } else {
            ss = SpreadsheetApp.getActiveSpreadsheet();
        }

        const configSheet = ss.getSheetByName("Config");

        if (!configSheet) {
            Logger.log("⚠️ Hoja Config no existe, creando...");
            crearHojaConfig(sheetUrl);
            return obtenerConfiguracionPorDefecto();
        }

        // Leer todos los datos de configuración
        const datos = configSheet.getDataRange().getValues();
        const config = {};

        // Saltar header (fila 0) y procesar el resto
        for (let i = 1; i < datos.length; i++) {
            const clave = datos[i][0];
            const valor = datos[i][1];

            if (clave) {
                config[clave] = valor;
            }
        }

        Logger.log(
            "✅ Configuración cargada: " + Object.keys(config).length + " items"
        );
        return config;
    } catch (error) {
        Logger.log("❌ Error al obtener configuración: " + error.message);
        return obtenerConfiguracionPorDefecto();
    }
}

/**
 * Incrementa el contador de un tipo de ID
 * @param {string} tipo - Tipo de ID (ej: 'ultimo_caso_id', 'ultimo_bug_id')
 * @returns {number} El nuevo ID
 */
function incrementarContador(tipo) {
    try {
        const valorActual = obtenerValorConfig(tipo, "0");
        const nuevoValor = parseInt(valorActual) + 1;
        guardarValorConfig(tipo, nuevoValor.toString());
        return nuevoValor;
    } catch (error) {
        Logger.log("❌ Error al incrementar contador: " + error.message);
        return 1;
    }
}

/**
 * Obtiene el contador de IDs por hoja (para casos de prueba)
 * @param {string} nombreHoja - Nombre de la hoja
 * @returns {number} El contador actual de esa hoja
 */
function obtenerContadorPorHoja(nombreHoja) {
    const clave =
        "ultimo_caso_id_" + nombreHoja.toLowerCase().replace(/\s+/g, "_");
    return parseInt(obtenerValorConfig(clave, "0"));
}

/**
 * Incrementa el contador de una hoja específica
 * @param {string} nombreHoja - Nombre de la hoja
 * @returns {number} El nuevo ID
 */
function incrementarContadorHoja(nombreHoja) {
    const clave =
        "ultimo_caso_id_" + nombreHoja.toLowerCase().replace(/\s+/g, "_");
    const valorActual = obtenerValorConfig(clave, "0");
    const nuevoValor = parseInt(valorActual) + 1;
    guardarValorConfig(clave, nuevoValor.toString());
    return nuevoValor;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES ESPECÍFICAS PARA TRELLO
// Rama: feature/bugs-trello
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtiene la configuración de Trello
 * @param {string} sheetUrl - URL del Sheet (opcional)
 * @returns {Object} Configuración de Trello
 */
function obtenerConfigTrello(sheetUrl) {
    try {
        const config = obtenerConfiguracion(sheetUrl);

        return {
            apiKey: config["trello_api_key"] || "",
            token: config["trello_token"] || "",
            boardId: config["trello_board_id"] || "",
            listId: config["trello_list_id"] || "",
            boardUrl: config["trello_board_url"] || "",
            boardName: config["trello_board_name"] || "",
            listName: config["trello_list_name"] || "",
            configurado: !!(
                config["trello_api_key"] &&
                config["trello_token"] &&
                config["trello_list_id"]
            ),
        };
    } catch (error) {
        Logger.log("❌ Error obteniendo config Trello: " + error.message);
        return {
            apiKey: "",
            token: "",
            boardId: "",
            listId: "",
            boardUrl: "",
            boardName: "",
            listName: "",
            configurado: false,
        };
    }
}

/**
 * Guarda la configuración de Trello
 * @param {Object} configTrello - Objeto con datos de Trello
 * @param {string} sheetUrl - URL del Sheet (opcional)
 * @returns {boolean} true si se guardó
 */
function guardarConfigTrello(configTrello, sheetUrl) {
    try {
        Logger.log("💾 Guardando configuración de Trello...");
        Logger.log(
            "   API Key: " + (configTrello.apiKey ? "[PRESENTE]" : "[VACÍO]")
        );
        Logger.log(
            "   Token: " + (configTrello.token ? "[PRESENTE]" : "[VACÍO]")
        );
        Logger.log("   Board ID: " + (configTrello.boardId || "[VACÍO]"));
        Logger.log("   List ID: " + (configTrello.listId || "[VACÍO]"));

        const config = {
            trello_api_key: configTrello.apiKey || "",
            trello_token: configTrello.token || "",
            trello_board_id: configTrello.boardId || "",
            trello_list_id: configTrello.listId || "",
            trello_board_url: configTrello.boardUrl || "",
            trello_board_name: configTrello.boardName || "",
            trello_list_name: configTrello.listName || "",
        };

        const guardado = guardarConfiguracion(config, sheetUrl);

        if (guardado) {
            Logger.log("✅ Configuración de Trello guardada");
        } else {
            Logger.log("❌ Error guardando configuración de Trello");
        }

        return guardado;
    } catch (error) {
        Logger.log("❌ Error guardando config Trello: " + error.message);
        return false;
    }
}

/**
 * Valida si la configuración de Trello es válida
 * @param {string} sheetUrl - URL del Sheet (opcional)
 * @returns {Object} Resultado de validación
 */
function validarConfigTrello(sheetUrl) {
    try {
        const config = obtenerConfigTrello(sheetUrl);
        const errores = [];

        if (!config.apiKey || config.apiKey === "") {
            errores.push("Falta API Key de Trello");
        }

        if (!config.token || config.token === "") {
            errores.push("Falta Token de Trello");
        }

        if (!config.listId || config.listId === "") {
            errores.push("Falta seleccionar lista de destino");
        }

        // Validar formato de API Key (32 caracteres hexadecimales)
        if (config.apiKey && config.apiKey.length !== 32) {
            errores.push(
                "API Key de Trello inválida (debe tener 32 caracteres)"
            );
        }

        // Validar formato de Token (64 caracteres)
        if (config.token && config.token.length !== 64) {
            errores.push("Token de Trello inválido (debe tener 64 caracteres)");
        }

        return {
            valido: errores.length === 0,
            errores: errores,
            configurado: config.configurado,
        };
    } catch (error) {
        Logger.log("❌ Error validando config Trello: " + error.message);
        return {
            valido: false,
            errores: ["Error al validar configuración"],
            configurado: false,
        };
    }
}

/**
 * Limpia la configuración de Trello (desconectar)
 * @param {string} sheetUrl - URL del Sheet (opcional)
 * @returns {boolean} true si se limpió
 */
function limpiarConfigTrello(sheetUrl) {
    try {
        Logger.log("🧹 Limpiando configuración de Trello...");

        const config = {
            trello_api_key: "",
            trello_token: "",
            trello_board_id: "",
            trello_list_id: "",
            trello_board_url: "",
            trello_board_name: "",
            trello_list_name: "",
        };

        const limpiado = guardarConfiguracion(config, sheetUrl);

        if (limpiado) {
            Logger.log("✅ Configuración de Trello limpiada");
        }

        return limpiado;
    } catch (error) {
        Logger.log("❌ Error limpiando config Trello: " + error.message);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES PARA CONTADORES DE BUGS
// Rama: feature/bugs-trello
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtiene el próximo ID de bug
 * @param {string} sheetUrl - URL del Sheet (opcional)
 * @returns {string} ID del bug en formato BUG-N
 */
function obtenerProximoIdBug(sheetUrl) {
    try {
        const clave = "ultimo_bug_id";
        const valorActual = obtenerValorConfig(clave, "0", sheetUrl);
        const nuevoValor = parseInt(valorActual) + 1;

        // Guardar el nuevo valor
        const configActualizar = {};
        configActualizar[clave] = nuevoValor.toString();
        guardarConfiguracion(configActualizar, sheetUrl);

        const bugId = "BUG-" + nuevoValor;
        Logger.log("✅ Próximo ID de bug: " + bugId);
        return bugId;
    } catch (error) {
        Logger.log("❌ Error generando ID de bug: " + error.message);
        // Fallback: usar timestamp
        return "BUG-" + new Date().getTime();
    }
}

/**
 * Función de prueba - Verifica que todo funcione
 */
function testConfiguracion() {
    if (typeof __debugGuard === "function" && __debugGuard()) {
        return;
    }
    Logger.log("🧪 Iniciando test de configuración...");

    // Test 1: Obtener configuración
    Logger.log("\n📖 Test 1: Obtener configuración");
    const config = obtenerConfiguracion();
    Logger.log("Config actual: " + JSON.stringify(config, null, 2));

    // Test 2: Guardar valor
    Logger.log("\n💾 Test 2: Guardar valor");
    const guardado = guardarValorConfig("test_key", "test_value");
    Logger.log("Guardado exitoso: " + guardado);

    // Test 3: Obtener valor específico
    Logger.log("\n🔍 Test 3: Obtener valor específico");
    const valor = obtenerValorConfig("test_key", "no encontrado");
    Logger.log("Valor obtenido: " + valor);

    // Test 4: Incrementar contador
    Logger.log("\n➕ Test 4: Incrementar contador");
    const contador1 = incrementarContador("test_contador");
    const contador2 = incrementarContador("test_contador");
    Logger.log("Contador 1: " + contador1 + ", Contador 2: " + contador2);

    // Test 5: Contador por hoja
    Logger.log("\n📄 Test 5: Contador por hoja");
    const idHoja1 = incrementarContadorHoja("Login");
    const idHoja2 = incrementarContadorHoja("Login");
    Logger.log("ID Login 1: " + idHoja1 + ", ID Login 2: " + idHoja2);

    Logger.log("\n✅ Tests completados");
}

/**
 * Test de configuración de Trello
 */
function testConfiguracionTrello() {
    if (typeof __debugGuard === "function" && __debugGuard()) {
        return;
    }
    Logger.log("🧪 Iniciando test de configuración Trello...");

    // Usar tu Sheet de prueba
    var testUrl = "TU_SHEET_URL_AQUI";

    // Test 1: Obtener config Trello (vacía inicialmente)
    Logger.log("\n📖 Test 1: Obtener config Trello");
    var config = obtenerConfigTrello(testUrl);
    Logger.log("Config Trello: " + JSON.stringify(config, null, 2));
    Logger.log("¿Configurado?: " + config.configurado);

    // Test 2: Guardar config Trello de prueba
    Logger.log("\n💾 Test 2: Guardar config Trello");
    var guardado = guardarConfigTrello(
        {
            apiKey: "12345678901234567890123456789012", // 32 chars
            token: "1234567890123456789012345678901234567890123456789012345678901234", // 64 chars
            boardId: "test_board_id",
            listId: "test_list_id",
            boardUrl: "https://trello.com/b/abc123",
            boardName: "Board de Prueba",
            listName: "Bugs",
        },
        testUrl
    );
    Logger.log("Guardado exitoso: " + guardado);

    // Test 3: Validar config
    Logger.log("\n🔍 Test 3: Validar config Trello");
    var validacion = validarConfigTrello(testUrl);
    Logger.log("Validación: " + JSON.stringify(validacion, null, 2));

    // Test 4: Generar ID de bug
    Logger.log("\n🐛 Test 4: Generar ID de bug");
    var bugId1 = obtenerProximoIdBug(testUrl);
    var bugId2 = obtenerProximoIdBug(testUrl);
    Logger.log("Bug ID 1: " + bugId1);
    Logger.log("Bug ID 2: " + bugId2);

    // Test 5: Limpiar config
    Logger.log("\n🧹 Test 5: Limpiar config Trello");
    var limpiado = limpiarConfigTrello(testUrl);
    Logger.log("Limpiado exitoso: " + limpiado);

    Logger.log("\n✅ Tests completados");
}
