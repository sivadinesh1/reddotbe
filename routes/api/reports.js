const express = require('express');
const reportsRouter = express.Router();

const mysql = require('mysql');
const moment = require('moment');
const logger = require('../../routes/helpers/log4js');
const { toTimeZone, toTimeZoneFrmt } = require('./../helpers/utils');

const { getProductInventoryReport, fullStockReport } = require('../modules/reports/inventoryreports.js');
const { getProductSummaryReport } = require('../modules/reports/productsummaryreports.js');
const {
	getStatement,
	getVendorStatement,
	getItemWiseSale,
	getReceivablesClosingBalance,
	getReceivablesOpeningBalance,
} = require('../modules/reports/statementreports');
var pool = require('./../helpers/db');

reportsRouter.post('/full-inventory-report', async (req, res) => {
	const [center_id, mrp_split] = Object.values(req.body);

	let data = await fullStockReport(center_id, mrp_split, res);
	return res.status(200).json(data);

	// fullStockReport(center_id, (err, data) => {
	// 	if (err) {
	// 		console.log('dinesh ' + JSON.stringify(err));
	// 		return handleError(
	// 			new ErrorHandler('500', 'full-inventory-report', err),
	// 			res
	// 		);
	// 	} else {
	// 		return res.status(200).json(data);
	// 	}
	// });
});

reportsRouter.post('/inventory-report', (req, res) => {
	const [center_id, product_code, product_id] = Object.values(req.body);

	getProductInventoryReport(center_id, product_code, product_id, (err, data) => {
		if (err) {
			return handleError(new ErrorHandler('500', 'inventory-report', err), res);
		} else {
			return res.status(200).json(data);
		}
	});
});

reportsRouter.post('/product-summary-report', (req, res) => {
	const [center_id, start, end] = Object.values(req.body);

	getProductSummaryReport(center_id, start, end, (err, data) => {
		if (err) {
			return handleError(new ErrorHandler('500', '/product-summary-report', err), res);
		} else {
			return res.status(200).json(data);
		}
	});
});

reportsRouter.post('/customer-statement', async (req, res) => {
	const [center_id, customer_id, start, end, sale_type] = Object.values(req.body);
	let start_date = toTimeZoneFrmt(start, 'Asia/Kolkata', 'DD-MM-YYYY') + ' 00:00:00';
	let end_date = toTimeZoneFrmt(end, 'Asia/Kolkata', 'DD-MM-YYYY') + ' 23:59:59';

	let data = await getStatement(center_id, customer_id, start_date, end_date, sale_type);
	return res.status(200).json(data);
});

reportsRouter.post('/vendor-statement', async (req, res) => {
	const [center_id, vendor_id, start, end] = Object.values(req.body);
	let start_date = toTimeZoneFrmt(start, 'Asia/Kolkata', 'YYYY-MM-DD') + ' 00:00:00';
	let end_date = toTimeZoneFrmt(end, 'Asia/Kolkata', 'YYYY-MM-DD') + ' 23:59:59';

	let data = await getVendorStatement(center_id, vendor_id, start_date, end_date);
	return res.status(200).json(data);
});

reportsRouter.post('/customer-closing-balance-statement', async (req, res) => {
	const [center_id, customer_id, start, end, sale_type] = Object.values(req.body);
	let start_date = toTimeZoneFrmt(start, 'Asia/Kolkata', 'DD-MM-YYYY') + ' 00:00:00';
	let end_date = toTimeZoneFrmt(end, 'Asia/Kolkata', 'DD-MM-YYYY') + ' 23:59:59';

	let data = await getReceivablesClosingBalance(center_id, customer_id, start_date, end_date, sale_type);
	return res.status(200).json(data);
});

reportsRouter.post('/customer-opening-balance-statement', async (req, res) => {
	const [center_id, customer_id, start, end, sale_type] = Object.values(req.body);
	let start_date = toTimeZoneFrmt(start, 'Asia/Kolkata', 'DD-MM-YYYY') + ' 00:00:00';
	let end_date = toTimeZoneFrmt(end, 'Asia/Kolkata', 'DD-MM-YYYY') + ' 23:59:59';

	let data = await getReceivablesOpeningBalance(center_id, customer_id, start_date, end_date, sale_type);
	return res.status(200).json(data);
});

reportsRouter.post('/item-wise-sale', async (req, res) => {
	let start_date = toTimeZone(req.body.startdate, 'Asia/Kolkata') + ' 00:00:00';
	let end_date = toTimeZone(req.body.enddate, 'Asia/Kolkata') + ' 23:59:59';

	let data = await getItemWiseSale(req.body.center_id, req.body.brandid, start_date, end_date, req.body.saletype, req.body.start, req.body.end);
	return res.status(200).json(data);
});

module.exports = reportsRouter;

// select str_to_date(txn_date,'%d-%m-%Y'), stock_level from item_history
// where
// product_ref_id = '65663'
// -- and txn_date = '08-04-2021 09:41:07'
// and str_to_date(txn_date,'%d-%m-%Y')
// 	between str_to_date('08-04-2021', '%d-%m-%Y') and str_to_date('08-04-2021', '%d-%m-%Y')
// 	order by txn_date desc limit 1
