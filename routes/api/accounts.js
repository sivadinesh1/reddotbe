const express = require("express");
const accountsRouter = express.Router();

const mysql = require("mysql");
const moment = require("moment");
const logger = require("../../routes/helpers/log4js");
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
	getPymtTransactionsByCenter,
	updateCustomerCredit,
	updateCustomerCreditMinus,
	getPymtTransactionByCustomers,
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

		logger.debug.debug("calling pymtNo >>>  " + pymtNo);

		// add payment master
		addPaymentMaster(cloneReq, pymtNo, k, (err, data) => {
			let newPK = data.insertId;

			// (3) - updates pymt details
			let process = processItems(cloneReq, newPK, k.sale_ref_id, k.receivedamount);
		}).catch((err) => {
			logger.debug.debug("error: " + err);
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

				addPaymentLedgerRecord(cloneReq, newPK, receivedamount, sale_ref_id, (err, data) => {
					if (err) {
						let errTxt = err.message;
						logger.debug.debug("error inserting payment ledger records " + errTxt);
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

accountsRouter.get("/get-pymt-transactions-customer/:centerid/:customerid", (req, res) => {
	getPymtTransactionByCustomers(req.params.centerid, req.params.customerid, (err, data) => {
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

accountsRouter.get("/get-pymt-transactions-center/:centerid", (req, res) => {
	getPymtTransactionsByCenter(req.params.centerid, (err, data) => {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching get getPymtTransactionsByCenter ."), res);
		} else {
			return res.status(200).json(data);
		}
	});
});

accountsRouter.post("/add-bulk-payment-received", async (req, res) => {
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	const cloneReq = { ...req.body };

	const [customer, center_id, accountarr, invoicesplit, balanceamount] = Object.values(req.body);

	let index = 0;

	for (const k of accountarr) {
		await updatePymtSequenceGenerator(center_id);

		let pymtNo = await getPymtSequenceNo(cloneReq);

		// add payment master
		addPaymentMaster(cloneReq, pymtNo, k, (err, data) => {
			let newPK = data.insertId;

			// (3) - updates pymt details
			let process = processBulkItems(cloneReq, newPK, invoicesplit);
		}).catch((err) => {
			logger.debug.debug("error: " + err);
			return handleError(new ErrorHandler("500", "Error bulk pymtMaster/Details Entry > " + err), res);
		});

		if (index == accountarr.length - 1) {
			if (req.body.creditsused === "YES") {
				updateCustomerCreditMinus(req.body.creditusedamount, cloneReq.centerid, cloneReq.customer.id, (err, data1) => {
					if (err) {
						let errTxt = err.message;
						logger.debug.debug("error updating updateCustomerCreditMinus " + errTxt);
					} else {
						// todo nothing
					}
				});
			}

			// apply the excess amount to custome credit
			// applicable only if balanceamount < 0
			if (balanceamount < 0) {
				updateCustomerCredit(balanceamount, cloneReq.centerid, cloneReq.customer.id, (err, data1) => {
					if (err) {
						let errTxt = err.message;
						logger.debug.debug("error updating customer credit " + errTxt);
					} else {
						// todo nothing
					}
				});
			}
			return res.status(200).json("success");
		}
		index++;
	}
});

function processBulkItems(cloneReq, newPK, invoicesplit) {
	invoicesplit.forEach((e) => {
		let sql = `INSERT INTO payment_detail(pymt_ref_id, sale_ref_id, applied_amount) VALUES
		( '${newPK}', '${e.id}', '${e.applied_amount}' )`;

		let pymtdetailsTblPromise = new Promise(function (resolve, reject) {
			pool.query(sql, function (err, data) {
				if (err) {
					reject(err);
				} else {
					// check if there is any credit balance for the customer, if yes, first apply that

					addPaymentLedgerRecord(cloneReq, newPK, e.applied_amount, e.id, (err, data2) => {
						if (err) {
							let errTxt = err.message;
							logger.debug.debug("error inserting payment ledger records " + errTxt);
						} else {
							// do nothing
						}
					});
					resolve(data);
				}
			});
		});
	});
}

module.exports = accountsRouter;
