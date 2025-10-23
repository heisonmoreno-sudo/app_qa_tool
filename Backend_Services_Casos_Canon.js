/**
 * Canon: buscarCasoEnTodasHojas
 * Delegado hacia buscarCasoEnTodasLasHojas si existe; incluye fallback seguro.
 */
function buscarCasoEnTodasHojasCanon(spreadsheet, casoId) {
  try {
    if (typeof buscarCasoEnTodasLasHojas === 'function') {
      return buscarCasoEnTodasLasHojas(spreadsheet, casoId);
    }
  } catch (e) {
    // ignorar y usar fallback
  }

  var hojas = spreadsheet.getSheets();
  var hojasExcluidas = ['Config', 'Bugs', 'Ejecuciones', 'Regresiones'];

  for (var i = 0; i < hojas.length; i++) {
    var hoja = hojas[i];
    var nombreHoja = hoja.getName();
    if (hojasExcluidas.indexOf(nombreHoja) > -1) continue;

    var datos = hoja.getDataRange().getValues();
    if (datos.length < 2) continue;

    var headers = datos[0];
    var colID = headers.indexOf('ID');
    if (colID === -1) continue;

    for (var j = 1; j < datos.length; j++) {
      if (datos[j][colID] === casoId) {
        return { hoja: hoja, fila: j + 1, headers: headers, nombreHoja: nombreHoja };
      }
    }
  }

  return null;
}
