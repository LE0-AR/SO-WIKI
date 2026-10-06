# Proyecto 2: Motor de Transacciones Concurrentes y Detector de Interbloqueos

*Recordar que debe ser añadido a la Wiki*
*   **Ponderación:** 5 puntos
*   **Unidades:** 3 (Concurrencia y Sincronización — eje central) y 4 (Interbloqueos — extensión)
*   **Entorno obligatorio:** Linux real (WSL2 o máquina virtual). No se acepta código que solo "imprime" concurrencia sin crear hilos/procesos reales del sistema operativo.

## 1. Objetivo
Implementar un motor transaccional que use hilos o procesos reales del sistema operativo —verificables con herramientas como `ps -eLf`, `/proc/[pid]/task` o `htop`, tal como lo hicieron en el laboratorio de hilos— para proteger secciones críticas con semáforos y/o monitores/locks nativos, demostrando que se evitan condiciones de carrera.

Como extensión (Unidad 4), el sistema incorpora un módulo detector de interbloqueos basado en un Grafo de Asignación de Recursos (RAG) y una estrategia de recuperación.

## 2. Qué significa "recursos reales"

**No se acepta:**
*   Un solo hilo que alterna entre "roles" con if/else fingiendo ser dos hilos distintos.
*   Un deadlock "actuado" con `time.sleep()` en un orden fijo, sin que surja de una disputa real por locks.
*   Un grafo de recursos dibujado a mano o hardcodeado, desconectado del estado real del programa en ejecución.

**Sí se exige:**
*   Hilos o procesos reales (`threading`, `multiprocessing`, `pthreads`, etc., según el lenguaje elegido).
*   Evidencia externa al programa: capturas de `ps -eLf`, `/proc`, `htop` o `strace` mostrando los hilos/procesos vivos durante la ejecución, igual que en el laboratorio previo.
*   El grafo de asignación de recursos se construye leyendo el estado real de las estructuras internas del programa (qué hilo tiene qué lock, quién espera qué), no una representación estática.

## 3. Entregables

### Entregable 0 — Propuesta de Proyecto (nuevo, obligatorio antes de programar)
Documento corto (1–2 páginas)
*   Escenario elegido (transferencias bancarias, reservas de asientos, u otro con recursos compartidos claros).
*   Lenguaje y mecanismo de sincronización que usarán (semáforos, Lock, monitores) y por qué.
*   Qué recursos compartidos existirán y qué hilos/procesos competirán por ellos.
*   Cómo van a provocar y comprobar una condición de carrera real (no solo describirla).
*   Diseño inicial de cómo forzarán la espera circular (qué hilo pide qué recurso, en qué orden) para el Entregable 2.
*   Cronograma de trabajo hasta la entrega final.

### Entregable 1 — Motor concurrente (Unidad 3, foco principal)
Motor funcional con hilos/procesos reales ejecutando transacciones concurrentes sobre recursos compartidos, protegido con semáforos o monitores, con evidencia de que la integridad de los datos se mantiene bajo carga.

### Entregable 2 — Inyección de deadlocks + RAG + recuperación (Unidad 4)
Modo activable que fuerza las 4 condiciones de Coffman, módulo que construye el RAG en memoria, hilo guardián que detecta ciclos (DFS o Tarjan), y estrategia de recuperación (terminación o liberación forzada).

### Entregable 3 — Documentación y demo
Repositorio con código comentado, README con instrucciones para reproducir en WSL/VM, y demostración en vivo del ciclo completo: operación normal → deadlock inyectado → detección → recuperación.