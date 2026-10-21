Aquí tienes tu **`README.md`** mejorado a nivel profesional, respetando la estructura exacta de tu borrador, tu repositorio oficial (`LE0-AR/wiki`), la separación **Cliente-Servidor (Frontend + Backend en Node/Express)** y completando los pasos de instalación que se cortaron al final:

---

# SO-WIKI (WIKI-SO)

## Descripción del proyecto

**SO-WIKI** es una plataforma web interactiva diseñada para la visualización, simulación y documentación de conceptos clave de Ingeniería en Sistemas y Sistemas Operativos[cite: 3]. El sistema combina un gestor de contenidos (CMS) colaborativo con motores de simulación en el navegador para demostrar de forma práctica la administración de recursos del Kernel: planificación de procesos en cola y en ejecución, gestión de memoria RAM, auditoría de eventos y control de concurrencia[cite: 3].

---

## Arquitectura del Sistema y Despliegue en la Nube

El proyecto está construido bajo una **arquitectura Cliente-Servidor desacoplada** (Frontend y Backend independientes), orientada a eventos y optimizada para un renderizado de alta velocidad[cite: 3]:

* **Frontend (Capa de Presentación):** Alojado en **Vercel** con despliegue continuo (CI/CD) desde GitHub, aprovechando el Virtual DOM de React para actualizar las simulaciones en tiempo real sin recargar el navegador[cite: 3].
* **Backend (API REST):** Alojado en **Render**, encargado de procesar la lógica de negocio y la comunicación segura entre el cliente y los servicios de almacenamiento.
* **Base de Datos y Autenticación (BaaS):** Implementado en **Supabase** sobre **PostgreSQL**, gestionando la integridad relacional de artículos, categorías y usuarios mediante sesiones seguras basadas en **JWT (JSON Web Tokens)**[cite: 3].
* **Almacenamiento Multimedia (Object Storage):** Integración con un **Bucket de Amazon S3** para alojar las imágenes de los artículos de forma externa, evitando sobrecargar la base de datos relacional.

---

## Módulos Principales

1. **Base de Conocimientos (Wiki-Blog):** Catálogo público de artículos técnicos con filtrado multicategoría y un **Buscador Global en Tiempo Real (Live Search)** sincronizado mediante parámetros de URL (`useSearchParams`)[cite: 1, 3].
2. **Simulador de Memoria RAM y CPU:** Gestor de recursos sobre una capacidad teórica de **1024 MB** que previene el bloqueo de cabeza de línea (*Head-of-Line Blocking*) evaluando toda la cola de procesos listos, acompañado de una consola **System Log Terminal** con *auto-scroll* para auditar transiciones de estado[cite: 3].
3. **Simulador de Parqueo Concurrente:** Demostración práctica de exclusión mutua (*Mutex*) y semáforos lógicos para prevenir condiciones de carrera (*Race Conditions*) en recursos compartidos[cite: 1].
4. **Backoffice Administrativo y Seguridad (RBAC):** Protección de vistas mediante el componente guardián `<RutaPrivada>`, diferenciando permisos entre **Administrador** (CRUD de usuarios, categorías y artículos) y **Editor** (Panel de redacción y publicación)[cite: 3].

---

## Tecnologías implementadas

### Lenguaje de programación utilizado

* **JavaScript (ES6+):** Implementado de forma transversal tanto en la lógica de estados del cliente como en el entorno de ejecución del servidor.

### Librerías y frameworks empleados

**Frontend (Cliente):**

* **React.js (v18+):** Biblioteca principal para la construcción de la interfaz de usuario basada en componentes y manejo de estados (`useState`, `useEffect`, `useRef`)[cite: 3].
* **Vite:** Herramienta de construcción y empaquetado de módulos ECMAScript con *Hot Module Replacement* (HMR) instantáneo[cite: 3].
* **React Router DOM (v6):** Gestión de enrutamiento del lado del cliente (SPA), parámetros de búsqueda en URL y protección de rutas privadas[cite: 3].
* **Bootstrap 5 & Bootstrap Icons:** Sistema de grillas responsivo (*mobile-first*) y menú móvil superpuesto controlado directamente desde React[cite: 1, 2, 3].
* **@supabase/supabase-js:** Cliente oficial para consultas asíncronas (`async/await`) y gestión de autenticación con Supabase[cite: 3].

**Backend (Servidor):**

* **Node.js:** Entorno de ejecución en tiempo de servidor orientado a eventos asíncronos.
* **Express.js:** Framework minimalista para la estructuración de rutas, controladores y endpoints de la API REST.
* **Cors & Dotenv:** Middleware para el control de acceso HTTP de origen cruzado (CORS) e inyección segura de variables de entorno.
* **Nodemon:** Utilidad de monitoreo para el reinicio automático del servidor durante el desarrollo.

---

## Instrucciones de instalación y uso

Para ejecutar este proyecto en tu entorno local, asegúrate de tener instalado **Node.js (v18+ recomendado)** y **Git**. Sigue estos pasos:

### 1. Clonar el repositorio

```bash
git clone https://github.com/LE0-AR/wiki.git
cd wiki

```

### 2. Configurar e iniciar el Backend (Servidor)

Ingresa al directorio del servidor (o raíz correspondiente de la API), instala las dependencias y configura tus variables de entorno:

```bash
cd backend
npm install

```

Crea un archivo `.env` dentro de la carpeta del servidor con tus credenciales:

```env
PORT=3000
SUPABASE_URL=tu_url_de_supabase
SUPABASE_KEY=tu_clave_de_supabase
AWS_ACCESS_KEY_ID=tu_access_key_s3
AWS_SECRET_ACCESS_KEY=tu_secret_key_s3
AWS_REGION=tu_region_s3
AWS_BUCKET_NAME=nombre_de_tu_bucket

```

Inicia el servidor en modo desarrollo:

```bash
npm run dev

```

### 3. Configurar e iniciar el Frontend (Cliente)

Abre una nueva terminal, dirígete a la carpeta del cliente e instala sus paquetes:

```bash
cd frontend
npm install

```

Crea un archivo `.env` en la raíz del frontend apuntando a tus servicios:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
VITE_API_URL=http://localhost:3000

```

Levanta el entorno de desarrollo con Vite:

```bash
npm run dev

```

La aplicación estará disponible en tu navegador en `http://localhost:5173`.

---

## Autores y Contexto Académico

* **Desarrollador:** Leonardo Ismael Aspuac Raxón y equipo de desarrollo[cite: 3].
* **Carrera:** Ingeniería en Sistemas de Información y Ciencias de la Computación (Octavo Semestre)[cite: 3].
* **Curso:** Sistemas Operativos[cite: 3].
* **Institución:** Universidad Mariano Gálvez de Guatemala (UMG)[cite: 3].

---
