// models/AstroProfile.js

const mongoose = require('mongoose');

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

module.exports = mongoose.model('AstroProfile', AstroSchema);
