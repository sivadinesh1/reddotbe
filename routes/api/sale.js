/** @format */

const express = require("express");
const saleRouter = express.Router();

const mysql = require("mysql");
const moment = require("moment");
const { handleError, ErrorHandler } = require("./../helpers/error");

var pool = require("../helpers/db");

// Get Possible Next Sale Invoice # (ReadOnly)
saleRouter.get("/get-next-sale-invoice-no/:centerid", (req, res) => {
	let center_id = req.params.centerid;

	let invoiceyear = moment().format("YY");

	let sql = `	select concat('${invoiceyear}', "/", "1", "/", lpad(invseq + 1, 5, "0")) as NxtInvNo from financialyear  where 
	center_id = '${center_id}' and  
	CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;

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

		// step 1
		let auditPromise = await new Promise(function (resolve, reject) {
			pool.query(auditQuery, function (err, data) {
				if (err) {
					console.log("error: " + err);
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

	if (deletePromise.affectedRows === 1) {
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

	console.log("object.." + JSON.stringify(cloneReq));

	// (1) Updates invseq in tbl financialyear, then {returns} formated sequence {YY/MM/INVSEQ}
	await updateSequenceGenerator(cloneReq.center_id);
	let invNo = await getSequenceNo(cloneReq);

	// (2)
	saleMasterEntry(cloneReq, invNo)
		.then(async (data) => {
			newPK = cloneReq.salesid === "" ? data.insertId : cloneReq.salesid;
			console.log("New PK" + newPK);

			// if sale came from enquiry, then update the enq table with the said id {status = E (executed)}
			if (cloneReq.enqref !== 0) {
				await updateEnquiry(newPK, cloneReq.enqref);
			}

			// (3) - updates sale details
			let process = processItems(cloneReq, newPK);

			Promise.all([process]).then(res.json({ result: "success", id: newPK, invoiceno: invNo }));
		})
		.catch((err) => {
			console.log("error: " + err);
			return handleError(new ErrorHandler("500", "Error saleMasterEntry > " + err), res);
		});
});

// Update Sequence in financial Year tbl when its fresh sale insert
function updateSequenceGenerator(center_id) {
	let qryUpdateSqnc = `
	update financialyear set invseq = invseq + 1 where 
	center_id = '${center_id}' and  
	CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;

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
	let invNoQry = ` 
			select concat('${moment(cloneReq.invoicedate).format("YY")}', "/", '${moment(cloneReq.invoicedate).format(
		"MM",
	)}', "/", lpad(invseq, 5, "0")) as invNo from financialyear 
			where 
			center_id = '${cloneReq.center_id}' and  
			CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;

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

	let orderdate = cloneReq.orderdate;
	let lrdate = cloneReq.lrdate;

	orderdate = cloneReq.orderdate !== "" ? moment(orderdate).format("DD-MM-YYYY") : "";
	lrdate = cloneReq.lrdate !== "" ? moment(lrdate).format("DD-MM-YYYY") : "";

	// create a invoice number and save in sale master
	let insQry = `
			INSERT INTO sale (center_id, customer_id, invoice_no, invoice_date, order_no, order_date, 
			lr_no, lr_date, sale_type,  total_qty, no_of_items, taxable_value, cgst, sgst, igst, 
			total_value, net_total, transport_charges, unloading_charges, misc_charges, status, sale_datetime)
			VALUES
			('${cloneReq.center_id}', '${cloneReq.customer.id}', 
			'${invNo}',
			'${moment(cloneReq.invoicedate).format("DD-MM-YYYY")}', '${cloneReq.orderno}', '${orderdate}', '${cloneReq.lrno}', '${lrdate}',
	 'GST Inovoice','${cloneReq.totalqty}', 
			'${cloneReq.noofitems}', '${cloneReq.taxable_value}', '${cloneReq.cgst}', '${cloneReq.sgst}', '${cloneReq.igst}', '${cloneReq.totalvalue}', 
			'${cloneReq.net_total}', '${cloneReq.transport_charges}', '${cloneReq.unloading_charges}', '${cloneReq.misc_charges}', '${cloneReq.status}',
			'${moment().format("DD-MM-YYYY")}'
			)`;

	let upQry = `
			UPDATE sale set center_id = '${cloneReq.center_id}', customer_id = '${cloneReq.customer.id}', 
			order_date = '${orderdate}', lr_no = '${cloneReq.lrno}',
			lr_date = '${lrdate}', total_qty = '${cloneReq.totalqty}', no_of_items = '${cloneReq.noofitems}',
			taxable_value = '${cloneReq.taxable_value}', cgst = '${cloneReq.cgst}', sgst = '${cloneReq.sgst}', igst = '${cloneReq.igst}',
			total_value = '${cloneReq.totalvalue}', net_total = '${cloneReq.net_total}', transport_charges = '${cloneReq.transport_charges}', 
			unloading_charges = '${cloneReq.unloading_charges}', misc_charges = '${cloneReq.misc_charges}', status = '${cloneReq.status}',
			sale_datetime = '${moment().format("DD-MM-YYYY")}', revision = '${revisionCnt}'
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
	console.log("dinesh >> " + uenqsaleidqry);
	return new Promise(function (resolve, reject) {
		pool.query(uenqsaleidqry, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
}

function processItems(cloneReq, newPK) {
	// if sale master insert success, then insert in invoice details.
	cloneReq.productarr.forEach(function (k) {
		let insQuery100 = `INSERT INTO sale_detail(sale_id, product_id, qty, disc_percent, disc_value, disc_type, unit_price, mrp, batchdate, tax,
												igst, cgst, sgst, taxable_value, total_value, stock_id) VALUES
												( '${newPK}', '${k.product_id}', '${k.qty}', '${k.disc_percent}', '${k.disc_value}', '${k.disc_type}', '${k.unit_price}', '${k.mrp}', 
												'${moment().format("DD-MM-YYYY")}', '${k.taxrate}', '${k.igst}', 
												'${k.cgst}', '${k.sgst}', '${k.taxable_value}', '${k.total_value}', '${k.stock_pk}')`;

		let upQuery100 = `update sale_detail set product_id = '${k.product_id}', qty = '${k.qty}', disc_percent = '${k.disc_percent}', 
		disc_value = '${k.disc_value}',	disc_type= '${k.disc_type}', unit_price = '${k.unit_price}', mrp = '${k.mrp}', 
												batchdate = '${moment().format("DD-MM-YYYY")}', tax = '${k.taxrate}',
												igst = '${k.igst}', cgst = '${k.cgst}', sgst = '${k.sgst}', 
												taxable_value = '${k.taxable_value}', total_value = '${k.total_value}', stock_id = '${k.stock_pk}'
												where
												id = '${k.sale_det_id}' `;

		console.log("object" + insQuery100);
		let saleTblPromise = new Promise(function (resolve, reject) {
			pool.query(k.sale_det_id === "" ? insQuery100 : upQuery100, function (err, data) {
				if (err) {
					reject(err);
				}
				resolve(data);
			});
		});

		console.log("object... new qty " + k.qty + " old val " + k.old_val);

		// after sale details is updated, then update stock (as this is sale, reduce available stock) tbl & product tbl
		let qty_to_update = k.qty - k.old_val;

		let query2 = `update stock set available_stock =  available_stock - '${qty_to_update}'
			 where product_id = '${k.product_id}' and id = '${k.stock_pk}'  `;

		let stockTblPromise = new Promise(function (resolve, reject) {
			pool.query(query2, function (err, data) {
				if (err) {
					reject(err);
				}
				resolve(data);
			});
		});

		let productTblPromise = new Promise(function (resolve, reject) {
			// update current stock in product table
			let query300 = ` update product set currentstock = (select sum(available_stock) from stock where product_id = '${k.product_id}')`;
			pool.query(query300, function (err, data) {
				if (err) {
					reject(err);
				}
				resolve(data);
			});
		});
	});
}

module.exports = saleRouter;
