const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Traemos las variables de tu archivo .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error(' Faltan las credenciales de Supabase en el archivo .env');
}

// Creamos la conexión (el cliente)
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Conexión a Supabase configurada correctamente');

module.exports = supabase;