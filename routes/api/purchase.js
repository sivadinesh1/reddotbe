const express = require('express');
const purchaseRouter = express.Router();
const logger = require('../../routes/helpers/log4js');

const mysql = require('mysql');

const { handleError, ErrorHandler } = require('../helpers/error');

var pool = require('../helpers/db');
const { toTimeZone, currentTimeInTimeZone } = require('./../helpers/utils');

const {
	addPurchaseLedgerRecord,
	addReversePurchaseLedgerRecord,
	addPurchaseLedgerAfterReversalRecord,
	getPurchaseInvoiceByCenter,
} = require('../modules/accounts/purchaseaccounts');

purchaseRouter.post('/insert-purchase-details', async (req, res) => {
	const cloneReq = { ...req.body };

	//	let today = currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY');

	let newPK = await purchaseMasterEntry(cloneReq);

	try {
		let processItemsPromise = processItems(cloneReq, newPK);

		// ledger entry should NOT be done if status is draft ("D")
		if (cloneReq.status === 'C' && cloneReq.purchaseid === '') {
			await addPurchaseLedgerRecord(cloneReq, newPK);
		} else if (cloneReq.status === 'C' && cloneReq.purchaseid !== '') {
			await addReversePurchaseLedgerRecord(cloneReq, newPK);
			await addPurchaseLedgerAfterReversalRecord(cloneReq, newPK);
		} else {
		}

		res.json({
			result: 'success',
		});
	} catch (err) {
		return handleError(
			new ErrorHandler(
				'500',
				'Error saleMasterEntry > /insert-purchase-details',
				err
			),
			res
		);
	}
});

function purchaseMasterEntry(cloneReq) {
	let revisionCnt = 0;

	// always very first insert will increment revision to 1, on consicutive inserts, it will be +1
	if (cloneReq.status === 'C' && cloneReq.revision === 0) {
		revisionCnt = 1;
	} else if (cloneReq.status === 'C' && cloneReq.revision !== 0) {
		revisionCnt = cloneReq.revision + 1;
	}

	let today = currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY HH:mm:ss');

	let orderdate =
		cloneReq.orderdate !== ''
			? toTimeZone(cloneReq.orderdate, 'Asia/Kolkata')
			: '';
	let lrdate =
		cloneReq.lrdate !== '' ? toTimeZone(cloneReq.lrdate, 'Asia/Kolkata') : '';
	let orderrcvddt =
		cloneReq.orderrcvddt !== ''
			? toTimeZone(cloneReq.orderrcvddt, 'Asia/Kolkata')
			: '';

	let insQry = `
			INSERT INTO purchase ( center_id, vendor_id, invoice_no, invoice_date, lr_no, lr_date, received_date, 
			purchase_type, order_no, order_date, total_qty, no_of_items, taxable_value, cgst, sgst, igst, 
			total_value, transport_charges, unloading_charges, misc_charges, net_total, no_of_boxes, status, stock_inwards_datetime, roundoff, revision)
			VALUES
			( '${cloneReq.centerid}', '${cloneReq.vendorctrl.id}', '${cloneReq.invoiceno}', 
			
			'${toTimeZone(cloneReq.invoicedate, 'Asia/Kolkata')}', 
			'${cloneReq.lrno}', '${lrdate}', 
			'${orderrcvddt}', 'GST Inovoice', '${cloneReq.orderno}', '${orderdate}', 
			'${cloneReq.totalqty}', '${cloneReq.noofitems}', '${
		cloneReq.taxable_value
	}', '${cloneReq.cgst}', 
			'${cloneReq.sgst}', '${cloneReq.igst}', '${cloneReq.totalvalue}', '${
		cloneReq.transport_charges
	}', 
			'${cloneReq.unloading_charges}', '${cloneReq.misc_charges}', '${
		cloneReq.net_total
	}', 
			'${cloneReq.noofboxes}', '${cloneReq.status}' , 
			'${currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY HH:mm:ss')}',
			'${cloneReq.roundoff}', '${revisionCnt}' )`;

	let updQry = ` update purchase set center_id = '${
		cloneReq.centerid
	}', vendor_id = '${cloneReq.vendorctrl.id}',
			invoice_no = '${cloneReq.invoiceno}', 
			invoice_date = '${toTimeZone(cloneReq.invoicedate, 'Asia/Kolkata')}', 
			lr_no = '${cloneReq.lrno}',
			lr_date = '${lrdate}', received_date = '${orderrcvddt}', purchase_type = 'GST Inovoice',
			order_no = '${cloneReq.orderno}', order_date = '${orderdate}', total_qty = '${
		cloneReq.totalqty
	}', 
			no_of_items = '${cloneReq.noofitems}', taxable_value = '${
		cloneReq.taxable_value
	}', cgst = '${cloneReq.cgst}', 
			sgst = '${cloneReq.sgst}', igst = '${cloneReq.igst}', total_value = '${
		cloneReq.totalvalue
	}', 
			transport_charges = '${cloneReq.transport_charges}', unloading_charges = '${
		cloneReq.unloading_charges
	}', 
			misc_charges = '${cloneReq.misc_charges}', net_total = '${
		cloneReq.net_total
	}', no_of_boxes = '${cloneReq.noofboxes}',
			status =  '${
				cloneReq.status
			}', stock_inwards_datetime =  '${today}', roundoff = '${
		cloneReq.roundoff
	}',
			revision = '${revisionCnt}'
			where id = '${cloneReq.purchaseid}' `;

	return new Promise(function (resolve, reject) {
		pool.query(
			cloneReq.purchaseid === '' ? insQry : updQry,
			function (err, data) {
				if (err) {
					return reject(
						new ErrorHandler('500', 'Error Purchase master entry.', err),
						res
					);
				}
				if (cloneReq.purchaseid === '') {
					newPK = data.insertId;
				} else if (cloneReq.purchaseid != '') {
					newPK = cloneReq.purchaseid;
				}

				return resolve(newPK);
			}
		);
	});
}

async function processItems(cloneReq, newPK) {
	for (const k of cloneReq.productarr) {
		let insQuery1 = ` INSERT INTO purchase_detail(purchase_id, product_id, qty, purchase_price, mrp, batchdate, tax,
			igst, cgst, sgst, taxable_value, total_value, stock_id) VALUES
			( '${newPK}', '${k.product_id}', '${k.qty}', '${k.purchase_price}', '${k.mrp}', 
			'${currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY')}',
			'${k.taxrate}', '${k.igst}', 
			'${k.cgst}', '${k.sgst}', '${k.taxable_value}', '${k.total_value}', '${
			k.stock_pk
		}') `;

		let updQuery1 = ` update purchase_detail set purchase_id = '${
			k.purchase_id
		}', product_id = '${k.product_id}', 
			qty = '${k.qty}', purchase_price = '${k.purchase_price}', mrp = '${k.mrp}', 
			batchdate = '${currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY')}', 
			tax = '${k.taxrate}', igst = '${k.igst}', cgst = '${k.cgst}', sgst = '${
			k.sgst
		}', 
			taxable_value =  '${k.taxable_value}', total_value = '${
			k.total_value
		}', stock_id = '${k.stock_pk}' where
			id = '${k.pur_det_id}' `;

		await new Promise(function (resolve, reject) {
			pool.query(
				k.pur_det_id === '' ? insQuery1 : updQuery1,
				async function (err, data) {
					if (err) {
						return reject(
							new ErrorHandler('500', 'Error Purchase process items.', err),
							res
						);
					} else {
						updateLatestPurchasePrice(k);

						if (`${k.mrp_change_flag}` === 'Y') {
							// get pur_det_id for both insert and update - check
							// if insert its: data.insertId
							// for update its k.k.pur_det_id

							let pdetailid =
								k.pur_det_id === '' ? data.insertId : k.pur_det_id;

							// if mrp flag is true the insert new record to stocks
							let stockid = await insertStock(k);
							let isupdated = await updatePurchaseDetail(pdetailid, stockid);
							insertItemHistory(k, newPK, data.insertId, cloneReq);
						} else {
							// else update the stock tbl, only of the status is "C - completed", draft should be ignored

							//	if (cloneReq.status === "C") {
							// update stock for both status C & D (Completed & Draft)
							let isupdated = await updateStock(k);
							insertItemHistory(k, newPK, data.insertId, cloneReq);

							//		}
						}

						// if (cloneReq.status === 'C') {
						// 	insertItemHistory(k, newPK, data.insertId, cloneReq);
						// }

						resolve(true);
					}
				}
			);
		});
	}
}

function insertStock(k) {
	todayYYMMDD = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD');
	let query2 = `
	insert into stock (product_id, mrp, available_stock, open_stock, updateddate)
	values ('${k.product_id}', '${k.mrp}', '${k.qty}', 0, '${todayYYMMDD}')`;

	return new Promise(function (resolve, reject) {
		pool.query(query2, function (err, data) {
			if (err) {
				return reject(
					new ErrorHandler('500', 'Error insertStock in Purchasejs.', err),
					res
				);
			} else {
				resolve(data.insertId);
			}
		});
	});
}

function updatePurchaseDetail(purchaseDetailId, stockid) {
	todayYYMMDD = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD');

	let query3 = `

			update purchase_detail set stock_id =  '${stockid}'
			where id  = '${purchaseDetailId}' `;

	return new Promise(function (resolve, reject) {
		pool.query(query3, function (err, data) {
			if (err) {
				return reject(
					new ErrorHandler('500', 'Error updateStock in Purchasejs.', err),
					res
				);
			} else {
				resolve('purchase_detail_updated');
			}
		});
	});
}

// function insertStock(k, pdetailid) {
// 	todayYYMMDD = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD');
// 	let query2 = `
// 	insert into stock (product_id, mrp, available_stock, open_stock, updateddate)
// 	values ('${k.product_id}', '${k.mrp}', '${k.qty}', 0, '${todayYYMMDD}')`;

// 	pool.query(query2, function (err, data) {
// 		if (err) {
// 		} else {
// 			let query3 = `

// 			update purchase_detail set stock_id =  '${data.insertId}'
// 			where id  = '${pdetailid}' `;

// 			pool.query(query3, function (err, data) {
// 				if (err) {
// 				} else {
// 				}
// 			});
// 		}
// 	});
// }

function updateStock(k) {
	let qty_to_update = k.qty - k.old_val;

	let query2 = `

update stock set available_stock =  available_stock + '${qty_to_update}'
where product_id = '${k.product_id}' and id = '${k.stock_pk}' `;

	return new Promise(function (resolve, reject) {
		pool.query(query2, function (err, data) {
			if (err) {
				return reject(
					new ErrorHandler('500', 'Error updateStock in Purchasejs.', err),
					res
				);
			}
			return resolve('updated');
		});
	});
}

// when purchasing, for company both unit_price (use in sales screen reports) & purchase_price are same
function updateLatestPurchasePrice(k) {
	let query2 = `

update product set purchase_price = '${k.purchase_price}', unit_price = '${k.purchase_price}'
where id = '${k.product_id}'  `;

	pool.query(query2, function (err, data) {
		if (err) {
		} else {
		}
	});
}

//vPurchase_id - purchase_id && vPurchase_det_id - new purchase_detail id
// k - looped purchase details array
function insertItemHistory(k, vPurchase_id, vPurchase_det_id, cloneReq) {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY HH:mm:ss');

	// if purchase details id is missing its new else update
	let purchase_det_id = k.pur_det_id === '' ? vPurchase_det_id : k.pur_det_id;
	let txn_qty = k.pur_det_id === '' ? k.qty : k.qty - k.old_val;
	// let actn_type = "ADD";
	let purchase_id = vPurchase_id === '' ? k.purchase_id : vPurchase_id;

	// scenario: purhcase added > draft status > now create purchase entry. txn_qty will be zero, because old_val & current_val will be same
	// this is a fix for above scenario
	if (cloneReq.revision === 0 && txn_qty === 0) {
		txn_qty = k.qty;
	}

	//let purchase_det_id = k.pur_det_id;
	//let txn_qty = k.qty;
	let actn_type = 'Purchased';
	//	let purchase_id = k.purchase_id;

	//txn -ve means subtract from qty
	if (txn_qty < 0) {
		actn_type = 'Mod/Del';
	}

	if (txn_qty !== 0) {
		let query2 = `
			insert into item_history (center_id, module, product_ref_id, purchase_id, purchase_det_id, actn, actn_type, txn_qty, stock_level, txn_date)
			values ('${cloneReq.centerid}', 'Purchase', '${k.product_id}', '${purchase_id}', '${purchase_det_id}', 'PUR', '${actn_type}', '${txn_qty}', 
							(select IFNULL(available_stock, 0) as available_stock  from stock where product_id = '${k.product_id}' and mrp = '${k.mrp}' ), '${today}' ) `;

		pool.query(query2, function (err, data) {
			if (err) {
			} else {
			}
		});
	}
}

module.exports = purchaseRouter;
