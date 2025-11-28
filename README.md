# 🧪 QA Management System - Herramienta de Gestión de Casos de Prueba

> Sistema completo de gestión de casos de prueba integrado con Google Sheets, Google Drive y Trello

[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=flat&logo=google&logoColor=white)](https://script.google.com/)
[![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=flat&logo=google-sheets&logoColor=white)](https://sheets.google.com/)
[![Trello](https://img.shields.io/badge/Trello-0052CC?style=flat&logo=trello&logoColor=white)](https://trello.com/)

## 📋 Descripción

**QA Management System** es una aplicación web basada en Google Apps Script que permite gestionar de manera integral casos de prueba, bugs y ejecuciones de testing. Utiliza Google Sheets como base de datos, Drive para almacenar evidencias y se integra con Trello para sincronización de bugs.

## ✨ Características Principales

### 🎯 Gestión de Casos de Prueba

-   ✅ **Creación y edición** de casos de prueba con múltiples formatos (Clásico, Gherkin)
-   📊 **Organización por módulos/hojas** para estructurar casos por funcionalidad
-   🏷️ **Priorización** (Crítica, Alta, Media, Baja)
-   🎭 **Tipos de prueba** (Funcional, Regresión, UI/UX, etc.)
-   📝 **Soporte para escenarios Gherkin** (Given-When-Then)
-   🔍 **Búsqueda y filtrado** avanzado
-   📈 **Tablero visual** con tarjetas interactivas

### 🐛 Gestión de Bugs

-   🔴 **Reporte de bugs** con información detallada
-   📸 **Adjuntar evidencias** (imágenes, videos, documentos)
-   🔗 **Vinculación con casos de prueba**
-   🎯 **Clasificación por severidad** y estado
-   📤 **Sincronización bidireccional con Trello**
-   🖥️ **Registro de ambiente y navegador**
-   🔄 **Estados**: Pendiente, En revisión, Resuelto, Cerrado

### ▶️ Ejecución de Casos

-   🎬 **Modal interactivo** para ejecutar casos
-   📊 **Estados de ejecución**: OK, No OK, Bloqueado, Descartado, Ejecutando
-   💬 **Comentarios y observaciones** por ejecución
-   📎 **Subida de evidencias** con detección automática de tipo de archivo
-   🔗 **Vinculación automática de bugs** en ejecuciones fallidas
-   📅 **Historial de ejecuciones** con fechas y resultados
-   🌐 **Registro de ambiente y navegador** utilizado

### 📊 Métricas y Reportes

-   📈 **Dashboard con indicadores** de progreso
-   🎯 **Barras de progreso** por estado (OK, No OK, Bloqueado)
-   📊 **Estadísticas en tiempo real**
-   🔢 **Contadores de casos** por prioridad y estado
-   📉 **Métricas de bugs** reportados y resueltos

### 🔧 Configuración y Workspace

-   ⚙️ **Configuración centralizada** con validación
-   📁 **Gestión de carpetas Drive** para evidencias
-   🔑 **API Keys de Trello** configurables
-   🎨 **Branding personalizable**
-   🚀 **Inicialización automática** de workspace

## 🏗️ Arquitectura

### Estructura de Archivos

```
app_qa_tool/
├── 📄 Backend_Code.js                          # Funciones principales del backend
├── 📄 Backend_Config.js                        # Gestión de configuración
├── 📄 Backend_Debug.js                         # Herramientas de debug
├── 📄 Backend_Services_Bugs.js                 # Lógica de bugs
├── 📄 Backend_Services_Casos_Canon.js          # Funciones canónicas de casos
├── 📄 Backend_Services_Casos.js                # CRUD de casos de prueba
├── 📄 Backend_services_drive.js                # Integración con Drive
├── 📄 Backend_Services_Ejecucion.js            # Lógica de ejecuciones
├── 📄 Backend_Services_Trello.js               # Integración con Trello
├── 📄 Backend_Services_Workspace.js            # Inicialización de workspace
├── 📄 Backend_Utils_Headers.js                 # Utilidades para headers HTTP
├── 📄 Backend_Utils_Utils.js                   # Funciones utilitarias
├── 📄 Backend_Validator.js                     # Validaciones
├── 🎨 Frontend_Branding.html                   # Estilos de marca
├── 🧩 Frontend_Components_Bugs_List.html       # Lista de bugs (v1)
├── 🧩 Frontend_Components_Bugs_List2.html      # Lista de bugs (v2)
├── 🧩 Frontend_Components_Bugs.html            # Gestión de bugs
├── 🧩 Frontend_Components_Casos_CRUD.html      # CRUD frontend de casos
├── 🧩 Frontend_Components_Casos_Hojas.html     # Gestión de hojas/módulos
├── 🧩 Frontend_Components_Casos_Navegacion.html # Navegación entre secciones
├── 🧩 Frontend_Components_Casos_Tabla.html     # Tabla de casos
├── 🧩 Frontend_Components_Casos_UI.html        # UI principal de casos
├── 🧩 Frontend_Components_Ejecuciones.html     # Modal de ejecución
├── 🧩 Frontend_Components_Metricas.html        # Dashboard de métricas
├── 🧩 Frontend_Components_Setup.html           # Pantalla de configuración inicial
├── 🧩 Frontend_Components_Trello_Config.html   # Configuración de Trello
├── 📱 Frontend_Index.html                      # Punto de entrada
├── 📜 Frontend_Policies.html                   # Políticas de privacidad
├── 🎨 Frontend_Styles_Base.html                # Estilos base
└── ⚙️ appsscript.json                          # Configuración del proyecto
```

### Modelo de Datos

#### Hoja: Casos

| Columna                  | Descripción                  |
| ------------------------ | ---------------------------- |
| ID                       | Identificador único          |
| Hoja                     | Módulo/categoría             |
| Titulo                   | Título del caso              |
| Descripcion              | Descripción detallada        |
| Formato                  | Clásico o Gherkin            |
| Prioridad                | Crítica, Alta, Media, Baja   |
| TipoPrueba               | Funcional, Regresión, etc.   |
| Pasos                    | Pasos de ejecución           |
| ResultadoEsperado        | Resultado esperado           |
| ScenarioGiven/When/Then  | Para formato Gherkin         |
| Precondiciones           | Condiciones previas          |
| CandidatoRegresion       | Si/No                        |
| EstadoDiseño             | Pendiente, Aprobado, etc.    |
| FechaCreacion            | Fecha de creación            |
| CreadoPor                | Usuario creador              |
| FechaUltimaEjecucion     | Fecha última ejecución       |
| ResultadoUltimaEjecucion | OK, No OK, etc.              |
| ComentariosEjecucion     | Observaciones                |
| EvidenciasURL            | Enlaces a evidencias         |
| Ambiente                 | Ambiente de ejecución        |
| Navegador                | Navegador utilizado          |
| LinkTrelloHU             | Enlace a historia de usuario |
| LinkBugRelacionado       | Enlace a bugs                |
| CasoURI                  | URI única del caso           |
| Notas                    | Notas adicionales            |

#### Hoja: Bugs

| Columna           | Descripción                  |
| ----------------- | ---------------------------- |
| ID                | Identificador único          |
| Titulo            | Título del bug               |
| Descripcion       | Descripción detallada        |
| Severidad         | Crítica, Alta, Media, Baja   |
| Estado            | Pendiente, En revisión, etc. |
| PasosReproduccion | Pasos para reproducir        |
| ResultadoObtenido | Resultado actual             |
| ResultadoEsperado | Resultado esperado           |
| Ambiente          | Ambiente donde ocurre        |
| Navegador         | Navegador afectado           |
| CasosRelacionados | IDs de casos                 |
| EvidenciasURL     | Enlaces a evidencias         |
| FechaCreacion     | Fecha de reporte             |
| DetectadoPor      | Usuario reportador           |
| LinkTrello        | Enlace a tarjeta Trello      |
| TrelloCardId      | ID de tarjeta Trello         |

#### Hoja: Config

Almacena la configuración del sistema:

-   Carpetas de Drive para evidencias
-   API Keys de Trello
-   Board y List IDs de Trello
-   Configuraciones generales

## 🚀 Instalación y Configuración

### 📋 Requisitos Previos

-   **Cuenta de Google** (Gmail corporativo)
-   **Node.js** v14 o superior (para desarrollo local)
-   **npm** (incluido con Node.js)
-   Acceso a **Google Sheets** y **Google Drive**
-   Permisos de administrador en **Google Apps Script**

---

## 🏠 Opción 1: Desarrollo Local (Recomendado para el Equipo)

### 1️⃣ Instalación de Herramientas

#### Instalar Node.js y npm

1. Descarga Node.js desde [nodejs.org](https://nodejs.org/)
2. Verifica la instalación:

    ```bash
    node --version   # Debe mostrar v14 o superior
    npm --version    # Debe mostrar la versión de npm
    ```

#### Instalar clasp (Google Apps Script CLI)

```bash
# Instalar clasp globalmente
npm install -g @google/clasp

# Verificar instalación
clasp --version
```

### 2️⃣ Autenticación con Google

```bash
# Iniciar sesión con tu cuenta de Google
clasp login
```

Esto abrirá un navegador donde deberás:

1. Seleccionar tu cuenta de Google
2. Aceptar los permisos solicitados
3. Cerrar la ventana cuando diga "Success"

### 3️⃣ Clonar el Proyecto desde Apps Script

1. **Obtener el Script ID**:

    - Ve a [Google Apps Script](https://script.google.com/)
    - Abre el proyecto **QA Management System**
    - Ve a **Configuración del proyecto** (⚙️ en el menú lateral)
    - Copia el **ID de script** (algo como: `1a2b3c4d5e6f7g8h9i0j...`)

2. **Clonar localmente**:

    ```bash
    # Crear carpeta del proyecto
    mkdir app_qa_tool
    cd app_qa_tool

    # Clonar el proyecto (reemplaza SCRIPT_ID con el ID copiado)
    clasp clone SCRIPT_ID
    ```

### 4️⃣ Estructura del Proyecto Local

Después de clonar, deberías tener:

```text
app_qa_tool/
├── .clasp.json              # Configuración de clasp (no modificar)
├── appsscript.json          # Manifest del proyecto
├── Backend_Code.js
├── Backend_Config.js
├── Backend_Services_*.js    # Todos los archivos de servicios
├── Frontend_Index.html
├── Frontend_Components_*.html
└── README.md
```

### 5️⃣ Desarrollo y Despliegue

#### Hacer Cambios Localmente

1. Abre el proyecto con tu editor favorito (VS Code recomendado)
2. Modifica los archivos `.js` y `.html` según necesites
3. Guarda tus cambios

#### Subir Cambios a Apps Script

```bash
# Subir TODOS los archivos al servidor
clasp push

# Si pregunta por confirmar sobrescritura, escribe: y
```

#### Abrir el Editor Web (Opcional)

```bash
# Abrir el proyecto en el navegador
clasp open
```

#### Ver Logs en Tiempo Real

```bash
# Ver logs del servidor
clasp logs

# Ver logs en tiempo real (streaming)
clasp logs --watch
```

### 6️⃣ Configurar el Proyecto (Primera Vez)

**Crear Implementación Web**:

-   En el editor web: **Implementar > Nueva implementación**
-   Tipo: **Aplicación web**
-   Descripción: `Versión Producción` o `v1.0`
-   Ejecutar como: **Yo** (tu email)
-   Quién tiene acceso:
    -   **Solo yo** (desarrollo)
    -   **Todos en [tu organización]** (producción interna)
    -   **Todos** (producción pública)
-   Click **Implementar**
-   **¡IMPORTANTE!**: Copia la **URL de la aplicación web** generada

---

## 📊 Configuración del Google Sheet (Ambas Opciones)

### Paso 1: Crear el Sheet

1. Ve a [Google Sheets](https://sheets.google.com/)
2. Crea un **nuevo libro** (llamado por ejemplo: "QA Data")
3. Copia la URL completa del Sheet

### Paso 2: Inicializar el Workspace

**Opción A: Desde la Web App** (Recomendado)

1. Abre la URL de tu aplicación web
2. Ve a **⚙️ Configuración**
3. Pega la URL del Sheet
4. Click **Inicializar Workspace**
5. Espera a que se creen todas las hojas automáticamente

#### Opción B: Desde Apps Script

1. En el editor de Apps Script
2. Abre el archivo `Backend_Services_Workspace.js`
3. Ejecuta la función `inicializarWorkspace()` con la URL del Sheet

### Paso 3: Configurar Carpetas de Drive

1. Crea 2 carpetas en Google Drive:

    - 📁 `QA - Evidencias de Ejecución`
    - 📁 `QA - Evidencias de Bugs`

2. Comparte las carpetas con tu equipo (Editores o Visualizadores)

3. Copia las URLs de cada carpeta (algo como: `https://drive.google.com/drive/folders/FOLDER_ID`)

4. En la app web:
    - Ve a **⚙️ Configuración**
    - Pega las URLs en:
        - **Carpeta Evidencias Ejecución**
        - **Carpeta Evidencias Bugs**
    - Click **Guardar Configuración**

---

## 👥 Workflow del Equipo

### Para el Lead/Administrador

```bash
# 1. Hacer cambios localmente
code .                    # Abrir VS Code

# 2. Hacer commits en Git
git add .
git commit -m "Feature: Nueva funcionalidad de bugs"
git push origin feature/bugs-trello

# 3. Subir a Apps Script
clasp push

# 4. (Opcional) Crear nueva versión
clasp deploy --description "v1.2.0 - Integración Trello"
```

### Para Desarrolladores del Equipo

```bash
# 1. Clonar el repositorio (primera vez)
git clone https://github.com/heisonmoreno-sudo/app_qa_tool.git
cd app_qa_tool

# 2. Instalar clasp si no lo tienes
npm install -g @google/clasp

# 3. Autenticarte con tu cuenta
clasp login

# 4. Conectar con el proyecto en Apps Script
clasp clone SCRIPT_ID    # El admin te dará el SCRIPT_ID

# 5. Hacer cambios y probar localmente
# ... editar archivos ...

# 6. Subir tus cambios
clasp push

# 7. Ver logs para debugging
clasp logs --watch
```

### Para QA/Testers (Sin Desarrollo)

1. Solo necesitan la **URL de la aplicación web**
2. No requieren instalación de clasp ni desarrollo local
3. Pueden usar la app directamente desde el navegador

---

## 🔄 Comandos Útiles de clasp

```bash
# Ver información del proyecto
clasp settings

# Ver versiones desplegadas
clasp deployments

# Descargar cambios del servidor (si alguien editó online)
clasp pull

# Forzar subida (sobrescribir todo)
clasp push --force

# Crear una nueva versión
clasp deploy -d "v1.3.0"

# Ver diferencias locales vs servidor
clasp status

# Ejecutar una función específica
clasp run nombreDeLaFuncion
```

---

## 📝 Notas Adicionales

### Archivo .clasp.json

Después de hacer `clasp clone`, se creará un archivo `.clasp.json` con esta estructura:

```json
{
    "scriptId": "1a2b3c4d5e6f7g8h9i0j...",
    "rootDir": "."
}
```

**🚨 IMPORTANTE**:

-   **NO** compartas este archivo públicamente (tiene el Script ID)
-   Agrégalo a `.gitignore` si usas control de versiones
-   Cada desarrollador tendrá su propio `.clasp.json` local

### Mejores Prácticas

1. **Siempre haz `clasp pull` antes de `clasp push`** para evitar sobrescribir cambios de otros
2. **Usa ramas en Git** para features nuevas (`feature/nombre-feature`)
3. **Comenta tu código** especialmente en funciones complejas
4. **Prueba localmente** antes de hacer push a producción
5. **Mantén backups** del Sheet principal

---

## 🎯 Siguiente Paso: Usar la Aplicación

Una vez instalado y configurado, consulta la sección **📖 Uso** de este README para aprender a:

-   Crear casos de prueba
-   Ejecutar casos
-   Reportar bugs
-   Ver métricas

---

### Paso 6: Configuración Inicial

1. Abre la aplicación web
2. Ve a **Configuración** (⚙️)
3. Completa:
    - URL del Google Sheet
    - Carpetas de Drive para evidencias
    - (Opcional) Configuración de Trello

## 📖 Uso

### Crear un Caso de Prueba

1. Click en **➕ Nuevo Caso**
2. Completa los campos:
    - **Título**: Nombre descriptivo
    - **Descripción**: Detalle del caso
    - **Formato**: Clásico o Gherkin
    - **Prioridad**: Crítica, Alta, Media, Baja
    - **Tipo de Prueba**: Funcional, Regresión, etc.
3. Si es Clásico: Agrega Pasos y Resultado Esperado
4. Si es Gherkin: Completa Given, When, Then
5. Click **Guardar**

### Ejecutar un Caso

1. En la tabla de casos, click en **▶️ Ejecutar**
2. En el modal:
    - Selecciona **Resultado**: OK, No OK, Bloqueado, etc.
    - Agrega **Observaciones**
    - Selecciona **Ambiente** y **Navegador**
    - Adjunta **Evidencias** (imágenes, videos, documentos)
    - Si es No OK: Vincula o crea un Bug
3. Click **💾 Guardar Ejecución**

### Reportar un Bug

1. Click en **🐛 Reportar Bug** (desde ejecución o sección Bugs)
2. Completa:
    - **Título** y **Descripción**
    - **Severidad**
    - **Pasos de Reproducción**
    - **Resultado Obtenido** vs **Esperado**
    - **Ambiente** y **Navegador**
    - Adjunta **Evidencias**
3. (Opcional) Sincroniza con Trello
4. Click **Guardar**

### Ver Métricas

1. Ve a la sección **📊 Métricas**
2. Visualiza:
    - Progreso de Ejecución (barras por estado)
    - Estadísticas de casos
    - Estado de bugs

## 🔧 Configuración Avanzada

### Integración con Trello

1. Obtén tu **API Key** de Trello: [https://trello.com/app-key](https://trello.com/app-key)
2. Genera un **Token**: Click en el enlace de la página de API Key
3. Obtén el **Board ID**: Desde la URL del board en Trello
4. Obtén el **List ID**: Usa la API de Trello o inspecciona con DevTools
5. Configura en la app: **⚙️ Configuración > Trello**

### Carpetas de Drive

Crea carpetas en Google Drive para almacenar evidencias:

-   Una para evidencias de **Ejecuciones**
-   Una para evidencias de **Bugs**

Comparte las carpetas con los permisos adecuados y copia sus URLs a la configuración.

## 🙏 Agradecimientos

-   Google Apps Script por la plataforma
-   Comunidad de QA por feedback y sugerencias
-   Trello por la API de integración

## 🗺️ Roadmap

-   [ ] Exportación de reportes en PDF
-   [ ] Integración con Jira
-   [ ] Notificaciones por email
-   [ ] Dashboard de métricas avanzado
-   [ ] Gestión de usuarios y permisos
-   [ ] Historial completo de cambios
-   [ ] API REST para integraciones
-   [ ] Mobile responsive mejorado
-   [ ] Modo offline con sincronización

---
