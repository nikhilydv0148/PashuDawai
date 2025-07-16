// api/shorten.js
// This Vercel Serverless Function creates a short ID, stores prescription data in Supabase,
// and returns the short URL for the frontend.

const { createClient } = require('@supabase/supabase-js');
const { nanoid } = require('nanoid'); // Used for generating short, unique IDs

// Initialize Supabase client
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY should be set as environment variables in Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  // Ensure only POST requests are handled
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { prescriptionData } = req.body;

    // Validate incoming data
    if (!prescriptionData || !prescriptionData.medicines || prescriptionData.medicines.length === 0) {
      return res.status(400).json({ error: 'Invalid prescription data provided.' });
    }

    // Generate a short, unique ID for the prescription
    const shortId = nanoid(7); // Generates a 7-character ID (e.g., "fj39f2a")

    // Calculate expiry time (10 days from now)
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + (10 * 24 * 60 * 60 * 1000)); // 10 days in milliseconds

    // Prepare data for Supabase insertion
    const dataToInsert = {
      id: shortId,
      doctor_name: prescriptionData.doctorName || null,
      farmer_phone: prescriptionData.farmerPhone || null, // Storing for record, but not exposed publicly
      message: prescriptionData.message || null,
      medicines: prescriptionData.medicines, // JSONB column will store this array
      created_at: createdAt.toISOString(),
      expires_at: expiresAt.toISOString()
    };

    // Insert data into the 'prescriptions' table
    const { data, error } = await supabase
      .from('prescriptions')
      .insert([dataToInsert]);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to store prescription data.' });
    }

    // Construct the full short URL to be returned to the frontend
    // This URL will point to your Vercel frontend, which then calls get-prescription.js
    const vercelAppUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const shortUrl = `${vercelAppUrl}/prescription.html?id=${shortId}`;

    res.status(200).json({ shortUrl });

  } catch (error) {
    console.error('Error in shorten.js:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};
