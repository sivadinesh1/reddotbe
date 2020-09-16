const express = require("express");
const printRouter = express.Router();

const mysql = require("mysql");
const moment = require("moment");

const { handleError, ErrorHandler } = require("./../helpers/error");
const { getSalesMaster, getSalesMaster1, getSalesDetails } = require("../modules/sales/sales.js");
const { getCenterDetails } = require("../modules/center/center.js");

const { getCustomerDetails } = require("../modules/customers/customers");

const { createInvoice } = require("./createInvoice.js");

const { printSaleInvoice } = require("./../modules/sales/printSaleInvoice.js");

printRouter.get("/invoice-pdf/:saleid", async (req, res) => {
	let sale_id = req.params.saleid;

	// createInvoice("", "", invoice, "invoice.pdf", res);

	// using saleid get SALE MASTER & SALE DETAILS
	let saleMaster = await getSalesMaster(sale_id);
	let saleDetails = await getSalesDetails(sale_id);

	// get CUSTOMER & CENTER DETAILS
	let customerDetails = await getCustomerDetails(saleMaster[0].center_id, saleMaster[0].customer_id);
	let centerDetails = await getCenterDetails(saleMaster[0].center_id);

	// once all the data received, now populate invoice

	createInvoice(saleMaster, saleDetails, customerDetails, centerDetails, invoice, "invoice.pdf", res);
});

module.exports = printRouter;

const invoice = {
	shipping: {
		name: "John Doe",
		address: "1234 Main Street",
		city: "San Francisco",
		state: "CA",
		country: "US",
		postal_code: 94111,
	},
	items: [
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
		{
			item: "TC 100",
			description: "Toner Cartridge",
			quantity: 2,
			amount: 6000,
		},
		{
			item: "USB_EXT",
			description: "USB Cable Extender",
			quantity: 1,
			amount: 2000,
		},
	],
	subtotal: 8000,
	paid: 0,
	invoice_nr: 1234,
};
