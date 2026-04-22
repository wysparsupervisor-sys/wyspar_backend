require("dotenv").config();
const { S3Client } = require("@aws-sdk/client-s3");
const { fromIni } = require("@aws-sdk/credential-providers");
const { MEDIA_PUT_URL } = require("../../domain");
const isProduction = process.env.NODE_ENV === "production";

const S3 = new S3Client({
    region: "auto",
    endpoint: MEDIA_PUT_URL,
    credentials: !isProduction ? fromIni({ profile: "local" }) : {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY,
    },
    ...(!isProduction && {
        forcePathStyle: true,
    })
}); 


module.exports = S3;