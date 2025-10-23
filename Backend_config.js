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
    const configSheet = ss.getSheetByName('Config');
    
    if (!configSheet) {
      Logger.log('⚠️ Hoja Config no existe, creando...');
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
      
      if (clave) { // Solo si hay clave
        config[clave] = valor;
      }
    }
    
    Logger.log('✅ Configuración cargada: ' + Object.keys(config).length + ' items');
    return config;
    
  } catch (error) {
    Logger.log('❌ Error al obtener configuración: ' + error.message);
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
  Logger.log('   ┌─────────────────────────────────────────────────────');
  Logger.log('   │ INICIO guardarConfiguracion()');
  Logger.log('   ├─────────────────────────────────────────────────────');
  
  try {
    Logger.log('   │ 🔹 Config recibida: ' + JSON.stringify(config));
    Logger.log('   │ 🔹 sheetUrl recibida: ' + (sheetUrl || 'null - usará active'));
    
    let ss;
    
    // Si hay URL, abrir por URL, sino usar el activo
    if (sheetUrl) {
      Logger.log('   │ 🔹 Abriendo Sheet por URL...');
      ss = SpreadsheetApp.openByUrl(sheetUrl);
    } else {
      Logger.log('   │ 🔹 Obteniendo Spreadsheet activo...');
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    if (!ss) {
      Logger.log('   │ ❌ ERROR: No se pudo obtener el Spreadsheet');
      return false;
    }
    
    Logger.log('   │    ✓ Spreadsheet: ' + ss.getName());
    Logger.log('   │    ✓ ID: ' + ss.getId());
    
    Logger.log('   │');
    Logger.log('   │ 🔹 Buscando hoja Config...');
    let configSheet = ss.getSheetByName('Config');
    Logger.log('   │    Config existe: ' + (configSheet !== null));
    
    if (!configSheet) {
      Logger.log('   │    ⚠️  Creando hoja Config...');
      configSheet = crearHojaConfig(sheetUrl);
      Logger.log('   │    ✓ Hoja creada');
    }
    
    Logger.log('   │');
    Logger.log('   │ 🔹 Obteniendo configuración actual...');
    const configActual = obtenerConfiguracion(sheetUrl);
    Logger.log('   │    Config actual keys: ' + Object.keys(configActual).length);
    
    Logger.log('   │');
    Logger.log('   │ 🔹 Mergeando configuraciones...');
    const configFinal = {};
    
    // Copiar config actual
    let copiadosActual = 0;
    for (const key in configActual) {
      if (configActual.hasOwnProperty(key)) {
        configFinal[key] = configActual[key];
        copiadosActual++;
      }
    }
    Logger.log('   │    ✓ Copiados de config actual: ' + copiadosActual);
    
    // Agregar/sobrescribir con nueva config
    let copiadosNuevos = 0;
    for (const key in config) {
      if (config.hasOwnProperty(key)) {
        configFinal[key] = config[key];
        copiadosNuevos++;
      }
    }
    Logger.log('   │    ✓ Agregados de config nueva: ' + copiadosNuevos);
    Logger.log('   │    ✓ Total en configFinal: ' + Object.keys(configFinal).length);
    
    Logger.log('   │');
    Logger.log('   │ 🔹 Limpiando datos existentes...');
    const ultimaFila = configSheet.getLastRow();
    Logger.log('   │    Última fila: ' + ultimaFila);
    
    if (ultimaFila > 1) {
      configSheet.getRange(2, 1, ultimaFila - 1, 3).clearContent();
      Logger.log('   │    ✓ Filas 2-' + ultimaFila + ' limpiadas');
    }
    
    Logger.log('   │');
    Logger.log('   │ 🔹 Preparando datos para escribir...');
    const datos = [];
    for (const clave in configFinal) {
      if (configFinal.hasOwnProperty(clave)) {
        datos.push([clave, configFinal[clave], '']);
      }
    }
    Logger.log('   │    Filas a escribir: ' + datos.length);
    
    if (datos.length > 0) {
      Logger.log('   │ 🔹 Escribiendo en Sheet...');
      configSheet.getRange(2, 1, datos.length, 3).setValues(datos);
      Logger.log('   │    ✓ Escritura exitosa');
    } else {
      Logger.log('   │    ⚠️  No hay datos para escribir');
    }
    
    Logger.log('   │');
    Logger.log('   │ ✅ ÉXITO - Configuración guardada');
    Logger.log('   └─────────────────────────────────────────────────────');
    
    return true;
    
  } catch (error) {
    Logger.log('   │');
    Logger.log('   │ 💥 EXCEPCIÓN EN guardarConfiguracion():');
    Logger.log('   │    Error: ' + error.toString());
    Logger.log('   │    Mensaje: ' + error.message);
    Logger.log('   │    Stack: ');
    Logger.log(error.stack);
    Logger.log('   └─────────────────────────────────────────────────────');
    
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
    Logger.log('⚠️ Error al obtener valor de config: ' + error.message);
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
    const configSheet = ss.insertSheet('Config', 0); // Insertar como primera hoja
    
    // Crear headers
    const headers = [['Clave', 'Valor', 'Descripción']];
    configSheet.getRange(1, 1, 1, 3).setValues(headers);
    
    // Formato de headers
    const headerRange = configSheet.getRange(1, 1, 1, 3);
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // Ajustar anchos
    configSheet.setColumnWidth(1, 250); // Clave
    configSheet.setColumnWidth(2, 300); // Valor
    configSheet.setColumnWidth(3, 300); // Descripción
    
    // Crear configuración inicial
    const configInicial = [
      ['trello_board_id', '', 'ID del tablero de Trello'],
      ['trello_api_key', '', 'API Key de Trello (personal)'],
      ['trello_token', '', 'Token de Trello (personal)'],
      ['drive_folder_id', '', 'ID de carpeta de evidencias en Drive'],
      ['proyecto_nombre', 'Mi Proyecto QA', 'Nombre del proyecto actual'],
      ['ultimo_caso_id', '0', 'Contador global de casos']
    ];
    
    configSheet.getRange(2, 1, configInicial.length, 3).setValues(configInicial);
    
    Logger.log('✅ Hoja Config creada con éxito');
    return configSheet;
    
  } catch (error) {
    Logger.log('❌ Error al crear hoja Config: ' + error.message);
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
    
    const configSheet = ss.getSheetByName('Config');
    
    if (!configSheet) {
      Logger.log('⚠️ Hoja Config no existe, creando...');
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
    
    Logger.log('✅ Configuración cargada: ' + Object.keys(config).length + ' items');
    return config;
    
  } catch (error) {
    Logger.log('❌ Error al obtener configuración: ' + error.message);
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
    const valorActual = obtenerValorConfig(tipo, '0');
    const nuevoValor = parseInt(valorActual) + 1;
    guardarValorConfig(tipo, nuevoValor.toString());
    return nuevoValor;
  } catch (error) {
    Logger.log('❌ Error al incrementar contador: ' + error.message);
    return 1;
  }
}

/**
 * Obtiene el contador de IDs por hoja (para casos de prueba)
 * @param {string} nombreHoja - Nombre de la hoja
 * @returns {number} El contador actual de esa hoja
 */
function obtenerContadorPorHoja(nombreHoja) {
  const clave = 'ultimo_caso_id_' + nombreHoja.toLowerCase().replace(/\s+/g, '_');
  return parseInt(obtenerValorConfig(clave, '0'));
}

/**
 * Incrementa el contador de una hoja específica
 * @param {string} nombreHoja - Nombre de la hoja
 * @returns {number} El nuevo ID
 */
function incrementarContadorHoja(nombreHoja) {
  const clave = 'ultimo_caso_id_' + nombreHoja.toLowerCase().replace(/\s+/g, '_');
  const valorActual = obtenerValorConfig(clave, '0');
  const nuevoValor = parseInt(valorActual) + 1;
  guardarValorConfig(clave, nuevoValor.toString());
  return nuevoValor;
}

/**
 * Función de prueba - Verifica que todo funcione
 */
function testConfiguracion() {
  if (typeof __debugGuard === 'function' && __debugGuard()) { return; }
  Logger.log('🧪 Iniciando test de configuración...');
  
  // Test 1: Obtener configuración
  Logger.log('\n📖 Test 1: Obtener configuración');
  const config = obtenerConfiguracion();
  Logger.log('Config actual: ' + JSON.stringify(config, null, 2));
  
  // Test 2: Guardar valor
  Logger.log('\n💾 Test 2: Guardar valor');
  const guardado = guardarValorConfig('test_key', 'test_value');
  Logger.log('Guardado exitoso: ' + guardado);
  
  // Test 3: Obtener valor específico
  Logger.log('\n🔍 Test 3: Obtener valor específico');
  const valor = obtenerValorConfig('test_key', 'no encontrado');
  Logger.log('Valor obtenido: ' + valor);
  
  // Test 4: Incrementar contador
  Logger.log('\n➕ Test 4: Incrementar contador');
  const contador1 = incrementarContador('test_contador');
  const contador2 = incrementarContador('test_contador');
  Logger.log('Contador 1: ' + contador1 + ', Contador 2: ' + contador2);
  
  // Test 5: Contador por hoja
  Logger.log('\n📄 Test 5: Contador por hoja');
  const idHoja1 = incrementarContadorHoja('Login');
  const idHoja2 = incrementarContadorHoja('Login');
  Logger.log('ID Login 1: ' + idHoja1 + ', ID Login 2: ' + idHoja2);
  
  Logger.log('\n✅ Tests completados');
}
