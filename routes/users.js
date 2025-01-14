const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Redis } = require('@upstash/redis');
const router = express.Router();

// Konfigurasi Upstash Redis
const redisUser  = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

// Kunci rahasia untuk JWT
const JWT_SECRET = 'your_jwt_secret';


router.get('/register',async (req, res, next ) =>{
  res.render('register')
})
// Rute untuk mendaftar pengguna baru
router.post('/register', async (req, res, next) => {
  const { username, email, password } = req.body;

  // Validasi input
  if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
  }

  try {
      // Cek jumlah pengguna yang ada
      const allUsers = await redisUser.get('user'); // Ambil semua kunci yang dimulai dengan 'user:'
      
      if (allUsers) {
          return res.status(403).json({ message: 'Only one user is allowed' });
      }

      // Cek apakah pengguna sudah ada berdasarkan username dan email
      const existingUser = await redisUser.get(`user`);

      if (existingUser) {
          return res.redirect('/users/login');
      }

      // Hash password menggunakan bcrypt
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Simpan pengguna baru ke Redis
      const newUser  = { username, email, password: hashedPassword };
      await redisUser.set(`user`, newUser );

      res.status(201).json({ message: 'User  registered successfully' });
  } catch (error) {
      next(error);
  }
});


router.get('/login',async (req, res, next ) =>{
  const user = await redisUser.get('user');
  res.render('login', { userEmail : user.email})
})

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  // Validasi input
  if (!email || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const user = await redisUser .get(`user`);

    if (!user ) {
      return res.redirect('/users/register');
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Buat token JWT
    const token = jwt.sign({ username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '1y' });
    res.cookie('token', token, {
      httpOnly: true, // Hanya dapat diakses oleh server
      secure: true,   // Hanya dikirim melalui HTTPS
      maxAge: 365 * 24 * 60 * 60 * 1000 // 1 tahun
  });
    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    next(error);
  }
});

// Rute untuk mengatur ulang password
router.post('/reset-password', async (req, res, next) => {
 const { email } = req.body
  try {
    // Ambil data pengguna dari Redis
    const user = await redisUser.get('user');
    const websiteUrl = await redisUser.get('website_data');

    if (!user) {
      return res.status(404).json({ message: 'User  not found' });
    }

    // Buat tautan reset password
    const resetToken = Math.random().toString(36).substring(2);
    const resetLink = `${websiteUrl.website.footer.coppyRight}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Simpan token reset password di Redis dengan masa berlaku (misalnya 1 jam)
    redisClient.set(`reset-token:${resetToken}`, 3600, email); // 3600 detik = 1 jam

    // Konfigurasi transporter untuk mengirim email
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Ganti dengan penyedia email Anda
      auth: {
        user: process.env.EMAIL_WEB, // Ganti dengan email Anda
        pass: process.env.EMAIL_PASSWORD , // Ganti dengan password email Anda
      },
    });

    // Template email HTML
    const mailOptions = {
      from: process.env.EMAIL_WEB ,
      to: email,
      subject: 'Reset Password',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p>Hi,</p>
          <p>We received a request to reset your password. Click the link below to reset it:</p>
          <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>If you did not request a password reset, please ignore this email.</p>
          <p>Thank you!</p>
          <p>Best regards,<br>${websiteUrl.website.name}</p>
          <p>The link is only valid for 1 hour.</p>
        </div>
      `,
    };

    // Kirim email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return next(error);
      }
      res.json({ message: 'Reset password link has been sent to your email' });
    });
  } catch (error) {
    next(error);
  }
});

// Rute untuk mengubah password
router.post('/update-password', async (req, res, next) => {
  const { email, newPassword } = req.body;

  // Validasi input
  if (!email || !newPassword) {
    return res.status(400).json({ message: 'Email and new password are required' });
  }

  try {
    const user = await redisUser .getall(`user:${email}`);

    if (!user || !user.email) {
      return res.status(404).json({ message: 'User  not found' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password di Redis
    await redisUser .hset(`user:${email}`, 'password', hashedPassword);

    res.json({ message: 'Password updated successfully ' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;