const SetUpMediaBucket = require("./bucket_config_commands/media");
const SetUpTempBucket = require("./bucket_config_commands/temp");
const isProduction = process.env.NODE_ENV === "production";

const Configures3 = async () => {
    //only configure these settings when we're in production
    if(!isProduction) {
        await SetUpTempBucket();
        await SetUpMediaBucket();
    };
};


module.exports = Configures3;