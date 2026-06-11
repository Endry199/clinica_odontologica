const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    try {
        // 1. Extraer los datos que Netlify capturó del formulario
        const body = JSON.parse(event.body);
        const formName = body.payload.form_name;
        const formData = body.payload.data;

        // Por seguridad, verificamos que sea el formulario correcto
        if (formName !== 'citas-odontologia') {
            return { statusCode: 200, body: 'Formulario ignorado' };
        }

        const { nombre, nacionalidad, cedula, correo, telefono, servicio, fecha } = formData;

        // ==========================================
        // 2. GUARDAR EN SUPABASE (Opcional/Recomendado)
        // ==========================================
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY; // Usa la llave de servicio o anon key
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error: dbError } = await supabase
            .from('citas') // Asegúrate de que tu tabla en Supabase se llame 'citas'
            .insert([{ 
                nombre, 
                cedula: `${nacionalidad}-${cedula}`, 
                correo, 
                telefono, 
                servicio, 
                fecha 
            }]);

        if (dbError) console.error("Error en Supabase:", dbError);

        // ==========================================
        // 3. ENVIAR NOTIFICACIÓN A TELEGRAM
        // ==========================================
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        // Diseñamos el mensaje con formato Markdown
        const mensaje = `🦷 *Nueva Solicitud de Cita UNEFA*\n\n` +
                        `👤 *Paciente:* ${nombre}\n` +
                        `🪪 *Cédula:* ${nacionalidad}-${cedula}\n` +
                        `📧 *Correo:* ${correo}\n` +
                        `📱 *Teléfono:* ${telefono}\n` +
                        `🩺 *Servicio:* ${servicio}\n` +
                        `📅 *Fecha Solicitada:* ${fecha}`;

        const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;

        await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: mensaje,
                parse_mode: 'Markdown'
            })
        });

        // Netlify requiere un retorno de status 200 para saber que todo salió bien
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Proceso completado con éxito" })
        };

    } catch (error) {
        console.error("Error en la función:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Hubo un error al procesar la solicitud" })
        };
    }
};