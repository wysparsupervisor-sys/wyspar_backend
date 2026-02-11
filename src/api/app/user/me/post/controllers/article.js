const { body, validationResult } = require("express-validator");
const pool = require("../../../../../../config/pg");
const POST_TYPES = require("../../../../../../lib/data/post-types");
const POST_CATEGORIES = require("../../../../../../lib/data/post-categories");
const LOCATION_CLASSES = require("../../../../../../lib/data/location-classes");
const { PutObjectCommand, HeadObjectCommand, CopyObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const S3 = require("../../../../../../config/s3");
const redisClient = require("../../../../../../config/redis");
const { embed } = require("../../../../../../config/embedder");
const { TrackEvent } = require("../../../../../../config/mixpanel");



const ProcessArticlePost = async (req, res) => {
    //valiadate inputs
    await body("text").exists().isString().isLength({max: 1000, min: 3}).withMessage("").run(req)
    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: "Invalid request body!"});
    
    
    const { withImage } = req.query;

    if (withImage === "true") return HandleArticleWithImage(req, res);
    if (withImage === "false") return HandleArticleWithoutImage(req, res);

    return res.status(405).send("NOT FOUND");
};


module.exports = ProcessArticlePost;




async function HandleArticleWithoutImage(req, res){
    const user_id = req.user.ID;
    const location_status = req.user.location_status;
    const { text, type, category } = req.body;

    //prepare a client cause operation must be atomic
    const client = await pool.connect();

    try { 
        //
        const post_vector = await embed(text);

        //increment user total post counter by 1 then store post on DB
        const post_query = `INSERT INTO posts (user_id, content, post_type, post_category, location_status, embedding) VALUES ($1, $2, $3, $4, $5, $6) RETURNING post_id, content, post_type, post_category, post_style, images, location_status, total_upvote, total_downvote, total_love, total_view, total_comment, metadata, created_at`;
        const increment_query = `UPDATE users SET stats = jsonb_set(stats, '{posts}', ((stats->>'posts')::int + 1)::text::jsonb) WHERE user_id = $1`;

        await client.query("BEGIN");
        const result = await client.query(post_query, [user_id, text, POST_TYPES.indexOf(type), POST_CATEGORIES.indexOf(category), LOCATION_CLASSES.indexOf(location_status), '['+ post_vector.join(',') + ']']);
        await client.query(increment_query, [user_id]);
        await client.query("COMMIT");

        res.status(200).json({ok: true, msg: "Success", post_info: result.rows[0]});

        TrackEvent('Post Created', {
            distinct_id: user_id,
            time: new Date().toISOString(),
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.log(err);
        res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
        TrackEvent('Post Created', {
            distinct_id: user_id,
        });
    } finally {
        client.release();
    };
};



async function HandleArticleWithImage(req, res) {
    const user_id = req.user.ID;
    const { action } = req.query;

    //first handle presigned url to get post
    if (action === "presigned-url") {
        try {
            const timestamp = Date.now();
            const uuid = crypto.randomUUID();

            const bucket = "temp"; //upload media image to autodelete temp bucket first just incase they get orphaned
            const key = `posts/images/${timestamp}_${uuid}.webp`;

            const command = new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                ContentType: "image/webp",
            });

            const uploadUrl = await getSignedUrl(S3, command, { expiresIn: 5 * 60 });
            await redisClient.set(`POST:S3KEYS:${user_id}`, JSON.stringify([key]), { EX: 5 * 60 });

            return res.status(200).json({ok: true, url: uploadUrl});
        } catch (err) {
            console.log(err);
            return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
        };
    };

    //then handle post if action is to post
    if (action === "post-article") {
        const user_id = req.user.ID;
        const location_status = req.user.location_status;
        const { text, type, category } = req.body;


        //S3 logic
        let imageKeysArray;
        try {
            //i'm essentially using array cause in the future we might want to store more images
            imageKeysArray = JSON.parse(await redisClient.get(`POST:S3KEYS:${user_id}`));
            const temp_bucket_name = "temp";
            const main_bucket_name = "media";

            //verify if user actually uploaded the image to temo. After that transfer to main. Temp bucket  is set to auto expire after sometime
            await S3.send(new HeadObjectCommand({ Bucket: temp_bucket_name, Key: imageKeysArray[0] }));
            await S3.send(new CopyObjectCommand({ Bucket: main_bucket_name, Key: imageKeysArray[0], CopySource: `${temp_bucket_name}/${imageKeysArray[0]}`}));

        } catch (err) {
            console.log(err);
            return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
        };

        //prepare a client cause operation must be atomic
        const client = await pool.connect();

        try {
            //
            const post_vector = await embed(text);
             
            //increment user total post counter by 1 then store post on DB
            const post_query = `INSERT INTO posts (user_id, content, post_type, post_category, location_status, images, embedding) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING post_id, content, post_type, post_category, post_style, images, location_status, total_upvote, total_downvote, total_love, total_view, total_comment, metadata, created_at`;
            const increment_query = `UPDATE users SET stats = jsonb_set(stats, '{posts}', ((stats->>'posts')::int + 1)::text::jsonb) WHERE user_id = $1`;

            await client.query("BEGIN");
            const result = await client.query(post_query, [user_id, text, POST_TYPES.indexOf(type), POST_CATEGORIES.indexOf(category), LOCATION_CLASSES.indexOf(location_status), imageKeysArray, '['+ post_vector.join(',') + ']']);
            await client.query(increment_query, [user_id]);
            await client.query("COMMIT");

            res.status(200).json({ok: true, msg: "Success", post_info: result.rows[0]});
            TrackEvent('Post Created', {
                distinct_id: user_id,
                time: new Date().toISOString(),
            });
        } catch (err) {
            await client.query("ROLLBACK")
            console.log(err);
            return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
        } finally {
            client.release();
        }
    };
};