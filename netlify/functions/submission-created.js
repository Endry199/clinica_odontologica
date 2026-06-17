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

        const { tipo_usuario, nombre, nacionalidad, cedula, correo, telefono, servicio, imagenBase64 } = formData;
        const cedulaCompleta = `${nacionalidad}-${cedula}`;

        // ==========================================
        // 1. REGISTRO EN SUPABASE
        // ==========================================
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY; 
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Agrega en tu tabla de Supabase las columnas 'tipo_usuario' si no la tienes
        const { error: dbError } = await supabase
            .from('citas') 
            .insert([{ 
                nombre, 
                cedula: cedulaCompleta, 
                correo, 
                telefono, 
                servicio,
                tipo_usuario
            }]);

        if (dbError) console.error("Error al insertar registro en Supabase:", dbError);

        // ==========================================
        // 2. ENVÍO A TELEGRAM CON FOTO Y BOTÓN INLINE
        // ==========================================
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        const mensaje = `🦷 *Nueva Solicitud de Cita UNEFA*\n\n` +
                        `🎖️ *Categoría:* ${tipo_usuario}\n` +
                        `👤 *Paciente:* ${nombre}\n` +
                        `🪪 *Cédula:* ${cedulaCompleta}\n` +
                        `📧 *Correo:* ${correo}\n` +
                        `📱 *Teléfono:* ${telefono}\n` +
                        `🩺 *Procedimiento:* ${servicio}\n` +
                        `💵 *Estado:* Pago adjunto en revisión.`;

        // URL del despliegue en Netlify para confirmar la cita pasándole la info
        const siteUrl = process.env.URL || 'https://tu-sitio.netlify.app'; 
        const urlConfirmacion = `${siteUrl}/confirmar.html?email=${encodeURIComponent(correo)}&name=${encodeURIComponent(nombre)}&service=${encodeURIComponent(servicio)}`;

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
        let reqBody = {};

        if (imagenBase64) {
            // Si hay captura de pago enviamos como foto
            telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendPhoto`;
            
            // Creamos un Buffer de Node desde la cadena Base64
            const buffer = Buffer.from(imagenBase64, 'base64');
            
            // Telegram permite enviar fotos mediante Multipart o pasando directamente un archivo si usamos form-data,
            // pero la forma más limpia en entornos Serverless puros es enviando la foto mediante FormData o subiendo un Blob.
            // Para evitar dependencias complejas de 'form-data', convertiremos el buffer a InputFile enviándolo de forma nativa:
            
            // Truco óptimo: Usar una URL de datos directa si el archivo no supera el límite de tamaño,
            // o usar multipart. Para asegurar estabilidad usaremos un enfoque JSON enviando la imagen si la API lo permite,
            // o mandando el texto con la foto usando multipart.
        }

        // Para evitar problemas de dependencias pesadas en Netlify con multipart/form-data, 
        // usaremos la vía estructurada: Si pesa muy poco se puede mandar directo, si no, adjuntamos por multipart estándar.
        // Aquí te dejo la solución nativa más robusta para funciones Node-fetch:

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