import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

export const Articulo = () => {
    const { id } = useParams();
    const [articulo, setArticulo] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const cargarArticulo = async () => {
            try {
                const URL_API = `http://localhost:3000/api/articulos/${id}`;
                const respuesta = await fetch(URL_API);

                if (respuesta.ok) {
                    const data = await respuesta.json();
                    setArticulo(data);
                } else {
                    console.error("El backend no devolvió el artículo. Código de estado:", respuesta.status);
                    setArticulo(null);
                }
            } catch (error) {
                console.error("Error de conexión con el backend:", error);
                setArticulo(null);
            } finally {
                setCargando(false);
            }
        };

        cargarArticulo();
    }, [id]);

    if (cargando) {
        return <div className="min-vh-100 d-flex justify-content-center align-items-center">Cargando artículo...</div>;
    }

    if (!articulo) {
        return (
            <div className="min-vh-100 d-flex flex-column justify-content-center align-items-center bg-light">
                <h3 className="fw-bold text-dark mb-3">Artículo no encontrado</h3>
                <p className="text-secondary mb-4">No se pudo cargar la información desde la base de datos.</p>
                <Link to="/articulos" className="btn btn-dark rounded-pill px-4">Volver al Blog</Link>
            </div>
        );
    }

    return (
        <div className="bg-white min-vh-100 pb-5">

            {/* Miga de pan */}
            <div className="border-bottom py-3 mb-5">
                <div className="container" style={{ maxWidth: '800px' }}>
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-0 small">
                            <li className="breadcrumb-item"><Link to="/" className="text-decoration-none text-secondary">Inicio</Link></li>
                            <li className="breadcrumb-item"><Link to="/articulos" className="text-decoration-none text-secondary">Blog</Link></li>
                            <li className="breadcrumb-item active text-dark fw-semibold" aria-current="page">
                                {articulo.titulo.length > 40 ? articulo.titulo.substring(0, 40) + '...' : articulo.titulo}
                            </li>
                        </ol>
                    </nav>
                </div>
            </div>

            <div className="container" style={{ maxWidth: '800px' }}>

                {/* BANNER DE IMAGEN DE PORTADA */}
                {articulo.imagen && (
                    <div className="mb-5 rounded-4 overflow-hidden shadow-sm border" style={{ height: '400px' }}>
                        <img
                            src={articulo.imagen}
                            alt={articulo.titulo}
                            className="w-100 h-100"
                            style={{ objectFit: 'cover', objectPosition: 'center' }}
                        />
                    </div>
                )}

                <div className="d-flex align-items-center gap-3 mb-4">
                    <span className="badge bg-success rounded-pill px-3 py-2 text-uppercase" style={{ letterSpacing: '0.5px' }}>
                        {articulo.categoria || 'General'}
                    </span>
                    <span className="text-muted small fw-semibold">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="bi bi-clock me-1 mb-1" viewBox="0 0 16 16">
                            <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z" />
                            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z" />
                        </svg>
                        3 min de lectura
                    </span>
                    <span className="text-muted small fw-semibold">
                        {articulo.created_at ? new Date(articulo.created_at).toLocaleDateString() : 'Reciente'}
                    </span>
                </div>

                <h1 className="display-5 fw-bold text-dark mb-4" style={{ letterSpacing: '-1px' }}>
                    {articulo.titulo}
                </h1>

                <div className="border-start border-success border-4 ps-4 py-1 mb-5">
                    <p className="fs-5 text-secondary mb-0" style={{ lineHeight: '1.6' }}>
                        {articulo.descripcion || 'Sin descripción disponible.'}
                    </p>
                </div>

                <div className="d-flex justify-content-between align-items-center border-top border-bottom py-3 mb-5">
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-light rounded-circle d-flex align-items-center justify-content-center text-success" style={{ width: '40px', height: '40px' }}>
                            <span className="fw-bold">{articulo.creado_por ? articulo.creado_por.charAt(0).toUpperCase() : 'A'}</span>
                        </div>
                        <div>
                            <p className="fw-bold text-dark mb-0 small text-uppercase">Escrito por</p>
                            <p className="text-muted mb-0 text-uppercase" style={{ fontSize: '11px', letterSpacing: '1px' }}>
                                {articulo.creado_por || 'WIKI-SO ADMIN'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="fs-6 text-dark" style={{ lineHeight: '1.8' }}>
                    {(articulo.contenido || '').split('\n').map((parrafo, index) => (
                        <p key={index} className="mb-4">{parrafo}</p>
                    ))}
                </div>
                    
                <div className="border-top mt-5 pt-4 pb-5 d-flex justify-content-between align-items-center">
                    <Link to="/articulos" className="text-success text-decoration-none fw-bold small">
                        &larr; Volver al blog
                    </Link>
                </div>

            </div>
        </div>
    );
};