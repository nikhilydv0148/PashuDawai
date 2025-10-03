// api/generate-pdf.js
// Generates a PDF prescription using jsPDF library
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
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
    const { prescriptionId } = req.body;

    if (!prescriptionId) {
      return res.status(400).json({ error: 'Prescription ID is required' });
    }

    // Fetch prescription data
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', prescriptionId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Generate PDF data URL (base64) that can be used on frontend
    const pdfData = {
      doctorName: data.doctor_name || 'Veterinarian',
      farmerPhone: data.farmer_phone,
      message: data.message || 'Please follow the prescription carefully.',
      medicines: data.medicines,
      timestamp: new Date(data.created_at).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };

    res.status(200).json({ 
      success: true, 
      pdfData,
      prescriptionId 
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}