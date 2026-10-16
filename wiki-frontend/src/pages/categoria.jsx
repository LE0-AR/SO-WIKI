import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export const Categoria = () => { 
    const [categorias, setCategorias] = useState([]);
    const [nuevaCategoria, setNuevaCategoria] = useState('');
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
    const [categoriaEditando, setCategoriaEditando] = useState(null);

    const usuarioGuardado = JSON.parse(localStorage.getItem('usuarioWiki') || '{}');
    const rutaVolver = usuarioGuardado.rol === 'Editor' ? '/editor' : '/panel';

    const cargarCategorias = async () => {
        const { data, error } = await supabase.from('categoria').select('*').order('id', { ascending: true });
        if (data) setCategorias(data);
        if (error) console.error("Error al cargar:", error);
    };

    useEffect(() => {
        cargarCategorias();
    }, []);

    const manejarSubmit = async (e) => {
        e.preventDefault();
        setMensaje({ texto: 'Procesando...', tipo: 'info' });

        if (categoriaEditando) {
            const { error } = await supabase
                .from('categoria')
                .update({ nombre: nuevaCategoria })
                .eq('id', categoriaEditando.id);

            if (error) {
                setMensaje({ texto: 'Error al actualizar.', tipo: 'danger' });
            } else {
                setMensaje({ texto: 'Categoría actualizada.', tipo: 'success' });
                setCategoriaEditando(null);
            }
        } else {
            const { error } = await supabase
                .from('categoria')
                .insert([{ nombre: nuevaCategoria }]);

            if (error) {
                setMensaje({ texto: 'Error al crear.', tipo: 'danger' });
            } else {
                setMensaje({ texto: 'Categoría guardada.', tipo: 'success' });
            }
        }
        
        setNuevaCategoria('');
        cargarCategorias();
    };

    const iniciarEdicion = (cat) => {
        setCategoriaEditando(cat);
        setNuevaCategoria(cat.nombre);
    };

    const cancelarEdicion = () => {
        setCategoriaEditando(null);
        setNuevaCategoria('');
        setMensaje({ texto: '', tipo: '' });
    };

    const eliminarCategoria = async (id) => {
        if (!window.confirm('¿Eliminar esta categoría? Esto podría afectar a los artículos asociados.')) return;
        
        const { error } = await supabase.from('categoria').delete().eq('id', id);
        if (error) {
            setMensaje({ texto: 'Error al eliminar.', tipo: 'danger' });
        } else {
            setMensaje({ texto: 'Categoría eliminada.', tipo: 'success' });
            cargarCategorias();
        }
    };

    return (
        <div className="bg-light min-vh-100 py-5">
            <div className="container" style={{ maxWidth: '700px' }}>
                
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="fw-bold text-dark mb-0">Gestión de Categorías</h2>
                        <p className="text-secondary small mt-1">Administra los temas de tu Wiki.</p>
                    </div>
                    <Link to={rutaVolver} className="btn btn-outline-dark rounded-pill fw-bold px-4">
                        &larr; Volver
                    </Link>
                </div>

                <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                    {mensaje.texto && (
                        <div className={`alert alert-${mensaje.tipo} fw-bold small py-2`} role="alert">
                            {mensaje.texto}
                        </div>
                    )}
                    
                    {categoriaEditando && (
                        <div className="alert alert-warning small py-1 mb-3 d-flex justify-content-between align-items-center">
                            <span>Modo Edición Activado</span>
                            <button onClick={cancelarEdicion} className="btn btn-sm btn-dark">Cancelar</button>
                        </div>
                    )}

                    <form onSubmit={manejarSubmit} className="d-flex gap-2">
                        <input 
                            type="text" 
                            className="form-control rounded-3 bg-light border-0" 
                            placeholder="Ej. Inteligencia Artificial" 
                            value={nuevaCategoria}
                            onChange={(e) => setNuevaCategoria(e.target.value)}
                            required
                        />
                        <button type="submit" className={`btn ${categoriaEditando ? 'btn-warning' : 'btn-success'} fw-bold px-4 rounded-3`}>
                            {categoriaEditando ? 'Actualizar' : 'Agregar'}
                        </button>
                    </form>
                </div>

                <div className="card border-0 shadow-sm rounded-4 p-4">
                    <h5 className="fw-bold text-dark mb-3">Categorías Actuales</h5>
                    <ul className="list-group list-group-flush">
                        {categorias.map(cat => (
                            <li key={cat.id} className="list-group-item bg-transparent px-0 border-bottom d-flex justify-content-between align-items-center">
                                <span className="text-secondary fw-semibold">{cat.nombre}</span>
                                <div>
                                    <button onClick={() => iniciarEdicion(cat)} className="btn btn-sm btn-outline-primary rounded-pill px-3 me-2">Editar</button>
                                    <button onClick={() => eliminarCategoria(cat.id)} className="btn btn-sm btn-outline-danger rounded-pill px-3">Eliminar</button>
                                </div>
                            </li>
                        ))}
                        {categorias.length === 0 && (
                            <li className="list-group-item bg-transparent text-muted px-0">No hay categorías registradas.</li>
                        )}
                    </ul>
                </div>

            </div>
        </div>
    );
};