const express = require('express');
const printRouter = express.Router();

const mysql = require('mysql');
const moment = require('moment');
const logger = require('../../routes/helpers/log4js');

const { handleError, ErrorHandler } = require('./../helpers/error');
const {
	getSalesMaster,
	getSalesMaster1,
	getSalesDetails,
} = require('../modules/sales/sales.js');
const { getCenterDetails } = require('../modules/center/center.js');

const { getCustomerDetails } = require('../modules/customers/customers');

const { createInvoice } = require('./createInvoice.js');
const { createEstimate } = require('./createEstimate.js');

const { printSaleInvoice } = require('./../modules/sales/printSaleInvoice.js');

printRouter.post('/invoice-pdf', async (req, res) => {
	let sale_id = req.body.sale_id;
	let print_type = req.body.print_type;

	// using saleid get SALE MASTER & SALE DETAILS
	let saleMaster = await getSalesMaster(sale_id);
	let saleDetails = await getSalesDetails(sale_id);

	// get CUSTOMER & CENTER DETAILS
	let customerDetails = await getCustomerDetails(
		saleMaster[0].center_id,
		saleMaster[0].customer_id
	);
	let centerDetails = await getCenterDetails(saleMaster[0].center_id);

	// once all the data received, now populate invoice

	createInvoice(
		saleMaster,
		saleDetails,
		customerDetails,
		centerDetails,

		'invoice.pdf',
		res,
		print_type
	);
});

printRouter.post('/estimate-pdf', async (req, res) => {
	let sale_id = req.body.sale_id;
	let print_type = req.body.print_type;

	// using saleid get SALE MASTER & SALE DETAILS
	let saleMaster = await getSalesMaster(sale_id);
	let saleDetails = await getSalesDetails(sale_id);

	// get CUSTOMER & CENTER DETAILS
	let customerDetails = await getCustomerDetails(
		saleMaster[0].center_id,
		saleMaster[0].customer_id
	);
	let centerDetails = await getCenterDetails(saleMaster[0].center_id);

	// once all the data received, now populate invoice

	createEstimate(
		saleMaster,
		saleDetails,
		customerDetails,
		centerDetails,

		'estimate.pdf',
		res,
		print_type
	);
});

module.exports = printRouter;
