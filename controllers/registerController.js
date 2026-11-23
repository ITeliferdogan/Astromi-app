const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Register = require('../models/RegisterUser');

const registerUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        const hashedPass = await bcrypt.hash(password, 10);

        await Register.create({
            username,
            password: hashedPass
        });

        res.json({ message: "Kayıt başarılı (username/password)" });

    } catch (error) {
        res.status(500).json({ error: "Register hata" });
    }
};

const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await Register.findOne({ username });
        if (!user) return res.status(400).json({ error: "Kullanıcı yok" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: "Şifre hatalı" });

        const token = jwt.sign(
            { registerId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({ token });

    } catch (error) {
        res.status(500).json({ error: "Login hata" });
    }
};

module.exports = { registerUser, loginUser };
