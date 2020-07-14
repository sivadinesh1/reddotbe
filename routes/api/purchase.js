const express = require("express");
const purchaseRouter = express.Router();

const mysql = require("mysql");
const moment = require("moment");
const { handleError, ErrorHandler } = require("../helpers/error");

var pool = require("../helpers/db");

purchaseRouter.post("/insert-purchase-details", async (req, res) => {
	const cloneReq = { ...req.body };

	console.log("din " + JSON.stringify(cloneReq));

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

module.exports = purchaseRouter;

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
			total_value, transport_charges, unloading_charges, misc_charges, net_total, no_of_boxes, status, stock_inwards_datetime)
			VALUES
			( '${cloneReq.centerid}', '${cloneReq.vendor.id}', '${cloneReq.invoiceno}', '${invoicedate}', '${cloneReq.lrno}', '${lrdate}', 
			'${orderrcvddt}', 'GST Inovoice', '${cloneReq.orderno}', '${orderdate}', 
			'${cloneReq.totalqty}', '${cloneReq.noofitems}', '${cloneReq.taxable_value}', '${cloneReq.cgst}', 
			'${cloneReq.sgst}', '${cloneReq.igst}', '${cloneReq.totalvalue}', '${cloneReq.transport_charges}', 
			'${cloneReq.unloading_charges}', '${cloneReq.misc_charges}', '${cloneReq.net_total}', 
			'${cloneReq.noofboxes}', '${cloneReq.status}' , '${today}' )`;

	let updQry = ` update purchase set center_id = '${cloneReq.centerid}', vendor_id = '${cloneReq.vendor.id}',
			invoice_no = '${cloneReq.invoiceno}', invoice_date = '${moment(cloneReq.invoicedate).format("DD-MM-YYYY")}', lr_no = '${cloneReq.lrno}',
			lr_date = '${lrdate}', received_date = '${orderrcvddt}', purchase_type = 'GST Inovoice',
			order_no = '${cloneReq.orderno}', order_date = '${orderdate}', total_qty = '${cloneReq.totalqty}', 
			no_of_items = '${cloneReq.noofitems}', taxable_value = '${cloneReq.taxable_value}', cgst = '${cloneReq.cgst}', 
			sgst = '${cloneReq.sgst}', igst = '${cloneReq.igst}', total_value = '${cloneReq.totalvalue}', 
			transport_charges = '${cloneReq.transport_charges}', unloading_charges = '${cloneReq.unloading_charges}', 
			misc_charges = '${cloneReq.misc_charges}', net_total = '${cloneReq.net_total}', no_of_boxes = '${cloneReq.noofboxes}',
			status =  '${cloneReq.status}', stock_inwards_datetime =  '${today}' where id = '${cloneReq.purchaseid}' `;

	console.log("dinesh " + updQry);

	return new Promise(function (resolve, reject) {
		pool.query(cloneReq.purchaseid === "" ? insQry : updQry, function (err, data) {
			if (err) {
				console.log("print error 1 " + err);
				return reject(err);
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
		let insQuery1 = ` INSERT INTO purchase_detail(purchase_id, product_id, qty, unit_price, mrp, batchdate, tax,
			igst, cgst, sgst, taxable_value, total_value) VALUES
			( '${newPK}', '${k.product_id}', '${k.qty}', '${k.unit_price}', '${k.mrp}', '${moment().format("DD-MM-YYYY")}', '${k.taxrate}', '${k.igst}', 
			'${k.cgst}', '${k.sgst}', '${k.taxable_value}', '${k.total_value}') `;

		let updQuery1 = ` update purchase_detail set purchase_id = '${k.purchase_id}', product_id = '${k.product_id}', 
			qty = '${k.qty}', unit_price = '${k.unit_price}', mrp = '${k.mrp}', batchdate = '${moment().format("DD-MM-YYYY")}', 
			tax = '${k.taxrate}', igst = '${k.igst}', cgst = '${k.cgst}', sgst = '${k.sgst}', 
			taxable_value =  '${k.taxable_value}', total_value = '${k.total_value}' where
			id = '${k.pur_det_id}' `;

		new Promise(function (resolve, reject) {
			pool.query(k.pur_det_id === "" ? insQuery1 : updQuery1, function (err, data) {
				if (err) {
					reject(err);
				} else {
					if (`${k.mrp_change_flag}` === "Y") {
						// if mrp flag is true the insert new record to stocks
						insertStock(k);
					} else {
						// else update the stock tbl, only of the status is "C - completed", draft should be ignored

						//	if (cloneReq.status === "C") {
						// update stock for both status C & D (Completed & Draft)
						updateStock(k);
						//		}
					}
					resolve(true);
				}
			});
		});
	});
}

function insertStock(k) {
	let upDate = new Date();
	todayYYMMDD = moment(upDate).format("YYYY-MM-DD");
	let query2 = `
	insert into stock (product_id, mrp, available_stock, open_stock, updateddate)
	values ('${k.product_id}', '${k.mrp}', '${k.qty}', 0, '${todayYYMMDD}')`;

	pool.query(query2, function (err, data) {
		if (err) {
			console.log("object" + err);
		} else {
			console.log("object..stock update .");
		}
	});
}

function updateStock(k) {
	let qty_to_update = k.qty - k.old_val;
	console.log("old val > " + k.old_val);
	console.log("qty val > " + k.qty);
	console.log("qty_to_update val > " + k.qty);

	let query2 = `

update stock set available_stock =  available_stock + '${qty_to_update}'
where product_id = '${k.product_id}' and mrp = '${k.mrp}' `;

	pool.query(query2, function (err, data) {
		if (err) {
			console.log("object..stock update .");
		} else {
			console.log("object..stock update .");
		}
	});
}
