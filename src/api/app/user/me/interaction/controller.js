const { body, validationResult } = require("express-validator");
const pool = require("../../../../../config/pg");

const ProcessInteraction = async (req, res) => {
    await body("interactions").isArray({max: 40, min: 1}).withMessage("").run(req);
    await body("interactions.*.post_id").exists().isString().isUUID().withMessage("").run(req);
    await body("interactions.*.interaction_type").exists().isIn(["vote", "love"]).withMessage("").run(req);
    await body("interactions.*.value").isIn([1, -1, 0]).withMessage("").run(req);

    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});
    
    //filter all interactions
    const interactions = req.body.interactions;
    const lovesMap = new Map();
    const votesMap = new Map();
    const filt_votes = interactions.filter(item => item.interaction_type === "vote");
    const filt_loves = interactions.filter(item => item.interaction_type === "love");
    filt_votes.forEach(v => votesMap.set(v.post_id, v));
    filt_loves.forEach(l => lovesMap.set(l.post_id, l));
    const loves = Array.from(lovesMap.values());
    const votes = Array.from(votesMap.values()); 

    try {
        if (votes.length > 0) {
            const post_ids = votes.map(r => r.post_id);
            const values = votes.map(r => r.value);

            const query = `
                WITH old_values AS (
                    SELECT post_id, value FROM votes
                    WHERE user_id = $3
                        AND post_id = ANY($1::uuid[])
                ),
                merged AS (
                    MERGE INTO votes as v
                    USING (
                        SELECT UNNEST($1::uuid[]) AS post_id,
                            UNNEST($2::smallint[]) AS value
                    ) AS batch(post_id, value)
                    ON v.user_id = $3
                    AND v.post_id = batch.post_id
                    WHEN MATCHED AND batch.value = 0 THEN DELETE
                    WHEN MATCHED THEN
                    UPDATE SET value = batch.value
                    WHEN NOT MATCHED AND batch.value != 0 THEN
                    INSERT (user_id, post_id, value) VALUES ($3, batch.post_id, batch.value)
                ),
                post_counter_diff AS (
                    SELECT batch.post_id, COALESCE(old_values.value,0) AS old_value,
                    batch.value as value,
                    posts.user_id as poster_id
                    FROM (
                        SELECT UNNEST($1::uuid[]) AS post_id,
                            UNNEST($2::smallint[]) AS value
                    ) AS batch
                    LEFT JOIN old_values ON batch.post_id = old_values.post_id
                    JOIN posts ON posts.post_id =  batch.post_id
                ),
                posts_update AS (
                    UPDATE posts SET total_upvote = total_upvote + CASE 
                    WHEN old_value = 0 AND value = 1 THEN 1
                    WHEN old_value = -1 AND value = 1 THEN 1
                    WHEN old_value = 1 AND value = 0 THEN -1
                    WHEN old_value = 1 AND value = -1 THEN -1
                    ELSE 0 END,

                    total_downvote = total_downvote + CASE 
                    WHEN old_value = 0 AND value = -1 THEN 1
                    WHEN old_value = 1 AND value = -1 THEN 1
                    WHEN old_value = -1 AND value = 0 THEN -1
                    WHEN old_value = -1 AND value = 1 THEN -1
                    ELSE 0 END

                    FROM post_counter_diff WHERE posts.post_id = post_counter_diff.post_id RETURNING post_counter_diff.poster_id,
                    CASE WHEN old_value = 0 AND value = 1 THEN 1
                    WHEN old_value = -1 AND value = 1 THEN 1
                    WHEN old_value = 1 AND value = 0 THEN -1
                    WHEN old_value = 1 AND value = -1 THEN -1
                    ELSE 0 END AS upvote_delta
                ),
                poster_totals AS (
                    SELECT poster_id, SUM(upvote_delta) AS total_upvote_delta FROM posts_update GROUP BY poster_id
                ),
                poster_update AS (
                    UPDATE users SET stats = jsonb_set(stats,'{upvotes}', to_jsonb((COALESCE(stats->>'upvotes', '0')::int + poster_totals.total_upvote_delta)::int), true)
                    FROM poster_totals WHERE users.user_id = poster_totals.poster_id
                )
                SELECT 1;
            `;

            await pool.query(query, [post_ids, values,  req.user.ID]);
        };

        if (loves.length >  0) {
            const post_ids = loves.map(r => r.post_id);
            const values = loves.map(r => r.value);

            const query = `
                WITH old_values AS (
                    SELECT post_id, value FROM loves
                    WHERE user_id = $3 AND post_id = ANY($1::uuid[])
                ),
                merged AS (
                    MERGE INTO loves USING (
                        SELECT UNNEST($1::uuid[]) AS post_id,
                        UNNEST($2::smallint[]) AS value
                    ) AS batch(post_id, value)
                    ON loves.user_id = $3
                    AND loves.post_id = batch.post_id
                    WHEN MATCHED AND batch.value = 0 THEN DELETE
                    WHEN MATCHED AND batch.value != 0 THEN
                    UPDATE SET value = batch.value
                    WHEN NOT MATCHED AND batch.value != 0 THEN 
                    INSERT (user_id, post_id, value) VALUES ($3, batch.post_id, batch.value)
                ),
                post_counter_diff AS (
                    SELECT batch.post_id, COALESCE(old_values.value, 0) AS old_value, batch.value as new_value, posts.user_id AS poster_id FROM (
                        SELECT UNNEST($1::uuid[]) AS post_id,
                        UNNEST($2::smallint[]) AS value
                    ) AS batch
                    LEFT JOIN old_values ON batch.post_id = old_values.post_id 
                    JOIN posts ON posts.post_id = batch.post_id 
                ),
                posts_update AS (
                    UPDATE posts SET total_love = total_love + CASE
                    WHEN old_value = 0 AND new_value = 1 THEN 1
                    WHEN old_value = 1 AND new_value = 0 THEN -1
                    ELSE 0 END
                    FROM post_counter_diff WHERE posts.post_id = post_counter_diff.post_id RETURNING post_counter_diff.poster_id,
                    CASE WHEN old_value = 0 AND new_value = 1 THEN 1
                    WHEN old_value = 1 AND new_value = 0 THEN -1
                    ELSE 0
                    END AS delta
                ),
                poster_deltas AS (
                    SELECT poster_id, SUM(delta) AS total_delta FROM posts_update GROUP BY poster_id
                ),
                poster_update AS (
                    UPDATE users SET stats = jsonb_set(stats,'{likes}', to_jsonb((COALESCE(stats->>'likes', '0')::bigint + poster_deltas.total_delta)::bigint), true)
                    FROM poster_deltas WHERE users.user_id = poster_deltas.poster_id
                )
                SELECT 1;
            `;
            //still crazy  that i called loves interaction likes in users table

            await pool.query(query, [post_ids, values, req.user.ID]);
        };

        //everything went  well
        return res.status(200).json({ok: true, msg: "success"});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = ProcessInteraction;