const Save = require("./controller/save");
const router = require("express").Router();


router.post("/", async (req, res) => {
    const { action } = req.query;

    if (action === "save") return Save(req, res);

    return res.status(404).send("NOT FOUND");
});


module.exports = router;