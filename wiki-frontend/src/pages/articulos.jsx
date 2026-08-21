import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export const Articulos = () => {
    const [articulos, setArticulos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const respuesta = await fetch('http://localhost:3000/api/articulos');
                if (respuesta.ok) {
                    const data = await respuesta.json();
                    setArticulos(data);
                    
                    // Extraer automáticamente las categorías de los artículos para el panel
                    const categoriasUnicas = ['Todas', ...new Set(data.map(art => art.categoria).filter(Boolean))];
                    setCategorias(categoriasUnicas);
                }
            } catch (error) {
                console.error("Error al cargar la base de datos:", error);
            } finally {
                setCargando(false);
            }
        };

        cargarDatos();
    }, []);

    // Filtramos los artículos según lo que el usuario seleccione en el panel
    const articulosFiltrados = categoriaSeleccionada === 'Todas' 
        ? articulos 
        : articulos.filter(art => art.categoria === categoriaSeleccionada);

    if (cargando) {
        return <div className="min-vh-100 d-flex justify-content-center align-items-center">Cargando base de conocimientos...</div>;
    }

    return (
        <div className="bg-light min-vh-100 py-5">
            <div className="container">
                <div className="mb-5 border-bottom pb-4">
                    <h2 className="fw-bold text-dark">Base de Conocimientos</h2>
                    <p className="text-secondary mb-0">Explora la documentación, guías y manuales técnicos del sistema.</p>
                </div>

                <div className="row g-5">
                    {/* PANEL LATERAL DE CATEGORÍAS */}
                    <div className="col-lg-3">
                        <div className="card border-0 shadow-sm rounded-4 position-sticky" style={{ top: '20px' }}>
                            <div className="card-header bg-white border-bottom-0 pt-4 pb-0 px-4">
                                <h6 className="fw-bold text-uppercase text-secondary mb-3" style={{ letterSpacing: '1px', fontSize: '0.8rem' }}>
                                    Panel de Categorías
                                </h6>
                            </div>
                            <div className="card-body p-3">
                                <div className="list-group list-group-flush">
                                    {categorias.map((cat, index) => (
                                        <button 
                                            key={index}
                                            onClick={() => setCategoriaSeleccionada(cat)}
                                            className={`list-group-item list-group-item-action border-0 rounded-3 mb-1 px-3 py-2 ${categoriaSeleccionada === cat ? 'bg-primary text-white fw-bold' : 'text-dark'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LISTADO DE TARJETAS DE ARTÍCULOS */}
                    <div className="col-lg-9">
                        <div className="row g-4">
                            {articulosFiltrados.map((art) => (
                                <div className="col-md-6" key={art.id}>
                                    <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden">
                                        
                                        {/* Imagen de portada */}
                                        {art.imagen ? (
                                            <img 
                                                src={art.imagen} 
                                                alt={art.titulo} 
                                                className="card-img-top" 
                                                style={{ height: '220px', objectFit: 'cover' }} 
                                            />
                                        ) : (
                                            <div className="bg-secondary bg-opacity-10 d-flex justify-content-center align-items-center" style={{ height: '220px' }}>
                                                <span className="text-muted small fw-bold text-uppercase">Sin Imagen</span>
                                            </div>
                                        )}

                                        <div className="card-body p-4">
                                            <span className="badge bg-success rounded-pill mb-3 text-uppercase" style={{ letterSpacing: '0.5px' }}>
                                                {art.categoria || 'GENERAL'}
                                            </span>
                                            <h5 className="card-title fw-bold text-dark mb-3">
                                                {art.titulo}
                                            </h5>
                                            <p className="card-text text-secondary small">
                                                {art.descripcion || 'Sin descripción disponible. Haz clic para leer el contenido completo.'}
                                            </p>
                                        </div>
                                        
                                        <div className="card-footer bg-white border-0 px-4 pb-4 pt-0 d-flex justify-content-between align-items-center">
                                            <span className="text-muted small fw-semibold">
                                                {art.created_at ? new Date(art.created_at).toLocaleDateString() : 'Reciente'}
                                            </span>
                                            <Link to={`/articulo/${art.id}`} className="btn btn-dark btn-sm rounded-pill px-4 fw-bold">
                                                Leer &rarr;
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {articulosFiltrados.length === 0 && (
                                <div className="col-12 text-center text-muted py-5 mt-4 card border-0 shadow-sm rounded-4">
                                    <p className="mb-0">No hay artículos publicados en esta categoría.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};