const express = require("express");
const dashboardRouter = express.Router();

const mysql = require("mysql");
const moment = require("moment");
const logger = require("../../routes/helpers/log4js");

const { handleError, ErrorHandler } = require("./../helpers/error");

const {
	getInquirySummary,
	getSalesSummary,
	getPurchaseSummary,
	getSaleTotal,
	getCenterSummary,
	getReceivablesOutstanding,
	getPaymentsByCustomers,
} = require("../modules/dashboard/dashboard.js");

var pool = require("./../helpers/db");

dashboardRouter.post("/inquiry-summary", (req, res) => {
	const [center_id, from_date, to_date] = Object.values(req.body);

	getInquirySummary(center_id, from_date, to_date, (err, data) => {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching getInquirySummary."), res);
		} else {
			return res.status(200).json(data);
		}
	});
});

dashboardRouter.post("/sales-summary", (req, res) => {
	const [center_id, from_date, to_date] = Object.values(req.body);

	getSalesSummary(center_id, from_date, to_date, (err, data) => {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching getSalesSummary."), res);
		} else {
			return res.status(200).json(data);
		}
	});
});

dashboardRouter.post("/purchase-summary", (req, res) => {
	const [center_id, from_date, to_date] = Object.values(req.body);

	getPurchaseSummary(center_id, from_date, to_date, (err, data) => {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching getPurchaseSummary."), res);
		} else {
			return res.status(200).json(data);
		}
	});
});

dashboardRouter.post("/sales-total", (req, res) => {
	const [center_id, from_date, to_date] = Object.values(req.body);

	getSaleTotal(center_id, from_date, to_date, (err, data) => {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching getSaleTotal."), res);
		} else {
			return res.status(200).json(data);
		}
	});
});

dashboardRouter.post("/center-summary", (req, res) => {
	const [center_id, from_date, to_date] = Object.values(req.body);

	getCenterSummary(center_id, from_date, to_date, (err, data) => {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching getCenterSummary."), res);
		} else {
			return res.status(200).json(data);
		}
	});
});

dashboardRouter.post("/center-receivables-summary", (req, res) => {
	const [center_id, from_date, to_date] = Object.values(req.body);

	getReceivablesOutstanding(center_id, from_date, to_date, (err, data) => {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching getreceivablesoutstanding."), res);
		} else {
			return res.status(200).json(data);
		}
	});
});

dashboardRouter.post("/payments-customers", (req, res) => {
	const [center_id, from_date, to_date] = Object.values(req.body);

	getPaymentsByCustomers(center_id, from_date, to_date, (err, data) => {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching getPaymentsByCustomers."), res);
		} else {
			return res.status(200).json(data);
		}
	});
});

module.exports = dashboardRouter;

//  ~ Daily summary

// SELECT
//  YEAR(STR_TO_DATE(s.invoice_date,'%d-%m-%Y')) AS `year`,
//  MONTHNAME(STR_TO_DATE(s.invoice_date,'%d-%m-%Y')) AS `month`,
//  SUM(s.net_total) AS `subtotal`,
//  count(*) AS orders,
//  s.invoice_date
// FROM sale s
// WHERE
// STR_TO_DATE(s.invoice_date,'%d-%m-%Y') between
// str_to_date('01-09-2020', '%d-%m-%YYYY') and
// str_to_date('01-10-2020', '%d-%m-%YYYY')
// GROUP BY YEAR(STR_TO_DATE(s.invoice_date,'%d-%m-%Y')), MONTH(STR_TO_DATE(s.invoice_date,'%d-%m-%y')), s.invoice_date

//  ~ Monthly summary

// SELECT DATE_FORMAT(STR_TO_DATE(s.invoice_date,'%d-%m-%Y'), "%b-%Y") AS Month, IFNULL(SUM(s.net_total), 0)
// FROM sale s
// WHERE
// STR_TO_DATE(s.invoice_date,'%d-%m-%Y') between
// str_to_date('01-05-2020', '%d-%m-%YYYY') and
// str_to_date('01-10-2020', '%d-%m-%YYYY')
// GROUP BY DATE_FORMAT(STR_TO_DATE(s.invoice_date,'%d-%m-%Y'), "%b-%Y")

// https://stackoverflow.com/questions/27600863/mysql-monthly-sale-of-last-12-months-including-months-with-no-sale
// https://stackoverflow.com/questions/49514715/pulling-data-for-each-month-sql-even-if-there-is-no-data
