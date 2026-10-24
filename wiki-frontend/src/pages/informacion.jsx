import React from 'react';

export const Documentacion = () => {
  const pdfUrl = "/Documentacion_Tecnica_WIKI_SO.pdf";

  return (
    <div className="container py-5">
      {/* Encabezado y Botones de Descarga */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 pb-3 border-bottom">
        <div>
          <span className="badge bg-primary mb-2">Ingeniería en Sistemas - UMG</span>
          <h1 className="fw-bold mb-1">Documentación Técnica y Arquitectura</h1>
          <p className="text-muted mb-0">
            Especificación del stack tecnológico, arquitectura distribuida y algoritmos del Kernel en WIKI-SO.
          </p>
        </div>

        <div className="mt-3 mt-md-0 d-flex gap-2">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-dark d-flex align-items-center gap-2"
          >
            <i className="bi bi-eye"></i> Ver PDF
          </a>
          <a
            href={pdfUrl}
            download="Documentacion_Tecnica_WIKI_SO.pdf"
            className="btn btn-primary d-flex align-items-center gap-2 shadow-sm"
          >
            <i className="bi bi-file-earmark-arrow-down-fill"></i> Descargar PDF
          </a>
        </div>
      </div>

      {/* Resumen del Proyecto */}
      <div className="card border-0 shadow-sm mb-4 bg-dark text-white">
        <div className="card-body p-4">
          <h4 className="fw-bold text-info">
            <i className="bi bi-cpu me-2"></i>Visión General del Sistema
          </h4>
          <p className="mb-0">
            <strong>SO-WIKI</strong> es una plataforma web construida bajo una arquitectura Cliente-Servidor desacoplada. 
            Unifica un Sistema de Gestión de Contenidos (CMS) colaborativo con motores matemáticos ejecutados en el cliente 
            para simular la planificación de procesos en CPU, asignación dinámica de memoria RAM (1024 MB) y control de 
            concurrencia mediante semáforos y exclusión mutua (Mutex).
          </p>
        </div>
      </div>

      {/* Arquitectura Distribuida en 4 Capas */}
      <h3 className="fw-bold mb-3">
        <i className="bi bi-diagram-3 me-2 text-primary"></i>Arquitectura Distribuida en la Nube
      </h3>
      <div className="row g-4 mb-5">
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <div className="text-primary fs-3 mb-2"><i className="bi bi-window-stack"></i></div>
              <h5 className="fw-bold">1. Frontend (Vercel)</h5>
              <p className="small text-muted mb-2">React.js + Vite + Bootstrap 5</p>
              <p className="small mb-0">
                SPA con reconciliación por Virtual DOM para renderizar las ráfagas del simulador en tiempo real. Despliegue continuo (CI/CD) en red Edge.
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <div className="text-success fs-3 mb-2"><i className="bi bi-hdd-network"></i></div>
              <h5 className="fw-bold">2. Backend API (Render)</h5>
              <p className="small text-muted mb-2">Node.js + Express.js</p>
              <p className="small mb-0">
                API RESTful que gestiona la lógica de negocio, controladores de artículos, validación de permisos CORS y comunicación segura entre capas.
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <div className="text-warning fs-3 mb-2"><i className="bi bi-database-check"></i></div>
              <h5 className="fw-bold">3. Datos y Auth (Supabase)</h5>
              <p className="small text-muted mb-2">PostgreSQL + JWT Auth</p>
              <p className="small mb-0">
                Persistencia relacional para usuarios, roles y artículos, junto con autenticación Stateless basada en JSON Web Tokens.
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <div className="text-danger fs-3 mb-2"><i className="bi bi-cloud-arrow-up"></i></div>
              <h5 className="fw-bold">4. Multimedia (Supabase Storage)</h5>
              <p className="small text-muted mb-2">Buckets de Supabase</p>
              <p className="small mb-0">
                Almacenamiento de imágenes de los artículos directamente en los Buckets de Supabase, centralizando la infraestructura BaaS y optimizando la entrega sin saturar PostgreSQL.
              </p>
            </div>
          </div>
        </div>


      </div>

      {/* Módulos e Ingeniería */}
      <div className="row g-4 mb-5">
        <div className="col-lg-6">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-header bg-white fw-bold py-3">
              <i className="bi bi-terminal me-2 text-primary"></i>Motores de Simulación de SO
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                <li className="list-group-item px-0">
                  <strong>Prevención de Head-of-Line Blocking (RAM):</strong> El planificador evalúa toda la cola de procesos listos para aprovechar los bloques libres de los 1024 MB sin detenerse por un proceso pesado al inicio.
                </li>
                <li className="list-group-item px-0">
                  <strong>System Log Terminal:</strong> Consola de auditoría en tiempo real con auto-scroll mediante <code>useRef</code> que registra creación, asignación y finalización de ráfagas de CPU.
                </li>
                <li className="list-group-item px-0">
                  <strong>Concurrencia en Parqueo:</strong> Implementación de semáforos y exclusión mutua (Mutex) para evitar condiciones de carrera (<em>Race Conditions</em>) en recursos compartidos.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-header bg-white fw-bold py-3">
              <i className="bi bi-shield-lock me-2 text-primary"></i>Backoffice, CRUDs y Optimizaciones UI
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                <li className="list-group-item px-0">
                  <strong>Control de Acceso Basado en Roles (RBAC):</strong> Rutas protegidas mediante <code>&lt;RutaPrivada&gt;</code> separando permisos de Administrador (CRUD total de usuarios, categorías y artículos) y Editor.
                </li>
                <li className="list-group-item px-0">
                  <strong>Live Search Sincronizado por URL:</strong> Uso del hook <code>useSearchParams</code> para filtrar artículos en tiempo real desde la barra de navegación global sin recargar la vista.
                </li>
                <li className="list-group-item px-0">
                  <strong>Menú Móvil Controlado por Estado:</strong> Gestión del menú responsivo directamente con <code>useState</code> para evitar colisiones entre el DOM nativo de Bootstrap y el Virtual DOM de React.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Visor embebido opcional + llamada a la acción */}
      <div className="card border-0 shadow-sm bg-light">
        <div className="card-body p-4 d-flex flex-column flex-md-row justify-content-between align-items-center">
          <div>
            <h5 className="fw-bold mb-1">¿Necesitas el informe completo para revisión académica?</h5>
            <p className="text-muted small mb-0">
              Descarga el documento oficial en formato PDF con el detalle completo de la arquitectura y capturas del sistema.
            </p>
          </div>
          <a
            href={pdfUrl}
            download="Documentacion_Tecnica_WIKI_SO.pdf"
            className="btn btn-dark mt-3 mt-md-0 px-4"
          >
            <i className="bi bi-download me-2"></i>Descargar Documento PDF
          </a>
        </div>
      </div>
    </div>
  );
};

export default Documentacion;