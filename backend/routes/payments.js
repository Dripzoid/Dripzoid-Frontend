// routes/payments.js
import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import db from "../db.js";

const router = express.Router();

// --- Encryption helpers ---
// Make sure ENC_KEY is 32 bytes and IV is 16 bytes in production through env vars.
const ENC_KEY = process.env.ENC_KEY || "12345678901234567890123456789012"; // 32 chars
const IV = process.env.IV || "1234567890123456"; // 16 chars

function encrypt(text) {
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENC_KEY), IV);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

function decrypt(text) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENC_KEY), IV);
  let decrypted = decipher.update(text, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// --- Validation helpers ---
function luhnCheck(num) {
  // remove non-digits
  const digits = (num + "").replace(/\D/g, "");
  if (!/^\d+$/.test(digits)) return false;
  const arr = digits.split("").reverse().map(x => parseInt(x, 10));
  const sum = arr.reduce((acc, val, idx) => {
    if (idx % 2) {
      val *= 2;
      if (val > 9) val -= 9;
    }
    return acc + val;
  }, 0);
  return sum % 10 === 0;
}

const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
const upiRegex = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// --- Middleware: Auth ---
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// --- Add payment method ---
router.post("/", auth, (req, res) => {
  const {
    type,
    card_number,
    card_name,
    card_expiry,
    card_cvv, // WILL NOT BE STORED (see note)
    upi_id,
    bank_name,
    account_number,
    ifsc_code,
    nickname,
    holder_name,
    is_default
  } = req.body;

  try {
    let last4 = null,
      masked = null,
      encrypted = null,
      metadata = {};

    if (type === "card") {
      const clean = (card_number || "").replace(/\D/g, "");
      if (!clean || !luhnCheck(clean)) return res.status(400).json({ error: "Invalid card number" });
      if (!expiryRegex.test(card_expiry || "")) return res.status(400).json({ error: "Invalid expiry (MM/YY)" });

      last4 = clean.slice(-4);
      masked = `**** **** **** ${last4}`;
      encrypted = encrypt(clean);

      if (/^4/.test(clean)) metadata.provider = "Visa";
      else if (/^5[1-5]/.test(clean)) metadata.provider = "MasterCard";
      else if (/^3[47]/.test(clean)) metadata.provider = "Amex";
      else metadata.provider = "Unknown";
    } else if (type === "upi") {
      if (!upi_id || !upiRegex.test(upi_id)) return res.status(400).json({ error: "Invalid UPI ID" });
      const normalized = upi_id.trim();
      last4 = normalized.slice(-4);
      masked = `****@${normalized.split("@")[1] || ""}`;
      encrypted = encrypt(normalized);
    } else if (type === "netbanking") {
      if (!ifsc_code || !ifscRegex.test(ifsc_code)) return res.status(400).json({ error: "Invalid IFSC" });
      const cleanAcct = (account_number || "").replace(/\D/g, "");
      if (!cleanAcct || cleanAcct.length < 4) return res.status(400).json({ error: "Invalid account number" });
      last4 = cleanAcct.slice(-4);
      masked = `****${last4}`;
      encrypted = encrypt(cleanAcct);
    } else {
      return res.status(400).json({ error: "Invalid type. Must be 'card', 'upi' or 'netbanking'." });
    }

    // SECURITY NOTE: Do not persist CVV. PCI rules typically forbid storing CVV.
    if (card_cvv) {
      console.warn(`Received CVV for user ${req.user.id} — CVV will NOT be stored.`);
    }

    const params = [
      req.user.id,
      type,
      type === "card" ? encrypted : null, // card_number (encrypted)
      card_name || null, // card_name column
      card_expiry || null,
      null, // card_cvv -> intentionally null
      type === "upi" ? encrypted : null, // upi_id (encrypted)
      bank_name || null,
      type === "netbanking" ? encrypted : null, // account_number (encrypted)
      ifsc_code || null,
      is_default ? 1 : 0,
      nickname || null,
      holder_name || null,
      masked,
      last4,
      0, // verified default 0
      JSON.stringify(metadata || {})
    ];

    db.run(
      `INSERT INTO PaymentMethods
       (user_id, type, card_number, card_name, card_expiry, card_cvv, upi_id, bank_name, account_number, ifsc_code, is_default, nickname, holder_name, masked_number, last4, verified, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params,
      function (err) {
        if (err) {
          console.error("DB insert error:", err);
          return res.status(500).json({ error: "DB error" });
        }

        // If client requested this to be default, ensure only this is default now
        if (is_default) {
          db.run(`UPDATE PaymentMethods SET is_default = 0 WHERE user_id = ? AND id != ?`, [req.user.id, this.lastID], runErr => {
            if (runErr) console.error("Failed clearing old defaults:", runErr);
          });
        }

        res.json({ id: this.lastID, success: true });
      }
    );
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

// --- List methods ---
// IMPORTANT: we do NOT return encrypted card_number / upi_id / account_number.
router.get("/", auth, (req, res) => {
  db.all(
    `SELECT id, type, card_name, masked_number, last4, nickname, holder_name, card_expiry, bank_name, ifsc_code, is_default, verified, metadata, created_at, updated_at
     FROM PaymentMethods WHERE user_id = ?`,
    [req.user.id],
    (err, rows) => {
      if (err) {
        console.error("DB read error:", err);
        return res.status(500).json({ error: "DB error" });
      }
      const out = rows.map(r => ({
        ...r,
        metadata: r.metadata ? JSON.parse(r.metadata) : {}
      }));
      res.json(out);
    }
  );
});

// --- Update method (non-sensitive) ---
router.put("/:id", auth, (req, res) => {
  const { nickname, holder_name, card_expiry, card_name } = req.body;

  db.run(
    `UPDATE PaymentMethods
     SET nickname = ?, holder_name = ?, card_expiry = ?, card_name = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [nickname || null, holder_name || null, card_expiry || null, card_name || null, req.params.id, req.user.id],
    function (err) {
      if (err) {
        console.error("DB update error:", err);
        return res.status(500).json({ error: "DB error" });
      }
      if (this.changes === 0) return res.status(404).json({ error: "Not found or not owned" });
      res.json({ success: true });
    }
  );
});

// --- Delete method ---
router.delete("/:id", auth, (req, res) => {
  db.run(`DELETE FROM PaymentMethods WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id], function (err) {
    if (err) {
      console.error("DB delete error:", err);
      return res.status(500).json({ error: "DB error" });
    }
    if (this.changes === 0) return res.status(404).json({ error: "Not found or not owned" });
    res.json({ success: true });
  });
});

// --- Set default ---
router.patch("/:id/default", auth, (req, res) => {
  db.serialize(() => {
    db.run(`UPDATE PaymentMethods SET is_default = 0 WHERE user_id = ?`, [req.user.id], function (err) {
      if (err) {
        console.error("DB error clearing defaults:", err);
        return res.status(500).json({ error: "DB error" });
      }
      db.run(
        `UPDATE PaymentMethods SET is_default = 1 WHERE id = ? AND user_id = ?`,
        [req.params.id, req.user.id],
        function (err2) {
          if (err2) {
            console.error("DB error setting default:", err2);
            return res.status(500).json({ error: "DB error" });
          }
          if (this.changes === 0) return res.status(404).json({ error: "Not found or not owned" });
          res.json({ success: true });
        }
      );
    });
  });
});

// --- Normalize ---
// We cannot derive last4/masked from encrypted values with SQL. Decrypt rows server-side and update.
router.patch("/normalize", auth, async (req, res) => {
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, type, card_number, account_number, upi_id, masked_number, last4, metadata
         FROM PaymentMethods
         WHERE (card_number IS NOT NULL OR account_number IS NOT NULL OR upi_id IS NOT NULL)
           AND (last4 IS NULL OR masked_number IS NULL)`,
        [],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });

    const promises = rows.map(row =>
      (async () => {
        try {
          let plaintext;
          let last4 = row.last4;
          let masked = row.masked_number;
          let metadata = row.metadata ? JSON.parse(row.metadata) : {};

          if (row.type === "card" && row.card_number) {
            try {
              plaintext = decrypt(row.card_number);
            } catch (e) {
              console.error(`Failed to decrypt card_number for id ${row.id}:`, e);
              return;
            }
            last4 = plaintext.slice(-4);
            masked = `**** **** **** ${last4}`;
            if (!metadata.provider) {
              if (/^4/.test(plaintext)) metadata.provider = "Visa";
              else if (/^5[1-5]/.test(plaintext)) metadata.provider = "MasterCard";
              else if (/^3[47]/.test(plaintext)) metadata.provider = "Amex";
              else metadata.provider = "Unknown";
            }
          } else if (row.type === "netbanking" && row.account_number) {
            try {
              plaintext = decrypt(row.account_number);
            } catch (e) {
              console.error(`Failed to decrypt account_number for id ${row.id}:`, e);
              return;
            }
            last4 = plaintext.slice(-4);
            masked = `****${last4}`;
          } else if (row.type === "upi" && row.upi_id) {
            try {
              plaintext = decrypt(row.upi_id);
            } catch (e) {
              console.error(`Failed to decrypt upi_id for id ${row.id}:`, e);
              return;
            }
            last4 = plaintext.slice(-4);
            masked = `****@${plaintext.split("@")[1] || ""}`;
          } else {
            return;
          }

          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE PaymentMethods SET last4 = ?, masked_number = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [last4, masked, JSON.stringify(metadata), row.id],
              function (err) {
                if (err) return reject(err);
                resolve();
              }
            );
          });
        } catch (e) {
          console.error("Normalize iteration error:", e);
        }
      })()
    );

    await Promise.all(promises);
    res.json({ success: true, processed: rows.length });
  } catch (e) {
    console.error("Normalize failed:", e);
    res.status(500).json({ error: "Normalize failed" });
  }
});

export default router;
