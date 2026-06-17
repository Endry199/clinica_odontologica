const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    try {
        const body = JSON.parse(event.body);
        const formName = body.payload.form_name;
        const formData = body.payload.data;

        if (formName !== 'citas-odontologia') {
            return { statusCode: 200, body: 'Formulario de origen no admitido' };
        }

        // Se extraen los campos enviados por el formulario del paciente
        const { tipo_usuario, nombre, nacionalidad, cedula, correo, telefono, servicio, imagenBase64, doctor } = formData;
        const cedulaCompleta = `${nacionalidad}-${cedula}`;

        // Si el formulario principal no incluye selector de doctor, se inicializa como 'Por asignar'
        const doctorAsignado = doctor || 'Por asignar';

        // ==========================================
        // 1. REGISTRO EN SUPABASE
        // ==========================================
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY; 
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Se insertan los datos incluyendo la nueva columna 'doctor'
        const { error: dbError } = await supabase
            .from('citas') 
            .insert([{ 
                nombre, 
                cedula: cedulaCompleta, 
                correo, 
                telefono, 
                servicio,
                tipo_usuario,
                doctor: doctorAsignado
            }]);

        if (dbError) console.error("Error al insertar registro en Supabase:", dbError);

        // ==========================================
        // 2. ENVÍO A TELEGRAM CON FOTO Y BOTÓN INLINE
        // ==========================================
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        // Se incluye la línea del especialista asignado/pendiente en el texto de Telegram
        const mensaje = `🦷 *Nueva Solicitud de Cita UNEFA*\n\n` +
                        `🎖️ *Categoría:* ${tipo_usuario}\n` +
                        `👤 *Paciente:* ${nombre}\n` +
                        `🪪 *Cédula:* ${cedulaCompleta}\n` +
                        `📧 *Correo:* ${correo}\n` +
                        `📱 *Teléfono:* ${telefono}\n` +
                        `🩺 *Procedimiento:* ${servicio}\n` +
                        `👨‍⚕️ *Especialista:* ${doctorAsignado}\n` +
                        `💵 *Estado:* Pago adjunto en revisión.`;

        // URL del despliegue en Netlify pasando todas las variables necesarias por URL, incluyendo &doctor=
        const siteUrl = process.env.URL || 'https://tu-sitio.netlify.app'; 
        const urlConfirmacion = `${siteUrl}/confirmar.html?email=${encodeURIComponent(correo)}&name=${encodeURIComponent(nombre)}&service=${encodeURIComponent(servicio)}&doctor=${encodeURIComponent(doctorAsignado)}`;

        // Definimos el Inline Keyboard con el botón interactivo
        const inlineKeyboard = {
            inline_keyboard: [
                [
                    {
                        text: "✅ Confirmar Pago y Asignar Cita",
                        url: urlConfirmacion
                    }
                ]
            ]
        };

        let telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;

        const FormData = require('form-data');
        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('parse_mode', 'Markdown');
        form.append('reply_markup', JSON.stringify(inlineKeyboard));

        if (imagenBase64) {
            telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendPhoto`;
            const imageBuffer = Buffer.from(imagenBase64, 'base64');
            form.append('photo', imageBuffer, { filename: 'pago.jpg' });
            form.append('caption', mensaje);
        } else {
            form.append('text', mensaje);
        }

        await fetch(telegramUrl, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Transacción y notificaciones enviadas correctamente" })
        };

    } catch (error) {
        console.error("Error crítico ejecutando la función:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Ocurrió un desperfecto al guardar la orden" })
        };
    }
};