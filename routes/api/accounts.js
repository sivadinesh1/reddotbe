const express = require("express");
const accountsRouter = express.Router();

const mysql = require("mysql");
const moment = require("moment");

var pool = require("../helpers/db");
const { handleError, ErrorHandler } = require("./../helpers/error");

accountsRouter.post("/add-account-received", (req, res) => {
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	const [customer, center_id, accountarr] = Object.values(req.body);

	// accountarr
	accountarr.forEach(function (k) {
		let query = `
		INSERT INTO accnt_received ( center_id, customer_id, received_amt, received_date, pymt_mode, bank_ref, gnrl_ref, last_updated)
		VALUES
			( '${center_id}', '${customer.id}', '${k.receivedamount}', '${k.receiveddate}', '${k.pymtmode}', '${k.bankref}', '${k.gnrlref}', '${today}'
			) `;

		pool.query(query, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler("500", "Error adding accounts received."), res);
			} else {
				res.status(200).json({
					result: "success",
				});
			}
		});
	});
});

accountsRouter.get("/get-accounts-receivable/:centerid", (req, res) => {
	let center_id = req.params.centerid;

	console.log("inside get vendor details");
	let sql = `select a.*, c.name as customer_name from accnt_received a, customer c
	where
	c.id = a.customer_id and
	a.center_id = '${center_id}' 
	order by a.last_updated desc limit 2
	 `;
	console.log("object..." + sql);

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching center details."), res);
		} else {
			res.status(200).json(data);
		}
	});
});

module.exports = accountsRouter;
