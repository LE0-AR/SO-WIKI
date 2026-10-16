import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

import { Home } from './pages/home';
import { Articulos } from './pages/articulos';
import { Articulo } from './pages/articulo';
import { Simulacion } from './pages/simulacion';
import { Login } from './pages/login';
import { Panel } from './pages/panel';
import { EditorPanel } from './pages/Editor'; 
import { Categoria } from './pages/categoria';
import { Usuarios } from './pages/usuarios';
import { Parqueo } from './pages/parqueo';

function Navbar({ usuario, setUsuario }) {
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('usuarioWiki');
    setUsuario(null);
    window.location.href = '/';
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
            <li className="nav-item"><Link className="nav-link fw-semibold text-dark" to="/parqueo">Parqueo</Link></li>
          </ul>
        </div>

        <div className="d-none d-lg-flex align-items-center gap-3">
          <form className="d-flex" role="search">
            <input className="form-control me-2 rounded-pill bg-light border-0" type="search" placeholder="Buscar artículos..." />
            <button className="btn btn-outline-success rounded-pill px-4 fw-bold" type="submit">Buscar</button>
          </form>

          {usuario ? (
            <>
              {/* SI ES ADMIN: Ve el botón Panel que lo lleva a /panel */}
              {(usuario.rol === 'Admin' || usuario.rol === 'Administrador') && (
                <Link to="/panel" className="btn btn-outline-dark rounded-pill px-3 fw-bold">Panel Admin</Link>
              )}

              {/* SI ES EDITOR: Ve el botón Redactar que lo lleva a /editor */}
              {(usuario.rol === 'Editor') && (
                <Link to="/editor" className="btn btn-outline-dark rounded-pill px-3 fw-bold">Redactar</Link>
              )}

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

const RutaPrivada = ({ children, rolesPermitidos }) => {
  const usuarioGuardado = localStorage.getItem('usuarioWiki');
  const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (!rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuarioWiki');
    if (usuarioGuardado) {
      setUsuario(JSON.parse(usuarioGuardado));
    }
  }, []);

  return (
    <BrowserRouter>
      <Navbar usuario={usuario} setUsuario={setUsuario} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/articulos" element={<Articulos />} />
        <Route path="/articulo/:id" element={<Articulo />} />
        <Route path="/simulacion" element={<Simulacion />} />
        <Route path="/login" element={<Login setUsuario={setUsuario} />} />
        <Route path="/categoria" element={<Categoria />} />
        <Route path="/parqueo" element={<Parqueo />} />
        {/* --- RUTAS BLINDADAS --- */}
        {/* El panel maestro AHORA SÓLO ACEPTA ADMINS */}
        <Route
          path="/panel"
          element={
            <RutaPrivada rolesPermitidos={['Admin', 'Administrador']}>
              <Panel />
            </RutaPrivada>
          }
        />

        {/* Esta es la NUEVA RUTA EXCLUSIVA PARA EL EDITOR */}
        <Route
          path="/editor"
          element={
            <RutaPrivada rolesPermitidos={['Admin', 'Administrador', 'Editor']}>
              <EditorPanel />
            </RutaPrivada>
          }
        />

        <Route
          path="/usuarios"
          element={
            <RutaPrivada rolesPermitidos={['Admin', 'Administrador']}>
              <Usuarios />
            </RutaPrivada>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;