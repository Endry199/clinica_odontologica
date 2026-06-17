const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Método no permitido' };
    }

    try {
        const { doctor, fecha } = event.queryStringParameters;

        if (!doctor || !fecha) {
            return { statusCode: 400, body: 'Faltan parámetros requeridos (doctor y fecha).' };
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY; 
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Consultamos las citas que ya existen para ese doctor en ese día y que no estén canceladas
        const { data: citasExistentes, error } = await supabase
            .from('citas')
            .select('hora_cita')
            .eq('doctor', doctor)
            .eq('fecha_cita', fecha)
            .neq('estado', 'cancelado');

        if (error) throw error;

        // Mapeamos solo el array de horas ocupadas (ej: ['08:00:00', '10:00:00'])
        const horasOcupadas = citasExistentes.map(c => c.hora_cita);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ horasOcupadas })
        };

    } catch (error) {
        console.error("Error al verificar disponibilidad:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};