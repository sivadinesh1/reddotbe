/** @format */

const express = require("express");
const saleRouter = express.Router();

const mysql = require("mysql");
const moment = require("moment");

var pool = require("../helpers/db");

saleRouter.get("/get-next-sale-invoice-no/:centerid", (req, res) => {
	let center_id = req.params.centerid;

	let sql = `	select invseq + 1 as NxtInvNo from financialyear where 
	center_id = '${center_id}' and  
	CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;

	console.log("sq purchase >> " + sql);

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error get Nxt Sale Invoice No"), res);
		} else {
			return res.json(data);
		}
	});
});

module.exports = saleRouter;

saleRouter.post("/delete-sales-details", (req, res) => {
	let id = req.body.id;
	let sales_id = req.body.salesid;
	let autidneeded = req.body.autidneeded;

	console.log("delete sale details id > " + id);
	console.log("delete sale details sales_id > " + sales_id);
	console.log("delete sale details autidneeded > " + autidneeded);

	if (autidneeded) {
		var today = new Date();
		today = moment(today).format("YYYY-MM-DD HH:mm:ss");

		let auditQuery = `
		INSERT INTO audit_tbl (module, module_ref_id, module_ref_det_id, actn, old_value, new_value, audit_date)
		VALUES
			('Sales', '${sales_id}', '${id}', 'delete', 
			(SELECT CONCAT('[{', result, '}]') as final
			FROM (
				SELECT GROUP_CONCAT(CONCAT_WS(',', CONCAT('"saleId": ', sale_id), CONCAT('"productId": "', product_id, '"'), CONCAT('"qty": "', qty, '"')) SEPARATOR '},{') as result
				FROM (
					SELECT sale_id, product_id, qty
					FROM sale_detail where id = '${id}'
				) t1
			) t2)
			, '', '${today}'
			) `;
		console.log("audit sale delete query " + auditQuery);

		pool.query(auditQuery, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler("500", "Error adding sale audit."), res);
			}
		});
	}

	let query = `
	delete from sale_detail where id = '${id}' `;
	console.log("delete sale details " + query);
	pool.query(query, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error deleting sale details"), res);
		} else {
			return res.json({
				result: "success",
			});
		}
	});
});
