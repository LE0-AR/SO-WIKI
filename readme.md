# SO-WIKI

## Descripción del proyecto
SO-WIKI es una plataforma web interactiva diseñada para la visualización, simulación y documentación de conceptos clave de Ingeniería de Sistemas y Sistemas Operativos. El sistema permite gestionar información de manera colaborativa, al mismo tiempo que integra un módulo para la demostración práctica de la gestión de recursos del sistema, como la administración de procesos (en ejecución y en cola) y el monitoreo del estado de la memoria RAM.

## Tecnologías implementadas
El proyecto está construido bajo una arquitectura Cliente-Servidor (Frontend y Backend separados), orientada a eventos y renderizado rápido. Se utiliza **Supabase** como base de datos y servicio de autenticación (BaaS).

### Lenguaje de programación utilizado
* **JavaScript (JS)** (Tanto en el lado del cliente como en el servidor).

### Librerías o frameworks empleados
**Frontend (Cliente):**
* **React** (Biblioteca principal para la interfaz de usuario).
* **Vite** (Herramienta de construcción y empaquetado ultra rápido).
* **React Router Dom** (Para el enrutamiento y navegación entre vistas).
* **@supabase/supabase-js** (Cliente para la conexión con la base de datos).

**Backend (Servidor):**
* **Node.js** (Entorno de ejecución).
* **Express.js** (Framework para la creación de la API REST).
* **Nodemon** (Herramienta de desarrollo para reinicio automático).
* **Cors & Dotenv** (Gestión de permisos cruzados y variables de entorno).

---

## Instrucciones de instalación y uso

Para ejecutar este proyecto en tu entorno local, asegúrate de tener instalado **Node.js** y sigue estos pasos:

### 1. Clonar el repositorio
```bash
git clone [https://github.com/LE0-AR/wiki.git](https://github.com/LE0-AR/wiki.git)
cd wiki-main
```

## Proyecto 2: Parqueo concurrente

La nueva sección **Parqueo**, disponible en `/parqueo`, añade vehículos ejecutados con Worker Threads, sincronización mediante memoria compartida y Atomics, demostraciones de carrera, detección de interbloqueos con RAG/DFS y recuperación. El simulador de memoria permanece independiente.

Para iniciar el laboratorio sin credenciales de Supabase, ejecutar en dos terminales:

```sh
# Terminal 1, desde wiki-backend
npm install
npm run dev:parqueo
```

```sh
# Terminal 2, desde wiki-frontend
npm install
npm run dev
```

La guía completa está en `docs/parqueo.md`: requisitos, configuración, pruebas y evidencia Linux/WSL2. Los documentos originales de propuesta y directrices se muestran dentro de la página. La demostración académica requiere comprobar los hilos en Linux real; no basta con ejecutar el frontend.

Ejecutar `npm test` en ambos directorios; en el frontend, ejecutar también `npm run lint` y `npm run build`. Las dependencias nuevas requieren actualizar los archivos de bloqueo con `npm install` antes de utilizar `npm ci`.