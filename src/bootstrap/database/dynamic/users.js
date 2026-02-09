const pool = require("../../../config/pg");



//create user table function
const CreateUsersTable =  async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS users(
            user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            password TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            anonymous_name TEXT NOT NULL UNIQUE,
            school TEXT NOT NULL,
            gender INT NOT NULL,
            details JSONB NOT NULL DEFAULT '{"avatar": {}, "profile_background":"", "description": "Hey! 👋 I joined Wyspar 🎭 Its awesome, engaging, and fun!"}'::jsonb,
            stats jsonb NOT NULL DEFAULT '{"views": 0, "posts": 0, "upvotes": 0, "likes": 0}',
            deleted BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT now()
        );
    `;

    //add triagm index
    const query2 = `CREATE INDEX IF NOT EXISTS idx_users_anonymous_name_trgm ON users USING GIN (anonymous_name gin_trgm_ops) WHERE deleted = FALSE;`;
    const query3 = `CREATE INDEX IF NOT EXISTS idx_users_school ON users(school) WHERE deleted = FALSE`;
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        await client.query(query);
        await client.query(query2);
        await client.query(query3);
        await client.query("COMMIT");
        console.log("Users DB table configured successfully! ✅🎉");

    } catch (err) {
        await client.query("ROLLBACK");
        return console.log(err);
        
    } finally {
        client.release();
    };
};




module.exports = CreateUsersTable;