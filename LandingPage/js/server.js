const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

app.use(express.static('.')); // Sirve el frontend (index.html, css, js) directamente

// Configuración del servicio de correo (Gmail)
// NOTA: Para Gmail debes usar una "Contraseña de Aplicación"
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'pablitoisaiasrodriguezcruz@gmail.com',
    pass: process.env.EMAIL_PASS || 'TU_CONTRASEÑA_DE_APLICACION_AQUI'
  }
});

/* ----------------------------------------------------------
 * ENDPOINT DE LA API REST: POST /api/contacto
 * ---------------------------------------------------------- */
app.post('/api/contacto', async (req, res) => {
  const { nombre, email, mensaje } = req.body;

  // Validación de campos vacíos
  if (!nombre || !email || !mensaje) {
    return res.status(400).json({
      ok: false,
      message: 'Todos los campos son obligatorios.'
    });
  }

  // Validación de correo
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      ok: false,
      message: 'Ingresa un correo electrónico válido.'
    });
  }

  try {
    const mailOptions = {
      from: `"${nombre}" <${email}>`,
      to: 'pablitoisaiasrodriguezcruz@gmail.com',
      subject: `[Portafolio] Mensaje de ${nombre}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f2f2f2;">
          <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border-left: 6px solid #5EC8C0;">
            <h2 style="color: #2B2B2B; margin-top: 0;">Nuevo mensaje de contacto</h2>
            <p><strong>Nombre:</strong> ${nombre}</p>
            <p><strong>Correo de contacto:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Mensaje:</strong></p>
            <p style="background: #f9f9f9; padding: 12px; border-radius: 6px; white-space: pre-wrap;">${mensaje}</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      ok: true,
      message: '¡Gracias por tu mensaje! Me pondré en contacto contigo pronto.'
    });

  } catch (error) {
    console.error('Error enviando el correo:', error);
    return res.status(500).json({
      ok: false,
      message: 'No se pudo enviar el mensaje en este momento. Inténtalo más tarde.'
    });
  }
});

app.listen(PORT, () => {
  console.log(` Servidor corriendo en: http://localhost:${PORT}`);
});