import React from 'react';
import { Link } from 'react-router-dom';

export const Home = () => {
    return (
        <>
            {/* Banner con GIF de fondo y capa oscura */}
            <section 
                className="text-white text-center d-flex align-items-center justify-content-center" 
                style={{ 
                    minHeight: '65vh',
                    backgroundImage: "linear-gradient(#212529d9, #212529f2), url('/fondo.gif')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            >
                <div className="container py-5">
                    
                    <p className="fw-semibold text-light mb-3" style={{ letterSpacing: '1px' }}>
                        Proyecto de Arquitectura Híbrida: Base de Conocimientos + Simulador de Memoria RAM
                    </p>
                    
                    <h1 className="display-3 fw-bold mb-5">
                        Wiki Blog & <span className="text-success">Simulador</span>
                    </h1>
                    
                    {/* Botones */}
                    <div className="d-flex justify-content-center gap-3 flex-wrap">
                        <Link to="/articulos" className="btn btn-outline-light btn-lg px-4 py-2 fw-bold rounded-pill">
                            Explorar Blog
                        </Link>
                        <Link to="/simulacion" className="btn btn-success btn-lg px-4 py-2 fw-bold rounded-pill">
                            Abrir Simulador
                        </Link>
                    </div>

                </div>
            </section>

            {/* Información de la Arquitectura */}
            <section className="container py-5 my-4">
                <div className="card bg-light border-0 shadow-sm rounded-4 text-start mx-auto" style={{ maxWidth: '900px' }}>
                    <div className="card-body p-4 p-md-5">
                        <h2 className="h3 fw-bold text-dark mb-3">
                            Arquitectura del Proyecto
                        </h2>
                        <p className="text-secondary mb-4" style={{ lineHeight: '1.8' }}>
                            Este sistema fue diseñado como una solución de arquitectura híbrida. Por un lado, funciona como una base de conocimientos estructurada para la gestión de proyectos. Por otro, integra un motor matemático interactivo que simula la gestión de memoria RAM (límite de 1024 MB) y la concurrencia de CPU, procesando colas de ejecución en tiempo real.
                        </p>
                        
                        <div className="border-top border-success pt-4 mt-2">
                            <p className="text-success fw-bold small mb-1">
                                Ingeniería en Sistemas • Universidad Mariano Gálvez
                            </p>
                            <p className="text-success small mb-0">
                                Curso: Sistemas Operativos 
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};