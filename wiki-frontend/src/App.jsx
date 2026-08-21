import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { supabase } from './supabaseClient'; 

import { Home } from './pages/home';
import { Articulos } from './pages/articulos'; // <-- El plural (tarjetas)
import { Articulo } from './pages/articulo';   // <-- ¡ESTA ES LA LÍNEA QUE TE FALTA! (Singular)
import { Simulacion } from './pages/simulacion';
import { Login } from './pages/login';
import { Panel } from './pages/panel';
import { Categoria } from './pages/categoria';

function Navbar({ usuario }) {
  
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'; // Redirige al inicio al salir
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white py-3 shadow-sm">
      <div className="container">
        <Link className="navbar-brand fw-bold fs-4" to="/">
          <span className="text-dark">WIKI</span><span className="text-success">-SO</span>
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse justify-content-center" id="navbarNav">
          <ul className="navbar-nav gap-4">
            <li className="nav-item"><Link className="nav-link fw-semibold text-dark" to="/">Inicio</Link></li>
            <li className="nav-item"><Link className="nav-link fw-semibold text-dark" to="/articulos">Blog</Link></li>
            <li className="nav-item"><Link className="nav-link fw-semibold text-dark" to="/simulacion">Simulador</Link></li>
          </ul>
        </div>
        
        <div className="d-none d-lg-flex align-items-center gap-3">
          <form className="d-flex" role="search">
            <input className="form-control me-2 rounded-pill bg-light border-0" type="search" placeholder="Buscar artículos..." />
            <button className="btn btn-outline-success rounded-pill px-4 fw-bold" type="submit">Buscar</button>
          </form>
          
          {/* LÓGICA DE SESIÓN: Si hay usuario mostramos Panel/Salir, si no, Ingresar */}
          {usuario ? (
            <>
              <Link to="/panel" className="btn btn-outline-dark rounded-pill px-3 fw-bold">Panel</Link>
              <button onClick={cerrarSesion} className="btn btn-dark rounded-pill px-3 fw-bold">Salir</button>
            </>
          ) : (
            <Link to="/login" className="btn btn-dark rounded-pill px-4 fw-bold">Ingresar</Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    // 1. Revisar si hay una sesión guardada al abrir la página
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsuario(session?.user ?? null);
    });

    // 2. Quedarse escuchando si el usuario hace login o logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      {/* Pasamos el estado del usuario al menú */}
      <Navbar usuario={usuario} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/articulos" element={<Articulos />} />
        
        {/* 2. AGREGAMOS LA RUTA DINÁMICA DEL ARTÍCULO */}
        <Route path="/articulo/:id" element={<Articulo />} /> 
        
        <Route path="/simulacion" element={<Simulacion />} />
        <Route path="/login" element={<Login />} />
        <Route path="/panel" element={<Panel />} />
        <Route path="/categoria" element={<Categoria />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;