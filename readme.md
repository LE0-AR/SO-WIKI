# SO-WIKI | Sistemas Operativos Wiki

Plataforma web interactiva para aprender, documentar y simular conceptos fundamentales de los Sistemas Operativos mediante artículos técnicos y simuladores visuales.

## Descripción del proyecto

**SO-WIKI** es una aplicación web académica desarrollada para facilitar el aprendizaje práctico de conceptos de Ingeniería en Sistemas y Sistemas Operativos.

El proyecto integra una base de conocimientos con herramientas interactivas que permiten explorar conceptos como la administración de procesos, la gestión de memoria, la concurrencia y la sincronización de recursos.

Además, cuenta con funcionalidades de administración de contenido para organizar artículos, categorías y usuarios, según los permisos asignados.

## Funcionalidades principales

### Base de conocimientos
- Publicación y consulta de artículos técnicos.
- Organización de contenido por categorías.
- Búsqueda de información.
- Interfaz web adaptable a diferentes dispositivos.

### Simulador de procesos y memoria
- Representación visual de procesos.
- Simulación de la asignación y liberación de memoria RAM.
- Visualización de estados y transiciones de procesos.
- Registro de eventos para facilitar el análisis de la ejecución.

###  Simulador de concurrencia
- Representación de recursos compartidos mediante una simulación de parqueo.
- Demostración de conceptos de exclusión mutua.
- Uso de semáforos lógicos para explicar la sincronización.
- Exploración de condiciones de carrera y concurrencia.

###  Panel administrativo
- Administración de artículos y categorías.
- Gestión de usuarios.
- Control de acceso según roles y permisos.
- Herramientas para la creación y publicación de contenido.

## Arquitectura del sistema

El proyecto utiliza una arquitectura web basada en componentes para el cliente y servicios para el procesamiento del servidor.

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| Frontend | React.js y Vite | Interfaz de usuario y simuladores interactivos |
| Estilos | Bootstrap 5 | Diseño adaptable y componentes visuales |
| Enrutamiento | React Router DOM | Navegación entre páginas y vistas protegidas |
| Backend | Node.js y Express.js | API y lógica del servidor |
| Base de datos | Supabase / PostgreSQL | Persistencia de información |
| Despliegue frontend | Vercel | Publicación de la aplicación web |
| Despliegue backend | Render | Ejecución de los servicios del servidor |

*Nota: esta tabla describe el stack previsto para el proyecto. La configuración definitiva debe coincidir con las dependencias y servicios que realmente utiliza el repositorio.*

## Tecnologías utilizadas

- **JavaScript:** lógica de la aplicación.
- **React:** construcción de interfaces mediante componentes.
- **Vite:** servidor de desarrollo y herramienta de compilación.
- **Node.js:** entorno de ejecución del backend.
- **Express.js:** desarrollo de endpoints y servicios HTTP.
- **Bootstrap:** diseño responsivo.
- **Supabase y PostgreSQL:** servicios de datos, si están configurados en el entorno.
- **Git y GitHub:** control de versiones y colaboración.
- **Vercel y Render:** plataformas de despliegue.

## Requisitos previos

Antes de ejecutar el proyecto, instala:

- [Node.js](https://nodejs.org/)
- [Git](https://git-scm.com/)
- Un editor de código, como [Visual Studio Code](https://code.visualstudio.com/)

Se recomienda utilizar una versión de Node.js compatible con las dependencias del proyecto.

## Instalación y ejecución

### 1. Clonar el repositorio

```bash
git clone https://github.com/LE0-AR/wiki.git
cd wiki
```

### 2. Instalar las dependencias

Identifica las carpetas que contienen el frontend y el backend. Si el proyecto mantiene la estructura `frontend/` y `backend/`, ejecuta:

**Backend**

```bash
cd backend
npm install
```

**Frontend**

Abre otra terminal:

```bash
cd frontend
npm install
```

### 3. Configurar las variables de entorno

Crea los archivos `.env` correspondientes a cada aplicación, utilizando los nombres de variables que espera el código fuente.

Ejemplo para un frontend con Vite:

```env
VITE_API_URL=http://localhost:3000
```

Si el proyecto utiliza Supabase, configura también las variables de conexión requeridas por la aplicación.

Para el backend, configura el puerto, las credenciales y los servicios externos que realmente utilice.

**Importante:** no publiques claves privadas, contraseñas ni archivos `.env` con credenciales reales en GitHub.

### 4. Iniciar los servicios

Ejecuta el comando definido en los scripts de `package.json` de cada aplicación.

Por ejemplo, si ambos proyectos incluyen un script `dev`:

```bash
npm run dev
```

La URL local del frontend y el puerto del backend dependerán de la configuración del proyecto.

## Objetivos académicos

SO-WIKI busca reforzar el aprendizaje de los Sistemas Operativos a través de la experimentación y la representación visual de sus principales mecanismos.

Entre los conceptos abordados se encuentran:

- Administración de procesos.
- Planificación y ejecución.
- Gestión de memoria.
- Concurrencia y sincronización.
- Exclusión mutua y semáforos.
- Administración de recursos compartidos.

## Autores

**Desarrollador:** Grupo 4.

**Institución:** Universidad Mariano Gálvez de Guatemala.

**Carrera:** Ingeniería en Sistemas de Información y Ciencias de la Computación.

**Curso:** Sistemas Operativos.
**Sede:** Chimaltenango. 

---

Desarrollado como proyecto académico para el aprendizaje práctico de los Sistemas Operativos.
