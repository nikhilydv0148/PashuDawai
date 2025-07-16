// api/get-prescription.js
// This Vercel Serverless Function retrieves prescription data from Supabase
// using a short ID and handles expiry checks.

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Ensure only GET requests are handled
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const shortId = req.query.id;

    if (!shortId) {
      return res.status(400).json({ error: 'Prescription ID is missing.' });
    }

    // Fetch the prescription data from Supabase
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', shortId)
      .single(); // Use .single() to get a single row or null/error

    if (error) {
      console.error('Supabase fetch error:', error);
      if (error.code === 'PGRST116') { // Specific code for no rows found
        return res.status(404).json({ error: 'Prescription not found.' });
      }
      return res.status(500).json({ error: 'Failed to retrieve prescription data.' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Prescription not found or has been deleted.' });
    }

    const expiresAt = new Date(data.expires_at); // Use data.expires_at from Supabase
    const currentTime = new Date();

    // Check if the prescription has expired
    if (currentTime > expiresAt) {
      // Optionally delete the expired document from Supabase
      // This helps keep your database clean, but is not strictly necessary for functionality
      // as the frontend will already mark it as expired.
      await supabase.from('prescriptions').delete().eq('id', shortId);
      return res.status(404).json({ error: 'Prescription has expired and been deleted.' });
    }

    // Return the prescription data (adjusting keys to match frontend's expectation if needed)
    res.status(200).json({
      id: data.id,
      doctorName: data.doctor_name,
      message: data.message,
      medicines: data.medicines,
      timestamp: data.created_at // Use created_at from Supabase
    });

  } catch (error) {
    console.error('Error in get-prescription.js:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}
