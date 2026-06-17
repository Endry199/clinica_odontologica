const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método no permitido' };
    }

    try {
        const { email, name, service, fecha, hora } = JSON.parse(event.body);

        if (!email || !name || !fecha || !hora) {
            return { statusCode: 400, body: 'Faltan parámetros requeridos.' };
        }

        // Configuración del servidor de correo saliente
        // Recuerda configurar estas variables de entorno en el panel de Netlify
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Puedes usar Gmail, Outlook, Yahoo o SMTP personalizado
            auth: {
                user: process.env.EMAIL_USER,     // Tu correo institucional o personal
                pass: process.env.EMAIL_PASSWORD  // Tu contraseña de aplicación (No la normal)
            }
        });

        // Diseño del Correo con Estilo Profesional
        const mailOptions = {
            from: `"Servicio Odontológico UNEFA" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '✅ Confirmación de tu Cita Odontológica - UNEFA',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                    <div style="text-align: center; border-bottom: 2px solid #0077b6; padding-bottom: 15px;">
                        <h2 style="color: #03045e; margin: 0;">Servicio Odontológico UNEFA</h2>
                        <p style="color: #00b4d8; font-size: 14px; margin: 5px 0 0 0;">¡Tu salud bucal es nuestra prioridad!</p>
                    </div>
                    
                    <div style="padding: 20px 0;">
                        <p style="font-size: 16px; color: #2b2d42;">Hola, <strong>${name}</strong>.</p>
                        <p style="font-size: 15px; color: #6c757d; line-height: 1.5;">Nos complace informarte que tu pago ha sido validado correctamente por nuestro equipo de administración. Tu cita ha sido agendada formalmente en nuestro cronograma clínico.</p>
                        
                        <div style="background-color: #f4f9fc; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #0077b6;">
                            <h3 style="margin-top: 0; color: #03045e; font-size: 16px;">Detalles de la Cita:</h3>
                            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #2b2d42;">
                                <tr>
                                    <td style="padding: 5px 0; font-weight: 600; width: 120px;">Procedimiento:</td>
                                    <td style="padding: 5px 0;">${service}</td>
                                }
                                <tr>
                                    <td style="padding: 5px 0; font-weight: 600;">Fecha Asignada:</td>
                                    <td style="padding: 5px 0; color: #0077b6; font-weight: 600;">${fecha}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0; font-weight: 600;">Bloque Horario:</td>
                                    <td style="padding: 5px 0;">${hora}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <p style="font-size: 13px; color: #e63946; font-style: italic;">* Nota importante: Se solicita puntual asistencia, portar tu cédula de identidad y cumplir estrictamente con las normas de bioseguridad en el consultorio.</p>
                    </div>
                    
                    <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #a0aec0;">
                        <p>📍 Servicio Odontológico UNEFA - Núcleo Miranda, Sede Los Teques</p>
                        <p>Por favor no respondas a este correo automatizado.</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Notificación enviada" })
        };

    } catch (error) {
        console.error("Error enviando email:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "No se pudo despachar el correo electrónico" })
        };
    }
};