const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./db/connection'); // Asumo que este archivo existe y funciona

const app = express();
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
connectDB();

// Rutas de API
const respuestasRouter = require('./routes/respuestas');
app.use('/api/respuestas', respuestasRouter);

// --- CLAVE DE LA UNIFICACIÓN ---

// 1. Servir frontend estático desde public (CSS, JS, index.html, etc.)
// Esto permite que el navegador pida la página web y los recursos del frontend.
app.use(express.static(path.join(__dirname, 'public')));

// 2. RUTA CATCH-ALL DEFINITIVA (Middleware Final)
// Usa app.use sin especificar una ruta. Este middleware se ejecuta para CUALQUIER
// solicitud que NO haya sido manejada por las rutas API o por los archivos estáticos.
// Esta es la solución más robusta para el "PathError" que estabas viendo.
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --------------------------------

// Puerto
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log('¡Listo para ngrok con un solo túnel!');
});