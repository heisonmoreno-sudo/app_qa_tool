/**
 * Bandera global para habilitar tests/depuración manual.
 * Mantener en false en producción.
 */
var DEBUG_TESTS = false;

function __debugGuard() {
    if (!DEBUG_TESTS) {
        Logger.log("DEBUG_TESTS deshabilitado. Omite ejecución de pruebas.");
        return true;
    }
    return false;
}
