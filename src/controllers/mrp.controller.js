const MRPModel = require("../models/mrp.model");

const MRPController = {
    async run(req, res) {
        try {
            const orderId = Number(req.body.orderId);
            if (!orderId) {
                return res.status(400).json({ success: false, message: "orderId required" });
            }
            const rows = await MRPModel.runByOrder(orderId);
            res.status(200).json({ success: true, list: rows });
        } catch (err) {
            console.error("MRP run error:", err);
            res.status(500).json({ success: false, message: err.message || "Server error" });
        }
    },
};

module.exports = MRPController;
