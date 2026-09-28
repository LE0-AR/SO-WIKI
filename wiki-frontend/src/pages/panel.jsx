import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export const Panel = () => {
    const [articulo, setArticulo] = useState({ titulo: '', categoria: '', descripcion: '', contenido: '', imagen: '' });
    const [imagenArchivo, setImagenArchivo] = useState(null);
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
    const [listaCategorias, setListaCategorias] = useState([]);
    const [listaArticulos, setListaArticulos] = useState([]);
    const [editandoId, setEditandoId] = useState(null);

    useEffect(() => {
        const cargarDatosIniciales = async () => {
            const { data: catData } = await supabase.from('categoria').select('nombre');
            if (catData && catData.length > 0) {
                setListaCategorias(catData);
                setArticulo(prev => ({ ...prev, categoria: catData[0].nombre }));
            }
            obtenerArticulos();
        };
        cargarDatosIniciales();
    }, []);

    const obtenerArticulos = async () => {
        try {
            // URL actualizada a tu servidor de producción
            const respuesta = await fetch('https://so-wiki.onrender.com/api/articulos');
            if (respuesta.ok) {
                const data = await respuesta.json();
                setListaArticulos(data);
            }
        } catch (error) {
            console.error("Error al cargar la tabla:", error);
        }
    };

    const manejarCambio = (e) => {
        setArticulo({ ...articulo, [e.target.name]: e.target.value });
    };

    const iniciarEdicion = (art) => {
        setArticulo({
            titulo: art.titulo || '',
            categoria: art.categoria || listaCategorias[0]?.nombre || '',
            descripcion: art.descripcion || '',
            contenido: art.contenido || '',
            imagen: art.imagen || ''
        });
        setEditandoId(art.id);
        setImagenArchivo(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarEdicion = () => {
        setArticulo({ titulo: '', categoria: listaCategorias[0]?.nombre || '', descripcion: '', contenido: '', imagen: '' });
        setEditandoId(null);
        setImagenArchivo(null);
        setMensaje({ texto: '', tipo: '' });
    };

    const publicarArticulo = async (e) => {
        e.preventDefault();
        setMensaje({ texto: 'Procesando...', tipo: 'info' });

        let urlImagenFinal = articulo.imagen;

        try {
            if (imagenArchivo) {
                setMensaje({ texto: 'Subiendo portada a Supabase...', tipo: 'info' });
                const nombreArchivo = `${Date.now()}-${imagenArchivo.name}`;
                const { data, error: uploadError } = await supabase.storage
                    .from('wiki-img')
                    .upload(nombreArchivo, imagenArchivo);

                if (uploadError) {
                    setMensaje({ texto: 'Error al subir la imagen: ' + uploadError.message, tipo: 'danger' });
                    return;
                }

                const { data: publicData } = supabase.storage
                    .from('wiki-img')
                    .getPublicUrl(data.path);
                urlImagenFinal = publicData.publicUrl;
            }

            const articuloFinal = { ...articulo, imagen: urlImagenFinal };
            setMensaje({ texto: editandoId ? 'Actualizando artículo...' : 'Guardando artículo...', tipo: 'info' });

            // URL actualizada a tu servidor de producción
            const URL_API = editandoId
                ? `https://so-wiki.onrender.com/api/articulos/${editandoId}`
                : 'https://so-wiki.onrender.com/api/articulos';
            const metodo = editandoId ? 'PUT' : 'POST';

            const respuesta = await fetch(URL_API, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(articuloFinal)
            });

            if (respuesta.ok) {
                setMensaje({ texto: editandoId ? '¡Artículo actualizado!' : '¡Artículo publicado con éxito!', tipo: 'success' });
                cancelarEdicion();
                obtenerArticulos();
            } else {
                setMensaje({ texto: 'Error al guardar en la base de datos.', tipo: 'danger' });
            }
        } catch (error) {
            setMensaje({ texto: 'Error de conexión con el servidor.', tipo: 'danger' });
        }
    };

    return (
        <div className="bg-light min-vh-100 py-5">
            <div className="container" style={{ maxWidth: '900px' }}>
                <div className="d-flex justify-content-between align-items-center mb-5 flex-wrap gap-3">
                    <div>
                        <h2 className="fw-bold text-dark mb-0">Gestión de Publicaciones</h2>
                        <p className="text-secondary mt-1 mb-0">Crea o edita artículos para la base de conocimientos.</p>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        {/* EL NUEVO BOTÓN DE USUARIOS */}
                        <Link to="/usuarios" className="btn btn-outline-primary rounded-pill fw-bold px-4 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-people-fill me-2 mb-1" viewBox="0 0 16 16">
                                <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                            </svg>
                            Usuarios
                        </Link>
                        <Link to="/categoria" className="btn btn-outline-success rounded-pill fw-bold px-4 shadow-sm">
                            Categorías
                        </Link>
                        <Link to="/articulos" className="btn btn-dark rounded-pill fw-bold px-4 shadow-sm">
                            Ver Blog
                        </Link>
                    </div>
                </div>

                <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 mb-5 bg-white">
                    {editandoId && (
                        <div className="alert alert-warning fw-bold small d-flex justify-content-between align-items-center mb-4 rounded-3 shadow-sm">
                            <span><i className="bi bi-pencil-square me-2"></i>Modo Edición Activado (ID: {editandoId})</span>
                            <button type="button" onClick={cancelarEdicion} className="btn btn-sm btn-dark rounded-pill px-3">Cancelar Edición</button>
                        </div>
                    )}

                    {mensaje.texto && (
                        <div className={`alert alert-${mensaje.tipo} fw-bold rounded-3 shadow-sm`} role="alert">
                            {mensaje.texto}
                        </div>
                    )}

                    <form onSubmit={publicarArticulo}>
                        <div className="row g-4 mb-4">
                            <div className="col-md-8">
                                <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>Título del Artículo</label>
                                <input type="text" className="form-control form-control-lg rounded-3 bg-light border-0 shadow-sm" name="titulo" value={articulo.titulo} onChange={manejarCambio} placeholder="Escribe un título atractivo..." required />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>Categoría</label>
                                <select className="form-select form-select-lg rounded-3 bg-light border-0 shadow-sm" name="categoria" value={articulo.categoria} onChange={manejarCambio}>
                                    {listaCategorias.map((cat, index) => (
                                        <option key={index} value={cat.nombre}>{cat.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* NUEVA ZONA DE CARGA DE IMAGEN (Drag & Drop Simulado) */}
                        <div className="mb-4">
                            <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>Imagen de Portada</label>

                            <div className="position-relative border border-2 border-success border-opacity-25 rounded-4 p-4 text-center bg-light shadow-sm transition-all" style={{ borderStyle: 'dashed !important' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" className="bi bi-cloud-arrow-up text-success mb-3" viewBox="0 0 16 16">
                                    <path fillRule="evenodd" d="M7.646 5.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 6.707V10.5a.5.5 0 0 1-1 0V6.707L6.354 7.854a.5.5 0 1 1-.708-.708l2-2z" />
                                    <path d="M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383zm.653.757c-.757.653-1.153 1.44-1.153 2.056v.448l-.445.049C2.064 6.805 1 7.952 1 9.318 1 10.785 2.23 12 3.781 12h8.906C13.98 12 15 10.988 15 9.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 4.825 10.328 3 8 3a4.53 4.53 0 0 0-2.941 1.1z" />
                                </svg>
                                <h6 className="fw-bold text-dark">
                                    {imagenArchivo ? <span className="text-success">{imagenArchivo.name}</span> : "Haz clic o arrastra una imagen aquí"}
                                </h6>
                                <p className="text-muted small mb-0">Soporta JPG, PNG o WEBP</p>

                                {/* Input invisible que cubre toda la caja */}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="position-absolute top-0 start-0 w-100 h-100 opacity-0"
                                    style={{ cursor: 'pointer' }}
                                    onChange={e => setImagenArchivo(e.target.files[0])}
                                />
                            </div>

                            {/* Insignia de imagen guardada en edición */}
                            {articulo.imagen && !imagenArchivo && (
                                <div className="mt-3 text-secondary small d-flex align-items-center gap-2 bg-light p-2 rounded-3 border">
                                    <span className="badge bg-success rounded-pill px-3 py-2">Portada guardada en base de datos</span>
                                    <a href={articulo.imagen} target="_blank" rel="noreferrer" className="text-decoration-none fw-bold text-dark">Ver imagen actual <i className="bi bi-box-arrow-up-right ms-1"></i></a>
                                </div>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>Descripción Breve (Para la tarjeta)</label>
                            <textarea className="form-control form-control-lg rounded-3 bg-light border-0 shadow-sm" rows="2" name="descripcion" value={articulo.descripcion} onChange={manejarCambio} placeholder="Un resumen corto de tu artículo..." required ></textarea>
                        </div>

                        <div className="mb-5">
                            <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>Contenido Completo (Markdown)</label>
                            <textarea className="form-control rounded-3 bg-light border-0 shadow-sm" rows="12" name="contenido" value={articulo.contenido} onChange={manejarCambio} placeholder="Escribe el desarrollo de tu artículo aquí..." required style={{ fontFamily: 'monospace' }}></textarea>
                        </div>

                        <div className="d-flex justify-content-end border-top pt-4">
                            <button type="submit" className="btn btn-success btn-lg rounded-pill fw-bold px-5 shadow-sm" disabled={mensaje.texto === 'Subiendo portada a Supabase...'}>
                                {editandoId ? 'Actualizar Artículo' : 'Publicar Artículo'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* TABLA INFERIOR */}
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                    <h5 className="fw-bold text-dark mb-4">Artículos Publicados</h5>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light text-secondary small text-uppercase">
                                <tr>
                                    <th className="py-3">Título</th>
                                    <th className="py-3">Categoría</th>
                                    <th className="text-end py-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listaArticulos.map((art) => (
                                    <tr key={art.id}>
                                        <td className="fw-semibold text-dark py-3">{art.titulo}</td>
                                        <td className="py-3"><span className="badge bg-light text-success border border-success rounded-pill px-3 py-2">{art.categoria}</span></td>
                                        <td className="text-end py-3">
                                            <button onClick={() => iniciarEdicion(art)} className="btn btn-sm btn-outline-dark fw-bold rounded-pill px-4">Editar</button>
                                        </td>
                                    </tr>
                                ))}
                                {listaArticulos.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="text-center text-muted py-5">
                                            No hay artículos publicados aún. ¡Escribe el primero!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};