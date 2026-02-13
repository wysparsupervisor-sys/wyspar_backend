const pool = require("../../../config/pg");

const CreatePushSubscriptionTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
            endpoint TEXT NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            PRIMARY KEY(user_id, endpoint)
        );
    `;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(query);
        await client.query("COMMIT")
        console.log("Push Subscriptions DB configured successfully 📪🥳");
    } catch (err) {
        await client.query("ROLLBACK")
        return console.log(err);
    } finally {
        client.release();
    }
};


module.exports = CreatePushSubscriptionTable;