/**
 * Utilidades de normalización de headers de Google Sheets.
 * Maneja variantes con/si acentos y nombres legacy comunes.
 */

// Mapa de alias por campo lógico
var HEADER_ALIASES = {
    ID: ["ID", "Id"],
    Hoja: ["Hoja", "Modulo", "Módulo"],
    Titulo: ["Titulo", "Título"],
    Descripcion: ["Descripcion", "Descripción"],
    Formato: ["Formato"],
    Prioridad: ["Prioridad"],
    TipoPrueba: ["TipoPrueba", "Tipo de Prueba"],
    Pasos: ["Pasos"],
    ResultadoEsperado: ["ResultadoEsperado", "Resultado Esperado"],
    ScenarioGiven: ["ScenarioGiven", "Dado"],
    ScenarioWhen: ["ScenarioWhen", "Cuando"],
    ScenarioThen: ["ScenarioThen", "Entonces"],
    Precondiciones: ["Precondiciones", "Pre-condiciones"],
    FlujoCritico: ["FlujoCritico", "FlujoCrítico"],
    CandidatoRegresion: ["CandidatoRegresion", "CandidatoRegresión"],
    EstadoDiseno: ["EstadoDiseño", "EstadoDiseo", "Estado Diseño", "Estado"],
    FechaCreacion: [
        "FechaCreacion",
        "Fecha Creacion",
        "FechaCreación",
        "Fecha Creación",
    ],
    CreadoPor: ["CreadoPor", "Creado Por"],
    FechaUltimaEjecucion: [
        "FechaUltimaEjecucion",
        "Fecha Última Ejecucion",
        "Fecha Última Ejecución",
        "FechaUltimaEjecución",
    ],
    ResultadoUltimaEjecucion: [
        "ResultadoUltimaEjecucion",
        "Resultado Última Ejecucion",
        "Resultado Última Ejecución",
        "EstadoEjecucion",
        "EstadoEjecución",
    ],
    ComentariosEjecucion: [
        "ComentariosEjecucion",
        "Comentarios Ejecucion",
        "Comentarios Ejecución",
    ],
    EvidenciasURL: ["EvidenciasURL", "Evidencias URL"],
    LinkTrelloHU: ["LinkTrelloHU", "Link Trello HU"],
    LinkBugRelacionado: ["LinkBugRelacionado", "Link Bug Relacionado"],
    CasoURI: ["CasoURI", "Caso URI"],
    Notas: ["Notas"],
};

/**
 * Devuelve índice de columna buscando por alias conocidos.
 * @param {string[]} headers
 * @param {string} logicalName - Campo lógico (ej. 'ResultadoUltimaEjecucion')
 * @returns {number} índice 0-based o -1 si no existe
 */
function findHeaderIndex(headers, logicalName) {
    if (!headers || headers.length === 0) return -1;
    // Búsqueda directa primero
    var idx = headers.indexOf(logicalName);
    if (idx > -1) return idx;
    // Búsqueda por alias
    var aliases = HEADER_ALIASES[logicalName];
    if (!aliases) return -1;
    for (var i = 0; i < aliases.length; i++) {
        var a = aliases[i];
        var j = headers.indexOf(a);
        if (j > -1) return j;
    }
    return -1;
}

/**
 * Obtiene el valor de una fila por campo lógico.
 */
function getCellByLogical(headers, row, logicalName) {
    var idx = findHeaderIndex(headers, logicalName);
    return idx > -1 ? row[idx] : null;
}

/**
 * Setea el valor en una ubicación por campo lógico.
 * Retorna true si actualizó, false si no encontró columna.
 */
function setCellByLogical(hoja, fila1based, headers, logicalName, value) {
    var idx = findHeaderIndex(headers, logicalName);
    if (idx === -1) return false;
    hoja.getRange(fila1based, idx + 1).setValue(value);
    return true;
}
