const express = require("express");
const saleRouter = express.Router();
const logger = require("../../routes/helpers/log4js");

const mysql = require("mysql");
const moment = require("moment");
const { handleError, ErrorHandler } = require("./../helpers/error");

const { getSalesMaster, getSalesDetails } = require("../modules/sales/sales.js");

const { addSaleLedgerRecord, addReverseSaleLedgerRecord, addSaleLedgerAfterReversalRecord } = require("../modules/accounts/accounts.js");

var pool = require("../helpers/db");

// Get Possible Next Sale Invoice # (ReadOnly)
saleRouter.get("/get-next-sale-invoice-no/:centerid/:invoicetype", (req, res) => {
	let center_id = req.params.centerid;
	let invoicetype = req.params.invoicetype;

	let invoiceyear = moment().format("YY");

	let sql = "";

	if (invoicetype === "stockissue") {
		sql = `select concat('SI',"-",'20', "/", "1", "/", lpad(stock_issue_seq + 1, 5, "0")) as NxtInvNo from financialyear  where 
					center_id = '${center_id}' and  
					CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;
	} else if (invoicetype === "gstinvoice") {
		sql = `select concat('${invoiceyear}', "/", "1", "/", lpad(invseq + 1, 5, "0")) as NxtInvNo from financialyear  where 
					center_id = '${center_id}' and  
					CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;
	}
	logger.debug.debug("invoice type l30" + invoicetype);
	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error get Nxt Sale Invoice No"), res);
		} else {
			return res.json(data);
		}
	});
});

// delete sale details records based on sale details id
// if audit is true, form a json string data and store in audit table
// first entry to audit table & then call the delete query
saleRouter.post("/delete-sales-details", async (req, res) => {
	let id = req.body.id;
	let sales_id = req.body.salesid;
	let qty = req.body.qty;
	let product_id = req.body.product_id;
	let stock_id = req.body.stock_id;
	let autidneeded = req.body.autidneeded;

	logger.debug.debug("delete sale details id > " + JSON.stringify(req.body));
	logger.debug.debug("delete sale details sales_id > " + sales_id);
	logger.debug.debug("delete sale details autidneeded > " + autidneeded);
	logger.debug.debug("delete sale details product_id > " + product_id);
	logger.debug.debug("delete sale details stock_id > " + stock_id);

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

		// step 1
		let auditPromise = await new Promise(function (resolve, reject) {
			pool.query(auditQuery, function (err, data) {
				if (err) {
					logger.debug.debug("error: " + err);
					return reject(handleError(new ErrorHandler("500", "Error adding sale audit."), res));
				}
				resolve(data);
			});
		});
	}

	// step 2
	let deletePromise = await new Promise(function (resolve, reject) {
		let query = `
				delete from sale_detail where id = '${id}' `;

		pool.query(query, function (err, data) {
			if (err) {
				return reject(handleError(new ErrorHandler("500", "Error deleting sale details"), res));
			}
			resolve(data);
		});
	});

	//

	// step 3
	let stockUpdatePromise = await new Promise(function (resolve, reject) {
		let stockUpdateQuery = `update stock set available_stock =  available_stock + '${qty}'
where product_id = '${product_id}' and id = '${stock_id}'  `;

		pool.query(stockUpdateQuery, function (err, data) {
			if (err) {
				return reject(handleError(new ErrorHandler("500", "Error deleting sale details"), res));
			}
			resolve(data);
		});
	});

	logger.debug.debug("select promise " + JSON.stringify(stockUpdatePromise));

	if (stockUpdatePromise.affectedRows === 1) {
		return res.json({
			result: "success",
		});
	} else {
		return res.json({
			result: "failed",
		});
	}
});

// insert sale details
// 1. Update Sequence Generator and form a formatted sale invoice
// 2. Insert records in sale master, if sale is via enquiry, then update enq table with saleid
// 3. Insert records in sale details
// 4. update Stock table & then update product table with current stock details
saleRouter.post("/insert-sale-details", async (req, res) => {
	const cloneReq = { ...req.body };

	logger.debug.debug("object..insert-sale-details >> " + JSON.stringify(cloneReq));

	// (1) Updates invseq in tbl financialyear, then {returns} formated sequence {YY/MM/INVSEQ}
	await updateSequenceGenerator(cloneReq);
	let invNo = await getSequenceNo(cloneReq);

	// (2)
	saleMasterEntry(cloneReq, invNo)
		.then(async (data) => {
			newPK = cloneReq.salesid === "" ? data.insertId : cloneReq.salesid;
			logger.debug.debug("New PK" + newPK);

			// if sale came from enquiry, then update the enq table with the said id {status = E (executed)}
			if (cloneReq.enqref !== 0 && cloneReq.enqref !== null) {
				await updateEnquiry(newPK, cloneReq.enqref);
			}

			// (3) - updates sale details
			let process = processItems(cloneReq, newPK);

			Promise.all([process]).then(() => {
				// ledger entry should NOT be done if status is draft ("D")
				if (cloneReq.status === "C" && cloneReq.salesid === "") {
					addSaleLedgerRecord(cloneReq, newPK, (err, data) => {
						if (err) {
							let errTxt = err.message;
							logger.debug.debug("error inserting ledger records " + errTxt);
						} else {
							res.json({ result: "success", id: newPK, invoiceno: invNo });
						}
					});
				} else if (cloneReq.status === "C" && cloneReq.salesid !== "") {
					// reverse the old ledger entry and then add a new sale entry

					addReverseSaleLedgerRecord(cloneReq, newPK, (err, data) => {
						if (err) {
							let errTxt = err.message;
							logger.debug.debug("error inserting reversal ledger records " + errTxt);
						} else {
							addSaleLedgerAfterReversalRecord(cloneReq, newPK, (err, data) => {
								if (err) {
									let errTxt = err.message;
									logger.debug.debug("error inserting ledger records " + errTxt);
								} else {
									res.json({ result: "success", id: newPK, invoiceno: invNo });
								}
							});
						}
					});
				} else {
					res.json({ result: "success", id: newPK, invoiceno: invNo });
				}
			});
		})
		.catch((err) => {
			logger.debug.debug("error: " + err);
			return handleError(new ErrorHandler("500", "Error saleMasterEntry > " + err), res);
		});
});

// Update Sequence in financial Year tbl when its fresh sale insert
function updateSequenceGenerator(cloneReq) {
	let qryUpdateSqnc = "";

	if (cloneReq.invoicetype === "gstinvoice") {
		qryUpdateSqnc = `
		update financialyear set invseq = invseq + 1 where 
		center_id = '${cloneReq.center_id}' and  
		CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;
	} else if (cloneReq.invoicetype === "stockissue") {
		qryUpdateSqnc = `
	update financialyear set stock_issue_seq = stock_issue_seq + 1 where 
	center_id = '${cloneReq.center_id}' and  
	CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;
	}

	return new Promise(function (resolve, reject) {
		pool.query(qryUpdateSqnc, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
}

// format and send sequence #
function getSequenceNo(cloneReq) {
	let invNoQry = "";
	if (cloneReq.invoicetype === "gstinvoice") {
		invNoQry = ` select concat('${moment(cloneReq.invoicedate).format("YY")}', "/", '${moment(cloneReq.invoicedate).format(
			"MM",
		)}', "/", lpad(invseq, 5, "0")) as invNo from financialyear 
				where 
				center_id = '${cloneReq.center_id}' and  
				CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;
	} else if (cloneReq.invoicetype === "stockissue") {
		invNoQry = ` select concat('SI',"-",'${moment(cloneReq.invoicedate).format("YY")}', "/", '${moment(cloneReq.invoicedate).format(
			"MM",
		)}', "/", lpad(stock_issue_seq, 5, "0")) as invNo from financialyear 
				where 
				center_id = '${cloneReq.center_id}' and  
				CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;
	}

	return new Promise(function (resolve, reject) {
		pool.query(invNoQry, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data[0].invNo);
		});
	});
}

// format and send sequence #
function saleMasterEntry(cloneReq, invNo) {
	let revisionCnt = 0;
	if (cloneReq.status === "C") {
		revisionCnt = cloneReq.revision + 1;
	}

	orderdate = cloneReq.orderdate !== "" ? moment(cloneReq.orderdate).format("DD-MM-YYYY") : "";
	lrdate = cloneReq.lrdate !== "" ? moment(cloneReq.lrdate).format("DD-MM-YYYY") : "";

	// create a invoice number and save in sale master
	let insQry = `
			INSERT INTO sale (center_id, customer_id, invoice_no, invoice_date, order_no, order_date, 
			lr_no, lr_date, sale_type,  total_qty, no_of_items, taxable_value, cgst, sgst, igst, 
			total_value, net_total, transport_charges, unloading_charges, misc_charges, status, sale_datetime, roundoff)
			VALUES
			('${cloneReq.center_id}', '${cloneReq.customerctrl.id}', 
			'${invNo}',
			'${moment(cloneReq.invoicedate).format("DD-MM-YYYY")}', '${cloneReq.orderno}', '${cloneReq.orderdate}', '${cloneReq.lrno}', '${cloneReq.lrdate}',
	 '${cloneReq.invoicetype}','${cloneReq.totalqty}', 
			'${cloneReq.noofitems}', '${cloneReq.taxable_value}', '${cloneReq.cgst}', '${cloneReq.sgst}', '${cloneReq.igst}', '${cloneReq.totalvalue}', 
			'${cloneReq.net_total}', '${cloneReq.transport_charges}', '${cloneReq.unloading_charges}', '${cloneReq.misc_charges}', '${cloneReq.status}',
			'${moment().format("DD-MM-YYYY")}', '${cloneReq.roundoff}'
			)`;

	let upQry = `
			UPDATE sale set center_id = '${cloneReq.center_id}', customer_id = '${cloneReq.customerctrl.id}', 
			order_date = '${cloneReq.orderdate}', lr_no = '${cloneReq.lrno}', sale_type = '${cloneReq.invoicetype}',
			lr_date = '${cloneReq.lrdate}', total_qty = '${cloneReq.totalqty}', no_of_items = '${cloneReq.noofitems}',
			taxable_value = '${cloneReq.taxable_value}', cgst = '${cloneReq.cgst}', sgst = '${cloneReq.sgst}', igst = '${cloneReq.igst}',
			total_value = '${cloneReq.totalvalue}', net_total = '${cloneReq.net_total}', transport_charges = '${cloneReq.transport_charges}', 
			unloading_charges = '${cloneReq.unloading_charges}', misc_charges = '${cloneReq.misc_charges}', status = '${cloneReq.status}',
			sale_datetime = '${moment().format("DD-MM-YYYY")}', revision = '${revisionCnt}', roundoff = '${cloneReq.roundoff}'
			where id= '${cloneReq.salesid}' `;

	return new Promise(function (resolve, reject) {
		pool.query(cloneReq.salesid === "" ? insQry : upQry, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
}

function updateEnquiry(newPK, enqref) {
	let uenqsaleidqry = `update enquiry set 
	estatus = 'E',
	sale_id = '${newPK}'
	where 
	id =  '${enqref}' `;
	logger.debug.debug("dinesh >> " + uenqsaleidqry);
	return new Promise(function (resolve, reject) {
		pool.query(uenqsaleidqry, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
}

async function processItems(cloneReq, newPK) {
	// if sale master insert success, then insert in sale details.

	for (const k of cloneReq.productarr) {
		let insQuery100 = `INSERT INTO sale_detail(sale_id, product_id, qty, disc_percent, disc_value, disc_type, unit_price, mrp, batchdate, tax,
												igst, cgst, sgst, taxable_value, total_value, stock_id) VALUES
												( '${newPK}', '${k.product_id}', '${k.qty}', '${k.disc_percent}', '${k.disc_value}', '${k.disc_type}', '${
			(k.total_value - k.disc_value) / k.qty
		}', '${k.mrp}', 
												'${moment().format("DD-MM-YYYY")}', '${k.taxrate}', '${k.igst}', 
												'${k.cgst}', '${k.sgst}', '${k.taxable_value}', '${k.total_value}', '${k.stock_pk}')`;

		let upQuery100 = `update sale_detail set product_id = '${k.product_id}', qty = '${k.qty}', disc_percent = '${k.disc_percent}', 
		disc_value = '${k.disc_value}',	disc_type= '${k.disc_type}', unit_price = '${(k.total_value - k.disc_value) / k.qty}', mrp = '${k.mrp}', 
												batchdate = '${moment().format("DD-MM-YYYY")}', tax = '${k.taxrate}',
												igst = '${k.igst}', cgst = '${k.cgst}', sgst = '${k.sgst}', 
												taxable_value = '${k.taxable_value}', total_value = '${k.total_value}', stock_id = '${k.stock_pk}'
												where
												id = '${k.sale_det_id}' `;

		let saleTblPromise = await new Promise(function (resolve, reject) {
			pool.query(k.sale_det_id === "" ? insQuery100 : upQuery100, function (err, data) {
				if (err) {
					reject(err);
				}
				// after sale details is updated, then update stock (as this is sale, reduce available stock) tbl & product tbl
				let qty_to_update = k.qty - k.old_val;

				let query2 = `update stock set available_stock =  available_stock - '${qty_to_update}'
			 where product_id = '${k.product_id}' and id = '${k.stock_pk}'  `;

				let stockTblPromise = new Promise(function (resolve, reject) {
					pool.query(query2, function (err, stockupdatedata) {
						if (err) {
							reject(err);
						}
						resolve(stockupdatedata);
					});
				});

				let productTblPromise = new Promise(function (resolve, reject) {
					// update current stock in product tables
					let query300 = ` update product set currentstock = (select sum(available_stock) from stock where product_id = '${k.product_id}' and id = '${k.stock_pk}')`;
					//	console.log("print dinesh" + query300);
					pool.query(query300, function (err, productupdatedata) {
						if (err) {
							reject(err);
						}
						resolve(productupdatedata);
					});
				});

				// its a hack to avoid data.insertid fix it
				if (data != null || data != undefined) {
					insertItemHistory(k, newPK, data.insertId, cloneReq);
				}

				resolve(data);
			});
		});
	}
}

// saleRouter.post("/convert-sale/:center_id/:sales_id/:oldinvoiceno", async (req, res) => {
saleRouter.post("/convert-sale", async (req, res) => {
	logger.debug.debug(" sivadinesh " + JSON.stringify(req.body));
	let center_id = req.body.center_id;
	let sales_id = req.body.sales_id;
	let old_invoice_no = req.body.old_invoice_no;
	let old_stock_issued_date = req.body.old_stock_issued_date;

	var today = new Date();
	today = moment(today).format("DD-MM-YYYY");

	// (1) Updates invseq in tbl financialyear, then {returns} formated sequence {YY/MM/INVSEQ}
	await updateSequenceGenerator({ invoicetype: "gstinvoice", center_id: center_id, invoicedate: moment() });
	let invNo = await getSequenceNo({ invoicetype: "gstinvoice", center_id: center_id, invoicedate: moment() });

	let sql = ` update sale set invoice_no = '${invNo}', sale_type = "gstinvoice", status = "C", stock_issue_ref = '${old_invoice_no}',
	invoice_date = '${today}', stock_issue_date_ref = '${moment(old_stock_issued_date).format("DD-MM-YYYY")}' where id = ${sales_id} `;
	logger.debug.debug("dinesh @@ " + sql);
	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error coverting to sale invoice."), res);
		} else {
			return res.status(200).json({
				result: "success",
				invoiceNo: invNo,
			});
		}
	});
});

// called from sale details list delete
saleRouter.get("/delete-sale/:id", async (req, res) => {
	let sale_id = req.params.id;
	logger.debug.debug("sale _id ^^" + sale_id);

	let saleDetails = await getSalesDetails(sale_id);

	let idx = 0;

	let retValue = await deleteSaleDetailsRecs(saleDetails, sale_id);

	if (retValue === "done") {
		return res.json({
			result: "success",
		});
	}
});

saleRouter.get("/delete-sale-master/:id", async (req, res) => {
	let sale_id = req.params.id;
	logger.debug.debug("sale _id ^^" + sale_id);

	let sql = `
		delete from sale where 
	id = '${sale_id}' `;
	logger.debug.debug("llllll222222 SQL " + sql);
	pool.query(sql, function (err, data) {
		if (err) {
			logger.debug.debug("what error " + JSON.stringify(err));
			return handleError(new ErrorHandler("500", "Error deleting sale detail / master"), res);
		} else {
			return res.json({
				result: "success",
			});
		}
	});
});

function deleteSaleDetailsRecs(saleDetails, sale_id) {
	let idx = 0;

	saleDetails.forEach(async (element, index) => {
		idx = index + 1;

		logger.debug.debug("object >>>>>> " + JSON.stringify(element));
		logger.debug.debug("object >>>>>><<<<<< " + idx);

		var today = new Date();
		today = moment(today).format("YYYY-MM-DD HH:mm:ss");

		let auditQuery = `
		INSERT INTO audit_tbl (module, module_ref_id, module_ref_det_id, actn, old_value, new_value, audit_date)
		VALUES
			('Sales', '${sale_id}', '${element.id}', 'delete', 
			(SELECT CONCAT('[{', result, '}]') as final
			FROM (
				SELECT GROUP_CONCAT(CONCAT_WS(',', CONCAT('"saleId": ', sale_id), CONCAT('"productId": "', product_id, '"'), CONCAT('"qty": "', qty, '"')) SEPARATOR '},{') as result
				FROM (
					SELECT sale_id, product_id, qty
					FROM sale_detail where id = '${element.id}'
				) t1
			) t2)
			, '', '${today}'
			) `;

		// step 1
		let auditPromise = await new Promise(function (resolve, reject) {
			pool.query(auditQuery, function (err, data) {
				if (err) {
					logger.debug.debug("error: " + err);
					return reject(handleError(new ErrorHandler("500", "Error adding sale audit."), res));
				}
				resolve(data);
			});
		});

		// step 2
		let deletePromise = await new Promise(function (resolve, reject) {
			let query = `
				delete from sale_detail where id = '${element.id}' `;

			pool.query(query, function (err, data) {
				if (err) {
					return reject(handleError(new ErrorHandler("500", "Error deleting sale details"), res));
				}
				resolve(data);
			});
		});

		//

		// step 3
		let stockUpdatePromise = await new Promise(function (resolve, reject) {
			let stockUpdateQuery = `update stock set available_stock =  available_stock + '${element.qty}'
where product_id = '${element.product_id}' and id = '${element.stock_id}'  `;

			pool.query(stockUpdateQuery, function (err, data) {
				if (err) {
					return reject(handleError(new ErrorHandler("500", "Error deleting sale details"), res));
				}
				resolve(data);
			});
		});

		//	logger.debug.debug("select promise " + JSON.stringify(stockUpdatePromise));
	});

	if (saleDetails.length === idx) {
		return new Promise(function (resolve, reject) {
			resolve("done");
		}).catch(() => {
			/* do whatever you want here */
		});
	}
}

function insertItemHistory(k, vSale_id, vSale_det_id, cloneReq) {
	var today = new Date();
	today = moment(today).format("DD-MM-YYYY");

	// if purchase details id is missing its new else update
	let sale_det_id = k.sale_det_id === "" ? vSale_det_id : k.sale_det_id;
	let txn_qty = k.sale_det_id === "" ? k.qty : k.qty - k.old_val;
	let actn_type = "SUB";
	let sale_id = vSale_id === "" ? k.sale_id : vSale_id;

	//txn -ve means subtract from qty
	if (txn_qty < 0) {
		actn_type = "ADD";
	}

	// convert -ve to positive number
	//~ bitwise operator. Bitwise does not negate a number exactly. eg:  ~1000 is -1001, not -1000 (a = ~a + 1)
	txn_qty = ~txn_qty + 1;

	let query2 = `
			insert into item_history (center_id, module, product_ref_id, sale_id, sale_det_id, actn, actn_type, txn_qty, stock_level, txn_date)
			values ('${cloneReq.center_id}', 'Sale', '${k.product_id}', '${sale_id}', '${sale_det_id}', 'SAL', '${actn_type}', '${txn_qty}', 
							(select (available_stock)  from stock where product_id = '${k.product_id}' and mrp = '${k.product_id}' ), '${today}' ) `;
	logger.debug.debug("sql for insertItemHistory" + query2);

	pool.query(query2, function (err, data) {
		if (err) {
			logger.debug.debug("object insertItemHistory >>" + err);
		} else {
			logger.debug.debug("object..stock update .");
		}
	});
}

// get sale master to display in sale invoice component
saleRouter.get("/get-sale-master/:sale_id", async (req, res) => {
	let sale_id = req.params.sale_id;
	let saleMaster = await getSalesMaster(sale_id);
	return res.json(saleMaster);
});

saleRouter.get("/get-sale-details/:sale_id", async (req, res) => {
	let sale_id = req.params.sale_id;
	let saleDetails = await getSalesDetails(sale_id);
	return res.json(saleDetails);
});

module.exports = saleRouter;
