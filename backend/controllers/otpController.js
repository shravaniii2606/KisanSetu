const twilio = require('twilio');
const { getSupabaseClient } = require('../supabase');

const farmersTable =
  process.env.SUPABASE_FARMERS_TABLE || 'farmer_records';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendOtp(req, res) {
  try {
    const { aadhar } = req.body;

    if (!aadhar) {
      return res.status(400).json({
        error: 'Aadhar is required'
      });
    }

    const supabase = getSupabaseClient();

    const { data: farmer, error } = await supabase
      .from(farmersTable)
      .select('*')
      .eq('aadhar_id', aadhar)
      .single();

    if (error || !farmer) {
      return res.status(404).json({
        error: 'Farmer not found'
      });
    }

    // CHANGE THIS FIELD TO MATCH YOUR TABLE
    const phone = farmer.phone;

    if (!phone) {
      return res.status(400).json({
        error: 'Farmer phone number missing'
      });
    }

    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: `+91${phone}`,
        channel: 'sms'
      });

    return res.status(200).json({
      success: true,
      phone: `******${phone.slice(-4)}`
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}

async function verifyOtp(req, res) {
  try {
    const { aadhar, otp } = req.body;

    if (!aadhar || !otp) {
      return res.status(400).json({
        error: 'Aadhar and OTP required'
      });
    }

    const supabase = getSupabaseClient();

    const { data: farmer, error } = await supabase
      .from(farmersTable)
      .select('*')
      .eq('aadhar_id', aadhar)
      .single();

    if (error || !farmer) {
      return res.status(404).json({
        error: 'Farmer not found'
      });
    }

    const phone = farmer.phone;

    const verificationCheck =
      await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({
          to: `+91${phone}`,
          code: otp
        });

    if (verificationCheck.status === 'approved') {
      return res.status(200).json({
        verified: true
      });
    }

    return res.status(400).json({
      verified: false,
      error: 'Invalid OTP'
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}

module.exports = {
  sendOtp,
  verifyOtp
};