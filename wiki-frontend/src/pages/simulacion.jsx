import React, { useState, useEffect } from 'react';

export const Simulacion = () => {
    // Especificaciones del sistema según los requerimientos
    const RAM_TOTAL = 1024; // 1 GB en MB
    
    const [procesosEjecucion, setProcesosEjecucion] = useState([]);
    const [procesosCola, setProcesosCola] = useState([]);
    
    const [pidCounter, setPidCounter] = useState(1);
    const [formulario, setFormulario] = useState({ nombre: '', memoria: '', duracion: '' });

    // Cálculo del estado de la memoria
    const ramUsada = procesosEjecucion.reduce((acc, p) => acc + parseInt(p.memoria), 0);
    const ramDisponible = RAM_TOTAL - ramUsada;
    const porcentajeRam = (ramUsada / RAM_TOTAL) * 100;

    // 1. EL MOTOR DE LA CPU (El reloj del sistema que reduce el tiempo)
    useEffect(() => {
        const timer = setInterval(() => {
            setProcesosEjecucion(actuales => {
                // Reducimos 1 segundo a cada proceso
                const actualizados = actuales.map(p => ({ ...p, duracionRestante: p.duracionRestante - 1 }));
                // Filtramos y liberamos la memoria de los que llegaron a 0
                return actualizados.filter(p => p.duracionRestante > 0);
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. EL GESTOR DE MEMORIA (Pasa de la Cola a Ejecución si hay espacio)
    useEffect(() => {
        if (procesosCola.length > 0) {
            const siguiente = procesosCola[0];
            if (siguiente.memoria <= ramDisponible) {
                // Lo sacamos de la cola
                setProcesosCola(prev => prev.slice(1));
                // Lo enviamos a ejecución
                setProcesosEjecucion(prev => [...prev, siguiente]);
            }
        }
    }, [procesosCola, procesosEjecucion, ramDisponible]);

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
            // Nombre dinámico si se deja en blanco
            nombre: formulario.nombre.trim() !== '' ? formulario.nombre : `Proceso-${pidCounter}`,
            memoria: memReq,
            duracionTotal: durReq,
            duracionRestante: durReq
        };

        setPidCounter(prev => prev + 1);
        setProcesosCola(prev => [...prev, nuevoProceso]);
        setFormulario({ nombre: '', memoria: '', duracion: '' });
    };

    return (
        <div className="bg-light min-vh-100 py-5">
            <div className="container">
                <div className="text-center mb-5">
                    <h1 className="fw-bold text-dark">Simulador de Gestión de Memoria</h1>
                    <p className="text-secondary">Ejecución concurrente con 1 GB (1024 MB) de memoria RAM disponible.</p>
                </div>

                <div className="row g-4">
                    {/* COLUMNA IZQUIERDA: CREACIÓN Y MEMORIA */}
                    <div className="col-lg-4">
                        {/* ESTADO DE LA MEMORIA */}
                        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                            <h5 className="fw-bold mb-3">Estado de la Memoria RAM</h5>
                            <div className="d-flex justify-content-between small fw-bold mb-1">
                                <span className={ramUsada > 800 ? "text-danger" : "text-dark"}>{ramUsada} MB Usados</span>
                                <span className="text-success">{ramDisponible} MB Libres</span>
                            </div>
                            <div className="progress mb-2" style={{ height: '25px', borderRadius: '15px' }}>
                                <div 
                                    className={`progress-bar progress-bar-striped progress-bar-animated ${porcentajeRam > 85 ? 'bg-danger' : porcentajeRam > 60 ? 'bg-warning' : 'bg-success'}`} 
                                    style={{ width: `${porcentajeRam}%` }}
                                >
                                    {Math.round(porcentajeRam)}%
                                </div>
                            </div>
                            <p className="text-muted small text-center m-0">Capacidad Total: {RAM_TOTAL} MB</p>
                        </div>

                        {/* FORMULARIO DE CREACIÓN */}
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

                    {/* COLUMNA DERECHA: EJECUCIÓN Y COLA */}
                    <div className="col-lg-8">
                        {/* PROCESOS EN EJECUCIÓN */}
                        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                            <h5 className="fw-bold text-success mb-3">En Ejecución ({procesosEjecucion.length})</h5>
                            {procesosEjecucion.length === 0 ? (
                                <p className="text-muted small text-center my-4">La CPU está inactiva. No hay procesos en ejecución.</p>
                            ) : (
                                <div className="row g-3">
                                    {procesosEjecucion.map(p => (
                                        <div className="col-md-6" key={p.pid}>
                                            <div className="border rounded-3 p-3 position-relative overflow-hidden bg-white">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="fw-bold text-dark">{p.nombre}</span>
                                                    <span className="badge bg-secondary">PID: {p.pid}</span>
                                                </div>
                                                <div className="d-flex justify-content-between small text-muted mb-2">
                                                    <span>Memoria: {p.memoria} MB</span>
                                                    <span>{p.duracionRestante}s restantes</span>
                                                </div>
                                                <div className="progress" style={{ height: '8px' }}>
                                                    <div 
                                                        className="progress-bar bg-success progress-bar-animated" 
                                                        style={{ width: `${(p.duracionRestante / p.duracionTotal) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* COLA DE ESPERA */}
                        <div className="card border-0 shadow-sm rounded-4 p-4">
                            <h5 className="fw-bold text-warning mb-3">Cola de Espera ({procesosCola.length})</h5>
                            {procesosCola.length === 0 ? (
                                <p className="text-muted small text-center my-3">No hay procesos esperando memoria.</p>
                            ) : (
                                <ul className="list-group list-group-flush">
                                    {procesosCola.map((p, index) => (
                                        <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-3" key={p.pid}>
                                            <div>
                                                <span className="fw-bold d-block">{index + 1}. {p.nombre} (PID: {p.pid})</span>
                                                <span className="text-muted small">Espera {p.memoria} MB libres para iniciar.</span>
                                            </div>
                                            <span className="badge bg-light text-dark border">{p.duracionTotal} Segundos</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    );
};