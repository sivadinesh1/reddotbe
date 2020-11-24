const express = require("express");
const returnsRouter = express.Router();
const logger = require("../../routes/helpers/log4js");

const { handleError, ErrorHandler } = require("./../helpers/error");

const { getReturns } = require("../modules/sales/returns.js");

var pool = require("../helpers/db");

// get sale master to display in sale invoice component
returnsRouter.get("/get-sale-returns/:center_id", async (req, res) => {
	let center_id = req.params.center_id;
	let saleReturns = await getReturns(center_id);
	console.log("object..." + saleReturns);
	return res.json(saleReturns);
});

module.exports = returnsRouter;
