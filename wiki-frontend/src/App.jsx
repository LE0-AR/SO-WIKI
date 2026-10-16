import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

import { Home } from './pages/home';
import { Articulos } from './pages/articulos';
import { Articulo } from './pages/articulo';
import { Simulacion } from './pages/simulacion';
import { Login } from './pages/login';
import { Panel } from './pages/panel';
import { EditorPanel } from './pages/editor'; 
import { Categoria } from './pages/categoria';
import { Usuarios } from './pages/usuarios';
import { Parqueo } from './pages/parqueo';

function Navbar({ usuario, setUsuario }) {
  const navigate = useNavigate();
  const [textoBusqueda, setTextoBusqueda] = useState('');
  
  // NUEVO: Controlamos el estado del menú móvil con React, no con Bootstrap JS
  const [menuAbierto, setMenuAbierto] = useState(false);

  const toggleMenu = () => setMenuAbierto(!menuAbierto);
  const cerrarMenu = () => setMenuAbierto(false); // Función para cerrar al hacer clic en cualquier opción

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('usuarioWiki');
    setUsuario(null);
    cerrarMenu();
    window.location.href = '/';
  };

  const manejarBusquedaGlobal = (e) => {
    e.preventDefault();
    if (textoBusqueda.trim() !== '') {
      navigate(`/articulos?q=${encodeURIComponent(textoBusqueda)}`);
      setTextoBusqueda(''); 
      cerrarMenu(); // Cierra el menú en celular al buscar
    }
  };

  return (
    <>
      {/* NUEVO: Estilo inyectado para que el menú flote SOBRE el contenido en celular y no empuje nada hacia abajo */}
      <style>
        {`
          @media (max-width: 991.98px) {
            .mobile-overlay-menu {
              position: absolute;
              top: 100%;
              left: 0;
              right: 0;
              background-color: white;
              box-shadow: 0 1rem 3rem rgba(0,0,0,0.15);
              padding: 1.5rem;
              z-index: 1050;
              border-top: 1px solid #eaeaea;
            }
          }
        `}
      </style>

      {/* position-relative es necesario para que el menú absoluto sepa de dónde flotar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white py-3 shadow-sm position-relative">
        <div className="container">
          <Link className="navbar-brand fw-bold fs-4" to="/" onClick={cerrarMenu}>
            <span className="text-dark">WIKI</span><span className="text-success">-SO</span>
          </Link>
          
          {/* Botón de Hamburguesa ejecutando toggleMenu de React */}
          <button className="navbar-toggler border-0 shadow-none" type="button" onClick={toggleMenu}>
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Menú normal en PC, pero flotante en móvil (mobile-overlay-menu). Usamos el estado 'show' de React */}
          <div className={`collapse navbar-collapse mobile-overlay-menu ${menuAbierto ? 'show' : ''}`}>
            
            <ul className="navbar-nav mx-auto gap-2 gap-lg-4 my-3 my-lg-0 text-center">
              <li className="nav-item">
                <Link className="nav-link fw-semibold text-dark" to="/" onClick={cerrarMenu}>Inicio</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link fw-semibold text-dark" to="/articulos" onClick={cerrarMenu}>Blog</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link fw-semibold text-dark" to="/simulacion" onClick={cerrarMenu}>Simulador</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link fw-semibold text-dark" to="/parqueo" onClick={cerrarMenu}>Parqueo</Link>
              </li>
            </ul>

            <div className="d-flex flex-column flex-lg-row align-items-center gap-3">
              <form className="d-flex w-100" role="search" onSubmit={manejarBusquedaGlobal}>
                <input 
                  className="form-control me-2 rounded-pill bg-light border-0" 
                  type="search" 
                  placeholder="Buscar artículos..." 
                  value={textoBusqueda}
                  onChange={(e) => setTextoBusqueda(e.target.value)}
                />
                <button className="btn btn-outline-success rounded-pill px-4 fw-bold" type="submit">Buscar</button>
              </form>

              {usuario ? (
                <div className="d-flex flex-column flex-lg-row gap-2 w-100">
                  {(usuario.rol === 'Admin' || usuario.rol === 'Administrador') && (
                    <Link to="/panel" className="btn btn-outline-dark rounded-pill px-3 fw-bold w-100 text-center" onClick={cerrarMenu}>Panel Admin</Link>
                  )}
                  {(usuario.rol === 'Editor') && (
                    <Link to="/editor" className="btn btn-outline-dark rounded-pill px-3 fw-bold w-100 text-center" onClick={cerrarMenu}>Redactar</Link>
                  )}
                  <button onClick={cerrarSesion} className="btn btn-dark rounded-pill px-3 fw-bold w-100">Salir</button>
                </div>
              ) : (
                <Link to="/login" className="btn btn-dark rounded-pill px-4 fw-bold w-100 text-center" onClick={cerrarMenu}>Ingresar</Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
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
        
        <Route
          path="/panel"
          element={
            <RutaPrivada rolesPermitidos={['Admin', 'Administrador']}>
              <Panel />
            </RutaPrivada>
          }
        />
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