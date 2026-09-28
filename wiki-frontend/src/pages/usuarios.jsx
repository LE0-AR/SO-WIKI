import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export const Usuarios = () => {
    // Estados del formulario y la tabla
    const [usuario, setUsuario] = useState({ nombre: '', correo: '', password: '', rol: 'Editor' });
    const [listaUsuarios, setListaUsuarios] = useState([]);
    const [editandoId, setEditandoId] = useState(null);
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

    // Cargar usuarios al entrar a la pantalla
    useEffect(() => {
        obtenerUsuarios();
    }, []);

    const obtenerUsuarios = async () => {
        try {
            const respuesta = await fetch('https://so-wiki.onrender.com/api/usuarios');
            if (respuesta.ok) {
                const data = await respuesta.json();
                setListaUsuarios(data);
            }
        } catch (error) {
            console.error("Error al cargar usuarios:", error);
        }
    };

    const manejarCambio = (e) => {
        setUsuario({ ...usuario, [e.target.name]: e.target.value });
    };

    const iniciarEdicion = (user) => {
        setUsuario({
            nombre: user.nombre || '',
            correo: user.correo || '',
            password: '', // Dejamos la contraseña en blanco por seguridad
            rol: user.rol || 'Editor'
        });
        setEditandoId(user.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelarEdicion = () => {
        setUsuario({ nombre: '', correo: '', password: '', rol: 'Editor' });
        setEditandoId(null);
        setMensaje({ texto: '', tipo: '' });
    };

    // Función para Crear o Actualizar
    const guardarUsuario = async (e) => {
        e.preventDefault();
        setMensaje({ texto: 'Procesando...', tipo: 'info' });

        try {
            const URL_API = editandoId
                ? `https://so-wiki.onrender.com/api/usuarios/${editandoId}`
                : 'https://so-wiki.onrender.com/api/usuarios';
            const metodo = editandoId ? 'PUT' : 'POST';

            const respuesta = await fetch(URL_API, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(usuario)
            });

            if (respuesta.ok) {
                setMensaje({ texto: editandoId ? '¡Usuario actualizado!' : '¡Usuario creado con éxito!', tipo: 'success' });
                cancelarEdicion();
                obtenerUsuarios(); // Recargar la tabla
            } else {
                setMensaje({ texto: 'Error al guardar el usuario.', tipo: 'danger' });
            }
        } catch (error) {
            setMensaje({ texto: 'Error de conexión con el servidor.', tipo: 'danger' });
        }
    };

    // Función para Eliminar
    const eliminarUsuario = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const respuesta = await fetch(`https://so-wiki.onrender.com/api/usuarios/${id}`, {
                method: 'DELETE'
            });

            if (respuesta.ok) {
                setMensaje({ texto: 'Usuario eliminado correctamente.', tipo: 'success' });
                obtenerUsuarios();
            } else {
                setMensaje({ texto: 'Error al eliminar el usuario.', tipo: 'danger' });
            }
        } catch (error) {
            setMensaje({ texto: 'Error de conexión con el servidor.', tipo: 'danger' });
        }
    };

    return (
        <div className="bg-light min-vh-100 py-5">
            <div className="container" style={{ maxWidth: '900px' }}>

                {/* ENCABEZADO */}
                <div className="d-flex justify-content-between align-items-center mb-5 flex-wrap gap-3">
                    <div>
                        <h2 className="fw-bold text-dark mb-0">Gestión de Usuarios</h2>
                        <p className="text-secondary mt-1 mb-0">Administra los accesos y roles de tu plataforma.</p>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        <Link to="/panel" className="btn btn-outline-dark rounded-pill fw-bold px-4 shadow-sm">
                            Volver a Publicaciones
                        </Link>
                    </div>
                </div>

                {/* TARJETA DE FORMULARIO */}
                <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 mb-5 bg-white">
                    {editandoId && (
                        <div className="alert alert-warning fw-bold small d-flex justify-content-between align-items-center mb-4 rounded-3 shadow-sm">
                            <span><i className="bi bi-pencil-square me-2"></i>Editando al usuario ID: {editandoId}</span>
                            <button type="button" onClick={cancelarEdicion} className="btn btn-sm btn-dark rounded-pill px-3">Cancelar Edición</button>
                        </div>
                    )}

                    {mensaje.texto && (
                        <div className={`alert alert-${mensaje.tipo} fw-bold rounded-3 shadow-sm`} role="alert">
                            {mensaje.texto}
                        </div>
                    )}

                    <form onSubmit={guardarUsuario}>
                        <div className="row g-4 mb-4">
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>Nombre Completo</label>
                                <input type="text" className="form-control form-control-lg rounded-3 bg-light border-0 shadow-sm" name="nombre" value={usuario.nombre} onChange={manejarCambio} placeholder="Ej. Juan Pérez" required />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>Correo Electrónico</label>
                                <input type="email" className="form-control form-control-lg rounded-3 bg-light border-0 shadow-sm" name="correo" value={usuario.correo} onChange={manejarCambio} placeholder="juan@ejemplo.com" required />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>Contraseña {editandoId && <span className="text-muted text-lowercase" style={{letterSpacing: '0'}}>(Dejar en blanco para no cambiarla)</span>}</label>
                                <input type="password" className="form-control form-control-lg rounded-3 bg-light border-0 shadow-sm" name="password" value={usuario.password} onChange={manejarCambio} placeholder="••••••••" required={!editandoId} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>Rol del Sistema</label>
                                <select className="form-select form-select-lg rounded-3 bg-light border-0 shadow-sm" name="rol" value={usuario.rol} onChange={manejarCambio}>
                                    <option value="Admin">Administrador</option>
                                    <option value="Editor">Editor</option>
                                    <option value="Lector">Lector</option>
                                </select>
                            </div>
                        </div>

                        <div className="d-flex justify-content-end border-top pt-4 mt-2">
                            <button type="submit" className="btn btn-primary btn-lg rounded-pill fw-bold px-5 shadow-sm">
                                {editandoId ? 'Actualizar Usuario' : 'Registrar Usuario'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* TARJETA DE LA TABLA */}
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                    <h5 className="fw-bold text-dark mb-4">Usuarios Registrados</h5>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light text-secondary small text-uppercase">
                                <tr>
                                    <th className="py-3">Nombre</th>
                                    <th className="py-3">Correo</th>
                                    <th className="py-3">Rol</th>
                                    <th className="text-end py-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listaUsuarios.map((user) => (
                                    <tr key={user.id}>
                                        <td className="fw-semibold text-dark py-3">{user.nombre}</td>
                                        <td className="text-muted py-3">{user.correo}</td>
                                        <td className="py-3">
                                            <span className={`badge rounded-pill px-3 py-2 ${user.rol === 'Admin' ? 'bg-danger' : user.rol === 'Editor' ? 'bg-primary' : 'bg-secondary'}`}>
                                                {user.rol}
                                            </span>
                                        </td>
                                        <td className="text-end py-3">
                                            <button onClick={() => iniciarEdicion(user)} className="btn btn-sm btn-outline-dark fw-bold rounded-pill px-3 me-2">Editar</button>
                                            <button onClick={() => eliminarUsuario(user.id)} className="btn btn-sm btn-outline-danger fw-bold rounded-pill px-3">Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                                {listaUsuarios.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="text-center text-muted py-5">
                                            No hay usuarios registrados aún.
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