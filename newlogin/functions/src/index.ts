import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import twilio from "twilio";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Get Twilio credentials from Firebase environment configuration
const accountSid = functions.config().twilio.account_sid;
const authToken = functions.config().twilio.auth_token;
const serviceSid = functions.config().twilio.service_sid;

// Initialize Twilio client
const twilioClient = twilio(accountSid, authToken);

/**
 * Sends an OTP to the user's phone number using Twilio Verify.
 */
export const sendOtp = functions.https.onCall(async (data, context) => {
  const { phoneNumber } = data as unknown as { phoneNumber: string };

  if (!phoneNumber) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      'The function must be called with one argument "phoneNumber".'
    );
  }

  try {
    const verification = await twilioClient.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phoneNumber, channel: "sms" });

    return { success: true, status: verification.status };
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Could not send OTP.",
      error
    );
  }
});

/**
 * Verifies the OTP provided by the user and creates a custom Firebase token.
 */
export const verifyOtp = functions.https.onCall(async (data, context) => {
  const { phoneNumber, code } = data as unknown as { phoneNumber: string; code: string };

  if (!phoneNumber || !code) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      'The function must be called with "phoneNumber" and "code" arguments.'
    );
  }

  try {
    const verificationCheck = await twilioClient.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phoneNumber, code });

    if (verificationCheck.status === "approved") {
      // The OTP is correct. Get or create a user in Firebase Authentication.
      const user = await admin.auth().getUserByPhoneNumber(phoneNumber).catch(async (error) => {
        if (error.code === 'auth/user-not-found') {
          return admin.auth().createUser({ phoneNumber });
        }
        throw error;
      });

      // Generate a custom token for the user to sign in on the client.
      const customToken = await admin.auth().createCustomToken(user.uid);
      return { success: true, token: customToken };
    } else {
      return { success: false, message: "Invalid OTP." };
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Could not verify OTP.",
      error
    );
  }
});
