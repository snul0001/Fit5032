/**
 * Firebase Functions: SendGrid email via HTTPS endpoint (admin-only)
 * Runtime config via dotenv: put keys in functions/.env (not committed)
 *
 * functions/.env
 *   SENDGRID_KEY=SG.xxxxx_your_real_key
 *   FROM_EMAIL=no-reply@yourdomain.test
 *   FROM_NAME=Youth Mental Health
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
const sgMail = require("@sendgrid/mail");

// Limit cold-boot concurrency a bit (optional)
setGlobalOptions({maxInstances: 10});

// Init Admin SDK
admin.initializeApp();

// Read secrets from dotenv env (Firebase automatically loads functions/.env)
const SENDGRID_KEY = process.env.SENDGRID_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "no-reply@yourdomain.test";
const FROM_NAME = process.env.FROM_NAME || "Youth Mental Health";

if (!SENDGRID_KEY) {
  logger.error("Missing SENDGRID_KEY env var. Set it in functions/.env");
}
sgMail.setApiKey(SENDGRID_KEY);

/**
 * POST /sendMail
 * Body: {
 *   to: string | string[],
 *   subject: string,
 *   text?: string,
 *   html?: string,
 *   attachments?: [{ filename, type?, content(base64) }]
 * }
 * Auth: Bearer <Firebase ID token> (must be admin)
 */
exports.sendMail = onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      // 1) Verify Firebase ID token
      const authHeader = req.headers.authorization || "";
      const m = authHeader.match(/^Bearer (.+)$/);
      if (!m) return res.status(401).json({error: "Missing token"});

      const decoded = await admin.auth().verifyIdToken(m[1]);
      const uid = decoded.uid;

      // 2) Check admin role in Firestore: users/{uid}.role === 'admin'
      const udoc = await admin.firestore().doc(`users/${uid}`).get();
      const role = udoc.exists ? udoc.data().role : "user";
      if (role !== "admin") {
        return res.status(403).json({error: "Not authorized"});
      }

      // 3) Validate payload
      const {to, subject, text, html, attachments} = req.body || {};
      if (!to || !subject || (!text && !html)) {
        return res
            .status(400)
            .json({error: "Missing to/subject/body (text or html required)"});
      }

      const toList = Array.isArray(to) ? to : [to];

      // 4) Build SendGrid message
      const msg = {
        to: toList,
        from: {email: FROM_EMAIL, name: FROM_NAME},
        subject,
        text: text || undefined,
        html: html || undefined,
      };

      if (Array.isArray(attachments) && attachments.length) {
        msg.attachments = attachments.map((a) => ({
          filename: a.filename,
          type: a.type || "application/octet-stream",
          content: a.content, // base64 string
          disposition: "attachment",
        }));
      }

      // 5) Send
      await sgMail.send(msg);
      logger.info("Email sent", {to: toList, subject, by: uid});
      return res.json({ok: true});
    } catch (e) {
      logger.error("sendMail failed", e);
      return res.status(500).json({error: e.message || "Send failed"});
    }
  });
});
