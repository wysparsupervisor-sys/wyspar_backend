const { query, validationResult } = require("express-validator");
const { embed } = require("../../../../config/embedder");
const pool = require("../../../../config/pg");

const ProcessWhisperSearch = async (req, res) => {
    await query("search_query").customSanitizer(value => {
        return value.split("+").join(" ");
    }).isLength({min: 3, max: 70}).run(req);
    await query("lastItemRankProp").optional().isFloat().run(req);
    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: "Invalid query object"});

    const { search_query } = req.query;
    const last_distance =  req.query.lastItemRankProp;

    const db_query = `
        WITH filtered_posts AS (
            SELECT p.post_id,
            (CASE WHEN p.content_tsv @@ plainto_tsquery('english',  $1) THEN 0 ELSE p.embedding <=> $2 END) - ts_rank(p.content_tsv, plainto_tsquery('english', $1)) * 0.01 AS distance
            FROM posts p
            JOIN users u ON u.user_id = p.user_id
            WHERE u.school = $5
            AND (p.content_tsv @@ plainto_tsquery('english', $1) OR p.embedding <=> $2 < 0.6)
        )
        SELECT fp.post_id, p.content, fp.distance, p.post_type, p.post_category, p.post_style, p.images, p.location_status, p.total_upvote, p.total_downvote, p.total_love, p.total_view, p.total_comment, p.metadata, p.created_at, u.anonymous_name, u.details->'avatar' AS avatar, u.school, COALESCE(l.value, 0) AS love_value, COALESCE(v.value, 0) AS vote_value FROM filtered_posts fp
        JOIN posts p ON p.post_id = fp.post_id
        JOIN users u ON u.user_id = p.user_id
        LEFT JOIN loves l ON l.post_id = p.post_id AND l.user_id = $4
        LEFT JOIN votes v ON v.post_id = p.post_id AND v.user_id = $4
        WHERE fp.distance > COALESCE($3, -1e9)
        AND u.deleted = FALSE
        ORDER BY distance ASC LIMIT 10;
    `;

    try {
        const post_vector = await embed(search_query);
        const vector_for_pg = '[' + post_vector.join(",") + ']';

        const result = await pool.query(db_query, [search_query, vector_for_pg, last_distance, req.user.ID, req.user.school]);
        return res.status(200).json({ok: true, body: result.rows});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = ProcessWhisperSearch;
