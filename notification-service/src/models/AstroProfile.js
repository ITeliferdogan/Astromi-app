const mongoose = require('mongoose');

// AstroProfile, 'userapi' veritabanındaki astroloji profillerini kullanıyor.
const userConnection = mongoose.createConnection('mongodb://localhost:27017/userapi');

const AstroSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },

    sun: {
        burc: String,
        derece: Number
    },
    moon: {
        burc: String,
        derece: Number
    },
    rising: {
        burc: String,
        derece: Number
    }
}, { timestamps: true });

module.exports = userConnection.model('AstroProfile', AstroSchema, 'astroprofiles');
