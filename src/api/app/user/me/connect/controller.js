const { body, validationResult } = require("express-validator");
const { embed } = require("../../../../../config/embedder");
const pool = require("../../../../../config/pg");
const { TrackEvent } = require("../../../../../config/mixpanel");


const ProcessConnect = async (req, res) => {
    await body("purpose").exists().isString().isLength({max: 60, min: 5}).run(req);
    await body("phone").exists().isString().matches(/^0[0-9]{10}$/).run(req);
    await body("location").optional().isString().isLength({max: 30}).run(req);
    await body("extra").optional().isString().isLength({max: 200}).run(req);
    await body("description").exists().isString().isLength({max: 40, min: 3}).run(req);

    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: errors.array({ onlyFirstError: true })[0].msg});

    try { 
        //check if user is subdcribed
        const is_subscribed = req.subscription.is_subscribed;
        if (!is_subscribed) return res.status(200).json({ok: false, cause:"notsub"});

        const user_id = req.user.ID;
        const school = req.user.school;
        let { purpose, phone, location, extra, description } = req.body;
        phone = "234" + phone.slice(1);
        const connect_purpose_embedding = await embed(purpose);
        const bg_suitable_vector_input = '['+ connect_purpose_embedding.join(',') + ']';

        //use embedding to find 3 top best centroids in DB and from that get user matches
        const { rows: top3 } = await pool.query(`
            SELECT centroid_id, 1 - (centroid_vector <=>  $1) AS score FROM centroids WHERE (1 - (centroid_vector <=> $1)) > 0  ORDER BY centroid_vector <=> $1 LIMIT 3
        `, [bg_suitable_vector_input]);  

        //contruct a 50 dimensional sparse vector and get net freq
        const connect_interest_sparse_vector = new Array(50).fill(0);
        let connect_interest_net_freq = 0;
        top3.forEach(obj => {
            connect_interest_sparse_vector[obj.centroid_id] = obj.score;
        });
        top3.forEach(obj => {
            connect_interest_net_freq += obj.score;
        });

        //create a normalized sum sparse vector
        const normalized_connect_interest_sparse_vector = connect_interest_sparse_vector.map(v => v / (connect_interest_net_freq || 1));
        const bg_suitable_normalized_connect_interest_sparse_vector = '[' + normalized_connect_interest_sparse_vector.join(",") + ']';
 
        //send connect to DB and respond with 200 to user
        const insert_res = await pool.query(
            `
                WITH update_persona AS (
                    UPDATE personalities SET connect_description = $8 WHERE user_id = $7
                )
                INSERT INTO connects (purpose, phone, location, extra, embedding, normalized_interest_sparse_vector, user_id) SELECT $1, $2, $3, $4, $5, $6, $7 WHERE (SELECT COUNT(*) FROM connects WHERE user_id = $7) < 20 RETURNING connect_id, created_at, purpose, phone, location, extra
            `
            ,[purpose, phone, location, extra, bg_suitable_vector_input, bg_suitable_normalized_connect_interest_sparse_vector, user_id, description]
        );
        if (insert_res.rowCount === 0){ return res.status(200).json({ok: false, cause:"limit"}); };
        res.status(200).json({ok: true, msg: "success", returned: insert_res.rows[0]});

        //register event in mixpanel
        TrackEvent('Connect Created', {
            distinct_id: user_id,
            purpose,
            time: Date.now(),
        });


        //get user personality vector and net connect frequency
        const user = (await pool.query(`
            SELECT connect_personality, net_connect_frequency FROM personalities WHERE user_id = $1
        `, [user_id])).rows[0];
 
        //name stuff & multply user persona_vector by net_connect_freq
        const current_net_connect_freq = user.net_connect_frequency;
        const current_connect_personality_vector = JSON.parse(user.connect_personality);
        const current_connect_personality_vector_scaled = current_connect_personality_vector.map(x =>  x * current_net_connect_freq);

        //calculate new net_freq and new_scaled peronality vector
        const new_net_connect_freq = current_net_connect_freq + connect_interest_net_freq;
        const new_connect_personality_vector_scaled = connect_interest_sparse_vector.map((v, i) => v + current_connect_personality_vector_scaled[i]);

        //normalize sum of new scaled personality vector
        const new_connect_personality_vector = new_connect_personality_vector_scaled.map(v => v / new_net_connect_freq);
        const db_suitable_new_connect_personality_vector_input = '[' + new_connect_personality_vector.join(",") + ']';

        //save new personality vector to DB and new_freq
        await pool.query(
            `UPDATE personalities SET net_connect_frequency = $1, connect_personality = $2 WHERE user_id = $3`,
            [new_net_connect_freq, db_suitable_new_connect_personality_vector_input, user_id]
        );
 
        return
        //fetch top 20 users having the best match
        const result = await pool.query(
            `
                WITH top_users AS (
                    SELECT p.user_id FROM personalities p
                    JOIN users u ON u.user_id = p.user_id
                    WHERE u.school = $2
                        AND u.deleted = FALSE
                        AND u.user_id = $3
                    ORDER BY (p.connect_personality <#> $1) * -1 DESC LIMIT 20
                )
                SELECT ups.endpoint, ups.p256dh, ups.auth
                FROM top_users t
                JOIN push_subscriptions ups ON ups.user_id = t.user_id
            `,
            [bg_suitable_normalized_connect_interest_sparse_vector, school, user_id]
        );


        //broadcast notifications to 10 to 20 best candidates
        

    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


module.exports = ProcessConnect;