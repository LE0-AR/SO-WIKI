import React, { useState, useEffect, useRef } from 'react';

const PALETA_COLORES = ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#0dcaf0', '#6610f2', '#fd7e14', '#20c997', '#e83e8c'];

export const Simulacion = () => {
    const RAM_TOTAL = 1024;
    
    const [procesosEjecucion, setProcesosEjecucion] = useState([]);
    const [procesosCola, setProcesosCola] = useState([]);
    const [pidCounter, setPidCounter] = useState(1);
    const [formulario, setFormulario] = useState({ nombre: '', memoria: '', duracion: '' });
    
    const [logs, setLogs] = useState([]);
    const terminalEndRef = useRef(null);

    const ramUsada = procesosEjecucion.reduce((acc, p) => acc + parseInt(p.memoria), 0);
    const ramDisponible = RAM_TOTAL - ramUsada;



    const getHora = () => new Date().toLocaleTimeString('es-GT', { hour12: false });

    // 1. EL MOTOR DE LA CPU
    useEffect(() => {
        const timer = setInterval(() => {
            setProcesosEjecucion(actuales => {
                const actualizados = actuales.map(p => ({ ...p, duracionRestante: p.duracionRestante - 1 }));
                const terminados = actualizados.filter(p => p.duracionRestante <= 0);
                const siguen = actualizados.filter(p => p.duracionRestante > 0);

                if (terminados.length > 0) {
                    setLogs(prev => [
                        ...prev, 
                        ...terminados.map(p => `[${getHora()}] [CPU] Proceso P${p.pid} finalizado. Liberando ${p.memoria} MB.`)
                    ]);
                }

                return siguen;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. EL GESTOR DE MEMORIA
    useEffect(() => {
        if (procesosCola.length > 0) {
            let ramRestante = RAM_TOTAL - procesosEjecucion.reduce((acc, p) => acc + parseInt(p.memoria), 0);
            const nuevosEnEjecucion = [];
            const nuevaCola = [];

            for (let i = 0; i < procesosCola.length; i++) {
                const p = procesosCola[i];
                if (p.memoria <= ramRestante) {
                    nuevosEnEjecucion.push(p);
                    ramRestante -= p.memoria;
                } else {
                    nuevaCola.push(p); 
                }
            }

            if (nuevosEnEjecucion.length > 0) {
                setProcesosCola(nuevaCola);
                setProcesosEjecucion(prev => [...prev, ...nuevosEnEjecucion]);
                
                setLogs(prev => [
                    ...prev,
                    ...nuevosEnEjecucion.map(p => `[${getHora()}] [MEMORIA] Asignando ${p.memoria} MB a P${p.pid}. Iniciando ráfaga CPU.`)
                ]);
            }
        }
    }, [procesosCola, procesosEjecucion]);

    const manejarCambio = (e) => {
        setFormulario({ ...formulario, [e.target.name]: e.target.value });
    };

    const agregarProceso = (e) => {
        e.preventDefault();
        const memReq = parseInt(formulario.memoria);
        const durReq = parseInt(formulario.duracion);

        if (memReq <= 0 || durReq <= 0) return alert("La memoria y duración deben ser mayores a 0");
        if (memReq > RAM_TOTAL) return alert("El proceso requiere más memoria que la RAM total del sistema (1024 MB).");

        const nuevoProceso = {
            pid: pidCounter,
            nombre: formulario.nombre.trim() !== '' ? formulario.nombre : `Proceso-${pidCounter}`,
            memoria: memReq,
            duracionTotal: durReq,
            duracionRestante: durReq,
            color: PALETA_COLORES[pidCounter % PALETA_COLORES.length]
        };

        setPidCounter(prev => prev + 1);
        setProcesosCola(prev => [...prev, nuevoProceso]);
        setFormulario({ nombre: '', memoria: '', duracion: '' });

        setLogs(prev => [...prev, `[${getHora()}] [KERNEL] Proceso P${nuevoProceso.pid} (${nuevoProceso.nombre}) encolado. Requiere ${nuevoProceso.memoria} MB.`]);
    };

    return (
        <div className="bg-light min-vh-100 py-5">
            <div className="container">
                <div className="text-center mb-5">
                    <h1 className="fw-bold text-dark">Simulador de Gestión de Memoria</h1>
                    <p className="text-secondary">Ejecución concurrente con 1 GB (1024 MB) de memoria RAM disponible.</p>
                </div>

                <div className="row g-4 mb-4">
                    <div className="col-lg-4">
                        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                            <h5 className="fw-bold mb-3">Estado de la Memoria RAM</h5>
                            <div className="d-flex justify-content-between small fw-bold mb-1">
                                <span className={ramUsada > 800 ? "text-danger" : "text-dark"}>{ramUsada} MB Usados</span>
                                <span className="text-success">{ramDisponible} MB Libres</span>
                            </div>
                            
                            <div className="progress mb-2 bg-secondary bg-opacity-25" style={{ height: '30px', borderRadius: '15px' }}>
                                {procesosEjecucion.map(p => (
                                    <div 
                                        key={p.pid}
                                        className="progress-bar progress-bar-striped progress-bar-animated border-end border-white border-2" 
                                        style={{ width: `${(p.memoria / RAM_TOTAL) * 100}%`, backgroundColor: p.color }}
                                        title={`${p.nombre} (${p.memoria} MB)`}
                                    >
                                        <small className="fw-bold text-white text-shadow">P{p.pid}</small>
                                    </div>
                                ))}
                            </div>
                            <p className="text-muted small text-center m-0">Capacidad Total: {RAM_TOTAL} MB</p>
                        </div>

                        <div className="card border-0 shadow-sm rounded-4 p-4">
                            <h5 className="fw-bold mb-3">Crear Proceso</h5>
                            <form onSubmit={agregarProceso}>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Nombre (Opcional)</label>
                                    <input type="text" name="nombre" value={formulario.nombre} onChange={manejarCambio} className="form-control" placeholder="Ej: Google Chrome" />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Memoria Requerida (MB)</label>
                                    <input type="number" name="memoria" value={formulario.memoria} onChange={manejarCambio} className="form-control" required placeholder="Ej: 256" />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label small fw-bold">Duración (Segundos)</label>
                                    <input type="number" name="duracion" value={formulario.duracion} onChange={manejarCambio} className="form-control" required placeholder="Ej: 10" />
                                </div>
                                <button type="submit" className="btn btn-dark w-100 fw-bold rounded-pill">Agregar a la Cola</button>
                            </form>
                        </div>
                    </div>

                    <div className="col-lg-8">
                        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                            <h5 className="fw-bold text-success mb-3">En Ejecución ({procesosEjecucion.length})</h5>
                            {procesosEjecucion.length === 0 ? (
                                <p className="text-muted small text-center my-4">La CPU está inactiva. No hay procesos en ejecución.</p>
                            ) : (
                                <div className="row g-3">
                                    {procesosEjecucion.map(p => (
                                        <div className="col-md-6" key={p.pid}>
                                            <div className="border rounded-3 p-3 position-relative overflow-hidden bg-white shadow-sm" style={{ borderLeft: `5px solid ${p.color} !important` }}>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="fw-bold text-dark" style={{ color: p.color }}>{p.nombre}</span>
                                                    <span className="badge" style={{ backgroundColor: p.color }}>PID: {p.pid}</span>
                                                </div>
                                                <div className="d-flex justify-content-between small text-muted mb-2">
                                                    <span>Memoria: {p.memoria} MB</span>
                                                    <span>{p.duracionRestante}s restantes</span>
                                                </div>
                                                <div className="progress" style={{ height: '8px' }}>
                                                    <div 
                                                        className="progress-bar progress-bar-animated" 
                                                        style={{ width: `${(p.duracionRestante / p.duracionTotal) * 100}%`, backgroundColor: p.color }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="card border-0 shadow-sm rounded-4 p-4">
                            <h5 className="fw-bold text-warning mb-3">Cola de Espera ({procesosCola.length})</h5>
                            {procesosCola.length === 0 ? (
                                <p className="text-muted small text-center my-3">No hay procesos esperando memoria.</p>
                            ) : (
                                <ul className="list-group list-group-flush">
                                    {procesosCola.map((p, index) => (
                                        <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-3 border-bottom" key={p.pid}>
                                            <div>
                                                <span className="fw-bold d-block text-dark">
                                                    <span className="badge bg-secondary me-2">#{index + 1}</span>
                                                    {p.nombre} (PID: {p.pid})
                                                </span>
                                                <span className="text-muted small">Requiere {p.memoria} MB libres para iniciar.</span>
                                            </div>
                                            <span className="badge bg-light text-dark border p-2">{p.duracionTotal} Segundos</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12">
                        <div className="card border-0 shadow-sm rounded-4 bg-dark text-light overflow-hidden">
                            <div className="card-header bg-black border-bottom border-secondary d-flex justify-content-between align-items-center py-3">
                                <span className="fw-bold text-success font-monospace">
                                    <i className="bi bi-terminal-fill me-2"></i> System Log Terminal
                                </span>
                                <button className="btn btn-sm btn-outline-secondary rounded-pill font-monospace" onClick={() => setLogs([])}>
                                    <i className="bi bi-trash3 me-1"></i> Clear
                                </button>
                            </div>
                            <div className="card-body font-monospace small" style={{ height: '220px', overflowY: 'auto' }}>
                                {logs.length === 0 ? (
                                    <span className="text-secondary text-opacity-50">Esperando eventos del sistema (Kernel idle)...</span>
                                ) : (
                                    logs.map((log, i) => {
                                        let textColor = "text-light";
                                        let icon = "bi-info-circle";
                                        
                                        if (log.includes("[KERNEL]")) {
                                            textColor = "text-warning";
                                            icon = "bi-hourglass-split";
                                        }
                                        if (log.includes("[MEMORIA]")) {
                                            textColor = "text-info";
                                            icon = "bi-lightning-charge-fill";
                                        }
                                        if (log.includes("[CPU]")) {
                                            textColor = "text-success";
                                            icon = "bi-check-circle-fill";
                                        }
                                        
                                        return (
                                            <div key={i} className={`mb-1 ${textColor}`}>
                                                <i className={`bi ${icon} me-2`}></i>{log}
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={terminalEndRef} />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};