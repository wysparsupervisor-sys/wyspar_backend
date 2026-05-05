const pool = require("../../../../config/pg");

const GetDiscoveredConnects = async (req, res) => {
    try {
        const { school } = req.user;
        const user_id = req.user.ID;
        const is_subscribed = req.subscription.is_subscribed;

        if(!is_subscribed) return res.status(200).json({ok: true, cause:"nosub"});
        
        const query = `
            WITH random_connects AS (
                SELECT connect_id, embedding FROM connects ORDER BY random() LIMIT 3
            )
            SELECT array_agg(top_matches) FROM (
                SELECT (
                    SELECT json_agg(
                        json_build_object(
                            'connect_id', m.connect_id,
                            'purpose', m.purpose,
                            'phone', m.phone,
                            'location', m.location,
                            'extra', m.extra,
                            'created_at', m.created_at,
                            'gender', m.gender,
                            'profile_background', m.profile_background,
                            'connect_description', m.connect_description
                        )
                    )
                    FROM (
                        SELECT c.connect_id, c.purpose, c.phone, c.location, c.extra, c.created_at, u.gender, u.details->'profile_background' AS profile_background, p.connect_description
                        FROM connects c
                        JOIN users u ON u.user_id = c.user_id
                        JOIN personalities p ON p.user_id = c.user_id
                        WHERE u.school = $2
                        AND c.user_id != $1
                        AND c.connect_id != r.connect_id
                        ORDER BY c.embedding <=> r.embedding
                        LIMIT 3
                    ) m
                ) AS top_matches
                FROM random_connects r
            ) subquery
        `;

        const result = await pool.query(query, [user_id, school]);
        res.status(200).json({ok: true, body: result.rows[0].array_agg}); 
        
    } catch (err) {
        console.log(err);
        res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = GetDiscoveredConnects;