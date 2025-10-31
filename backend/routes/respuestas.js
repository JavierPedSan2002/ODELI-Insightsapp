const express = require('express');
const router = express.Router();
const Respuesta = require('../models/respuesta');
// Nota: La constante valorOpcion ya no es necesaria en este archivo, pues el
// cliente (frontend) ya envía el valor numérico. La dejamos por si la necesitas en otro lado.
// const valorOpcion = { ... }; 

// ==============================
// RUTA POST: Guardar respuestas
// ==============================
router.post('/', async (req, res) => {
  try {
    // 1. Opcional: Validación para asegurar que todas las respuestas tengan el campo 'valor'
    const respuestasValidas = req.body.respuestas.every(r => typeof r.valor === 'number');

    if (!respuestasValidas) {
        return res.status(400).json({ mensaje: 'Error de datos: Cada respuesta debe incluir el campo "valor" numérico.' });
    }

    // 2. Crear la nueva respuesta y guardar. 
    // Mongoose solo guardará los campos que existen en el Modelo.
    const nuevaRespuesta = new Respuesta(req.body);
    await nuevaRespuesta.save();
    
    // Si el guardado es exitoso, devolvemos el 201
    res.status(201).json({ mensaje: 'Respuesta guardada ✅' });
  } catch (err) {
    console.error("Error al guardar la respuesta:", err.message);
    res.status(500).json({ mensaje: 'Error al guardar la respuesta. Revisa el modelo Mongoose.', error: err.message });
  }
});

// ==============================
// RUTA GET: Ver todas las respuestas
// (Usada por el frontend para tablas y gráficos)
// ==============================
router.get('/', async (req, res) => {
  try {
    // Recomendado: Ordenar por fechaEnvio descendente para ver las últimas encuestas primero
    const respuestas = await Respuesta.find().sort({ fechaEnvio: -1 });
    res.json(respuestas);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener respuestas', error: err.message });
  }
});

// ==============================
// RUTA GET: Estadísticas por departamento (ELIMINADA)
// Si el frontend necesita estas estadísticas, puede hacerlo.
// Si las necesitas en el backend, se mantiene, pero en este contexto se elimina.
// ==============================

module.exports = router;
