const express = require('express');
const reportsRouter = express.Router();

const mysql = require('mysql');
const moment = require('moment');
const logger = require('../../routes/helpers/log4js');
const { toTimeZone, toTimeZoneFrmt } = require('./../helpers/utils');

const { handleError, ErrorHandler } = require('./../helpers/error');

const {
	getProductInventoryReport,
} = require('../modules/reports/inventoryreports.js');
const {
	getProductSummaryReport,
} = require('../modules/reports/productsummaryreports.js');
const {
	getStatement,
	getVendorStatement,
	getItemWiseSale,
} = require('../modules/reports/statementreports');
var pool = require('./../helpers/db');

reportsRouter.post('/inventory-report', (req, res) => {
	const [center_id, product_code] = Object.values(req.body);

	getProductInventoryReport(center_id, product_code, (err, data) => {
		if (err) {
			return handleError(
				new ErrorHandler('500', 'Error fetching getProductInventoryReport.'),
				res
			);
		} else {
			return res.status(200).json(data);
		}
	});
});

reportsRouter.post('/product-summary-report', (req, res) => {
	const [center_id, start, end] = Object.values(req.body);

	getProductSummaryReport(center_id, start, end, (err, data) => {
		if (err) {
			return handleError(
				new ErrorHandler('500', 'Error fetching product-summary-report.'),
				res
			);
		} else {
			return res.status(200).json(data);
		}
	});
});

reportsRouter.post('/customer-statement', async (req, res) => {
	const [center_id, customer_id, start, end] = Object.values(req.body);
	let start_date =
		toTimeZoneFrmt(start, 'Asia/Kolkata', 'YYYY-MM-DD') + ' 00:00:00';
	let end_date =
		toTimeZoneFrmt(end, 'Asia/Kolkata', 'YYYY-MM-DD') + ' 23:59:59';

	let data = await getStatement(center_id, customer_id, start_date, end_date);
	return res.status(200).json(data);
});

reportsRouter.post('/vendor-statement', async (req, res) => {
	const [center_id, vendor_id, start, end] = Object.values(req.body);
	let start_date =
		toTimeZoneFrmt(start, 'Asia/Kolkata', 'YYYY-MM-DD') + ' 00:00:00';
	let end_date =
		toTimeZoneFrmt(end, 'Asia/Kolkata', 'YYYY-MM-DD') + ' 23:59:59';

	let data = await getVendorStatement(
		center_id,
		vendor_id,
		start_date,
		end_date
	);
	return res.status(200).json(data);
});

reportsRouter.post('/item-wise-sale', async (req, res) => {
	let start_date = toTimeZone(req.body.startdate, 'Asia/Kolkata') + ' 00:00:00';
	let end_date = toTimeZone(req.body.enddate, 'Asia/Kolkata') + ' 23:59:59';

	let data = await getItemWiseSale(
		req.body.center_id,
		req.body.brandid,
		start_date,
		end_date,
		req.body.saletype,
		req.body.start,
		req.body.end
	);
	return res.status(200).json(data);
});

module.exports = reportsRouter;
