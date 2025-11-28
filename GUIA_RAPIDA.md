# 🚀 Guía Rápida - Instalación para Desarrolladores

## ⚡ Setup Rápido (5 minutos)

### Paso 1: Instalar Herramientas

```bash
# Instalar Node.js desde https://nodejs.org/
# Luego instalar clasp
npm install -g @google/clasp
```

### Paso 2: Autenticar

```bash
clasp login
# Se abrirá un navegador, acepta los permisos
```

### Paso 3: Clonar el Proyecto

```bash
# Solicita el SCRIPT_ID al administrador del proyecto
clasp clone [SCRIPT_ID]
```

### Paso 4: Trabajar

```bash
# Hacer cambios en los archivos
# Guardar

# Subir cambios
clasp push

# Ver logs
clasp logs --watch
```

---

## 🔧 Comandos Más Usados

| Comando              | Descripción                          |
| -------------------- | ------------------------------------ |
| `clasp push`         | Subir archivos locales a Apps Script |
| `clasp pull`         | Descargar archivos desde Apps Script |
| `clasp open`         | Abrir el proyecto en el navegador    |
| `clasp logs`         | Ver logs del servidor                |
| `clasp logs --watch` | Ver logs en tiempo real              |
| `clasp deploy`       | Crear nueva versión                  |

---

## 🐛 Problemas Comunes

### "command not found: clasp"

```bash
npm install -g @google/clasp
```

### "User has not enabled the Apps Script API"

Ve a: [Google Apps Script Settings](https://script.google.com/home/usersettings)

Activa la API

### "Manifest file has been updated"

```bash
clasp pull --only appsscript.json
clasp push
```

---

## 📁 Archivos Importantes

-   **Backend_Code.js**: Punto de entrada y funciones principales
-   **Backend_Services_Bugs.js**: Lógica de bugs
-   **Backend_Services_Casos.js**: Lógica de casos de prueba
-   **Frontend_Index.html**: Interfaz principal
-   **.clasp.json**: NO COMPARTIR (tiene el Script ID del proyecto)

---

## 🔄 Workflow Diario

1. **Antes de empezar**: `clasp pull` (descargar últimos cambios)
2. **Hacer cambios** en tu editor
3. **Probar localmente** (revisar sintaxis)
4. **Subir cambios**: `clasp push`
5. **Verificar**: Abre la app web y prueba la funcionalidad
6. **Ver errores**: `clasp logs`

---

## 💡 Tips

-   Usa VS Code con extensión "Apps Script" para mejor experiencia
-   Mantén backup del archivo `.clasp.json` (localmente, no en Git)
-   Haz `clasp pull` antes de `clasp push` para evitar conflictos
-   Usa comentarios en el código para explicar lógica compleja
-   Prueba en un Sheet de desarrollo antes de producción

---

## 📞 ¿Necesitas Ayuda?

Contacta al administrador del proyecto o revisa el README.md completo.

Happy Coding! 🎉
