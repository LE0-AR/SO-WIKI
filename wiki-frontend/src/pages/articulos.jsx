import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export const Articulos = () => {
    const [articulos, setArticulos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
    const [cargando, setCargando] = useState(true);

    // 1. Enganchamos la página para que lea la URL (ej. ?q=php) enviada por el buscador principal (Navbar)
    const [searchParams, setSearchParams] = useSearchParams();
    const queryUrl = searchParams.get('q') || '';

    // 2. El estado de búsqueda local se sincroniza con lo que venga en la URL
    const [busqueda, setBusqueda] = useState(queryUrl);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const respuesta = await fetch('https://wiki-oewl.onrender.com/api/articulos');
                if (respuesta.ok) {
                    const data = await respuesta.json();
                    setArticulos(data);
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

    // 3. Si el usuario hace una búsqueda desde el Navbar mientras YA ESTÁ en esta página, actualizamos el filtro
    useEffect(() => {
        setBusqueda(queryUrl);
        if (queryUrl) {
            setCategoriaSeleccionada('Todas'); // Mostramos resultados de todas las categorías si es una búsqueda global
        }
    }, [queryUrl]);

    // 4. Si el usuario escribe directamente en el buscador grande de abajo, sincronizamos la URL
    const manejarBusquedaLocal = (e) => {
        const texto = e.target.value;
        setBusqueda(texto);
        if (texto) {
            setSearchParams({ q: texto });
        } else {
            setSearchParams({});
        }
    };

    // Lógica de filtrado en tiempo real combinada
    const articulosFiltrados = articulos.filter(art => {
        const coincideCategoria = categoriaSeleccionada === 'Todas' || art.categoria === categoriaSeleccionada;
        const titulo = art.titulo || '';
        const descripcion = art.descripcion || '';
        const coincideTexto = titulo.toLowerCase().includes(busqueda.toLowerCase()) || 
                              descripcion.toLowerCase().includes(busqueda.toLowerCase());
                              
        return coincideCategoria && coincideTexto;
    });

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
                                            onClick={() => {
                                                setCategoriaSeleccionada(cat);
                                                // Si cambia de categoría, limpiamos la búsqueda para no confundir
                                                setBusqueda('');
                                                setSearchParams({});
                                            }}
                                            className={`list-group-item list-group-item-action border-0 rounded-3 mb-1 px-3 py-2 ${categoriaSeleccionada === cat ? 'bg-primary text-white fw-bold' : 'text-dark'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN PRINCIPAL: BUSCADOR Y LISTADO */}
                    <div className="col-lg-9">
                        
                        {/* BARRA DE BÚSQUEDA SECUNDARIA */}
                        <div className="mb-4">
                            <div className="input-group input-group-lg shadow-sm rounded-pill overflow-hidden border border-light">
                                <span className="input-group-text bg-white border-0 text-success pe-2">
                                    <i className="bi bi-search"></i>
                                </span>
                                <input 
                                    type="text" 
                                    className="form-control border-0 shadow-none bg-white" 
                                    placeholder="Buscar artículos, conceptos o palabras clave..." 
                                    value={busqueda}
                                    onChange={manejarBusquedaLocal} 
                                />
                            </div>
                        </div>

                        {/* LISTADO DE TARJETAS DE ARTÍCULOS */}
                        <div className="row g-4">
                            {articulosFiltrados.map((art) => (
                                <div className="col-md-6" key={art.id}>
                                    <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden d-flex flex-column" style={{ transition: 'transform 0.3s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>

                                        {art.imagen ? (
                                            <img
                                                src={art.imagen}
                                                alt={art.titulo}
                                                className="card-img-top"
                                                style={{ height: '220px', objectFit: 'contain', backgroundColor: '#f8f9fa', padding: '15px' }}
                                            />
                                        ) : (
                                            <div className="bg-secondary bg-opacity-10 d-flex justify-content-center align-items-center" style={{ height: '220px' }}>
                                                <span className="text-muted small fw-bold text-uppercase">Sin Imagen</span>
                                            </div>
                                        )}

                                        <div className="card-body p-4 d-flex flex-column">
                                            <span className="badge bg-success rounded-pill mb-3 text-uppercase align-self-start" style={{ letterSpacing: '0.5px' }}>
                                                {art.categoria || 'GENERAL'}
                                            </span>
                                            <h5 className="card-title fw-bold text-dark mb-3">
                                                {art.titulo}
                                            </h5>
                                            <p className="card-text text-secondary small">
                                                {art.descripcion || 'Sin descripción disponible. Haz clic para leer el contenido completo.'}
                                            </p>
                                        </div>

                                        <div className="card-footer bg-white border-0 px-4 pb-4 pt-0 d-flex justify-content-between align-items-center mt-auto">
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

                            {/* ESTADO VACÍO CUANDO NO SE ENCUENTRAN RESULTADOS */}
                            {articulosFiltrados.length === 0 && (
                                <div className="col-12 text-center text-muted py-5 mt-2 card border-0 shadow-sm rounded-4 bg-white">
                                    <i className="bi bi-journal-x opacity-50 mb-3" style={{ fontSize: '4rem' }}></i>
                                    <h5 className="text-muted fw-bold">No se encontraron resultados para "{busqueda}"</h5>
                                    <p className="mb-0 small">No hay artículos que coincidan con la búsqueda actual.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};