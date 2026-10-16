import React from 'react';
import { Link } from 'react-router-dom';

export const Home = () => {
    return (
        <div className="bg-light min-vh-100 pb-5">
            {/* Estilos inyectados para el efecto Hover de las tarjetas */}
            <style>
                {`
                .hover-card {
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                .hover-card:hover {
                    transform: translateY(-12px);
                    box-shadow: 0 1.5rem 4rem rgba(0,0,0,0.15) !important;
                }
                `}
            </style>

            {/* Banner con GIF de fondo y capa oscura */}
            <section
                className="text-white text-center d-flex align-items-center justify-content-center position-relative"
                style={{
                    minHeight: '55vh',
                    backgroundImage: "linear-gradient(#212529e6, #121416f2), url('/fondo.gif')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            >
                <div className="container py-5 z-1">
                    <p className="text-success fw-bold text-uppercase tracking-wider mb-2" style={{ letterSpacing: '2px' }}>
                        Proyecto de Arquitectura Híbrida
                    </p>
                    <h1 className="display-3 fw-bolder mb-4">
                        Wiki Blog & <span className="text-success">Simuladores OS</span>
                    </h1>
                    <p className="lead text-light mb-0 mx-auto" style={{ maxWidth: '700px' }}>
                        Plataforma interactiva para la gestión del conocimiento y demostración de conceptos avanzados de Sistemas Operativos.
                    </p>
                </div>
            </section>

            {/* Tarjetas de Módulos Destacadas (Todas con color uniforme) */}
            <section className="container" style={{ marginTop: '-60px', position: 'relative', zIndex: 10 }}>
                <div className="row g-4 justify-content-center">
                    
                    {/* Tarjeta Blog */}
                    <div className="col-md-4">
                        <div className="card h-100 border-0 shadow-lg rounded-4 overflow-hidden text-center hover-card">
                            <div className="card-body p-5 bg-white">
                                <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
                                    <i className="bi bi-journal-text text-success" style={{ fontSize: '2.5rem' }}></i>
                                </div>
                                <h4 className="fw-bold mb-3">Base de Conocimientos</h4>
                                <p className="text-muted small mb-4">
                                    Explora artículos, definiciones y guías estructuradas sobre sistemas operativos y gestión de proyectos.
                                </p>
                                <Link className="btn btn-success rounded-pill px-4 fw-bold w-100" to="/articulos">
                                    Explorar Blog
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta Memoria RAM */}
                    <div className="col-md-4">
                        <div className="card h-100 border-0 shadow-lg rounded-4 overflow-hidden text-center hover-card">
                            <div className="card-body p-5 bg-white">
                                <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
                                    <i className="bi bi-memory text-success" style={{ fontSize: '2.5rem' }}></i>
                                </div>
                                <h4 className="fw-bold mb-3">Simulador de Memoria</h4>
                                <p className="text-muted small mb-4">
                                    Motor interactivo que simula la gestión de memoria RAM y la concurrencia de colas de CPU.
                                </p>
                                <Link className="btn btn-success rounded-pill px-4 fw-bold w-100" to="/simulacion">
                                    Abrir Simulador
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta Parqueo */}
                    <div className="col-md-4">
                        <div className="card h-100 border-0 shadow-lg rounded-4 overflow-hidden text-center hover-card">
                            <div className="card-body p-5 bg-white">
                                <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
                                    <i className="bi bi-car-front-fill text-success" style={{ fontSize: '2.5rem' }}></i>
                                </div>
                                <h4 className="fw-bold mb-3">Parqueo Concurrente</h4>
                                <p className="text-muted small mb-4">
                                    Demostración de concurrencia y semáforos usando memoria compartida (SharedArrayBuffer).
                                </p>
                                <Link className="btn btn-success text-white rounded-pill px-4 fw-bold w-100" to="/parqueo">
                                    Ver Parqueo
                                </Link>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* Información de la Arquitectura */}
            <section className="container py-5 mt-4">
                <div className="card border border-success border-opacity-25 bg-success bg-opacity-10 rounded-4 text-start mx-auto shadow-sm" style={{ maxWidth: '900px' }}>
                    <div className="card-body p-4 p-md-5">
                        <h3 className="fw-bold text-success mb-3">
                            Arquitectura del Sistema
                        </h3>
                        <p className="text-dark mb-4" style={{ lineHeight: '1.8' }}>
                            Este sistema fue diseñado como una solución de arquitectura híbrida. Integra un gestor de contenido (CMS) funcional junto con motores matemáticos interactivos en el cliente, permitiendo procesar colas de ejecución, prevención de interbloqueos y visualización de estados en tiempo real sin saturar el servidor.
                        </p>

                        <div className="border-top border-success border-opacity-25 pt-4 mt-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <div>
                                <p className="fw-bold text-dark mb-0">Ingeniería en Sistemas</p>
                                <p className="text-muted small mb-0">Universidad Mariano Gálvez</p>
                            </div>
                            <span className="badge bg-success px-3 py-2 rounded-pill shadow-sm">Curso: Sistemas Operativos</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};