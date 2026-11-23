// models/RegisterUser.js
const mongoose = require('mongoose');

const RegisterSchema = new mongoose.Schema({
    firebaseUID: {
        type: String,
        required: true,
        unique: true // Firebase'in verdiği ID her zaman benzersizdir
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Register', RegisterSchema);