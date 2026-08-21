import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export const Categoria = () => { // <-- Nombre de exportación corregido
    const [categorias, setCategorias] = useState([]);
    const [nuevaCategoria, setNuevaCategoria] = useState('');
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

    // Cargar categorías al abrir la página
    const cargarCategorias = async () => {
        // <-- Tabla corregida a 'categoria' (singular)
        const { data, error } = await supabase.from('categoria').select('*').order('id', { ascending: true });
        if (data) setCategorias(data);
        if (error) console.error("Error al cargar:", error);
    };

    useEffect(() => {
        cargarCategorias();
    }, []);

    // Guardar una nueva categoría
    const crearCategoria = async (e) => {
        e.preventDefault();
        setMensaje({ texto: 'Guardando...', tipo: 'info' });

        // <-- Tabla corregida a 'categoria' (singular)
        const { error } = await supabase.from('categoria').insert([{ nombre: nuevaCategoria }]);

        if (error) {
            setMensaje({ texto: 'Error al crear la categoría.', tipo: 'danger' });
        } else {
            setMensaje({ texto: '¡Categoría guardada con éxito!', tipo: 'success' });
            setNuevaCategoria(''); // Limpiamos el input
            cargarCategorias(); // Recargamos la lista
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
                    <Link to="/panel" className="btn btn-outline-dark rounded-pill fw-bold px-4">
                        &larr; Volver a Artículos
                    </Link>
                </div>

                <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                    {mensaje.texto && (
                        <div className={`alert alert-${mensaje.tipo} fw-bold small py-2`} role="alert">
                            {mensaje.texto}
                        </div>
                    )}
                    <form onSubmit={crearCategoria} className="d-flex gap-2">
                        <input 
                            type="text" 
                            className="form-control rounded-3 bg-light border-0" 
                            placeholder="Ej. Inteligencia Artificial" 
                            value={nuevaCategoria}
                            onChange={(e) => setNuevaCategoria(e.target.value)}
                            required
                        />
                        <button type="submit" className="btn btn-success fw-bold px-4 rounded-3">
                            Agregar
                        </button>
                    </form>
                </div>

                <div className="card border-0 shadow-sm rounded-4 p-4">
                    <h5 className="fw-bold text-dark mb-3">Categorías Actuales</h5>
                    <ul className="list-group list-group-flush">
                        {categorias.map(cat => (
                            <li key={cat.id} className="list-group-item bg-transparent text-secondary px-0 border-bottom">
                                - {cat.nombre}
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