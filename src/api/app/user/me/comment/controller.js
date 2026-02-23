const { body, validationResult, query } = require("express-validator");
const pool = require("../../../../../config/pg");
const redisClient = require("../../../../../config/redis");
const webpush = require("web-push");
const { UUIDToBase62 } = require("../../../../../lib/utils/base-converter");
const { TrackEvent } = require("../../../../../config/mixpanel");

//configure vapid keys

const ProcessComment = async (req, res) => {
    const is_subscribed = req.subscription.is_subscribed;
    if (!is_subscribed) return res.status(200).json({ok: false});

    //validate comment
    await body("comment").exists().isString().trim().isLength({min: 2, max: 500}).withMessage("Invalid request body").run(req);
    await body("post_id").exists().isString().isUUID().withMessage("Invalid request body").run(req);
    await query("withProfileData").exists().isIn(["true","false"]).withMessage("Invalid request paramseter").run(req);

    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});

    const { comment, post_id } = req.body;
    const { withProfileData } = req.query;
    const user_id = req.user.ID;

    //add comment and icrement post comment counter
    let query_db;
    const qWithoutProfileData =  `
        WITH inserted_comment AS (
            INSERT INTO comments (comment, post_id, user_id) VALUES ($1, $2, $3) RETURNING created_at, comment_id
        ),
        update_post_counter AS (
            UPDATE posts SET total_comment = total_comment + 1 WHERE post_id = $2
        )
        SELECT created_at, comment_id FROM inserted_comment;
    `;
    const qWithProfileData =  `
        WITH inserted_comment AS (
            INSERT INTO comments (comment, post_id, user_id) VALUES ($1, $2, $3) RETURNING created_at, user_id, comment_id
        ),
        update_post_counter AS (
            UPDATE posts SET total_comment = total_comment + 1 WHERE post_id = $2
        )
        SELECT u.school, u.anonymous_name, u.details, i.created_at, i.comment_id FROM users u 
        LEFT JOIN inserted_comment i ON u.user_id = i.user_id
        WHERE u.user_id = $3;
    `;

    query_db = withProfileData === "true" ? qWithProfileData : qWithoutProfileData;

    try {
        const result = await pool.query(query_db, [comment, post_id, user_id]);
        res.status(200).json({ok: true, msg: "success", body: result.rows[0]});


        //handle push notification after response
        try {
            //fetch post owner
            const post_res = await pool.query(`SELECT u.user_id, u.anonymous_name FROM posts p JOIN users u ON u.user_id = p.user_id WHERE p.post_id = $1`, [post_id]);
            const poster_id = post_res.rows[0].user_id;

            //tell mixpanle that someone commented
            TrackEvent('Comment Created', {
                distinct_id: user_id,
                commented_on: post_res.rows[0].anonymous_name,
                time: Date.now(),
            });

            if(poster_id === user_id) return; //if poster posted the comment do nothing

            //handle mention if any
            const mentionMatch = comment.match(/@\S+/);
            if(mentionMatch) HandleMention(mentionMatch[0].slice(1), post_id, user_id, comment, poster_id);

            //check if poster has reached the limit
            if(!(await canSendPush(poster_id))) return;

            //passes everything then get data for push
            const sub_res = await pool.query(`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`, [poster_id]);
            if (sub_res.rows.length === 0) return;

            for (let i = 0; i < Math.min(sub_res.rows.length, 2); i++) {
                const row = sub_res.rows[i];
                try {
                    await webpush.sendNotification(
                        {
                            endpoint: row.endpoint,
                            keys: {
                                p256dh: row.p256dh,
                                auth: row.auth,
                            },
                        },
                        JSON.stringify({
                            title: "New comment on your whisper!",
                            body: `${comment.slice(0, 50)}...open app`,
                            icon: "https://www.wyspar.com/icon.png",
                            url: `https://www.wyspar.com/whisper/school/1/anonymous/hi/${UUIDToBase62(post_id)}`,
                            image: "https://www.wyspar.com/push.png",
                            actions: [{ action: "view", title: "View Comment" }, { action: "reply", title: "Reply" }],
                        }),
                    );
                } catch (err) {
                    console.error("Push error, removing subscription", row.endpoint);
                    return await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [row.endpoint])
                };
            };
        } catch (err) {
            console.log("Error with push notification");
        };
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = ProcessComment;



async function canSendPush(user_id){
    const key = `USER:${user_id}:PUSH_LIMIT`;
    const count = await redisClient.incr(key);

    if (count === 1) {
        //fisrt notificatiion
        await redisClient.expire(key, 24 * 60 * 60);
    };

    return count <= 40;
};


async function HandleMention(anonymous_name, post_id, user_id, comment, poster_id) {
    try {
        const result = await pool.query(
            `SELECT ps.endpoint, ps.p256dh, ps.auth, ps.user_id AS mentionee
            FROM users u
            JOIN comments c ON c.user_id = u.user_id AND c.post_id = $2
            JOIN push_subscriptions ps ON ps.user_id = u.user_id
            WHERE LOWER(u.anonymous_name) = LOWER($1)
                AND u.user_id != $4
                AND u.user_id != $3
                LIMIT 1`
        , [anonymous_name, post_id, user_id, poster_id]);

        if(!result.rows[0]) return;

        const { mentionee, endpoint, p256dh, auth} = result.rows[0];
        //else send notification to mentioned users
        if(!(await canSendPush(mentionee))) return;

        const url = `https://www.wyspar.com/whisper/school/1/anonymous/hi/${UUIDToBase62(post_id)}`
        console.log(url);

        await webpush.sendNotification(
            {
                endpoint: endpoint,
                keys: {
                    p256dh: p256dh,
                    auth: auth,
                },
            },
            JSON.stringify({
                title: "Someone replied your comment!",
                body: `${comment.slice(0,50)}...open app`,
                icon: "https://www.wyspar.com/icon.png",
                url: url,
                actions: [{ action: "view", title: "View" }, { action: "reply", title: "Reply" }],
            }),
        );
    } catch (err) {
        console.log(err);
    };
};