const fs = require("fs");
const path = require("path");
const S3 = require("../../../config/s3");
const { CreateBucketCommand, PutBucketCorsCommand } = require("@aws-sdk/client-s3");

//get cors.json
const bucket_name = "media";
const cors_path = path.resolve(__dirname, `../bucket_config_files/${bucket_name}-cors.json`);
const cors_config = JSON.parse(fs.readFileSync(cors_path, "utf-8"));

const SetUpMediaBucket = async () => {
    try {
        //create bucket (applied a seperate trycatch so already exists issues don't stop the next  commands)
        try {
            await S3.send(new CreateBucketCommand({ Bucket: bucket_name }));
            console.log(`S3 ${bucket_name} bucket successfully ready 🎊🧺`);
        } catch (err) {
            if(err.Code === "BucketAlreadyExists") {
                console.log(`S3 ${bucket_name} bucket successfully ready 🎊🧺`);
            } else {
                console.log(err);
            };
        };

        //apply cors
        await S3.send(new PutBucketCorsCommand({ Bucket: bucket_name, CORSConfiguration: cors_config }));
        console.log(`CORS configuration applied to S3 ${bucket_name} bucket successfully 🎊🧺`);
    } catch (err) {
        console.log(err);
    };
};


module.exports = SetUpMediaBucket;