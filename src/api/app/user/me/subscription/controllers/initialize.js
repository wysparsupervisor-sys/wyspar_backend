const { default: axios } = require("axios");
const pool = require("../../../../../../config/pg");
const { v4: uuidv4 } = require("uuid");
const { FRONTEND_URL } = require("../../../../../../../domain");

const InitializeUserSubscription = async (req, res) => {
    const user_id = req.user.ID;
    const amount = 750 * 100;
    const reference = uuidv4();

    try {
        //check if user is already running a payment session and it's possible user initialized makingwis_processing true. So if user has is processing true and it started 1hour ago and stll not complete it's like;y abandned so allow the start another payment session
        const session_check = await pool.query(`SELECT is_processing, processing_started_at, last_payment_ref, last_access_code FROM subscription WHERE user_id = $1`, [user_id]);
        if (session_check.rows[0].is_processing) {
            const started_at = new Date(session_check.rows[0].processing_started_at);
            const now = new Date();
            const diff_ms = now - started_at;
            const diff_hrs = diff_ms / ( 1000 * 60  * 60 );

            if (diff_hrs < 23) {
                return res.status(200).json({ok: true, reference: session_check.rows[0].last_payment_ref, access_code: session_check.rows[0].last_access_code});
            };
        };
        //first get email from db
        const db_query = `SELECT email FROM users WHERE user_id = $1`;
        const result = await pool.query(db_query, [user_id]);
        const user_email = result.rows[0].email;
        if(!user_email) throw new Error(`Failed to get email from db for user_id ${user_id} during subscription`);

        //initialize paystack transaction
        const paystack_init = await axios.post(
            "https://api.paystack.co/transaction/initialize",
            {
                email: user_email,
                amount: amount,  
                reference: reference,
                callback_url: FRONTEND_URL + "/manage",
                channels: ["bank_transfer", "card"],
                metadata: {
                    user_id: user_id,
                    purpose: "subscription",
                    email: user_email,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    "Content-Type":"application/json",
                },
            },
        );

        //add last reference to payment table
        await pool.query(`UPDATE subscription SET last_payment_ref = $1, is_processing = TRUE, processing_started_at = NOW(), last_access_code = $2 WHERE user_id = $3`, [reference, paystack_init.data.data.access_code, user_id]);

        //respond client
        return res.status(200).json({ok: true, access_code: paystack_init.data.data.access_code, reference: reference});
    } catch (err) {
        console.log(err.response?.data || err.message || err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = InitializeUserSubscription;