/// ===========================================================================
// BACKEND_VALIDATOR.GS
// Sistema de validacion de integridad del proyecto QA Management System
// ===========================================================================

/**
 * Funcion principal - Ejecuta todas las validaciones
 * EJECUTAR ESTA despues de cada actualizacion de codigo
 */
function validarSistemaCompleto() {
  const resultado = {
    timestamp: new Date(),
    errores: [],
    advertencias: [],
    info: [],
    resumen: {}
  };

  Logger.log('Iniciando validacion del sistema...\n');
  
  try {
    validarArchivosBackend(resultado);
    validarReferenciasBackend(resultado);
    validarConfiguracionSheet(resultado);
    validarEstructuraFrontend(resultado);
    generarReporte(resultado);
  } catch (error) {
    Logger.log('ERROR CRITICO EN VALIDACION: ' + error.message);
    Logger.log(error.stack);
  }
  
  return resultado;
}

function validarArchivosBackend(resultado) {
  Logger.log('Validando archivos Backend...');
  
  const archivosRequeridos = [
    'doGet',
    'obtenerConfiguracion',
    'guardarConfiguracion'
  ];
  
  archivosRequeridos.forEach(func => {
    if (typeof this[func] === 'function') {
      resultado.info.push('Funcion core encontrada: ' + func);
    } else {
      resultado.errores.push('Funcion core NO encontrada: ' + func);
    }
  });
}

function validarReferenciasBackend(resultado) {
  Logger.log('Validando referencias entre funciones...');
  
  const funcionesEsperadas = {
    'Casos': [
      'listarCasos',
      'obtenerDetalleCaso',
      'actualizarCaso',
      'eliminarCaso',
      'restaurarCaso',
      'moverCaso',
      'crearCaso',
      'obtenerHojasDisponibles',
      'crearNuevaHoja'
    ],
    'Bugs': [
      'listarBugs',
      'crearBug',
      'obtenerDetalleBug',
      'obtenerBugsPorCaso',
      'actualizarBug',
      'cambiarEstadoBug',
      'vincularBugConCaso',
      'desvincularBugDeCaso'
    ],
    'Workspace': [
      'verificarConfiguracionSheet',
      'configurarWorkspace',
      'crearNuevoWorkspace',
      'obtenerConfigWorkspace'
    ]
  };
  
  Object.keys(funcionesEsperadas).forEach(modulo => {
    const funciones = funcionesEsperadas[modulo];
    let encontradas = 0;
    
    funciones.forEach(func => {
      if (typeof this[func] === 'function') {
        encontradas++;
      } else {
        resultado.advertencias.push(modulo + ': Funcion ' + func + ' no encontrada');
      }
    });
    
    if (encontradas === funciones.length) {
      resultado.info.push('Modulo ' + modulo + ': ' + encontradas + '/' + funciones.length + ' funciones OK');
    } else {
      resultado.advertencias.push('Modulo ' + modulo + ': Solo ' + encontradas + '/' + funciones.length + ' funciones encontradas');
    }
  });
}

function validarConfiguracionSheet(resultado) {
  Logger.log('Validando configuracion del Sheet...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (!ss) {
      resultado.errores.push('No se puede acceder al Spreadsheet activo');
      return;
    }
    
    resultado.info.push('Spreadsheet activo: ' + ss.getName());
    
    const configSheet = ss.getSheetByName('Config');
    if (configSheet) {
      resultado.info.push('Hoja Config encontrada');
      
      const headers = configSheet.getRange(1, 1, 1, 3).getValues()[0];
      if (headers[0] === 'Clave' && headers[1] === 'Valor') {
        resultado.info.push('Estructura de Config correcta');
      } else {
        resultado.advertencias.push('Estructura de Config no estandar');
      }
    } else {
      resultado.errores.push('Hoja Config NO encontrada - Sistema no funcionara');
    }
    
    const bugsSheet = ss.getSheetByName('Bugs');
    if (bugsSheet) {
      resultado.info.push('Hoja Bugs encontrada');
    } else {
      resultado.advertencias.push('Hoja Bugs no encontrada - Funcionalidad limitada');
    }
    
    const allSheets = ss.getSheets();
    const hojasCase = allSheets.filter(s => 
      s.getName() !== 'Config' && 
      s.getName() !== 'Bugs'
    );
    
    if (hojasCase.length > 0) {
      resultado.info.push(hojasCase.length + ' hoja(s) de casos encontradas: ' + hojasCase.map(s => s.getName()).join(', '));
    } else {
      resultado.advertencias.push('No se encontraron hojas de casos de prueba');
    }
    
  } catch (error) {
    resultado.advertencias.push('No se puede validar Sheet (puede estar ejecutandose desde editor): ' + error.message);
  }
}

function validarEstructuraFrontend(resultado) {
  Logger.log('Validando estructura Frontend...');
  
  try {
    const html = HtmlService.createTemplateFromFile('Frontend_Index');
    if (html) {
      resultado.info.push('Frontend_Index.html encontrado');
    }
  } catch (error) {
    resultado.errores.push('Frontend_Index.html NO encontrado o tiene errores');
  }
  
  const componentesEsperados = [
    'Frontend_Styles_Base',
    'Frontend_Scripts_Main',
    'Frontend_Components_Casos'
  ];
  
  componentesEsperados.forEach(comp => {
    try {
      HtmlService.createTemplateFromFile(comp);
      resultado.info.push('Componente encontrado: ' + comp + '.html');
    } catch (error) {
      resultado.advertencias.push('Componente no encontrado: ' + comp + '.html');
    }
  });
}

function generarReporte(resultado) {
  Logger.log('\n======================================================================');
  Logger.log('REPORTE DE VALIDACION DEL SISTEMA');
  Logger.log('======================================================================');
  Logger.log('Timestamp: ' + resultado.timestamp.toLocaleString());
  Logger.log('');
  
  Logger.log('RESUMEN:');
  Logger.log('   Info: ' + resultado.info.length + ' items');
  Logger.log('   Advertencias: ' + resultado.advertencias.length + ' items');
  Logger.log('   Errores: ' + resultado.errores.length + ' items');
  Logger.log('');
  
  if (resultado.errores.length > 0) {
    Logger.log('ERRORES CRITICOS (REQUIEREN ATENCION):');
    resultado.errores.forEach(err => Logger.log('   ' + err));
    Logger.log('');
  }
  
  if (resultado.advertencias.length > 0) {
    Logger.log('ADVERTENCIAS (REVISAR):');
    resultado.advertencias.forEach(adv => Logger.log('   ' + adv));
    Logger.log('');
  }
  
  if (resultado.info.length > 0) {
    Logger.log('VALIDACIONES EXITOSAS:');
    resultado.info.forEach(info => Logger.log('   ' + info));
    Logger.log('');
  }
  
  Logger.log('======================================================================');
  if (resultado.errores.length === 0) {
    Logger.log('SISTEMA VALIDADO CORRECTAMENTE');
  } else {
    Logger.log('SISTEMA CON ERRORES - REVISAR ARRIBA');
  }
  Logger.log('======================================================================');
  
  try {
    const ui = SpreadsheetApp.getUi();
    if (resultado.errores.length === 0 && resultado.advertencias.length === 0) {
      ui.alert(
        'Validacion Exitosa',
        'El sistema esta correctamente configurado.\n\nRevisa el Log (Ver > Registros) para mas detalles.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        'Validacion con Observaciones',
        'Se encontraron:\n' +
        '• ' + resultado.errores.length + ' errores criticos\n' +
        '• ' + resultado.advertencias.length + ' advertencias\n\n' +
        'Revisa el Log (Ver > Registros) para mas detalles.',
        ui.ButtonSet.OK
      );
    }
  } catch (e) {
    Logger.log('Popup no disponible (ejecutando desde editor)');
    Logger.log('Revisa el reporte completo arriba');
  }
}

function existeFuncion(nombreFuncion) {
  try {
    return typeof this[nombreFuncion] === 'function';
  } catch (error) {
    return false;
  }
}

function validacionRapida() {
  Logger.log('Validacion Rapida...');
  
  const checks = [
    { nombre: 'doGet', tipo: 'CRITICO' },
    { nombre: 'obtenerConfiguracion', tipo: 'CRITICO' },
    { nombre: 'obtenerCasosPorHoja', tipo: 'IMPORTANTE' },
    { nombre: 'crearNuevoCaso', tipo: 'IMPORTANTE' }
  ];
  
  let erroresCriticos = 0;
  
  checks.forEach(check => {
    const existe = typeof this[check.nombre] === 'function';
    const icon = existe ? 'OK' : 'FAIL';
    Logger.log(icon + ' [' + check.tipo + '] ' + check.nombre);
    
    if (!existe && check.tipo === 'CRITICO') {
      erroresCriticos++;
    }
  });
  
  if (erroresCriticos === 0) {
    Logger.log('\nValidacion rapida OK');
  } else {
    Logger.log('\n' + erroresCriticos + ' error(es) critico(s) encontrado(s)');
  }
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Validador QA')
    .addItem('Validacion Completa', 'validarSistemaCompleto')
    .addItem('Validacion Rapida', 'validacionRapida')
    .addSeparator()
    .addItem('Ver ultimo reporte', 'mostrarUltimoReporte')
    .addToUi();
}

function mostrarUltimoReporte() {
  SpreadsheetApp.getUi().alert(
    'Ejecuta "Validacion Completa" y revisa el Log:\n' +
    'Ver > Registros (Ctrl+Enter)'
  );
}
