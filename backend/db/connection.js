const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/encuestaDB'); // MongoDB local
    console.log('✅ Conectado a MongoDB local correctamente');
  } catch (err) {
    console.error('❌ Error al conectar con MongoDB local:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
