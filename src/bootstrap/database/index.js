const CreatePostsTable = require("./dynamic/posts");
const CreateVotesTable = require("./dynamic/votes");
const CreateUsersTable = require("./dynamic/users");
const CreateLovesTable = require("./dynamic/loves");
const CreateCommentsTable = require("./dynamic/comments");
const AddPgTrgmExtension = require("./extensions/pg_trgm");
const AddUUIDOSSPExtension = require("./extensions/uuid");
const AddVectorExtension = require("./extensions/vector");
const CreateSubscriptionTable = require("./dynamic/subscription");
const CreateFeedbackTable = require("./dynamic/feedback");
const CreatePushSubscriptionTable = require("./dynamic/push_subscriptions");


const ConfigureRelationalDB =  async () => {
    try {
        await AddUUIDOSSPExtension();
        await AddPgTrgmExtension();
        await AddVectorExtension(); 

        await CreateUsersTable();
        await CreateSubscriptionTable();
        await CreatePostsTable();
        await CreateVotesTable();
        await CreateLovesTable();
        await CreateCommentsTable();
        await CreateFeedbackTable();
        await CreatePushSubscriptionTable();
    } catch (err) {
        return;
    };
};




module.exports = ConfigureRelationalDB;