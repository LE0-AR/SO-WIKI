const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Iniciamos la conexión normal a Supabase
const supabase = require('./config/supabase');

// Importamos el cliente con privilegios de administrador usando la llave service_role
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares (Configuraciones base)
app.use(cors());
app.use(express.json()); // Permite a la API entender formatos JSON

// Ruta de prueba (Health check)
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: '¡El intermediario de la Wiki está vivo!',
    timestamp: new Date()
  });
});

// Ruta para obtener todos los artículos de la Wiki
app.get('/api/articulos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('articulos')
      .select('*')
      .order('created_at', { ascending: false }); // Ordenamos para que los nuevos salgan primero

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 🌟 NUEVA RUTA: Obtener un solo artículo por ID (Para la vista del Blog)
app.get('/api/articulos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('articulos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para crear un nuevo artículo (con soporte de auditoría)
app.post('/api/articulos', async (req, res) => {
  // 🌟 AÑADIDOS LOS NUEVOS CAMPOS AQUÍ 🌟
  const { titulo, contenido, creado_por, categoria, descripcion, imagen } = req.body;

  if (!titulo || !contenido) {
    return res.status(400).json({ error: 'Faltan el título o el contenido' });
  }

  try {
    const { data, error } = await supabase
      .from('articulos')
      // 🌟 SE INSERTAN LOS NUEVOS CAMPOS AQUÍ 🌟
      .insert([{ titulo, contenido, creado_por, categoria, descripcion, imagen }])
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Registrar en la tabla de auditoría logs
    await supabase.from('auditoria_logs').insert([{
      accion: 'CREACIÓN',
      detalle: `Creó el artículo "${titulo}"`,
      usuario: creado_por || 'Sistema'
    }]);

    res.status(201).json({ 
      message: 'Artículo creado con éxito', 
      articulo: data[0] 
    });
  } catch (err) {
    res.status(500).json({ error: 'Error interno al intentar guardar' });
  }
});

// Ruta para actualizar un artículo existente (con auditoría)
app.put('/api/articulos/:id', async (req, res) => {
  const { id } = req.params;
  // 🌟 AÑADIDOS LOS NUEVOS CAMPOS AQUÍ 🌟
  const { titulo, contenido, actualizado_por, categoria, descripcion, imagen } = req.body;

  try {
 const { data, error } = await supabase
      .from('articulos')
      .update({ titulo, contenido, categoria, descripcion, imagen })
      .eq('id', id)
      .select();

    if (error) {
      // AGREGA ESTA LÍNEA PARA VER EL MOTIVO EXACTO DEL RECHAZO
      console.error("ERROR EXACTO DE SUPABASE:", error); 
      return res.status(400).json({ error: error.message });
    }

    // Registrar en la tabla de auditoría logs
    await supabase.from('auditoria_logs').insert([{
      accion: 'EDICIÓN',
      detalle: `Modificó el artículo "${titulo}"`,
      usuario: actualizado_por || 'Sistema'
    }]);

    res.status(200).json({ message: 'Artículo actualizado con éxito', articulo: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error interno al actualizar el artículo' });
  }
});

// Ruta para eliminar un artículo (con auditoría)
app.delete('/api/articulos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Obtenemos el título antes de borrarlo para dejar constancia en el log
    const { data: artData } = await supabase.from('articulos').select('titulo').eq('id', id).single();
    const tituloArt = artData ? artData.titulo : 'Desconocido';

    const { error } = await supabase
      .from('articulos')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Registrar en la tabla de auditoría logs
    await supabase.from('auditoria_logs').insert([{
      accion: 'ELIMINACIÓN',
      detalle: `Eliminó el artículo "${tituloArt}"`,
      usuario: 'Administrador'
    }]);

    res.status(200).json({ message: 'Artículo eliminado con éxito' });
  } catch (err) {
    res.status(500).json({ error: 'Error interno al eliminar el artículo' });
  }
});

// ==========================================
// RUTAS DE ADMINISTRACIÓN (NO MODIFICADAS)
// ==========================================

// Ruta para crear usuarios de forma privada (Panel de Admin)
app.post('/api/admin/crear-usuario', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan el correo o la contraseña' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true 
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    await supabase.from('auditoria_logs').insert([{
      accion: 'NUEVO USUARIO',
      detalle: `Creó cuenta para el correo ${email}`,
      usuario: 'Administrador'
    }]);

    res.status(201).json({ 
      message: 'Usuario creado exitosamente por el administrador', 
      user: data.user 
    });

  } catch (err) {
    res.status(500).json({ error: 'Error interno al crear el usuario' });
  }
});

// Ruta para eliminar un usuario del sistema (Panel de Admin)
app.delete('/api/admin/usuarios/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    await supabase.from('auditoria_logs').insert([{
      accion: 'ELIMINAR USUARIO',
      detalle: `Eliminó al colaborador con ID ${id}`,
      usuario: 'Administrador'
    }]);

    res.status(200).json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error interno al eliminar usuario' });
  }
});

// Ruta para actualizar la contraseña de un usuario (Panel de Admin)
app.put('/api/admin/usuarios/:id/password', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Se requiere la nueva contraseña' });
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    await supabase.from('auditoria_logs').insert([{
      accion: 'CAMBIO DE CONTRASEÑA',
      detalle: `Actualizó la contraseña del usuario ID ${id}`,
      usuario: 'Administrador'
    }]);

    res.status(200).json({ message: 'Contraseña actualizada con éxito' });
  } catch (err) {
    res.status(500).json({ error: 'Error interno al actualizar contraseña' });
  }
});

// Ruta para listar todos los usuarios en el Panel de Admin
app.get('/api/admin/usuarios', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json(data.users);
  } catch (err) {
    res.status(500).json({ error: 'Error interno al obtener los usuarios' });
  }
});

// Ruta para obtener los logs de auditoría
app.get('/api/admin/logs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('auditoria_logs')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error interno al obtener los logs de auditoría' });
  }
});

app.get('/', (req, res) => {
  res.send('Backend de Wiki funcionando correctamente 🚀');
});

// Arrancar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});