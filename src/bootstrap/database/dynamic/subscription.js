const pool = require("../../../config/pg");

const CreateSubscriptionTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS subscription (
            user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
            expiry TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '20 days',
            last_payment_ref TEXT,
            last_access_code TEXT,
            is_processing BOOLEAN NOT NULL DEFAULT FALSE,
            processing_started_at TIMESTAMPTZ DEFAULT NOW(),
            last_paid_at TIMESTAMPTZ DEFAULT NOW()
        );
    `;

    try {
        await pool.query(query);
        console.log("Subscription DB configured successfully 📪🥳");
    } catch (err) {
        console.log(err)
    };
};


module.exports = CreateSubscriptionTable;