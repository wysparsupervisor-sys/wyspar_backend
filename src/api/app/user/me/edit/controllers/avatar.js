const pool = require("../../../../../../config/pg");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const S3 = require("../../../../../../config/s3");
const redisClient = require("../../../../../../config/redis");
const { PutObjectCommand, HeadObjectCommand, CopyObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");



const ProcessAvatarEdit = async (req, res) => {
    try {
        const { action } = req.query;

        if(action === "get-presigned-url") return getPresignedUrl(req, res);
        if(action === "upload") return finalize(req, res); 

        return res.status(404).json({ok: false});
    } catch (err) {
        console.log(err);
        return res.status(404).json({ok: false});
    };
};


const getPresignedUrl = async(req, res) => {
    try {
        const timestamp = Date.now();
        const user_id = req.user.ID;
        const hashed_uuid = crypto.createHash("sha256").update(user_id).digest("hex");

        const bucket = "temp"; //upload media image to autodelete temp bucket first just incase they get orphaned
        const dimensions = ["240", "50"];
        
        const slotPromises = dimensions.map(async (size) => {
            const key = `user/profile/${hashed_uuid}_${size}.webp`;
            const command = new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                ContentType: "image/webp",
            });

            const uploadUrl = await getSignedUrl(S3, command, { expiresIn: 5 * 60 });
            return { size: `${size}px`, key, url: uploadUrl };
        });

        const slots = await Promise.all(slotPromises);
        const redis_payload = {
            timestamp,
            key_240: slots.find((s) => s.size === "240px").key,
            key_50: slots.find((s) => s.size === "50px").key,
        };

        await redisClient.set(`PROFILE:S3KEY:${user_id}`, JSON.stringify(redis_payload), { EX: 5 * 60 });
        return res.status(200).json({ok: true, slots: slots.map((s) => ({ size: s.size, url: s.url }))});
    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false, msg: "Something went wrong. Try again!"});
    };
};


const finalize = async (req, res) => {
    const user_id = req.user.ID;

    let imageKeyObj;

    const temp_bucket_name = "temp";
    const main_bucket_name = "media";

    try {
        const redisData = await redisClient.get(`PROFILE:S3KEY:${user_id}`);
        
        if(!redisClient) return res.status(400).json({ok: false});

        imageKeyObj = JSON.parse(redisData);

        const keysToProcess = [imageKeyObj.key_240, imageKeyObj.key_50];

        await Promise.all(keysToProcess.map(async (s3Key) =>  {
            await S3.send(
                new HeadObjectCommand({
                    Bucket: temp_bucket_name,
                    Key: s3Key,
                })
            );

            await S3.send(
                new CopyObjectCommand({
                    Bucket: main_bucket_name,
                    CopySource: `${temp_bucket_name}/${s3Key}`,
                    Key: s3Key,
                })
            );
        }));

        const prefix = keysToProcess[0].split("_")[0];
        await pool.query(`UPDATE users SET details = jsonb_set(details, '{profile_photo}', to_jsonb($1::text), true) WHERE user_id = $2`, [prefix, user_id]);
        return res.status(200).json({ok: true, prefix});

    } catch (err) {
        console.log(err);
        return res.status(400).json({ok: false});
    };
};



module.exports = ProcessAvatarEdit;