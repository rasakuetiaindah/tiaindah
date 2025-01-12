const jwt = require('jsonwebtoken');
const { Redis } = require('@upstash/redis');
const SECRET_KEY = 'your_jwt_secret';

const userRedis = new Redis({
    url: process.env.REDIS_URL,
    token: process.env.REDIS_TOKEN,
});

const authUser = async (req, res, next) => {
   
    const token = req.cookies.token
    const userData = await userRedis.get('user') // Ambil username dari body atau query jika diperlukan

    if (!userData) {
        return res.redirect('/users/register'); // Ganti '/register' dengan path yang sesuai
    }

    if (!token) {
        return res.redirect('/users/login'); // Ganti '/login' dengan path yang sesuai
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.redirect('/users/login'); // Ganti '/login' dengan path yang sesuai
        }
        req.user = user;
        console.log(req.user)
        next();
    });
};

module.exports = {
    authUser
};