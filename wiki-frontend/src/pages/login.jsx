import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Importamos tu conexión

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false); // Para mostrar que está pensando
    
    const navigate = useNavigate();

    const manejarLogin = async (e) => {
        e.preventDefault(); 
        setError('');
        setCargando(true);

        // 1. Enviamos los datos a la autenticación real de Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        // 2. Evaluamos la respuesta
        if (error) {
            setError('Credenciales incorrectas o usuario no registrado.');
            setCargando(false);
        } else {
            // ¡Éxito! Supabase confirmó que existe, vamos al panel
            navigate('/panel');
        }
    };

    return (
        <div className="bg-light min-vh-100 d-flex align-items-center justify-content-center" style={{ marginTop: '-80px' }}>
            <div className="card border-0 shadow-sm rounded-4 p-5" style={{ maxWidth: '420px', width: '100%' }}>
                
                <div className="text-center mb-4">
                    <h2 className="fw-bold text-dark mb-2">Panel Administrativo</h2>
                    <p className="text-secondary small">Ingresa tus credenciales para gestionar el contenido.</p>
                </div>

                {error && (
                    <div className="alert alert-danger py-2 small fw-bold text-center" role="alert">
                        {error}
                    </div>
                )}
                
                <form onSubmit={manejarLogin}>
                    <div className="mb-3 text-start">
                        <label className="form-label fw-bold text-dark small">Correo Electrónico</label>
                        <input 
                            type="email" 
                            className="form-control rounded-3 p-3 bg-light border-0" 
                            placeholder="admin@umg.edu.gt" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="mb-4 text-start">
                        <label className="form-label fw-bold text-dark small">Contraseña</label>
                        <input 
                            type="password" 
                            className="form-control rounded-3 p-3 bg-light border-0" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        className="btn btn-success w-100 rounded-pill fw-bold py-3 mb-4 shadow-sm"
                        disabled={cargando}
                    >
                        {cargando ? 'Validando...' : 'Iniciar Sesión'}
                    </button>
                    
                    <div className="text-center">
                        <Link to="/" className="text-success text-decoration-none small fw-bold">
                            &larr; Volver al inicio
                        </Link>
                    </div>
                </form>

            </div>
        </div>
    );
};