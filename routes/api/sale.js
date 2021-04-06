const express = require('express');
const saleRouter = express.Router();
const logger = require('../../routes/helpers/log4js');

const mysql = require('mysql');
// const moment = require("moment");
const { handleError, ErrorHandler } = require('./../helpers/error');

const {
	getSalesMaster,
	getSalesDetails,
	updateStockAsync,
	updateProductAsync,
	IUSaleDetailsAsync,
	insertItemHistoryAsync,
	getNextSaleInvoiceNoAsync,
	insertAuditTblforDeleteSaleDetailsRecAsync,
	deleteSaleDetailsRecAsync,
	updateStockWhileDeleteAsync,
	updateItemHistoryTable,
} = require('../modules/sales/sales.js');

const {
	addSaleLedgerRecord,
	addReverseSaleLedgerRecord,
	addSaleLedgerAfterReversalRecord,
} = require('../modules/accounts/accounts.js');

var pool = require('../helpers/db');
const {
	toTimeZone,
	currentTimeInTimeZone,
	toTimeZoneFrmt,
} = require('./../helpers/utils');

// Get Possible Next Sale Invoice # (ReadOnly)
saleRouter.get(
	'/get-next-sale-invoice-no/:centerid/:invoicetype',
	(req, res) => {
		let center_id = req.params.centerid;
		let invoicetype = req.params.invoicetype;

		getNextSaleInvoiceNoAsync(center_id, invoicetype).then((result) => {
			return res.json(result);
		});
	}
);

// delete sale details records based on sale details id
// if audit is true, form a json string data and store in audit table
// first entry to audit table & then call the delete query
saleRouter.post('/delete-sales-details', async (req, res) => {
	let center_id = req.body.center_id;
	let id = req.body.id;
	let sales_id = req.body.salesid;
	let qty = req.body.qty;
	let product_id = req.body.product_id;
	let stock_id = req.body.stock_id;
	let mrp = req.body.mrp;
	let autidneeded = req.body.autidneeded;

	if (autidneeded) {
		let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

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
					return reject(
						handleError(
							new ErrorHandler('500', 'Error adding sale audit.', err),
							res
						)
					);
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
				return reject(
					handleError(
						new ErrorHandler('500', 'Error deleting sale details', err),
						res
					)
				);
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
				return reject(
					handleError(new ErrorHandler('500', 'Error update stock ', err), res)
				);
			}
			resolve(data);
		});
	});

	if (stockUpdatePromise.affectedRows === 1) {
		// step 4 - update item history table. as items are deleted, items has to be reversed

		let updateitemhistorytbl = await updateItemHistoryTable(
			center_id,
			'Sale',
			product_id,
			sales_id,
			id,
			'SAL',
			'Mod/Del',
			qty,
			mrp
		);

		return res.json({
			result: 'success',
		});
	} else {
		return res.json({
			result: 'failed',
		});
	}
});

// insert sale details
// 1. Update Sequence Generator and form a formatted sale invoice
// 2. Insert records in sale master, if sale is via enquiry, then update enq table with saleid
// 3. Insert records in sale details
// 4. update Stock table & then update product table with current stock details
saleRouter.post('/insert-sale-details', async (req, res) => {
	const cloneReq = { ...req.body };

	// (1) Updates invseq in tbl financialyear, then {returns} formated sequence {YY/MM/INVSEQ}
	if (cloneReq.status === 'C' && cloneReq.revision === 0) {
		await updateSequenceGenerator(cloneReq);
	} else if (cloneReq.status === 'D') {
		if (cloneReq.invoiceno !== undefined && cloneReq.invoiceno !== null) {
			if (cloneReq.invoiceno.startsWith('D')) {
				// do nothing
			} else {
				await updateDraftSequenceGenerator(cloneReq);
			}
		}
	}

	let invNo = '';
	// always very first insert will increment revision to 1, on consicutive inserts, it will be +1
	if (cloneReq.status === 'C' && cloneReq.revision === 0) {
		invNo = await getSequenceNo(cloneReq);
	} else if (cloneReq.status === 'D') {
		if (cloneReq.invoiceno !== undefined && cloneReq.invoiceno !== null) {
			if (cloneReq.invoiceno.startsWith('D')) {
				invNo = cloneReq.invoiceno;
			} else {
				invNo = await getSequenceNo(cloneReq);
			}
		}
	} else if (cloneReq.status === 'C' && cloneReq.revision !== 0) {
		invNo = cloneReq.invoiceno;
	}

	// (2)
	saleMasterEntry(cloneReq, invNo)
		.then(async (data) => {
			const start = Date.now();

			newPK = cloneReq.salesid === '' ? data.insertId : cloneReq.salesid;

			// if sale came from enquiry, then update the enq table with the said id {status = E (executed)}
			if (cloneReq.enqref !== 0 && cloneReq.enqref !== null) {
				await updateEnquiry(newPK, cloneReq.enqref);
			}

			// (3) - updates sale details
			let process = processItems(cloneReq, newPK);

			// Promise.all([process]).then(() => {
			// ledger entry should NOT be done if status is draft ("D")
			if (cloneReq.status === 'C' && cloneReq.salesid === '') {
				await addSaleLedgerRecord(cloneReq, newPK);
				res.json({ result: 'success', id: newPK, invoiceno: invNo });
			} else if (cloneReq.status === 'C' && cloneReq.salesid !== '') {
				// reverse the old ledger entry and then add a new sale entry. scenario: sale completed, but after sale, if any changes done,
				// we reverse old entries and create new entries.

				await addReverseSaleLedgerRecord(cloneReq, newPK);
				await addSaleLedgerAfterReversalRecord(cloneReq, newPK);
				res.json({ result: 'success', id: newPK, invoiceno: invNo });
			} else {
				// draft scenario
				res.json({ result: 'success', id: newPK, invoiceno: invNo });
			}
			// });
		})
		.catch((err) => {
			return handleError(
				new ErrorHandler('500', 'Error saleMasterEntry > ', err),
				res
			);
		});
});

// Update Sequence in financial Year tbl when its fresh sale insert
function updateSequenceGenerator(cloneReq) {
	let qryUpdateSqnc = '';

	if (cloneReq.invoicetype === 'gstinvoice') {
		qryUpdateSqnc = `
		update financialyear set invseq = invseq + 1 where 
		center_id = '${cloneReq.center_id}' and  
		CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;
	} else if (cloneReq.invoicetype === 'stockissue') {
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

// Update Sequence in financial Year tbl DRAFT
function updateDraftSequenceGenerator(cloneReq) {
	let qryUpdateSqnc = '';

	if (cloneReq.invoicetype === 'gstinvoice') {
		qryUpdateSqnc = `
		update financialyear set draft_inv_seq = draft_inv_seq + 1 where 
		center_id = '${cloneReq.center_id}' and  
		CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;
	} else if (cloneReq.invoicetype === 'stockissue') {
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
	let invNoQry = '';
	if (cloneReq.invoicetype === 'gstinvoice' && cloneReq.status !== 'D') {
		invNoQry = ` select 
		concat('${currentTimeInTimeZone('Asia/Kolkata', 'YY')}', "/", 
		'${currentTimeInTimeZone(
			'Asia/Kolkata',
			'MM'
		)}', "/", lpad(invseq, 5, "0")) as invNo from financialyear 
				where 
				center_id = '${cloneReq.center_id}' and  
				CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;
	} else if (cloneReq.invoicetype === 'gstinvoice' && cloneReq.status === 'D') {
		invNoQry = ` select concat("D/", 
		'${currentTimeInTimeZone('Asia/Kolkata', 'YY')}', "/", 
		'${currentTimeInTimeZone(
			'Asia/Kolkata',
			'MM'
		)}', "/", lpad(draft_inv_seq, 5, "0")) as invNo from financialyear 
							where 
							center_id = '${cloneReq.center_id}' and  
							CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;
	} else if (cloneReq.invoicetype === 'stockissue') {
		invNoQry = ` select concat('SI',"-",'${currentTimeInTimeZone(
			'Asia/Kolkata',
			'YY'
		)}', "/", 
		'${currentTimeInTimeZone(
			'Asia/Kolkata',
			'MM'
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

	// always very first insert will increment revision to 1, on consicutive inserts, it will be +1
	if (cloneReq.status === 'C' && cloneReq.revision === 0) {
		revisionCnt = 1;
	} else if (cloneReq.status === 'C' && cloneReq.revision !== 0) {
		revisionCnt = cloneReq.revision + 1;
	}

	let orderdate =
		cloneReq.orderdate !== '' && cloneReq.orderdate !== null
			? toTimeZone(cloneReq.orderdate, 'Asia/Kolkata')
			: '';
	let lrdate =
		cloneReq.lrdate !== '' && cloneReq.lrdate !== null
			? toTimeZone(cloneReq.lrdate, 'Asia/Kolkata')
			: '';

	// create a invoice number and save in sale master
	let insQry = `
			INSERT INTO sale (center_id, customer_id, invoice_no, invoice_date, order_no, order_date, 
			lr_no, lr_date, sale_type,  total_qty, no_of_items, taxable_value, cgst, sgst, igst, 
			total_value, net_total, transport_charges, unloading_charges, misc_charges, status, 
			sale_datetime, roundoff, revision, retail_customer_name, retail_customer_address)
			VALUES
			('${cloneReq.center_id}', '${cloneReq.customerctrl.id}', 
			'${invNo}',
			'${toTimeZone(cloneReq.invoicedate, 'Asia/Kolkata')}', '${
		cloneReq.orderno
	}', '${orderdate}', '${cloneReq.lrno}', '${cloneReq.lrdate}',
	 '${cloneReq.invoicetype}','${cloneReq.totalqty}', 
			'${cloneReq.noofitems}', '${cloneReq.taxable_value}', '${cloneReq.cgst}', '${
		cloneReq.sgst
	}', '${cloneReq.igst}', '${cloneReq.totalvalue}', 
			'${cloneReq.net_total}', '${cloneReq.transport_charges}', '${
		cloneReq.unloading_charges
	}', '${cloneReq.misc_charges}', '${cloneReq.status}',
			'${currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY HH:mm:ss')}', '${
		cloneReq.roundoff
	}', '${revisionCnt}', '${cloneReq.retail_customer_name}', '${
		cloneReq.retail_customer_address
	}'
			)`;

	let upQry = `
			UPDATE sale set center_id = '${cloneReq.center_id}', customer_id = '${
		cloneReq.customerctrl.id
	}', 
			invoice_no = '${invNo}',
			invoice_date = 	'${toTimeZone(cloneReq.invoicedate, 'Asia/Kolkata')}', 
			order_date = '${orderdate}', lr_no = '${cloneReq.lrno}', sale_type = '${
		cloneReq.invoicetype
	}',
			lr_date = '${cloneReq.lrdate}', total_qty = '${
		cloneReq.totalqty
	}', no_of_items = '${cloneReq.noofitems}',
			taxable_value = '${cloneReq.taxable_value}', cgst = '${
		cloneReq.cgst
	}', sgst = '${cloneReq.sgst}', igst = '${cloneReq.igst}',
			total_value = '${cloneReq.totalvalue}', net_total = '${
		cloneReq.net_total
	}', transport_charges = '${cloneReq.transport_charges}', 
			unloading_charges = '${cloneReq.unloading_charges}', misc_charges = '${
		cloneReq.misc_charges
	}', status = '${cloneReq.status}',
			sale_datetime = 	'${currentTimeInTimeZone(
				'Asia/Kolkata',
				'DD-MM-YYYY HH:mm:ss'
			)}', revision = '${revisionCnt}', roundoff = '${cloneReq.roundoff}', 
			retail_customer_name = '${cloneReq.retail_customer_name}',
			retail_customer_address = '${cloneReq.retail_customer_address}'
			where id= '${cloneReq.salesid}' `;

	return new Promise(function (resolve, reject) {
		pool.query(cloneReq.salesid === '' ? insQry : upQry, function (err, data) {
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
		let p_data = await IUSaleDetailsAsync(k); //returns promise
		let p_data1 = await updateStockAsync(k); // returns promise
		//	let p_data2 = await updateProductAsync(k); // updating product master is not necessary, check if needed
		let p_data3;

		// its a hack to avoid data.insertid fix it
		if (p_data != null || p_data != undefined) {
			if (
				cloneReq.status === 'C' ||
				(cloneReq.status === 'D' && cloneReq.invoicetype === 'stockissue')
			) {
				p_data3 = insertItemHistoryAsync(k, newPK, p_data.insertId, cloneReq); // returns promise
			}
		}

		Promise.all([p_data, p_data1, p_data3]);
	}
}

// convert stock issue to sale
// 1. update sale table with status 'C' & sale type as 'gstinvoice'
// 2. insert ledger with payment details
saleRouter.post('/convert-sale', async (req, res) => {
	let center_id = req.body.center_id;
	let sales_id = req.body.sales_id;
	let old_invoice_no = req.body.old_invoice_no;
	let old_stock_issued_date = req.body.old_stock_issued_date;
	let customer_id = req.body.customer_id;
	let net_total = req.body.net_total;

	let today = currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY');

	// (1) Updates invseq in tbl financialyear, then {returns} formated sequence {YY/MM/INVSEQ}
	await updateSequenceGenerator({
		invoicetype: 'gstinvoice',
		center_id: center_id,
		invoicedate: today,
	});
	let invNo = await getSequenceNo({
		invoicetype: 'gstinvoice',
		center_id: center_id,
		invoicedate: today,
	});

	let sql = ` update sale set invoice_no = '${invNo}', sale_type = "gstinvoice", status = "C", stock_issue_ref = '${old_invoice_no}',
	invoice_date = '${today}', 
	stock_issue_date_ref =
	'${toTimeZone(old_stock_issued_date, 'Asia/Kolkata')}'
	
	where id = ${sales_id} `;

	pool.query(sql, async function (err, data) {
		if (err) {
			return handleError(
				new ErrorHandler(
					'500',
					'Error update sale coverting to sale invoice.',
					err
				),
				res
			);
		} else {
			await addSaleLedgerRecord(
				{
					center_id: center_id,
					customerctrl: { id: customer_id },
					net_total: net_total,
				},
				sales_id
			);

			return res.status(200).json({
				result: 'success',
				invoiceNo: invNo,
			});
		}
	});
});

// called from sale details list delete
saleRouter.get('/delete-sale/:id', async (req, res) => {
	let sale_id = req.params.id;

	let saleDetails = await getSalesDetails(sale_id);

	let idx = 0;

	let retValue = await deleteSaleDetailsRecs(saleDetails, sale_id);

	if (retValue === 'done') {
		return res.json({
			result: 'success',
		});
	}
});

saleRouter.get('/delete-sale-master/:id', async (req, res) => {
	let sale_id = req.params.id;

	let sql = `
		delete from sale where 
	id = '${sale_id}' `;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(
				new ErrorHandler('500', `/delete-sale-master/:id ${sale_id}`, err),
				res
			);
		} else {
			return res.json({
				result: 'success',
			});
		}
	});
});

function deleteSaleDetailsRecs(saleDetails, sale_id) {
	let idx = 0;

	saleDetails.forEach(async (element, index) => {
		idx = index + 1;

		// step 1
		let p_audit = await insertAuditTblforDeleteSaleDetailsRecAsync(
			element,
			sale_id
		);

		// step 2
		let p_delete = await deleteSaleDetailsRecAsync(element);

		// step 3
		let p_stock_update = await updateStockWhileDeleteAsync(element);
	});

	if (saleDetails.length === idx) {
		return new Promise(function (resolve, reject) {
			resolve('done');
		}).catch(() => {
			/* do whatever you want here */
		});
	}
}

// get sale master to display in sale invoice component
saleRouter.get('/get-sale-master/:sale_id', async (req, res) => {
	let sale_id = req.params.sale_id;
	let saleMaster = await getSalesMaster(sale_id);
	return res.json(saleMaster);
});

saleRouter.get('/get-sale-details/:sale_id', async (req, res) => {
	let sale_id = req.params.sale_id;
	let saleDetails = await getSalesDetails(sale_id);
	return res.json(saleDetails);
});

module.exports = saleRouter;
