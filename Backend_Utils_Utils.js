// ===================================================================
// BACKEND_UTILS_UTILS.GS
// Funciones auxiliares comunes usadas en todo el sistema
// ===================================================================

// ===================================================================
// UTILIDADES PARA GOOGLE SHEETS
// ===================================================================

/**
 * Obtiene o crea una hoja en un Spreadsheet
 */
function obtenerOCrearHoja(spreadsheet, nombreHoja) {
  var hoja = spreadsheet.getSheetByName(nombreHoja);
  
  if (!hoja) {
    hoja = spreadsheet.insertSheet(nombreHoja);
  }
  
  return hoja;
}

/**
 * Oculta una hoja (util para hojas de configuracion)
 */
function ocultarHoja(spreadsheet, nombreHoja) {
  try {
    var hoja = spreadsheet.getSheetByName(nombreHoja);
    if (hoja) {
      hoja.hideSheet();
    }
  } catch (error) {
    Logger.log('No se pudo ocultar hoja: ' + error.toString());
  }
}

/**
 * Convierte array de objetos a array 2D para escribir en Sheet
 * Ejemplo: [{a:1,b:2}] => [['a','b'],[1,2]]
 */
function objetosAArray2D(objetos, columnas) {
  if (!objetos || objetos.length === 0) {
    return [columnas];
  }
  
  var resultado = [columnas];
  
  for (var i = 0; i < objetos.length; i++) {
    var fila = [];
    for (var j = 0; j < columnas.length; j++) {
      var valor = objetos[i][columnas[j]];
      fila.push(valor !== undefined ? valor : '');
    }
    resultado.push(fila);
  }
  
  return resultado;
}

/**
 * Convierte array 2D (de Sheet) a array de objetos
 * Ejemplo: [['a','b'],[1,2]] => [{a:1,b:2}]
 */
function array2DAObjetos(data) {
  if (!data || data.length < 2) {
    return [];
  }
  
  var headers = data[0];
  var resultado = [];
  
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    resultado.push(obj);
  }
  
  return resultado;
}

/**
 * Busca una fila en un Sheet por un valor en una columna especifica
 */
function buscarFilaPorValor(hoja, columna, valor) {
  var data = hoja.getDataRange().getValues();
  var headers = data[0];
  var indiceColumna = headers.indexOf(columna);
  
  if (indiceColumna === -1) {
    return null;
  }
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][indiceColumna] === valor) {
      return {
        fila: i + 1,
        data: data[i]
      };
    }
  }
  
  return null;
}

/**
 * Actualiza una fila completa en un Sheet
 */
function actualizarFila(hoja, numeroFila, datos) {
  var rango = hoja.getRange(numeroFila, 1, 1, datos.length);
  rango.setValues([datos]);
}

// ===================================================================
// UTILIDADES PARA FECHAS
// ===================================================================

/**
 * Formatea una fecha al formato YYYY-MM-DD
 */
function formatearFecha(fecha) {
  if (!fecha) {
    fecha = new Date();
  }
  
  var year = fecha.getFullYear();
  var month = String(fecha.getMonth() + 1).padStart(2, '0');
  var day = String(fecha.getDate()).padStart(2, '0');
  
  return year + '-' + month + '-' + day;
}

/**
 * Formatea una fecha al formato YYYY-MM-DD HH:mm:ss
 */
function formatearFechaHora(fecha) {
  if (!fecha) {
    fecha = new Date();
  }
  
  var fechaParte = formatearFecha(fecha);
  var hours = String(fecha.getHours()).padStart(2, '0');
  var minutes = String(fecha.getMinutes()).padStart(2, '0');
  var seconds = String(fecha.getSeconds()).padStart(2, '0');
  
  return fechaParte + ' ' + hours + ':' + minutes + ':' + seconds;
}

/**
 * Calcula tiempo transcurrido desde una fecha
 */
function tiempoTranscurrido(fecha) {
  var ahora = new Date();
  var diferencia = ahora - fecha;
  
  var minutos = Math.floor(diferencia / 60000);
  var horas = Math.floor(minutos / 60);
  var dias = Math.floor(horas / 24);
  
  if (dias > 0) {
    return 'Hace ' + dias + ' dia' + (dias > 1 ? 's' : '');
  } else if (horas > 0) {
    return 'Hace ' + horas + ' hora' + (horas > 1 ? 's' : '');
  } else if (minutos > 0) {
    return 'Hace ' + minutos + ' minuto' + (minutos > 1 ? 's' : '');
  } else {
    return 'Hace un momento';
  }
}

// ===================================================================
// UTILIDADES PARA STRINGS
// ===================================================================

/**
 * Extrae el modulo de un titulo con formato [Modulo] Titulo
 */
function extraerModulo(titulo) {
  var match = titulo.match(/\[([^\]]+)\]/);
  return match ? match[1] : '';
}

/**
 * Valida que un string tenga longitud minima
 */
function validarLongitudMinima(texto, minimo) {
  if (!texto) return false;
  return texto.trim().length >= minimo;
}

/**
 * Limpia y normaliza un string
 */
function limpiarTexto(texto) {
  if (!texto) return '';
  return texto.toString().trim();
}

/**
 * Convierte texto a formato de nombre de archivo valido
 */
function textoANombreArchivo(texto) {
  return texto
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/__+/g, '_')
    .substring(0, 100);
}

// ===================================================================
// UTILIDADES PARA DRIVE
// ===================================================================

/**
 * Obtiene una carpeta por su URL
 */
function obtenerCarpetaPorUrl(url) {
  try {
    var id = extraerIdDeDriveUrl(url);
    return DriveApp.getFolderById(id);
  } catch (error) {
    throw new Error('No se pudo acceder a la carpeta. Verifica la URL y permisos.');
  }
}

/**
 * Extrae el ID de una URL de Drive
 */
function extraerIdDeDriveUrl(url) {
  var match = url.match(/[-\w]{25,}/);
  return match ? match[0] : url;
}

/**
 * Crea una carpeta si no existe
 */
function crearCarpetaSiNoExiste(carpetaPadre, nombreCarpeta) {
  var carpetas = carpetaPadre.getFoldersByName(nombreCarpeta);
  
  if (carpetas.hasNext()) {
    return carpetas.next();
  } else {
    return carpetaPadre.createFolder(nombreCarpeta);
  }
}

/**
 * Obtiene la URL de una carpeta o archivo
 */
function obtenerUrlDrive(archivo) {
  return archivo.getUrl();
}

// ===================================================================
// UTILIDADES GENERALES
// ===================================================================

/**
 * Genera un ID unico simple
 */
function generarIdUnico() {
  return Utilities.getUuid();
}

/**
 * Hace una pausa (para evitar rate limits)
 */
function pausa(milisegundos) {
  Utilities.sleep(milisegundos);
}

/**
 * Valida un email
 */
function esEmailValido(email) {
  var regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Trunca un texto a longitud maxima
 */
function truncarTexto(texto, maxLength) {
  if (!texto) return '';
  if (texto.length <= maxLength) return texto;
  return texto.substring(0, maxLength - 3) + '...';
}

/**
 * Convierte un objeto a JSON string de forma segura
 */
function objetoAJson(objeto) {
  try {
    return JSON.stringify(objeto);
  } catch (error) {
    return '{}';
  }
}

/**
 * Convierte JSON string a objeto de forma segura
 */
function jsonAObjeto(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return null;
  }
}

// ===================================================================
// UTILIDADES PARA VALIDACIONES
// ===================================================================

/**
 * Valida campos obligatorios de un objeto
 */
function validarCamposObligatorios(objeto, campos) {
  var errores = [];
  
  for (var i = 0; i < campos.length; i++) {
    var campo = campos[i];
    if (!objeto[campo] || objeto[campo] === '') {
      errores.push('El campo ' + campo + ' es obligatorio');
    }
  }
  
  return errores;
}

/**
 * Crea una respuesta estandar de exito
 */
function respuestaExito(data, mensaje) {
  return {
    success: true,
    data: data,
    mensaje: mensaje || 'Operacion exitosa'
  };
}

/**
 * Crea una respuesta estandar de error
 */
function respuestaError(error, mensaje) {
  return {
    success: false,
    error: error,
    mensaje: mensaje || 'Ocurrio un error'
  };
}
