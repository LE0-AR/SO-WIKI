'use strict';

const http = require('node:http');
const express = require('express');
require('dotenv').config();
const { attachParqueo } = require('./attach');

function startServer({ port = process.env.PORT || 3000, host = process.env.PARQUEO_HOST || '127.0.0.1', options } = {}) {
  const app = express();
  const server = http.createServer(app);
  const parqueo = attachParqueo({ app, server, options });
  server.listen(port, host, () => {
    console.log(`Motor de parqueo escuchando en ${host}:${server.address().port}; PID ${process.pid} (${process.platform}).`);
    console.log('Abre la página /parqueo del frontend. No se necesitan credenciales de Supabase.');
  });
  return { app, server, ...parqueo };
}

if (require.main === module) {
  const runtime = startServer();
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    try {
      await runtime.close();
    } catch (error) {
      console.error('Error al cerrar el parqueo:', error.message);
      process.exitCode = 1;
    }
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  runtime.server.on('error', error => {
    console.error('No se pudo iniciar el servidor de parqueo:', error.message);
    process.exitCode = 1;
    void shutdown();
  });
}

module.exports = { startServer };
