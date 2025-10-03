// api/shorten.js
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prescriptionData } = req.body;

    if (!prescriptionData || !prescriptionData.medicines || prescriptionData.medicines.length === 0) {
      return res.status(400).json({ error: 'Invalid prescription data provided.' });
    }

    const shortId = nanoid(7);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + (10 * 24 * 60 * 60 * 1000));

    const dataToInsert = {
      id: shortId,
      doctor_name: prescriptionData.doctorName || null,
      farmer_phone: prescriptionData.farmerPhone || null,
      message: prescriptionData.message || null,
      medicines: prescriptionData.medicines,
      created_at: createdAt.toISOString(),
      expires_at: expiresAt.toISOString()
    };

    const { error } = await supabase
      .from('prescriptions')
      .insert([dataToInsert]);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to store prescription data.' });
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const shortUrl = `${protocol}://${host}/prescription.html?id=${shortId}`;

    res.status(200).json({ shortUrl, prescriptionId: shortId });

  } catch (error) {
    console.error('Error in shorten.js:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}