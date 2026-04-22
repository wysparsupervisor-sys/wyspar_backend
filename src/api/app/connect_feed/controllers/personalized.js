const pool = require("../../../../config/pg");

const GetConnectFeed = async (req, res) => {
    const user_id = req.user.ID;
    const school = req.user.school;

    try {
    
        const query = `
            WITH connect_personality AS (
                SELECT connect_personality FROM personalities WHERE user_id = $1
            ),
            top_matches AS (
                SELECT c.connect_id, c.purpose, c.phone, c.location, c.extra, c.created_at, u.gender, u.details->'profile_background' AS profile_background, p.connect_description
                FROM connects c
                CROSS JOIN connect_personality cp
                JOIN personalities p ON p.user_id = c.user_id
                JOIN users u ON u.user_id = c.user_id
                WHERE u.school = $2 
                AND c.user_id != $1
                ORDER BY (cp.connect_personality <#> c.normalized_interest_sparse_vector) * -1 DESC
                LIMIT 100
            )
            SELECT * FROM top_matches ORDER BY RANDOM() LIMIT 10;
        `;

        const result = await pool.query(query, [user_id, school]);
        res.status(200).json({ok: true, body: result.rows}); 

    } catch (err) {
        console.log(err);
        res.status(400).json({ok: false, msg: "Something went wrong. Try again!"})
    };
};


module.exports = GetConnectFeed;