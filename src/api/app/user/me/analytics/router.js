const DAU = require("./controllers/dau");

const router = require("express").Router();

router.post("/", async (req, res)  => {
    const { action } = req.query;

    if(action === "dau") return DAU(req, res);

    res.status(404).send("NOT FOUND");
});


module.exports = router;