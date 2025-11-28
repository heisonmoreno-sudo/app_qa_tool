/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BACKEND_SERVICES_DRIVE.GS
 * Servicio para manejo de archivos en Google Drive
 * VERSIÓN 2.0: Renombrado inteligente y validaciones mejoradas
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Sube un archivo (evidencia) a Google Drive
 * VERSIÓN MEJORADA: Renombrado inteligente con límites
 * @param {Object} archivo - {nombre, contenidoBase64, mimeType}
 * @param {string} tipo - 'ejecucion' o 'bug'
 * @param {string} casoId - ID del caso (ej: "LOGIN-TC-1")
 * @param {string} casoTitulo - Título del caso
 * @param {string} bugTitulo - Título del bug (opcional, solo para bugs)
 * @returns {Object} {success, url, nombre, mensaje}
 */
function subirEvidenciaADrive(
    archivo,
    tipo,
    casoId,
    casoTitulo,
    bugTitulo,
    sheetUrl
) {
    try {
        Logger.log("📤 Subiendo evidencia de tipo: " + tipo);
        Logger.log("   Caso: " + casoId);
        Logger.log("   Archivo: " + archivo.nombre);

        // Obtener URL de carpeta desde Config según tipo
        var claveCarpeta =
            tipo === "ejecucion"
                ? "carpeta_evidencias_ejecuciones"
                : "carpeta_evidencias_bugs";

        // Preferir sheetUrl pasado como parámetro, sino usar script property
        if (!sheetUrl) {
            sheetUrl =
                PropertiesService.getScriptProperties().getProperty(
                    "currentSheetUrl"
                );
        }

        var urlCarpeta = obtenerValorConfig(claveCarpeta, "", sheetUrl);

        if (!urlCarpeta || urlCarpeta === "") {
            Logger.log("⚠️ No hay carpeta configurada para " + tipo);
            return {
                success: false,
                mensaje: "No hay carpeta configurada para " + tipo,
                codigo: "NO_CARPETA_CONFIGURADA",
            };
        }

        // Extraer ID de carpeta
        var folderId = extraerIdDeCarpetaDrive(urlCarpeta);

        if (!folderId) {
            Logger.log("❌ URL de carpeta inválida");
            return {
                success: false,
                mensaje: "URL de carpeta inválida",
                codigo: "URL_INVALIDA",
            };
        }

        // Obtener carpeta
        var folder;
        try {
            folder = DriveApp.getFolderById(folderId);
            Logger.log("✅ Carpeta encontrada: " + folder.getName());
        } catch (e) {
            Logger.log("❌ No se puede acceder a la carpeta: " + e.toString());
            return {
                success: false,
                mensaje: "No se puede acceder a la carpeta. Verifica permisos.",
                codigo: "SIN_PERMISOS",
            };
        }

        // Generar nuevo nombre con prefijo
        var nombreOriginal = archivo.nombre;
        var extension = obtenerExtension(nombreOriginal);
        var nombreBase =
            nombreOriginal.substring(0, nombreOriginal.lastIndexOf(".")) ||
            nombreOriginal;

        var nuevoNombre = "";

        if (tipo === "ejecucion") {
            // Formato: TC-1-Titulo_caso_nombrearchivo.ext
            var tituloLimpio = limpiarTextoParaNombre(casoTitulo, 50);
            nuevoNombre =
                casoId + "-" + tituloLimpio + "_" + nombreBase + extension;
        } else {
            // Formato: TC-1-Titulo_caso-Titulo_bug_nombrearchivo.ext
            // O: SIN_CASO-Titulo_bug_nombrearchivo.ext
            if (casoId && casoId !== "") {
                var tituloLimpio = limpiarTextoParaNombre(casoTitulo, 30);
                var bugLimpio = limpiarTextoParaNombre(bugTitulo, 30);
                nuevoNombre =
                    casoId +
                    "-" +
                    tituloLimpio +
                    "-" +
                    bugLimpio +
                    "_" +
                    nombreBase +
                    extension;
            } else {
                var bugLimpio = limpiarTextoParaNombre(bugTitulo, 50);
                nuevoNombre =
                    "SIN_CASO-" + bugLimpio + "_" + nombreBase + extension;
            }
        }

        Logger.log("📝 Renombrando: " + nombreOriginal + " → " + nuevoNombre);

        // Decodificar Base64 y crear blob
        var decodedData = Utilities.base64Decode(archivo.contenidoBase64);
        var blob = Utilities.newBlob(
            decodedData,
            archivo.mimeType,
            nuevoNombre
        );

        // Subir archivo
        var file = folder.createFile(blob);

        // Hacer público para visualización
        try {
            file.setSharing(
                DriveApp.Access.ANYONE_WITH_LINK,
                DriveApp.Permission.VIEW
            );
        } catch (e) {
            Logger.log(
                "⚠️ No se pudo hacer público (no crítico): " + e.toString()
            );
        }

        var fileUrl = file.getUrl();

        Logger.log("✅ Archivo subido: " + fileUrl);

        return {
            success: true,
            url: fileUrl,
            nombre: nuevoNombre,
            nombreOriginal: nombreOriginal,
            mimeType: archivo.mimeType,
            mensaje: "Archivo subido correctamente",
        };
    } catch (error) {
        Logger.log("❌ Error subiendo archivo: " + error.toString());
        return {
            success: false,
            mensaje: "Error al subir archivo: " + error.message,
            codigo: "ERROR_GENERAL",
        };
    }
}

/**
 * Sube un conjunto de evidencias (archivos) y retorna un arreglo con resultados
 * @param {Array} archivos - Array de objetos {nombre, contenidoBase64, mimeType}
 * @param {string} sheetUrl - URL del spreadsheet donde buscar la carpeta de evidencias (opcional)
 * @param {string} tipo - 'bug' o 'ejecucion' (opcional, por defecto 'bug')
 * @param {string} casoId - ID del caso relacionado (opcional)
 * @param {string} casoTitulo - Título del caso (opcional)
 * @param {string} bugTitulo - Título del bug (opcional)
 * @returns {Object} { success: true, results: [ { success, url, nombre, mensaje } ] }
 */
function subirEvidenciasBatch(
    archivos,
    sheetUrl,
    tipo,
    casoId,
    casoTitulo,
    bugTitulo
) {
    try {
        if (!archivos || !Array.isArray(archivos) || archivos.length === 0) {
            return { success: true, results: [] };
        }

        var results = [];

        for (var i = 0; i < archivos.length; i++) {
            var archivo = archivos[i];
            try {
                var res = subirEvidenciaADrive(
                    archivo,
                    tipo || "bug",
                    casoId || "",
                    casoTitulo || "",
                    bugTitulo || "",
                    sheetUrl
                );
                results.push(res);
            } catch (err) {
                results.push({
                    success: false,
                    mensaje: err.message || String(err),
                    nombre: archivo.nombre || "",
                });
            }
        }

        return { success: true, results: results };
    } catch (error) {
        Logger.log("❌ Error en subirEvidenciasBatch: " + error.toString());
        return { success: false, mensaje: error.message };
    }
}

/**
 * Limpia un texto para usarlo en nombres de archivo
 * @param {string} texto - Texto a limpiar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} Texto limpio
 */
function limpiarTextoParaNombre(texto, maxLength) {
    if (!texto || texto === "") {
        return "Sin_titulo";
    }

    // Quitar acentos y ñ
    var limpio = texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
        .replace(/ñ/g, "n")
        .replace(/Ñ/g, "N");

    // Quitar caracteres especiales y espacios
    limpio = limpio
        .replace(/[^a-zA-Z0-9\s-]/g, "") // Solo letras, números, espacios y guiones
        .replace(/\s+/g, "_") // Espacios → guiones bajos
        .replace(/_+/g, "_") // Múltiples guiones → uno solo
        .replace(/^_|_$/g, ""); // Quitar guiones al inicio/fin

    // Limitar longitud
    if (limpio.length > maxLength) {
        limpio = limpio.substring(0, maxLength);
    }

    return limpio || "Sin_titulo";
}

/**
 * Obtiene la extensión de un archivo
 * @param {string} nombreArchivo
 * @returns {string} Extensión con punto (ej: ".png")
 */
function obtenerExtension(nombreArchivo) {
    var lastDot = nombreArchivo.lastIndexOf(".");
    if (lastDot === -1) return "";
    return nombreArchivo.substring(lastDot);
}

/**
 * Extrae el ID de una carpeta de Drive desde su URL
 * @param {string} url - URL de la carpeta
 * @returns {string|null} ID de la carpeta o null
 */
function extraerIdDeCarpetaDrive(url) {
    try {
        // Formato: https://drive.google.com/drive/folders/ID_AQUI
        var match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    } catch (error) {
        Logger.log("❌ Error extrayendo ID: " + error.toString());
        return null;
    }
}

/**
 * Valida que una URL de carpeta de Drive sea válida y accesible
 * @param {string} url - URL de la carpeta
 * @returns {Object} {valida: boolean, mensaje: string, nombre: string}
 */
function validarCarpetaDrive(url) {
    try {
        if (!url || url.trim() === "") {
            return {
                valida: false,
                mensaje: "URL vacía",
            };
        }

        if (url.indexOf("drive.google.com") === -1) {
            return {
                valida: false,
                mensaje: "No es una URL de Google Drive",
            };
        }

        var folderId = extraerIdDeCarpetaDrive(url);

        if (!folderId) {
            return {
                valida: false,
                mensaje:
                    "No se pudo extraer el ID de la carpeta. Verifica el formato de la URL.",
            };
        }

        // Intentar acceder
        try {
            var folder = DriveApp.getFolderById(folderId);
            var nombre = folder.getName();

            return {
                valida: true,
                mensaje: "Carpeta válida: " + nombre,
                nombre: nombre,
                folderId: folderId,
            };
        } catch (e) {
            return {
                valida: false,
                mensaje:
                    "No se puede acceder a la carpeta. Verifica que tengas permisos de edición.",
            };
        }
    } catch (error) {
        return {
            valida: false,
            mensaje: error.message,
        };
    }
}

/**
 * Guarda la configuración de carpetas en Config
 * VERSION DEBUG - CON LOGS DETALLADOS
 * @param {Object} carpetas - {ejecuciones: url, bugs: url}
 * @returns {Object} {success, mensaje}
 */
function guardarConfiguracionCarpetas(carpetas) {
    Logger.log("═══════════════════════════════════════════════════════════");
    Logger.log("💾 INICIO guardarConfiguracionCarpetas");
    Logger.log("═══════════════════════════════════════════════════════════");

    try {
        Logger.log("📥 PASO 1: Recibiendo parámetros");
        Logger.log("   carpetas = " + JSON.stringify(carpetas));

        if (!carpetas) {
            Logger.log("❌ ERROR: carpetas es null o undefined");
            return {
                success: false,
                mensaje: "No se recibieron carpetas",
            };
        }

        Logger.log("✅ PASO 1: OK");

        var config = {};
        var errores = [];

        // Validar carpeta de ejecuciones
        if (carpetas.ejecuciones && carpetas.ejecuciones.trim() !== "") {
            Logger.log("\n🔍 Validando carpeta de ejecuciones");

            var validacion = validarCarpetaDrive(carpetas.ejecuciones);
            Logger.log("   Resultado: " + JSON.stringify(validacion));

            if (validacion.valida) {
                config["carpeta_evidencias_ejecuciones"] = carpetas.ejecuciones;
                Logger.log("   ✅ Carpeta ejecuciones válida");
            } else {
                errores.push("Ejecuciones: " + validacion.mensaje);
                Logger.log("   ❌ Carpeta ejecuciones inválida");
            }
        }

        // Validar carpeta de bugs
        if (carpetas.bugs && carpetas.bugs.trim() !== "") {
            Logger.log("\n🔍 Validando carpeta de bugs");

            var validacion = validarCarpetaDrive(carpetas.bugs);
            Logger.log("   Resultado: " + JSON.stringify(validacion));

            if (validacion.valida) {
                config["carpeta_evidencias_bugs"] = carpetas.bugs;
                Logger.log("   ✅ Carpeta bugs válida");
            } else {
                errores.push("Bugs: " + validacion.mensaje);
                Logger.log("   ❌ Carpeta bugs inválida");
            }
        }

        if (errores.length > 0) {
            Logger.log("❌ HAY ERRORES - Abortando");
            return {
                success: false,
                mensaje: "Errores de validación:\n" + errores.join("\n"),
            };
        }

        if (Object.keys(config).length === 0) {
            Logger.log("❌ Config vacía");
            return {
                success: false,
                mensaje: "No se proporcionaron carpetas válidas",
            };
        }

        Logger.log("\n💾 Guardando en Config");
        var sheetUrl =
            PropertiesService.getScriptProperties().getProperty(
                "currentSheetUrl"
            );
        var guardado = guardarConfiguracion(config, sheetUrl);

        if (guardado) {
            Logger.log("✅ ÉXITO TOTAL");
            return {
                success: true,
                mensaje: "Configuración guardada correctamente",
                carpetas: config,
            };
        } else {
            Logger.log("❌ Error al guardar");
            return {
                success: false,
                mensaje: "Error al guardar en Config",
            };
        }
    } catch (error) {
        Logger.log("\n💥 EXCEPCIÓN: " + error.toString());
        return {
            success: false,
            mensaje: "Excepción: " + error.message,
        };
    }
}

/**
 * Obtiene la configuración actual de carpetas
 * @returns {Object} {success, carpetas: {ejecuciones, bugs}}
 */
function obtenerConfiguracionCarpetas() {
    try {
        Logger.log("🔍 obtenerConfiguracionCarpetas - Iniciando");

        var sheetUrl =
            PropertiesService.getScriptProperties().getProperty(
                "currentSheetUrl"
            );
        Logger.log("   sheetUrl: " + sheetUrl);

        var carpetaEjecuciones = obtenerValorConfig(
            "carpeta_evidencias_ejecuciones",
            "",
            sheetUrl
        );
        var carpetaBugs = obtenerValorConfig(
            "carpeta_evidencias_bugs",
            "",
            sheetUrl
        );

        Logger.log("   Carpeta Ejecuciones: " + carpetaEjecuciones);
        Logger.log("   Carpeta Bugs: " + carpetaBugs);

        return {
            success: true,
            carpetas: {
                ejecuciones: carpetaEjecuciones,
                bugs: carpetaBugs,
            },
        };
    } catch (error) {
        Logger.log("❌ Error: " + error.toString());
        return {
            success: false,
            mensaje: error.message,
            carpetas: {
                ejecuciones: "",
                bugs: "",
            },
        };
    }
}

/**
 * Función de TEST
 */
function testDrive() {
    if (typeof __debugGuard === "function" && __debugGuard()) {
        return;
    }
    Logger.log("🧪 TEST DE DRIVE");

    var testUrl =
        "https://drive.google.com/drive/folders/1YDGJqDDJKBnnvb3e0nO5jhOFz0Sxgt4_";

    // Test 1: Validar carpeta
    Logger.log("\n📁 Test 1: Validar carpeta");
    var validacion = validarCarpetaDrive(testUrl);
    Logger.log("Resultado: " + JSON.stringify(validacion, null, 2));

    // Test 2: Guardar config
    Logger.log("\n💾 Test 2: Guardar configuración");
    var resultado = guardarConfiguracionCarpetas({
        ejecuciones: testUrl,
        bugs: testUrl,
    });
    Logger.log("Resultado: " + JSON.stringify(resultado, null, 2));

    // Test 3: Obtener config
    Logger.log("\n🔍 Test 3: Obtener configuración");
    var config = obtenerConfiguracionCarpetas();
    Logger.log("Resultado: " + JSON.stringify(config, null, 2));

    Logger.log("\n✅ Tests completados");
}

/**
 * Obtiene el tipo MIME de un archivo de Drive a partir de su URL
 * @param {string} fileUrl - URL del archivo en Drive
 * @returns {Object} {success, mimeType, nombre, mensaje}
 */
function obtenerTipoArchivoDrive(fileUrl) {
    try {
        if (!fileUrl || typeof fileUrl !== "string") {
            return {
                success: false,
                mensaje: "URL no válida",
            };
        }

        // Extraer el ID del archivo de la URL
        var fileId = null;

        // Patrón: /d/FILE_ID/
        var matchD = fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (matchD) {
            fileId = matchD[1];
        }

        // Patrón: ?id=FILE_ID
        if (!fileId) {
            var matchId = fileUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (matchId) {
                fileId = matchId[1];
            }
        }

        if (!fileId) {
            return {
                success: false,
                mensaje: "No se pudo extraer el ID del archivo",
            };
        }

        // Obtener el archivo de Drive
        var file = DriveApp.getFileById(fileId);
        var mimeType = file.getMimeType();
        var nombre = file.getName();

        return {
            success: true,
            mimeType: mimeType,
            nombre: nombre,
            fileId: fileId,
        };
    } catch (error) {
        Logger.log("❌ Error obteniendo tipo de archivo: " + error.toString());
        return {
            success: false,
            mensaje: "Error: " + error.toString(),
        };
    }
}
