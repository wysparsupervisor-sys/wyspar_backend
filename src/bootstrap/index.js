const ConfigureRelationalDB = require("./database/index");
const Configures3 = require("./S3");

const Bootstrap = async () => {
    try {
        console.log("\n------------Setting up PG DB------------");
        await ConfigureRelationalDB();
        console.log("------------PG DB set up done------------");

        console.log("\n------------Setting up S3------------");
        await Configures3();
        console.log("------------S3 setup done------------\n");
    } catch (err) {
        return;
    }
};


module.exports = Bootstrap;