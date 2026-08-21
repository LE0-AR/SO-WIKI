import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export const Panel = () => {
    const [articulo, setArticulo] = useState({ titulo: '', categoria: '', descripcion: '', contenido: '', imagen: '' });

    // Aquí está el estado para atrapar tu archivo, justo como lo tenías
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
            const respuesta = await fetch('http://localhost:3000/api/articulos');
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
            // 🌟 AQUÍ INTEGRAMOS TU LÓGICA DE SUBIDA EXACTA 🌟
            if (imagenArchivo) {
                setMensaje({ texto: 'Subiendo portada a Supabase...', tipo: 'info' });

                const nombreArchivo = `${Date.now()}-${imagenArchivo.name}`;

                // Usamos TU bucket 'wiki-img'
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

                // Asignamos la URL generada
                urlImagenFinal = publicData.publicUrl;
            }

            // Agregamos la URL limpia a la columna de la portada
            const articuloFinal = { ...articulo, imagen: urlImagenFinal };

            setMensaje({ texto: editandoId ? 'Actualizando artículo...' : 'Guardando artículo...', tipo: 'info' });

            // ENVIAMOS AL BACKEND DE NODE.JS
            const URL_API = editandoId
                ? `http://localhost:3000/api/articulos/${editandoId}`
                : 'http://localhost:3000/api/articulos';
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
            <div className="container">

                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="fw-bold text-dark mb-0">Gestión de Publicaciones</h2>
                        <p className="text-secondary small mt-1">Crea o edita artículos para la base de conocimientos.</p>
                    </div>
                    <div className="d-flex gap-2">
                        <Link to="/categoria" className="btn btn-outline-success rounded-pill fw-bold px-4">Administrar Categorías</Link>
                        <Link to="/articulos" className="btn btn-outline-dark rounded-pill fw-bold px-4">Ver Blog</Link>
                    </div>
                </div>

                <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 mb-5">
                    {editandoId && (
                        <div className="alert alert-warning fw-bold small d-flex justify-content-between align-items-center mb-4">
                            <span>Modo Edición Activado (Editando ID: {editandoId})</span>
                            <button type="button" onClick={cancelarEdicion} className="btn btn-sm btn-outline-dark rounded-pill px-3">Cancelar</button>
                        </div>
                    )}

                    {mensaje.texto && (
                        <div className={`alert alert-${mensaje.tipo} fw-bold`} role="alert">{mensaje.texto}</div>
                    )}

                    <form onSubmit={publicarArticulo}>
                        <div className="row g-4 mb-4">
                            <div className="col-md-8">
                                <label className="form-label fw-bold text-dark small">Título del Artículo</label>
                                <input type="text" className="form-control rounded-3 bg-light border-0 py-2" name="titulo" value={articulo.titulo} onChange={manejarCambio} required />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-bold text-dark small">Categoría</label>
                                <select className="form-select rounded-3 bg-light border-0 py-2" name="categoria" value={articulo.categoria} onChange={manejarCambio}>
                                    {listaCategorias.map((cat, index) => (
                                        <option key={index} value={cat.nombre}>{cat.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* TU BOTÓN DE SUBIR ARCHIVO */}
                        <div className="mb-4">
                            <label className="form-label fw-bold text-dark small">Imagen de Portada (Sube tu archivo)</label>
                            <input
                                type="file"
                                accept="image/*"
                                className="form-control rounded-3 bg-light border-0 py-2"
                                onChange={e => setImagenArchivo(e.target.files[0])}
                            />
                            {/* Mostramos si ya hay una portada guardada */}
                            {articulo.imagen && !imagenArchivo && (
                                <div className="mt-2 text-secondary small d-flex align-items-center gap-2">
                                    <span className="badge bg-success">Portada actual guardada</span>
                                    <a href={articulo.imagen} target="_blank" rel="noreferrer" className="text-decoration-none">Ver imagen actual</a>
                                </div>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-bold text-dark small">Descripción Breve (Para la tarjeta)</label>
                            <textarea className="form-control rounded-3 bg-light border-0 py-2" rows="2" name="descripcion" value={articulo.descripcion} onChange={manejarCambio} required ></textarea>
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-bold text-dark small">Contenido Completo (Soporta Markdown)</label>
                            <textarea className="form-control rounded-3 bg-light border-0 py-2" rows="10" name="contenido" value={articulo.contenido} onChange={manejarCambio} required ></textarea>
                        </div>

                        <div className="text-end mt-2">
                            <button type="submit" className="btn btn-success rounded-pill fw-bold px-5 py-2" disabled={mensaje.texto === 'Subiendo portada a Supabase...'}>
                                {editandoId ? 'Actualizar Artículo' : 'Publicar Artículo'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* TABLA INFERIOR */}
                <div className="card border-0 shadow-sm rounded-4 p-4">
                    <h5 className="fw-bold text-dark mb-4">Artículos Publicados</h5>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light text-secondary small text-uppercase">
                                <tr>
                                    <th>Título</th>
                                    <th>Categoría</th>
                                    <th className="text-end">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listaArticulos.map((art) => (
                                    <tr key={art.id}>
                                        <td className="fw-semibold text-dark">{art.titulo}</td>
                                        <td><span className="badge bg-light text-success border border-success">{art.categoria}</span></td>
                                        <td className="text-end">
                                            <button onClick={() => iniciarEdicion(art)} className="btn btn-sm btn-outline-secondary fw-bold rounded-pill px-3">Editar</button>
                                        </td>
                                    </tr>
                                ))}
                                {listaArticulos.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="text-center text-muted py-4">No hay artículos publicados.</td>
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