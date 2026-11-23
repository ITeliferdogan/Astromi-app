const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    surname: {
        type: String,
        required: true,
        trim: true
    },

    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        default: 'other'
    },

    birthday: {
        type: String,
        required: true
    },

    birthplace: {
        type: String,
        trim: true
    },

    birthLat: {
        type: Number,
        required: false
    },

    birthLon: {
        type: Number,
        required: false
    },

    birthTime: {
        type: String,
        required: false
    }
}, 
{
    timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
