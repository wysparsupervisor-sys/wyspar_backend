const pool = require("../../../config/pg");

const CreateFeedbackTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS feedbacks (
            feedback_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            feedback TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `;

    try {
        await pool.query(query);
        console.log("Feedbacks DB configured successfully 📪🥳");
    } catch (err) {
        return console.log(err);
    };
};


module.exports = CreateFeedbackTable;