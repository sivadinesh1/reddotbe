const express = require("express");
const purchaseRouter = express.Router();
const logger = require("../../routes/helpers/log4js");

const mysql = require("mysql");
const moment = require("moment");
const { handleError, ErrorHandler } = require("../helpers/error");

var pool = require("../helpers/db");

purchaseRouter.post("/insert-purchase-details", async (req, res) => {
	const cloneReq = { ...req.body };

	logger.debug.debug("din " + JSON.stringify(cloneReq));

	var today = new Date();
	today = moment(today).format("DD-MM-YYYY");

	let newPK = await purchaseMasterEntry(cloneReq);

	try {
		let processItemsPromise = processItems(cloneReq, newPK);

		res.json({
			result: "success",
		});
	} catch (err) {
		return handleError(new ErrorHandler("500", "Error saleMasterEntry > " + err), res);
	}
});

function purchaseMasterEntry(cloneReq) {
	var today = new Date();
	// today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	today = moment(today).format("DD-MM-YYYY HH:mm:ss");
	// var today = new Date();
	// today = moment(today).format("DD-MM-YYYY");

	// str_to_date(stock_inwards_datetime, '%Y-%m-%d %T') between
	// str_to_date('2020-05-01 00:00:00', '%Y-%m-%d %T') and
	// str_to_date('2020-05-08 23:59:00', '%Y-%m-%d %T')

	let invoicedate = cloneReq.invoicedate !== "" ? moment(cloneReq.invoicedate).format("DD-MM-YYYY") : "";
	let orderdate = cloneReq.orderdate !== "" ? moment(cloneReq.orderdate).format("DD-MM-YYYY") : "";
	let lrdate = cloneReq.lrdate !== "" ? moment(cloneReq.lrdate).format("DD-MM-YYYY") : "";
	let orderrcvddt = cloneReq.orderrcvddt !== "" ? moment(cloneReq.orderrcvddt).format("DD-MM-YYYY") : "";

	let insQry = `
			INSERT INTO purchase ( center_id, vendor_id, invoice_no, invoice_date, lr_no, lr_date, received_date, 
			purchase_type, order_no, order_date, total_qty, no_of_items, taxable_value, cgst, sgst, igst, 
			total_value, transport_charges, unloading_charges, misc_charges, net_total, no_of_boxes, status, stock_inwards_datetime, roundoff)
			VALUES
			( '${cloneReq.centerid}', '${cloneReq.vendorctrl.id}', '${cloneReq.invoiceno}', '${invoicedate}', '${cloneReq.lrno}', '${lrdate}', 
			'${orderrcvddt}', 'GST Inovoice', '${cloneReq.orderno}', '${orderdate}', 
			'${cloneReq.totalqty}', '${cloneReq.noofitems}', '${cloneReq.taxable_value}', '${cloneReq.cgst}', 
			'${cloneReq.sgst}', '${cloneReq.igst}', '${cloneReq.totalvalue}', '${cloneReq.transport_charges}', 
			'${cloneReq.unloading_charges}', '${cloneReq.misc_charges}', '${cloneReq.net_total}', 
			'${cloneReq.noofboxes}', '${cloneReq.status}' , '${today}', '${cloneReq.roundoff}' )`;

	let updQry = ` update purchase set center_id = '${cloneReq.centerid}', vendor_id = '${cloneReq.vendorctrl.id}',
			invoice_no = '${cloneReq.invoiceno}', invoice_date = '${moment(cloneReq.invoicedate).format("DD-MM-YYYY")}', lr_no = '${cloneReq.lrno}',
			lr_date = '${lrdate}', received_date = '${orderrcvddt}', purchase_type = 'GST Inovoice',
			order_no = '${cloneReq.orderno}', order_date = '${orderdate}', total_qty = '${cloneReq.totalqty}', 
			no_of_items = '${cloneReq.noofitems}', taxable_value = '${cloneReq.taxable_value}', cgst = '${cloneReq.cgst}', 
			sgst = '${cloneReq.sgst}', igst = '${cloneReq.igst}', total_value = '${cloneReq.totalvalue}', 
			transport_charges = '${cloneReq.transport_charges}', unloading_charges = '${cloneReq.unloading_charges}', 
			misc_charges = '${cloneReq.misc_charges}', net_total = '${cloneReq.net_total}', no_of_boxes = '${cloneReq.noofboxes}',
			status =  '${cloneReq.status}', stock_inwards_datetime =  '${today}', roundoff = '${cloneReq.roundoff}' where id = '${cloneReq.purchaseid}' `;

	logger.debug.debug("dinesh " + updQry);

	return new Promise(function (resolve, reject) {
		pool.query(cloneReq.purchaseid === "" ? insQry : updQry, function (err, data) {
			if (err) {
				logger.debug.debug("Error Purchase master entry. " + JSON.stringify(err));
				return reject(new ErrorHandler("500", "Error Purchase master entry."), res);
			}
			if (cloneReq.purchaseid === "") {
				newPK = data.insertId;
			} else if (cloneReq.purchaseid != "") {
				newPK = cloneReq.purchaseid;
			}

			return resolve(newPK);
		});
	});
}

function processItems(cloneReq, newPK) {
	cloneReq.productarr.forEach(function (k) {
		let insQuery1 = ` INSERT INTO purchase_detail(purchase_id, product_id, qty, purchase_price, mrp, batchdate, tax,
			igst, cgst, sgst, taxable_value, total_value, stock_id) VALUES
			( '${newPK}', '${k.product_id}', '${k.qty}', '${k.purchase_price}', '${k.mrp}', '${moment().format("DD-MM-YYYY")}', '${k.taxrate}', '${k.igst}', 
			'${k.cgst}', '${k.sgst}', '${k.taxable_value}', '${k.total_value}', '${k.stock_pk}') `;

		let updQuery1 = ` update purchase_detail set purchase_id = '${k.purchase_id}', product_id = '${k.product_id}', 
			qty = '${k.qty}', purchase_price = '${k.purchase_price}', mrp = '${k.mrp}', batchdate = '${moment().format("DD-MM-YYYY")}', 
			tax = '${k.taxrate}', igst = '${k.igst}', cgst = '${k.cgst}', sgst = '${k.sgst}', 
			taxable_value =  '${k.taxable_value}', total_value = '${k.total_value}', stock_id = '${k.stock_pk}' where
			id = '${k.pur_det_id}' `;

		new Promise(function (resolve, reject) {
			pool.query(k.pur_det_id === "" ? insQuery1 : updQuery1, function (err, data) {
				if (err) {
					logger.debug.debug("Error Purchase Details entry... processItems " + JSON.stringify(err));
					console.log("Error Purchase Details entry... processItems " + JSON.stringify(err));
					return reject(new ErrorHandler("500", "Error Purchase master entry."), res);
				} else {
					updateLatestPurchasePrice(k);

					if (`${k.mrp_change_flag}` === "Y") {
						// get pur_det_id for both insert and update - check
						// if insert its: data.insertId
						// for update its k.k.pur_det_id

						let pdetailid = k.pur_det_id === "" ? data.insertId : k.pur_det_id;

						logger.debug.debug("print the purchase detail id for both insert and upadte  " + JSON.stringify(data));
						// if mrp flag is true the insert new record to stocks
						insertStock(k, pdetailid);
					} else {
						// else update the stock tbl, only of the status is "C - completed", draft should be ignored

						//	if (cloneReq.status === "C") {
						// update stock for both status C & D (Completed & Draft)
						updateStock(k);
						//		}
					}
					logger.debug.debug("delete this " + JSON.stringify(data));
					insertItemHistory(k, newPK, data.insertId, cloneReq);

					resolve(true);
				}
			});
		});
	});
}

function insertStock(k, pdetailid) {
	let upDate = new Date();
	todayYYMMDD = moment(upDate).format("YYYY-MM-DD");
	let query2 = `
	insert into stock (product_id, mrp, available_stock, open_stock, updateddate)
	values ('${k.product_id}', '${k.mrp}', '${k.qty}', 0, '${todayYYMMDD}')`;

	pool.query(query2, function (err, data) {
		if (err) {
			logger.debug.debug("object" + err);
		} else {
			logger.debug.debug("object..stock update .");

			let query3 = `

			update purchase_detail set stock_id =  '${data.insertId}'
			where id  = '${pdetailid}' `;

			pool.query(query3, function (err, data) {
				if (err) {
					logger.debug.debug("object" + err);
				} else {
					logger.debug.debug("New Stock id due to MRP change is updated back in  purchase details table.");
				}
			});
		}
	});
}

function updateStock(k) {
	let qty_to_update = k.qty - k.old_val;
	logger.debug.debug("old val > " + k.old_val);
	logger.debug.debug("qty val > " + k.qty);
	logger.debug.debug("qty_to_update val > " + k.qty);

	let query2 = `

update stock set available_stock =  available_stock + '${qty_to_update}'
where product_id = '${k.product_id}' and id = '${k.stock_pk}' `;

	pool.query(query2, function (err, data) {
		if (err) {
			logger.debug.debug("object..stock update .");
		} else {
			logger.debug.debug("object..stock update .");
		}
	});
}

// when purchasing, for company both unit_price (use in sales screen reports) & purchase_price are same
function updateLatestPurchasePrice(k) {
	let query2 = `

update product set purchase_price = '${k.purchase_price}', unit_price = '${k.purchase_price}'
where id = '${k.product_id}'  `;
	logger.debug.debug("object.. di.." + query2);

	pool.query(query2, function (err, data) {
		if (err) {
			logger.debug.debug("object..purchase price update error .");
		} else {
			logger.debug.debug("object..purchase price updated .");
		}
	});
}

function insertItemHistory(k, vPurchase_id, vPurchase_det_id, cloneReq) {
	var today = new Date();
	today = moment(today).format("DD-MM-YYYY");

	logger.debug.debug("inside insert item history " + JSON.stringify(cloneReq));
	logger.debug.debug("delete ME 2 " + vPurchase_det_id);

	// if purchase details id is missing its new else update
	let purchase_det_id = k.pur_det_id === "" ? vPurchase_det_id : k.pur_det_id;
	let txn_qty = k.pur_det_id === "" ? k.qty : k.qty - k.old_val;
	let actn_type = "ADD";
	let purchase_id = vPurchase_id === "" ? k.purchase_id : vPurchase_id;

	//txn -ve means subtract from qty
	if (txn_qty < 0) {
		actn_type = "SUB";
	}

	let query2 = `
			insert into item_history (center_id, module, product_ref_id, purchase_id, purchase_det_id, actn, actn_type, txn_qty, stock_level, txn_date)
			values ('${cloneReq.centerid}', 'Purchase', '${k.product_id}', '${purchase_id}', '${purchase_det_id}', 'PUR', '${actn_type}', '${txn_qty}', 
							(select (available_stock)  from stock where product_id = '${k.product_id}' ), '${today}' ) `;

	pool.query(query2, function (err, data) {
		if (err) {
			logger.debug.debug("object" + err);
		} else {
			logger.debug.debug("object..stock update .");
		}
	});
}

module.exports = purchaseRouter;
