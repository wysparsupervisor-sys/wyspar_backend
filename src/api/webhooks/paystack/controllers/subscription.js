const express = require("express");
const crypto = require("crypto");
const pool = require("../../../../config/pg");
const redisClient = require("../../../../config/redis");
const MailTransporter = require("../../../../config/nodemailer");
const APP_NAME = require("../../../../lib/data/app-name");
const { TrackEvent } = require("../../../../config/mixpanel");
const router = express.Router();

router.post("/subscription", express.raw({ type:"application/json" }), async (req, res) => {
    const client = await pool.connect();
    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
       
        //compute signature
        const hash = crypto.createHmac("sha512", secret)
                          .update(req.body)
                          .digest("hex");
        
        if (hash !== req.headers["x-paystack-signature"]) return res.status(401).send("Invalid signature");

        const event = JSON.parse(res.body.toString());
        if (event.event === "charge.success") {
            const { metadata, reference } = event.data;

            //verify last_ref and check is_processing to prevent hook from running twice
            const verify_query = await pool.query(`SELECT last_payment_ref, is_processing FROM subscription WHERE user_id = $1`, [metadata.user_id]);
            const { last_payment_ref, is_processing } = verify_query.rows[0];
            if (last_payment_ref !== reference) return res.sendStatus(500);
            if (!is_processing) return res.sendStatus(200);

            if (metadata.purpose === "subscription") {
                await client.query("BEGIN");
                const db_query = `UPDATE subscription SET expiry = GREATEST(expiry, NOW()) + INTERVAL '30 days', is_processing = FALSE, last_paid_at = NOW() WHERE user_id = $1 RETURNING expiry`;
                const db_response = await client.query(db_query, [metadata.user_id]);

                //add redis key
                const next_expiry = db_response.rows[0].expiry.toISOString();
                await redisClient.set(`USER:${metadata.user_id}:EXPIRY`, next_expiry, { EX: 60 * 60 * 24 * 5 });

                await client.query("COMMIT");
                res.sendStatus(200);

                TrackEvent('User Subscribed', {
                    distinct_id: metadata.user_id,
                });

                //send coonfirmation mail to user finally
                MailTransporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: metadata.email, 
                    subject: `Thank you for subscribing!`,
                    html: `
                        <div style="border: 3px solid #5a0019ff; background-color: black; color: white; padding: 1rem; border-radius: 2rem;">                    
                            <h1 style="color: #0a6464ff;">${APP_NAME} Confirmed Your Subscription 🎉🎭</h1><br>
                            <p style="line-height: 1.6;">Hello 👋 <b style="color: white;">Thank you for supporting the growth of the Wyspar community, because of users like you we can continue to sustain and make this platform a great place for everyone and rich campus interactions!</p><br>
                            <p style="line-height: 1.6;">You now have more time and unlimited access to every feature. Keep letting people hear your voice and remember <b>Speak Freely, Stay Anonymous.</b></p><br>
                            <p>Thank you from Wyspar</p>
                        </div>
                    `
                });
            } else {
                return res.sendStatus(500);
            };
        } else {
            return res.sendStatus(500);
        };
        
    } catch (err) {
        await client.query("ROLLBACK")
        console.log(err);
        res.sendStatus(500);
    } finally {
        client.release();
    };
});


module.exports = router;