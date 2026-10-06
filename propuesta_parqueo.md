# UNIVERSIDAD MARIANO GALVEZ
CENTRO DE ANTIGUA GUATEMALA
FACULTA DE INGENIERIA
CURSO: SISTMAS OPERATIVOS
ING. JUAN CARLOS OVANDO BORRAYO

| TEMA | PROPUESTA PROYECTO 2 |
| :--- | :--- |
| **FECHA** | 26/09/2026 |
| **CARNÉ** | **NOMBRE COMPLETO** |
| 1990-23-8990 | GILMAR RICARDO SUBUYUJ RAXON |
| 1990-22-5370 | JUNIOR ANIBAL TUYUC CUX |
| 1990-24-25170 | LEONARDO ISMAEL ASPUAC RAXON |

---

## Idea general
**Escenario transaccional elegido.** Se desarrollará un sistema concurrente de gestión de parqueo que represente el ingreso, circulación, asignación de espacios y salida de vehículos. Cada vehículo será ejecutado como un Worker Thread en el backend y competirá por recursos compartidos del parqueo. El objetivo es demostrar problemas reales de concurrencia y la forma en que pueden controlarse mediante mecanismos de sincronización.

**Recursos compartidos y competencia.** Los principales recursos serán los espacios de estacionamiento, la entrada, la salida, la Zona A, la Zona B y la capacidad general del parqueo. Varios vehículos podrán solicitar los mismos recursos simultáneamente, generando competencia entre hilos.

**Qué se va a demostrar.** Primero se demostrará una condición de carrera haciendo que dos vehículos intenten reservar el mismo espacio al mismo tiempo. Luego se aplicará sincronización para garantizar que un único hilo pueda modificar el recurso. También se incluirá un modo controlado de interbloqueo para demostrar una espera circular real entre dos vehículos y dos zonas.

## 1. Introducción
El presente proyecto tiene como finalidad aplicar de manera práctica conceptos relacionados con concurrencia, sincronización e interbloqueos dentro de un sistema operativo. Para ello se desarrollará un sistema concurrente de gestión de parqueo, en el cual diferentes vehículos competirán por recursos compartidos como espacios, zonas de entrada, salida y áreas internas.

Cada vehículo será representado mediante una unidad de ejecución concurrente en el backend, permitiendo analizar situaciones como condiciones de carrera, acceso simultáneo a recursos y esperas circulares. El sistema incorporará mecanismos de sincronización, detección de interbloqueos y un monitor gráfico que permitirá visualizar el comportamiento de los hilos y recursos en tiempo real.

## 2. Objetivos
**Objetivo general**
Desarrollar un sistema concurrente de gestión de parqueo que permita demostrar el uso de hilos, mecanismos de sincronización, condiciones de carrera y detección de interbloqueos mediante recursos compartidos.

**Objetivos específicos**
* Implementar vehículos como unidades de ejecución concurrente.
* Administrar recursos compartidos mediante semáforos y mecanismos de exclusión mutua.
* Demostrar una condición de carrera y posteriormente corregirla mediante sincronización.
* Detectar interbloqueos utilizando un Grafo de Asignación de Recursos.
* Mostrar gráficamente el estado de los hilos, recursos y procesos del sistema.

## 3. Desarrollo

### 3.1 Descripción del sistema
El proyecto representará un parqueo en el que múltiples vehículos podrán ingresar, desplazarse, ocupar un espacio y salir de manera concurrente.

Los principales recursos compartidos serán:
* espacios de parqueo;
* zona de entrada;
* zona de salida;
* Zona A;
* Zona B.

Cada vehículo competirá por dichos recursos mientras se encuentra activo dentro del sistema.

### 3.2 Concurrencia y sincronización
El backend será desarrollado con Node.js y Express.
Para la ejecución concurrente se utilizará:
* worker_threads;
* SharedArrayBuffer;
* Atomics;
* semáforos;
* mecanismos de exclusión mutua.

Los semáforos permitirán controlar recursos con capacidad limitada, como la cantidad de espacios disponibles.
Los mecanismos de exclusión mutua permitirán proteger recursos que únicamente pueden ser utilizados por un hilo a la vez.

### 3.3 Condición de carrera
Se demostrará una condición de carrera haciendo que dos vehículos intenten reservar el mismo espacio simultáneamente.
Sin sincronización, ambos podrían identificar el espacio como disponible y tratar de utilizarlo.
Posteriormente se aplicarán mecanismos de exclusión mutua para garantizar que únicamente uno de los vehículos pueda acceder al recurso.
Este escenario ya está contemplado dentro de la propuesta actual del parqueo. Proyecto 2

### 3.4 Interbloqueo
Para demostrar un interbloqueo se utilizarán dos recursos:
* Zona A y Zona B.

El escenario será:
* Vehículo 1 obtiene Zona A y solicita Zona B.
* Vehículo 2 obtiene Zona B y solicita Zona A.

Esto provoca una espera circular:
Vehículo 1 Zona B → Vehículo 2 Zona A→ Vehículo 1

El sistema deberá identificar este ciclo y aplicar una estrategia de recuperación. Proyecto 2

### 3.5 Grafo de Asignación de Recursos
El sistema construirá dinámicamente un Grafo de Asignación de Recursos (RAG) utilizando la información real de los hilos y recursos.

El grafo permitirá conocer:
* qué recurso posee cada hilo;
* qué recurso está solicitando;
* qué hilos se encuentran bloqueados.

Para detectar ciclos se utilizará el algoritmo DFS.
Esto cumple con el requerimiento de que el grafo se genere a partir del estado real del programa y no mediante información estática

### 3.6 Monitor del sistema
El sistema contará con un panel que permita observar información como:

| Dato | Descripción |
| :--- | :--- |
| PID | Identificador del proceso principal |
| Worker | Hilo asociado a un vehículo |
| Estado | Ejecutando, esperando, bloqueado |
| Recurso actual | Recurso que posee |
| Recurso solicitado | Recurso que necesita |
| Memoria | Consumo aproximado |
| Sincronización | Semáforo o mutex |
| Deadlock | Estado de interbloqueo |

También se podrá visualizar gráficamente el parqueo y el Grafo de Asignación de Recursos.
El frontend debe mostrar el estado real de los procesos/hilos y recursos, que es precisamente uno de los puntos solicitados en la hoja del proyecto.

## 4. Tecnologías a utilizar

| Tecnología | Aplicación |
| :--- | :--- |
| React + Vite | Frontend |
| Bootstrap | Diseño y estilos |
| Node.js | Backend |
| Express | API |
| Worker Threads | Concurrencia |
| SharedArray Buffer / Atomics | Memoria compartida y sincronización |
| Socket.IO | Comunicación en tiempo real |
| Supabase | Base de datos PostgreSQL |
| DFS | Detección de ciclos |
| Vercel | Despliegue del frontend |
| Render | Despliegue del backend |
| Linux/WSL2 | Pruebas del sistema operativo |
| GitHub | Control de versiones |

## 5. Fases de desarrollo
Para no hacer demasiadas fases, yo las reduciría a cinco:

* **Fase 1. Diseño del parqueo:** Creación de vehículos, espacios, zonas y recursos compartidos.
* **Fase 2. Concurrencia y sincronización:** Implementación de Worker Threads, semáforos y exclusión mutua.
* **Fase 3. Condición de carrera e interbloqueos:** Generación de conflictos entre vehículos y creación del escenario de deadlock.
* **Fase 4. RAG, detección y recuperación:** Construcción del grafo, detección mediante DFS y liberación de recursos.
* **Fase 5. Monitor e integración:** Desarrollo del dashboard en React, conexión mediante Socket.IO, pruebas en Linux y despliegue.