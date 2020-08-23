const express = require("express");
const accountsRouter = express.Router();

const mysql = require("mysql");
const moment = require("moment");

var pool = require("../helpers/db");
const { handleError, ErrorHandler } = require("./../helpers/error");

const {
	addPaymentMaster,
	getLedgerByCustomers,
	getSaleInvoiceByCustomers,
	getPaymentsByCustomers,
	addPaymentLedgerRecord,
	updatePymtSequenceGenerator,
	getPymtSequenceNo,
	getPaymentsByCenter,
	getSaleInvoiceByCenter,
} = require("../modules/accounts/accounts.js");

accountsRouter.post("/add-payment-received", async (req, res) => {
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	const cloneReq = { ...req.body };

	const [customer, center_id, accountarr] = Object.values(req.body);

	let index = 0;

	for (const k of accountarr) {
		// accountarr.forEach(async (k, index) => {
		await updatePymtSequenceGenerator(center_id);

		let pymtNo = await getPymtSequenceNo(cloneReq);

		console.log("calling pymtNo >>>  " + pymtNo);

		// add payment master
		addPaymentMaster(cloneReq, pymtNo, k, (err, data) => {
			let newPK = data.insertId;

			// (3) - updates pymt details
			let process = processItems(cloneReq, newPK, k.sale_ref_id, k.receivedamount);
		}).catch((err) => {
			console.log("error: " + err);
			return handleError(new ErrorHandler("500", "Error pymtMaster/Details Entry > " + err), res);
		});

		if (index == accountarr.length - 1) {
			return res.status(200).json("success");
		}
		index++;
		// });
	}
});

function processItems(cloneReq, newPK, sale_ref_id, receivedamount) {
	let sql = `INSERT INTO payment_detail(pymt_ref_id, sale_ref_id, applied_amount) VALUES
		( '${newPK}', '${sale_ref_id}', '${receivedamount}' )`;

	let pymtdetailsTblPromise = new Promise(function (resolve, reject) {
		pool.query(sql, function (err, data) {
			if (err) {
				reject(err);
			} else {
				// check if there is any credit balance for the customer, if yes, first apply that

				addPaymentLedgerRecord(cloneReq, newPK, receivedamount, (err, data) => {
					if (err) {
						let errTxt = err.message;
						console.log("error inserting payment ledger records " + errTxt);
					} else {
						// todo
					}
				});

				resolve(data);
			}
		});
	});
}

accountsRouter.get("/get-ledger-customer/:centerid/:customerid", (req, res) => {
	getLedgerByCustomers(req.params.centerid, req.params.customerid, (err, data) => {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching get ledger customer."), res);
		} else {
			return res.status(200).json(data);
		}
	});
});

accountsRouter.get("/get-sale-invoice-customer/:centerid/:customerid", (req, res) => {
	getSaleInvoiceByCustomers(req.params.centerid, req.params.customerid, (err, data) => {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching get ledger customer."), res);
		} else {
			return res.status(200).json(data);
		}
	});
});

accountsRouter.get("/get-sale-invoice-center/:centerid", (req, res) => {
	getSaleInvoiceByCenter(req.params.centerid, (err, data) => {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching get ledger customer."), res);
		} else {
			return res.status(200).json(data);
		}
	});
});

accountsRouter.get("/get-payments-customer/:centerid/:customerid", (req, res) => {
	getPaymentsByCustomers(req.params.centerid, req.params.customerid, (err, data) => {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching get ledger customer."), res);
		} else {
			return res.status(200).json(data);
		}
	});
});

accountsRouter.get("/get-payments-center/:centerid", (req, res) => {
	getPaymentsByCenter(req.params.centerid, (err, data) => {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching get getPaymentsByCenter ."), res);
		} else {
			return res.status(200).json(data);
		}
	});
});

module.exports = accountsRouter;
