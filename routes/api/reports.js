const express = require("express");
const reportsRouter = express.Router();

const mysql = require("mysql");
const moment = require("moment");
const logger = require("../../routes/helpers/log4js");

const { handleError, ErrorHandler } = require("./../helpers/error");

const { getProductInventoryReport } = require("../modules/reports/inventoryreports.js");

var pool = require("./../helpers/db");

reportsRouter.post("/inventory-report", (req, res) => {
	const [center_id, product_id] = Object.values(req.body);
	logger.debug.debug("object..> inventory-report >" + center_id, product_id);

	getProductInventoryReport(center_id, product_id, (err, data) => {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching getProductInventoryReport."), res);
		} else {
			return res.status(200).json(data);
		}
	});
});

module.exports = reportsRouter;
