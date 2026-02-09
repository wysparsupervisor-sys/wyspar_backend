const { body, validationResult } = require("express-validator");
const pool = require("../../../../../../config/pg");
const { default: axios } = require("axios");
const redisClient = require("../../../../../../config/redis");
const MailTransporter = require("../../../../../../config/nodemailer");
const APP_NAME = require("../../../../../../lib/data/app-name");
const { TrackEvent } = require("../../../../../../config/mixpanel");

const VerifyUserSubscription = async (req, res) => {
    await body("reference").exists().isString().run(req);
    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: "Invalid request body!"});

    const user_id = req.user.ID;
    const { reference } = req.body;

    const client = await pool.connect();
    try {
        //verify last_ref and check is_processing to prevent hook from running twice
        const verify_query = await pool.query(`SELECT last_payment_ref, is_processing, expiry FROM subscription WHERE user_id = $1`, [user_id]);
        const { last_payment_ref, is_processing, expiry } = verify_query.rows[0];
        if (last_payment_ref !== reference) return res.status(500).json({ok: false, msg: "Invalid reference"});
        if (!is_processing) return res.status(200).json({ok: true, msg: "Already paid!", expiry});

        //if user passes this step then check paystack if user has paid
        const paystack_verification = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                },
            },
        );

        const verifation_res = paystack_verification.data.data;

        if(verifation_res.status !== "success") return res.status(400).json({ok: false, msg: "Payment not processed YET. Try again!"});
        if(verifation_res.metadata.purpose !== "subscription") return res.status(500).json({ok: false, msg: "Invalid payment type"});

        await client.query("BEGIN")
        //everything went well? then update user subscription
        const db_query = `UPDATE subscription SET expiry = GREATEST(expiry, NOW()) + INTERVAL '30 days', is_processing = FALSE, last_paid_at = NOW() WHERE user_id = $1 RETURNING expiry`;
        const db_result = await client.query(db_query, [user_id]);

        //add redis key
        const next_expiry = db_result.rows[0].expiry.toISOString();
        await redisClient.set(`USER:${user_id}:EXPIRY`, next_expiry, { EX: 60 * 60 * 24 * 5 });

        await client.query("COMMIT");
        res.status(200).json({ok: true, expiry: db_result.rows[0].expiry, msg:"Subscription successful!"});

        TrackEvent('User Subscribed', {
            distinct_id: user_id,
        });
        
        MailTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to: verifation_res.metadata.email, 
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

    } catch (err) {
        await client.query("ROLLBACK");
        console.log(err);
        res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    } finally {
        client.release();
    };
};


module.exports = VerifyUserSubscription;