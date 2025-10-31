const mongoose = require('mongoose');

const respuestaSchema = new mongoose.Schema({
  empleado: { type: String, required: true },
  departamento: { type: String, required: true },
  respuestas: [
    {
      pregunta: String,
      // AÑADIDO: Este campo es VITAL para almacenar el valor numérico (1 a 5)
      valor: Number, 
      opcion: String 
    }
  ],
  // CORREGIDO: Renombrado a 'fechaEnvio' para coincidir con lo que el frontend lee y envía
  fechaEnvio: { type: Date, default: Date.now } 
});

module.exports = mongoose.model('Respuesta', respuestaSchema);
