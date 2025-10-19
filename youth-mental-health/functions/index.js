/**
 * Firebase Functions:
 * - sendMail: Sends admin-only emails via SendGrid
 * - chat: Gemini AI endpoint using Google GenAI
 *
 * Environment variables (functions/.env):
 *   SENDGRID_KEY=SG.xxxxxxx_your_key
 *   FROM_EMAIL=no-reply@yourdomain.test
 *   FROM_NAME=Youth Mental Hub
 *   GEMINI_API_KEY=gsk_your_gemini_key_here
 */

const functions = require("firebase-functions");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const sgMail = require("@sendgrid/mail");
const {GoogleGenerativeAI} = require("@google/genai");

// --------------------------------------------------------
// INITIAL SETUP
// --------------------------------------------------------
functions.setGlobalOptions({maxInstances: 10});
admin.initializeApp();

const app = express();
app.use(cors({origin: true}));
app.use(express.json());

// --------------------------------------------------------
// ENVIRONMENT CONFIG
// --------------------------------------------------------
const SENDGRID_KEY = process.env.SENDGRID_KEY;

const FROM_EMAIL = process.env.FROM_EMAIL || "no-reply@yourdomain.test";
const FROM_NAME = process.env.FROM_NAME || "Youth Mental Hub";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SENDGRID_KEY) {
  logger.warn("⚠️ Missing SENDGRID_KEY (email may fail)");
}
if (!GEMINI_API_KEY) {
  logger.warn("⚠️ Missing GEMINI_API_KEY (Gemini may fail)");
}

if (SENDGRID_KEY) {
  sgMail.setApiKey(SENDGRID_KEY);
}
const ai = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// --------------------------------------------------------
// SENDGRID EMAIL FUNCTION
// --------------------------------------------------------
exports.sendMail = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      const authHeader = req.headers.authorization || "";
      const match = authHeader.match(/^Bearer (.+)$/);
      if (!match) {
        return res.status(401).json({error: "Missing token"});
      }

      const decoded = await admin.auth().verifyIdToken(match[1]);
      const uid = decoded.uid;

      const userDoc = await admin.firestore().doc("users/" + uid).get();
      const role = userDoc.exists ? userDoc.data().role : "user";
      if (role !== "admin") {
        return res.status(403).json({error: "Not authorized"});
      }

      const body = req.body || {};
      const to = body.to;
      const subject = body.subject;
      const text = body.text;
      const html = body.html;
      const attachments = body.attachments;

      if (!to || !subject || (!text && !html)) {
        return res.status(400).json({error: "Missing to/subject/body"});
      }

      const msg = {
        to: Array.isArray(to) ? to : [to],
        from: {email: FROM_EMAIL, name: FROM_NAME},
        subject: subject,
        text: text,
        html: html,
      };

      if (Array.isArray(attachments) && attachments.length > 0) {
        msg.attachments = attachments.map((a) => {
          return {
            filename: a.filename,
            type: a.type || "application/octet-stream",
            content: a.content,
            disposition: "attachment",
          };
        });
      }

      await sgMail.send(msg);
      logger.info("✅ Email sent", {to: to, subject: subject, by: uid});
      return res.json({ok: true});
    } catch (e) {
      logger.error("❌ sendMail failed", e);
      return res.status(500).json({error: e.message});
    }
  });
});

// --------------------------------------------------------
// GEMINI CHAT FUNCTION (no optional chaining, clean spacing)
// --------------------------------------------------------
exports.chat = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      if (!ai) {
        return res.status(500).json({error: "Gemini not configured"});
      }

      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      const body = req.body || {};
      const prompt = body.prompt;
      if (!prompt) {
        return res.status(400).json({error: "Missing prompt"});
      }

      // Simple, stable call: pass a string prompt
      const model = ai.getGenerativeModel({model: "gemini-2.0-flash"});
      const result = await model.generateContent(prompt);

      // Safe extraction without optional chaining
      let text = "No response";
      // eslint-disable-next-line max-len
      if (result && result.response && typeof result.response.text === "function") {
        text = result.response.text();
      }

      return res.json({text: text});
    } catch (e) {
      logger.error("[Gemini API Error]", e);
      return res.status(500).json({error: e.message});
    }
  });
});
