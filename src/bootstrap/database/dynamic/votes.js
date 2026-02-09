const pool = require("../../../config/pg");

const CreateVotesTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS votes(
            user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
            value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
            PRIMARY KEY (user_id, post_id)
        );
    `;

    try { 
        await pool.query(query);
        console.log("Votes DB configured successfully 📪🥳");
    } catch (err) {
        console.log(err)
    };
};


module.exports = CreateVotesTable;