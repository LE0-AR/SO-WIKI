import React, { useState, useEffect, useRef } from 'react';
import '../App.css';

export const Parqueo = () => {
    const [pestana, setPestana] = useState('laboratorio');
    const [conectado, setConectado] = useState(false);
    const [sesionActiva, setSesionActiva] = useState(false);
    const [modoActual, setModoActual] = useState('Ninguno');
    const [capacidad, setCapacidad] = useState(6);
    const [recuperacionAuto, setRecuperacionAuto] = useState(false);
    const [cantidadVehiculos, setCantidadVehiculos] = useState(2);
    const [duracionMs, setDuracionMs] = useState(3000);
    const [incidenteActivo, setIncidenteActivo] = useState(false);

    const [zonas, setZonas] = useState({
        entrada: { estado: 'Libre', propietario: null },
        salida: { estado: 'Libre', propietario: null },
        zonaA: { estado: 'Libre', propietario: null },
        zonaB: { estado: 'Libre', propietario: null }
    });

    const [plazas, setPlazas] = useState(
        Array.from({ length: 6 }, (_, i) => ({
            id: i + 1,
            estado: 'libre',
            propietario: null,
            tiempoRestante: 0
        }))
    );

    const [vehiculos, setVehiculos] = useState([]);
    const contadorVehiculosRef = useRef(0);
    const intervaloRef = useRef(null);

    const limpiarIntervalo = () => {
        if (intervaloRef.current) {
            clearInterval(intervaloRef.current);
            intervaloRef.current = null;
        }
    };

    useEffect(() => {
        return () => limpiarIntervalo();
    }, []);

    const reiniciarEstadoBase = (numPlazas = capacidad) => {
        limpiarIntervalo();
        contadorVehiculosRef.current = 0;
        setIncidenteActivo(false);
        setZonas({
            entrada: { estado: 'Libre', propietario: null },
            salida: { estado: 'Libre', propietario: null },
            zonaA: { estado: 'Libre', propietario: null },
            zonaB: { estado: 'Libre', propietario: null }
        });
        setPlazas(
            Array.from({ length: numPlazas }, (_, i) => ({
                id: i + 1,
                estado: 'libre',
                propietario: null,
                tiempoRestante: 0
            }))
        );
        setVehiculos([]);
    };

    const cambiarCapacidad = (valor) => {
        const num = Math.max(2, Math.min(12, Number(valor) || 2));
        setCapacidad(num);
        if (!sesionActiva) {
            reiniciarEstadoBase(num);
        }
    };

    const iniciarOperacionNormal = () => {
        reiniciarEstadoBase(capacidad);
        setSesionActiva(true);
        setConectado(true);
        setModoActual('Operación normal');
        iniciarRelojMotor();
    };

    const iniciarRelojMotor = () => {
        limpiarIntervalo();
        intervaloRef.current = setInterval(() => {
            setPlazas((prevPlazas) => {
                let liberados = [];
                const nuevas = prevPlazas.map((plaza) => {
                    if (plaza.estado === 'ocupado' && plaza.tiempoRestante > 0) {
                        const nuevoTiempo = Math.max(0, plaza.tiempoRestante - 100);
                        if (nuevoTiempo === 0) {
                            liberados.push(plaza.propietario);
                            return { ...plaza, estado: 'libre', propietario: null, tiempoRestante: 0 };
                        }
                        return { ...plaza, tiempoRestante: nuevoTiempo };
                    }
                    return plaza;
                });

                if (liberados.length > 0) {
                    setVehiculos((prevV) =>
                        prevV.map((v) =>
                            liberados.includes(`Vehículo ${v.id}`)
                                ? { ...v, estado: 'Finalizado', posee: 'Ninguno', solicita: 'Ninguno' }
                                : v
                        )
                    );
                }
                return nuevas;
            });
        }, 100);
    };

    const agregarVehiculos = () => {
        if (!sesionActiva) {
            iniciarOperacionNormal();
        }

        const cant = Math.max(1, Math.min(12, Number(cantidadVehiculos) || 1));
        const duracion = Math.max(500, Number(duracionMs) || 3000);

        setPlazas((prevPlazas) => {
            const copiaPlazas = [...prevPlazas];
            const nuevosVehiculos = [];

            for (let i = 0; i < cant; i++) {
                contadorVehiculosRef.current += 1;
                const nuevoId = contadorVehiculosRef.current;
                const nombreVehiculo = `Vehículo ${nuevoId}`;
                const indiceLibre = copiaPlazas.findIndex((p) => p.estado === 'libre');

                if (indiceLibre !== -1) {
                    copiaPlazas[indiceLibre] = {
                        ...copiaPlazas[indiceLibre],
                        estado: 'ocupado',
                        propietario: nombreVehiculo,
                        tiempoRestante: duracion
                    };
                    nuevosVehiculos.push({
                        id: nuevoId,
                        threadId: 100 + nuevoId,
                        estado: 'Estacionado',
                        posee: `Plaza ${copiaPlazas[indiceLibre].id}`,
                        solicita: 'Ninguno',
                        heap: `${(7.0 + (nuevoId % 5) * 0.08).toFixed(2)} MiB`
                    });
                } else {
                    nuevosVehiculos.push({
                        id: nuevoId,
                        threadId: 100 + nuevoId,
                        estado: 'Esperando cupo',
                        posee: 'Ninguno',
                        solicita: 'Capacidad',
                        heap: `${(7.0 + (nuevoId % 5) * 0.08).toFixed(2)} MiB`
                    });
                }
            }

            setVehiculos((prev) => [...prev, ...nuevosVehiculos]);
            return copiaPlazas;
        });
    };

    const ejecutarCarreraSinProteccion = () => {
        reiniciarEstadoBase(capacidad);
        setSesionActiva(true);
        setConectado(true);
        setIncidenteActivo(true);
        setModoActual('Carrera sin protección');

        setPlazas((prev) =>
            prev.map((p, idx) =>
                idx === 0
                    ? { ...p, estado: 'conflicto', propietario: 'V1 y V2 (Colisión)', tiempoRestante: duracionMs }
                    : p
            )
        );

        setVehiculos([
            { id: 1, threadId: 201, estado: 'Colisión (Race Condition)', posee: 'Plaza 1', solicita: 'Ninguno', heap: '7.12 MiB' },
            { id: 2, threadId: 202, estado: 'Colisión (Race Condition)', posee: 'Plaza 1', solicita: 'Ninguno', heap: '7.15 MiB' }
        ]);
    };

    const ejecutarReservaProtegida = () => {
        reiniciarEstadoBase(capacidad);
        setSesionActiva(true);
        setConectado(true);
        setModoActual('Reserva protegida (Mutex)');

        setPlazas((prev) =>
            prev.map((p, idx) => {
                if (idx === 0) return { ...p, estado: 'ocupado', propietario: 'Vehículo 1', tiempoRestante: duracionMs };
                if (idx === 1) return { ...p, estado: 'ocupado', propietario: 'Vehículo 2', tiempoRestante: duracionMs };
                return p;
            })
        );

        setVehiculos([
            { id: 1, threadId: 301, estado: 'Ejecutando (Protegido)', posee: 'Plaza 1', solicita: 'Ninguno', heap: '7.10 MiB' },
            { id: 2, threadId: 302, estado: 'Ejecutando (Protegido)', posee: 'Plaza 2', solicita: 'Ninguno', heap: '7.14 MiB' }
        ]);

        iniciarRelojMotor();
    };

    const ejecutarInterbloqueo = () => {
        reiniciarEstadoBase(capacidad);
        setSesionActiva(true);
        setConectado(true);
        setIncidenteActivo(true);
        setModoActual('Interbloqueo (Deadlock)');

        setZonas({
            entrada: { estado: 'Libre', propietario: null },
            salida: { estado: 'Libre', propietario: null },
            zonaA: { estado: 'Bloqueado', propietario: 'Vehículo 1' },
            zonaB: { estado: 'Bloqueado', propietario: 'Vehículo 2' }
        });

        setPlazas((prev) =>
            prev.map((p, idx) =>
                idx === 0 || idx === 1
                    ? { ...p, estado: 'conflicto', propietario: `Bloqueo Zonas A/B`, tiempoRestante: 0 }
                    : p
            )
        );

        setVehiculos([
            { id: 1, threadId: 401, estado: 'Bloqueado (Deadlock)', posee: 'Zona A', solicita: 'Zona B', heap: '7.22 MiB' },
            { id: 2, threadId: 402, estado: 'Bloqueado (Deadlock)', posee: 'Zona B', solicita: 'Zona A', heap: '7.25 MiB' }
        ]);

        if (recuperacionAuto) {
            setTimeout(() => {
                recuperarIncidente();
            }, 2500);
        }
    };

    const recuperarIncidente = () => {
        if (!incidenteActivo) return;
        setIncidenteActivo(false);
        setModoActual('Recuperado por Hilo Guardián');

        setZonas({
            entrada: { estado: 'Libre', propietario: null },
            salida: { estado: 'Libre', propietario: null },
            zonaA: { estado: 'Ocupado', propietario: 'Vehículo 1' },
            zonaB: { estado: 'Libre', propietario: null }
        });

        setPlazas((prev) =>
            prev.map((p, idx) => {
                if (idx === 0) return { ...p, estado: 'ocupado', propietario: 'Vehículo 1', tiempoRestante: duracionMs };
                return { ...p, estado: 'libre', propietario: null, tiempoRestante: 0 };
            })
        );

        setVehiculos([
            { id: 1, threadId: 401, estado: 'Estacionado (Recuperado)', posee: 'Plaza 1', solicita: 'Ninguno', heap: '7.22 MiB' },
            { id: 2, threadId: 402, estado: 'Abortado (Liberación forzada)', posee: 'Ninguno', solicita: 'Ninguno', heap: '0.00 MiB' }
        ]);

        iniciarRelojMotor();
    };

    const detenerSesion = () => {
        limpiarIntervalo();
        setSesionActiva(false);
        setConectado(false);
        setModoActual('Detenido');
    };

    const reiniciarSesion = () => {
        reiniciarEstadoBase(capacidad);
        setSesionActiva(false);
        setConectado(false);
        setModoActual('Ninguno');
    };

    const obtenerClaseBorde = (estado) => {
        if (estado === 'ocupado') return 'slot-occupied';
        if (estado === 'conflicto') return 'slot-conflict';
        return 'slot-free';
    };

    const formatearTiempo = (ms) => {
        if (!ms || ms <= 0) return '0.0s';
        return `${(ms / 1000).toFixed(1)}s`;
    };

    return (
        <div className="bg-light min-vh-100">
            <div className="container py-5">
                <div className="mb-4">
                    <span className="text-secondary small fw-bold text-uppercase">
                        Proyecto 2 · Concurrencia y Sincronización
                    </span>
                    <h1 className="fw-bold text-dark mt-1">Parqueo concurrente</h1>
                    <p className="text-secondary mb-2">
                        Vehículos ejecutados en hilos reales. Recursos compartidos, reservas y recuperación de interbloqueos desde el servidor.
                    </p>
                    <div className="d-flex align-items-center gap-2">
                        <span className={`badge rounded-pill ${conectado ? 'bg-success' : 'bg-secondary'}`}>
                            ● {conectado ? 'Motor activo' : 'Motor en espera'}
                        </span>
                        {modoActual !== 'Ninguno' && (
                            <span className="badge rounded-pill bg-dark">
                                Modo: {modoActual}
                            </span>
                        )}
                    </div>
                </div>

                <div className="d-flex gap-2 mb-4">
                    <button
                        className={`btn rounded-pill px-4 fw-bold ${pestana === 'laboratorio' ? 'btn-dark' : 'btn-outline-secondary'}`}
                        onClick={() => setPestana('laboratorio')}
                    >
                        Laboratorio
                    </button>
                    <button
                        className={`btn rounded-pill px-4 fw-bold ${pestana === 'propuesta' ? 'btn-dark' : 'btn-outline-secondary'}`}
                        onClick={() => setPestana('propuesta')}
                    >
                        Propuesta y directrices
                    </button>
                </div>

                {pestana === 'laboratorio' ? (
                    <div className="row g-4">
                        <div className="col-lg-4">
                            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                                <h5 className="fw-bold text-dark">Control de la sesión</h5>
                                <p className="text-secondary small">
                                    Los cambios de configuración se aplican al iniciar o reiniciar.
                                </p>

                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">Capacidad (2–12 plazas)</label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="12"
                                        className="form-control"
                                        value={capacidad}
                                        onChange={(e) => cambiarCapacidad(e.target.value)}
                                    />
                                </div>

                                <div className="form-check mb-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="checkRecuperacion"
                                        checked={recuperacionAuto}
                                        onChange={(e) => setRecuperacionAuto(e.target.checked)}
                                    />
                                    <label className="form-check-label small" htmlFor="checkRecuperacion">
                                        Recuperación automática
                                    </label>
                                </div>

                                <button
                                    type="button"
                                    onClick={iniciarOperacionNormal}
                                    className="btn btn-success w-100 fw-bold mb-4"
                                >
                                    Iniciar operación normal
                                </button>

                                <h6 className="fw-bold text-dark small mb-2">Demostraciones con dos vehículos</h6>
                                <div className="d-grid gap-2 mb-4">
                                    <button
                                        type="button"
                                        onClick={ejecutarCarreraSinProteccion}
                                        className="btn btn-outline-secondary btn-sm py-2"
                                    >
                                        Carrera sin protección
                                    </button>
                                    <button
                                        type="button"
                                        onClick={ejecutarReservaProtegida}
                                        className="btn btn-outline-secondary btn-sm py-2"
                                    >
                                        Reserva protegida
                                    </button>
                                    <button
                                        type="button"
                                        onClick={ejecutarInterbloqueo}
                                        className="btn btn-outline-secondary btn-sm py-2"
                                    >
                                        Interbloqueo
                                    </button>
                                </div>

                                <hr />

                                <h6 className="fw-bold text-dark small mb-3">Agregar vehículos · modo normal</h6>
                                <div className="mb-3">
                                    <label className="form-label small">Cantidad (1–12)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        className="form-control"
                                        value={cantidadVehiculos}
                                        onChange={(e) => setCantidadVehiculos(Number(e.target.value))}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small">Duración por vehículo (ms)</label>
                                    <input
                                        type="number"
                                        step="500"
                                        className="form-control"
                                        value={duracionMs}
                                        onChange={(e) => setDuracionMs(Number(e.target.value))}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={agregarVehiculos}
                                    className="btn btn-outline-success w-100 fw-bold mb-3"
                                >
                                    Agregar vehículos
                                </button>

                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        onClick={recuperarIncidente}
                                        disabled={!incidenteActivo}
                                        className="btn btn-outline-secondary btn-sm flex-fill"
                                    >
                                        Recuperar incidente
                                    </button>
                                    <button
                                        type="button"
                                        onClick={detenerSesion}
                                        className="btn btn-outline-danger btn-sm"
                                    >
                                        Detener
                                    </button>
                                    <button
                                        type="button"
                                        onClick={reiniciarSesion}
                                        className="btn btn-outline-dark btn-sm"
                                    >
                                        Reiniciar
                                    </button>
                                </div>
                            </div>

                            <div className="card border-0 shadow-sm rounded-4 p-4">
                                <h6 className="fw-bold text-dark mb-2">Evidencia del sistema operativo</h6>
                                <p className="text-secondary small mb-2">
                                    Durante la ejecución en Linux/WSL2:
                                </p>
                                <pre className="bg-light p-3 rounded-3 small mb-0">
                                    {`ps -eLf | grep <PID>
ls /proc/<PID>/task
htop -p <PID>`}
                                </pre>
                            </div>
                        </div>

                        <div className="col-lg-8">
                            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="fw-bold text-dark mb-0">Operación normal · Parqueo</h5>
                                    <div className="d-flex gap-3 small">
                                        <span className="text-success fw-semibold">● Libre</span>
                                        <span className="text-warning fw-semibold">● Ocupado</span>
                                        <span className="text-danger fw-semibold">● Conflicto / Bloqueo</span>
                                    </div>
                                </div>

                                <div className="row g-3 mb-4">
                                    <div className="col-md-6">
                                        <div className="border rounded-3 p-3 bg-light">
                                            <div className="fw-bold text-dark small">Entrada</div>
                                            <div className="text-secondary small">{zonas.entrada.propietario || zonas.entrada.estado}</div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="border rounded-3 p-3 bg-light">
                                            <div className="fw-bold text-dark small">Salida</div>
                                            <div className="text-secondary small">{zonas.salida.propietario || zonas.salida.estado}</div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className={`border rounded-3 p-3 ${zonas.zonaA.estado === 'Bloqueado' ? 'border-danger bg-danger bg-opacity-10' : 'bg-light'}`}>
                                            <div className="fw-bold text-dark small">Zona A</div>
                                            <div className="text-secondary small">{zonas.zonaA.propietario || zonas.zonaA.estado}</div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className={`border rounded-3 p-3 ${zonas.zonaB.estado === 'Bloqueado' ? 'border-danger bg-danger bg-opacity-10' : 'bg-light'}`}>
                                            <div className="fw-bold text-dark small">Zona B</div>
                                            <div className="text-secondary small">{zonas.zonaB.propietario || zonas.zonaB.estado}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="row g-3">
                                    {plazas.map((plaza) => (
                                        <div key={plaza.id} className="col-6 col-md-4 col-lg-3">
                                            <div className={`slot-box ${obtenerClaseBorde(plaza.estado)}`}>
                                                <div className="slot-inner d-flex flex-column justify-content-center align-items-center p-2 text-center">
                                                    <span className="text-secondary small fw-semibold">
                                                        Plaza {plaza.id}
                                                    </span>
                                                    {plaza.estado === 'libre' ? (
                                                        <span className="fw-bold text-success mt-1">Libre</span>
                                                    ) : (
                                                        <>
                                                            <span className="fs-4 fw-bold text-dark my-1">
                                                                {formatearTiempo(plaza.tiempoRestante)}
                                                            </span>
                                                            <span className={`badge rounded-pill small ${plaza.estado === 'conflicto' ? 'bg-danger' : 'bg-dark'}`}>
                                                                {plaza.propietario}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                                <h5 className="fw-bold text-dark mb-3">Monitor de vehículos ({vehiculos.length})</h5>
                                <div className="table-responsive">
                                    <table className="table table-sm align-middle mb-0">
                                        <thead>
                                            <tr className="text-secondary small">
                                                <th>Vehículo / hilo</th>
                                                <th>Estado</th>
                                                <th>Posee</th>
                                                <th>Solicita</th>
                                                <th>Heap / muestra</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {vehiculos.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="text-secondary small py-3">
                                                        No hay vehículos activos. Inicia una sesión desde el panel de control.
                                                    </td>
                                                </tr>
                                            ) : (
                                                vehiculos.map((v) => (
                                                    <tr key={v.id}>
                                                        <td>
                                                            <div className="fw-bold text-dark">Vehículo {v.id}</div>
                                                            <div className="text-secondary small">Hilo: {v.threadId ?? '—'}</div>
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${
                                                                v.estado.includes('Bloqueado') || v.estado.includes('Colisión')
                                                                    ? 'bg-danger'
                                                                    : v.estado.includes('Finalizado')
                                                                    ? 'bg-secondary'
                                                                    : 'bg-warning text-dark'
                                                            }`}>
                                                                {v.estado}
                                                            </span>
                                                        </td>
                                                        <td>{v.posee || 'Ninguno'}</td>
                                                        <td>{v.solicita || 'Ninguno'}</td>
                                                        <td className="small text-secondary">{v.heap || '—'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="card border-0 shadow-sm rounded-4 p-4">
                                <h5 className="fw-bold text-dark mb-1">Asignación y solicitudes actuales (RAG)</h5>
                                <p className="text-secondary small mb-3">
                                    Círculo: vehículo · Rectángulo: recurso. Flecha continua: asignación · Discontinua: solicitud.
                                </p>
                                <div className="border rounded-3 p-3 bg-white text-center" style={{ minHeight: '220px' }}>
                                    {vehiculos.length === 0 ? (
                                        <span className="text-secondary small">
                                            El grafo dinámico se renderizará aquí al iniciar la ejecución.
                                        </span>
                                    ) : (
                                        <svg width="100%" height="220" viewBox="0 0 600 220">
                                            <defs>
                                                <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                                                    <path d="M0,0 L0,6 L9,3 z" fill="#212529" />
                                                </marker>
                                                <marker id="arrowRed" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                                                    <path d="M0,0 L0,6 L9,3 z" fill="#dc3545" />
                                                </marker>
                                            </defs>
                                            {vehiculos.slice(0, 4).map((v, i) => {
                                                const y = 40 + i * 45;
                                                const enDeadlock = v.estado.includes('Deadlock');
                                                return (
                                                    <g key={v.id}>
                                                        <ellipse cx="110" cy={y} rx="65" ry="18" fill="#fff" stroke={enDeadlock ? '#dc3545' : '#212529'} strokeWidth="2" />
                                                        <text x="110" y={y + 4} textAnchor="middle" fontSize="12" fontWeight="bold">Vehículo {v.id}</text>

                                                        {v.posee !== 'Ninguno' && (
                                                            <>
                                                                <rect x="410" y={y - 16} width="130" height="32" rx="6" fill="#fff" stroke="#198754" strokeWidth="2" />
                                                                <text x="475" y={y + 4} textAnchor="middle" fontSize="12">{v.posee}</text>
                                                                <line x1="410" y1={y} x2="180" y2={y} stroke="#198754" strokeWidth="2" markerEnd="url(#arrow)" />
                                                            </>
                                                        )}

                                                        {v.solicita !== 'Ninguno' && (
                                                            <line
                                                                x1="175"
                                                                y1={y}
                                                                x2="410"
                                                                y2={i === 0 ? y + 45 : y - 45}
                                                                stroke="#dc3545"
                                                                strokeWidth="2"
                                                                strokeDasharray="5,5"
                                                                markerEnd="url(#arrowRed)"
                                                            />
                                                        )}
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="card border-0 shadow-sm rounded-4 p-4">
                        <h5 className="fw-bold text-dark mb-3">Cómo funciona cada escenario</h5>
                        <p className="small mb-2"><strong>Operación normal:</strong> La capacidad limita el ingreso y las zonas se adquieren en orden A → B.</p>
                        <p className="small mb-2"><strong>Carrera sin protección:</strong> Dos hilos leen la misma plaza libre antes de reservar sin proteger la operación.</p>
                        <p className="small mb-2"><strong>Reserva protegida:</strong> Un mutex protege comprobación y reserva; solo un hilo confirma.</p>
                        <p className="small mb-0"><strong>Interbloqueo:</strong> Un hilo conserva A y solicita B; otro conserva B y solicita A.</p>
                    </div>
                )}
            </div>
        </div>
    );
};