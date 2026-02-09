const pool = require("../../../config/pg");

const CreateLovesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS loves (
            user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
            value SMALLINT NOT NULL CHECK (value IN (0, 1)),
            PRIMARY KEY (user_id, post_id)
        );
    `;

    try {
        await pool.query(query);
        console.log("Loves DB configured successfully 📪🥳");
    } catch (err) {
        return console.log(err);
    };
};


module.exports = CreateLovesTable;