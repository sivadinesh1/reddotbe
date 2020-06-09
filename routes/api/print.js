const express = require("express");
const printRouter = express.Router();

const mysql = require("mysql");
const moment = require("moment");

const { handleError, ErrorHandler } = require("./../helpers/error");

const { createInvoice } = require("./createInvoice.js");

printRouter.get("/invoice-pdf/:invoiceid", (req, res) => {
	let invoiceid = req.params.invoiceid;
	console.log("object... inside invoice pdf" + invoiceid);

	createInvoice(invoice, "invoice.pdf", res);
});

module.exports = printRouter;
