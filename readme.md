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