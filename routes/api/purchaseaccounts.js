const express = require('express');
const purchaseaccountsRouter = express.Router();

const mysql = require('mysql');
const moment = require('moment');
const logger = require('../helpers/log4js');
var pool = require('../helpers/db');
const { handleError, ErrorHandler } = require('../helpers/error');
const { toTimeZone, currentTimeInTimeZone } = require('../helpers/utils');

const {
	getPurchaseInvoiceByCenter,
	getVendorPymtSequenceNo,
	updateVendorPymtSequenceGenerator,
	getPurchaseInvoiceByVendors,
	addVendorPaymentLedgerRecord,
	addVendorPaymentMaster,
	updateVendorCredit,
	updateVendorCreditMinus,
	updateVendorBalanceAmount,
	updateVendorLastPaidDate,
	getVendorPaymentsByCenter,
	getLedgerByVendors,
	getPaymentsByVendors,
} = require('../modules/accounts/purchaseaccounts.js');

purchaseaccountsRouter.post('/get-purchase-invoice-center', (req, res) => {
	let center_id = req.body.centerid;
	let from_date = toTimeZone(req.body.fromdate, 'Asia/Kolkata');
	let to_date = toTimeZone(req.body.todate, 'Asia/Kolkata');
	let vendor_id = req.body.vendorid;
	let searchtype = req.body.searchtype;
	let invoiceno = req.body.invoiceno;

	getPurchaseInvoiceByCenter(
		center_id,
		from_date,
		to_date,
		vendor_id,
		searchtype,
		invoiceno,
		(err, data) => {
			if (err) {
				return handleError(
					new ErrorHandler('500', '/get-purchase-invoice-center', err),
					res
				);
			} else {
				return res.status(200).json(data);
			}
		}
	);
});

purchaseaccountsRouter.post(
	'/add-vendor-payment-received',
	async (req, res) => {
		var today = new Date();
		today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

		const cloneReq = { ...req.body };

		const [vendor, center_id, accountarr] = Object.values(req.body);

		let index = 0;

		for (const k of accountarr) {
			// accountarr.forEach(async (k, index) => {
			await updateVendorPymtSequenceGenerator(center_id);

			let pymtNo = await getVendorPymtSequenceNo(cloneReq);

			// add payment master
			addVendorPaymentMaster(cloneReq, pymtNo, k, (err, data) => {
				let newPK = data.insertId;

				// (3) - updates pymt details
				let process = processItems(
					cloneReq,
					newPK,
					k.purchase_ref_id,
					k.receivedamount
				);
			}).catch((err) => {
				return handleError(
					new ErrorHandler(
						'500',
						'Error addVendorPaymentMaster::processitems',
						err
					),
					res
				);
			});

			if (index == accountarr.length - 1) {
				return res.status(200).json('success');
			}
			index++;
			// });
		}
	}
);

function processItems(cloneReq, newPK, purchase_ref_id, receivedamount) {
	let sql = `INSERT INTO vendor_payment_detail(vend_pymt_ref_id, purchase_ref_id, applied_amount) VALUES
		( '${newPK}', '${purchase_ref_id}', '${receivedamount}' )`;

	let pymtdetailsTblPromise = new Promise(function (resolve, reject) {
		pool.query(sql, function (err, data) {
			if (err) {
				reject(err);
			} else {
				// check if there is any credit balance for the vendor, if yes, first apply that

				addVendorPaymentLedgerRecord(
					cloneReq,
					newPK,
					receivedamount,
					purchase_ref_id,
					(err, data) => {
						if (err) {
							let errTxt = err.message;
						} else {
							// todo
						}
					}
				);

				resolve(data);
			}
		});
	});
}

purchaseaccountsRouter.post(
	'/add-bulk-vendor-payment-received',
	async (req, res) => {
		const cloneReq = { ...req.body };

		const [
			vendor,
			center_id,
			accountarr,
			invoicesplit,
			balanceamount,
		] = Object.values(req.body);

		let index = 0;

		for (const k of accountarr) {
			await updateVendorPymtSequenceGenerator(center_id);

			let pymtNo = await getVendorPymtSequenceNo(cloneReq);

			// add payment master
			addVendorPaymentMaster(cloneReq, pymtNo, k, (err, data) => {
				let newPK = data.insertId;

				// (3) - updates pymt details
				let process = processBulkItems(cloneReq, newPK, invoicesplit);
			}).catch((err) => {
				return handleError(
					new ErrorHandler(
						'500',
						'Error addVendorPaymentMaster::processBulkItems > ',
						err
					),
					res
				);
			});

			if (index == accountarr.length - 1) {
				if (req.body.creditsused === 'YES') {
					updateVendorCreditMinus(
						req.body.creditusedamount,
						cloneReq.centerid,
						cloneReq.vendor.id,
						(err, data1) => {
							if (err) {
								let errTxt = err.message;
							} else {
								// todo nothing
							}
						}
					);
				}

				// apply the excess amount to vendor credit
				// applicable only if balanceamount < 0
				if (balanceamount < 0) {
					updateVendorCredit(
						balanceamount,
						cloneReq.centerid,
						cloneReq.vendor.id,
						(err, data1) => {
							if (err) {
								let errTxt = err.message;
							} else {
								// todo nothing
							}
						}
					);
				}
				return res.status(200).json('success');
			}
			index++;
		}
	}
);

function processBulkItems(cloneReq, newPK, invoicesplit) {
	invoicesplit.forEach((e) => {
		let sql = `INSERT INTO vendor_payment_detail(vend_pymt_ref_id, purchase_ref_id, applied_amount) VALUES
		( '${newPK}', '${e.id}', '${e.applied_amount}' )`;

		let pymtdetailsTblPromise = new Promise(function (resolve, reject) {
			pool.query(sql, function (err, data) {
				if (err) {
					reject(err);
				} else {
					// check if there is any credit balance for the vendor, if yes, first apply that

					addVendorPaymentLedgerRecord(
						cloneReq,
						newPK,
						e.applied_amount,
						e.id,
						(err, data2) => {
							if (err) {
								let errTxt = err.message;
							} else {
								// do nothing
							}
						}
					);
					resolve(data);
				}
			});
		});
	});
}

purchaseaccountsRouter.post('/get-vendor-payments-center', (req, res) => {
	let center_id = req.body.centerid;
	let from_date = toTimeZone(req.body.fromdate, 'Asia/Kolkata');
	let to_date = toTimeZone(req.body.todate, 'Asia/Kolkata');
	let vendor_id = req.body.vendorid;
	let searchtype = req.body.searchtype;
	let invoiceno = req.body.invoiceno;

	getVendorPaymentsByCenter(
		center_id,
		from_date,
		to_date,
		vendor_id,
		searchtype,
		invoiceno,
		(err, data) => {
			if (err) {
				return handleError(
					new ErrorHandler('500', '/get-vendor-payments-center.', err),
					res
				);
			} else {
				return res.status(200).json(data);
			}
		}
	);
});

purchaseaccountsRouter.post('/get-purchase-invoice-vendor', (req, res) => {
	let center_id = req.body.centerid;
	let from_date = toTimeZone(req.body.fromdate, 'Asia/Kolkata');
	let to_date = toTimeZone(req.body.todate, 'Asia/Kolkata');
	let vendor_id = req.body.vendorid;
	let searchtype = req.body.searchtype;
	let invoiceno = req.body.invoiceno;

	getPurchaseInvoiceByVendors(
		center_id,
		vendor_id,
		from_date,
		to_date,
		searchtype,
		invoiceno,
		(err, data) => {
			if (err) {
				return handleError(
					new ErrorHandler(
						'500',
						'Error get-purchase-invoice-vendor getPurchaseInvoiceByVendors',
						err
					),
					res
				);
			} else {
				return res.status(200).json(data);
			}
		}
	);
});

purchaseaccountsRouter.post('/get-payments-vendor', (req, res) => {
	let center_id = req.body.centerid;
	let from_date = toTimeZone(req.body.fromdate, 'Asia/Kolkata');
	let to_date = toTimeZone(req.body.todate, 'Asia/Kolkata');
	let vendor_id = req.body.vendorid;
	let searchtype = req.body.searchtype;
	let invoiceno = req.body.invoiceno;

	getPaymentsByVendors(
		center_id,
		vendor_id,
		from_date,
		to_date,
		searchtype,
		invoiceno,
		(err, data) => {
			if (err) {
				return handleError(
					new ErrorHandler(
						'500',
						'Error /get-payments-vendor getPaymentsByVendors.',
						err
					),
					res
				);
			} else {
				return res.status(200).json(data);
			}
		}
	);
});

purchaseaccountsRouter.get(
	'/get-pymt-transactions-vendor/:centerid/:vendorid',
	(req, res) => {
		getPymtTransactionByVendors(
			req.params.centerid,
			req.params.vendorid,
			(err, data) => {
				if (err) {
					return handleError(
						new ErrorHandler(
							'500',
							`/get-pymt-transactions-vendor/:centerid/:vendorid ${req.params.centerid} ${req.params.vendorid}`,
							err
						),
						res
					);
				} else {
					return res.status(200).json(data);
				}
			}
		);
	}
);

purchaseaccountsRouter.get(
	'/get-ledger-vendor/:centerid/:vendorid',
	(req, res) => {
		getLedgerByVendors(
			req.params.centerid,
			req.params.vendorid,
			(err, data) => {
				if (err) {
					return handleError(
						new ErrorHandler(
							'500',
							`/get-ledger-vendor/:centerid/:vendorid ${req.params.centerid} ${req.params.vendorid}`,
							err
						),
						res
					);
				} else {
					return res.status(200).json(data);
				}
			}
		);
	}
);

module.exports = purchaseaccountsRouter;
