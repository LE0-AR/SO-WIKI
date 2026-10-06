# Parqueo concurrente — Proyecto 2

## Qué se añadió

La ruta `/parqueo`, accesible desde el menú y la portada, es un laboratorio conectado a un motor real de Node.js. El simulador de memoria original permanece separado y sin cambios.

Cada vehículo se ejecuta como un `worker_thread`. Un worker guardián obtiene el estado compartido, construye el Grafo de Asignación de Recursos (RAG), detecta ciclos y coordina la recuperación. React no inventa vehículos, PID, métricas, asignaciones ni interbloqueos.

Las fuentes académicas son `definici_n_del_proyecto_2.md` y `propuesta_parqueo.md`, en la raíz. La página las muestra sin modificar mediante Markdown con soporte de tablas.

## Requisitos

- Node.js compatible con Vite 8: usar Node 22.12 o posterior compatible (preferentemente una versión LTS).
- npm.
- Linux real para la demostración académica: WSL2, máquina virtual o instalación Linux. Ejecutar el binario Linux de Node, no `node.exe` a través de WSL.
- Dos terminales: servidor y frontend.

El motor autónomo no necesita credenciales de Supabase. El servidor completo de la wiki sí conserva sus requisitos de configuración originales.

## Instalación y ejecución

Desde la raíz del repositorio:

```sh
cd wiki-backend
npm install
npm run dev:parqueo
```

En otra terminal:

```sh
cd wiki-frontend
npm install
npm run dev
```

Abrir el frontend en el origen que indique Vite y pulsar **Parqueo**. El puerto esperado es 5173. El servidor autónomo escucha por defecto en `127.0.0.1:3000`; Vite reenvía `/api/parqueo` y `/socket.io` hacia ese servidor. No ejecutar a la vez el backend completo y el autónomo en el mismo puerto.

**Archivos de bloqueo:** si los manifiestos incluyen nuevas dependencias que todavía no figuran en `package-lock.json`, ejecutar primero `npm install` en cada directorio para actualizarlos. Después de instalar y verificar, conservar ambos archivos de bloqueo actualizados. No usar `npm ci` sobre manifiestos y bloqueos desincronizados.

### Configuración opcional

Variables del backend (en `wiki-backend/.env`, no subir secretos):

```dotenv
PORT=3000
PARQUEO_HOST=127.0.0.1
PARQUEO_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173
```

`PARQUEO_ORIGINS` es una lista de orígenes exactos, sin rutas ni comodines. Se comprueba también durante el handshake WebSocket. Vite usa el puerto 5173 en modo estricto: si está ocupado, cerrar la instancia anterior o configurar otro puerto y añadir ese origen a la lista. Los clientes de prueba Node envían un encabezado `Origin` permitido. La página usa transporte WebSocket para que también exista ese encabezado al conectar mediante el proxy local; el alojamiento/proxy debe permitir WebSocket.

Para un backend en otro origen, configurar en el frontend antes de compilar:

```dotenv
VITE_PARQUEO_API_URL=http://localhost:3000
```

No contiene credenciales. En producción debe ser un origen HTTPS compatible con la página. No apunta a `/api` ni a un namespace de Socket.IO. Las URLs del resto de la wiki no se alteraron.

Para incorporar el laboratorio al servidor existente, ejecutar `npm start` en `wiki-backend` con las variables `SUPABASE_URL`, `SUPABASE_KEY` y `SUPABASE_SERVICE_ROLE` que ya necesita la wiki. **La clave de servicio nunca debe ir al frontend.** No se requieren tablas nuevas ni operaciones sobre la base de datos para el parqueo.

## Guion de demostración

### 1. Operación normal

1. Seleccionar operación normal, capacidad 2 e iniciar.
2. Agregar, por ejemplo, 6 vehículos con estancia de 8000 ms (8 segundos).
3. Observar espera de capacidad, entrada, reserva, zonas, estacionamiento y salida.
4. Comprobar que cada plaza tiene un único propietario y los permisos permanecen dentro de la capacidad.

La capacidad se obtiene antes de retener la entrada. El mutex de espacios protege la tabla de reservas, pero no permanece adquirido durante toda la estancia. Cuando se necesitan ambas zonas, se adquieren A y después B.

### 2. Carrera sin protección

1. Elegir **Carrera sin protección** y reiniciar.
2. El motor crea dos hilos contra la misma plaza. Ambos leen su disponibilidad y una barrera hace reproducible el intercalado.
3. La comprobación y la reserva no están protegidas como una operación indivisible.
4. Examinar los intentos: dos confirmaciones para una plaza constituyen el conflicto, aunque el último escritor oculte al anterior en la ocupación final.

Las demostraciones de reserva aíslan una única plaza: no consumen permisos del semáforo de ingreso, porque ese semáforo podría serializar y ocultar el experimento. Por eso el indicador de permisos no representa el número de reservas confirmadas en estos dos modos.

La barrera no representa dos roles de un hilo único; coordina dos workers reales. Lecturas/escrituras individuales pueden ser atómicas y aun así la operación compuesta tener una carrera.

### 3. Reserva protegida

1. Elegir **Reserva protegida** y reiniciar.
2. Los dos hilos empiezan a competir fuera de la sección crítica.
3. Un mutex protege conjuntamente comprobación y reserva.
4. El resultado correcto es una sola confirmación, conservando la plaza hasta que ambos intentos hayan terminado.

### 4. Interbloqueo y recuperación

1. Elegir **Interbloqueo A / B**, desmarcar recuperación automática e iniciar.
2. Un vehículo adquiere A y el otro B. Una barrera de preparación garantiza que ambos poseen su primer recurso antes de solicitar el opuesto.
3. Observar el ciclo en el RAG y los hilos esperando. Obtener aquí las evidencias externas Linux.
4. Pulsar **Recuperar incidente**. La transacción víctima es cancelada y libera solo los recursos que posee.
5. Comprobar la desaparición del ciclo, la limpieza de la víctima y el avance del superviviente.
6. Repetir con recuperación automática. La evidencia histórica conserva el ciclo detectado aunque el estado actual ya esté recuperado.

Se cumplen exclusión mutua, retención y espera, ausencia de expropiación durante la operación normal y espera circular. La recuperación rompe el ciclo abortando una transacción; no consiste en que el guardián libere un mutex mientras su propietario continúa utilizándolo.

## Modelo de sincronización

- `SharedArrayBuffer` almacena permisos, propietarios, solicitudes, plazas y cancelación.
- Un monitor protege transiciones breves y permite obtener instantáneas coherentes. Nunca se espera por una zona o barrera reteniendo ese monitor.
- Las esperas bloqueantes de `Atomics.wait` se realizan en workers, no en el hilo HTTP de Express.
- El escenario de carrera deja deliberadamente sin proteger la operación de reserva que se está estudiando.
- Arista recurso → vehículo: asignación real. Arista vehículo → recurso: solicitud bloqueante real.
- DFS se aplica a recursos de instancia única. Un ciclo que involucra un semáforo de varias instancias no es, por sí solo, prueba suficiente de interbloqueo.
- Antes de recuperar, el guardián revalida que el ciclo sigue vigente.
- La cancelación despierta a los participantes. La limpieza verifica la propiedad y evita devolver un permiso dos veces.
- Si se necesita terminación de respaldo, se espera la salida del worker. Una generación con integridad incierta se descarta en lugar de continuar con el monitor posiblemente dañado.

## Sesiones y límites

- Una sesión por conexión Socket.IO, iniciada explícitamente.
- Las pestañas tienen ejecuciones aisladas y no reciben el estado de otras sesiones.
- Hasta 4 sesiones activas, 12 vehículos totales por ejecución y 32 workers globales, contando guardianes y workers todavía cerrándose.
- La ejecución vence después de 15 minutos. Historial y frecuencia de comandos están acotados.
- Detener, reiniciar, cerrar la página o perder la conexión cancela y limpia los hilos.
- Reconectar no restaura ni repite órdenes. Las últimas lecturas se marcan antiguas.
- Un comando sin confirmación no se reenvía automáticamente: reconectar cierra la sesión anterior antes de volver a operar.

El módulo es un laboratorio con estado temporal, no un sistema de reservas productivo ni un servicio público sin supervisión. No tiene persistencia de sesiones, coordinación entre instancias de Node ni autenticación propia. Las cuotas limitan el consumo de una instancia; el control de origen no sustituye autenticación frente a clientes no navegador. Un despliegue público exige controlar acceso y recursos en el alojamiento. No se ha desplegado nada como parte de esta integración.

## Evidencia Linux/WSL2

Desde WSL2, el repositorio de Windows puede estar en `/mnt/c/Users/Admin/SO-WIKI`. Instalar dependencias con Node/npm Linux dentro de esa distribución. Evitar compartir los mismos `node_modules` entre Windows y Linux; para validar ambos, usar copias de trabajo separadas o reinstalar dependencias en el sistema correspondiente.

Confirmar que se usa Node Linux:

```sh
node -p "process.platform"
node -p "process.execPath"
```

La primera salida debe ser `linux`. Obtener el PID real del panel o del mensaje de inicio. Sustituirlo en:

```sh
ps -eLf | grep '<PID>'
ls /proc/<PID>/task
ps -T -p <PID> -o pid,tid,stat,comm
htop -p <PID>
```

Registrar antes, durante y después de ejecutar vehículos. Node/V8/libuv crean hilos adicionales: el total de tareas no coincide necesariamente con vehículos más guardián.

- `process.pid`: proceso Node que contiene los workers.
- `worker.threadId`: identificador del worker en Node, **no** TID Linux.
- `/proc/<PID>/task`: TID del sistema operativo. No inventar una correspondencia individual con `threadId`.
- Estado del panel: estado de la transacción, no una lectura del planificador de Linux.
- RSS: memoria del proceso completo, no memoria por vehículo.
- Heap: muestra del isolate del worker, con hora de muestreo; puede ser antigua mientras el worker espera.

Las capturas deben realizarse en la ejecución real. Esta documentación no incorpora evidencia fabricada ni certifica por sí sola la validación Linux.

## Pruebas

Desde `wiki-backend`:

```sh
npm test
```

Desde `wiki-frontend`:

```sh
npm test
npm run lint
npm run build
```

Las pruebas del motor usan workers reales. Las pruebas de transporte comprueban sesiones explícitas, aislamiento, generación de comandos, cuotas, origen y limpieza. Las del hook comprueban `StrictMode`, desconexiones y confirmaciones sin reproducir órdenes.

Verificar también manualmente:

- Menú móvil y acceso directo a `/parqueo`.
- Tabla de recursos equivalente al grafo y lectura mediante teclado.
- Propuesta y directrices con sus tablas Markdown.
- Dos pestañas: iniciar y detener una no cambia la otra.
- Cerrar y reabrir: no se reanuda la ejecución anterior.
- Repetir detener/reiniciar durante espera circular y espera de capacidad.
- El simulador original, blog y sesión siguen disponibles.

Si no se han podido instalar dependencias, ejecutar las pruebas o acceder a Linux por permisos del entorno, esas verificaciones quedan pendientes y no deben reportarse como aprobadas.

## Archivos principales

- `wiki-backend/src/parqueo/`: motor, workers, sincronización, detector y transporte.
- `wiki-backend/src/parqueo/server.js`: entrada autónoma sin Supabase.
- `wiki-backend/src/index.js`: integración con el servidor existente.
- `wiki-backend/test/parqueo/`: pruebas del motor y transporte.
- `wiki-frontend/src/pages/parqueo.jsx`: página del laboratorio y documentos.
- `wiki-frontend/src/hooks/useParqueo.js`: contrato de comunicación.
- `wiki-frontend/src/components/parqueo/`: grafo y estilos locales.
- `wiki-frontend/src/hooks/useParqueo.test.jsx`: pruebas del cliente.
