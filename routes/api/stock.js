const express = require("express");
const stockRouter = express.Router();

const mysql = require("mysql");
const moment = require("moment");

var pool = require("./../helpers/db");

stockRouter.get("/search-all-draft-purchase/:centerid", (req, res) => {
	let center_id = req.params.centerid;

	let sql = `select p.*, v.id as vendor_id, v.name as vendor_name,
	case p.status
        when 'D' then 'Draft'
        when 'C' then 'Completed'
    end as pstatus
	from
	purchase p,
	vendor v
	where
	v.id = p.vendor_id and
	p.status = 'D' and 
	p.center_id = '${center_id}' `;

	console.log("sq purchase >> " + sql);

	pool.query(sql, function(err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error seacrching draft purchase"), res);
		} else {
			return res.json(data);
		}
	});
});

stockRouter.get("/search-purchase/:centerid/:vendorid/:status/:fromdate/:todate", (req, res) => {
	let center_id = req.params.centerid;
	let status = req.params.status;
	let vendor_id = req.params.vendorid;
	let from_date = req.params.fromdate;
	let to_date = req.params.todate;

	if (from_date !== "") {
		from_date = moment(req.params.fromdate).format("DD-MM-YYYY");
	}

	if (to_date !== "") {
		to_date = moment(req.params.todate).format("DD-MM-YYYY");
	}

	let vendsql = `and p.vendor_id = '${vendor_id}' `;

	let sql = `select p.*, v.id as vendor_id, v.name as vendor_name
	from
	purchase p,
	vendor v
	where
	v.id = p.vendor_id and
	p.status = '${status}' and
	p.center_id = '${center_id}' and
	str_to_date(stock_inwards_datetime, '%d-%m-%YYYY') between
	str_to_date('${from_date}', '%d-%m-%YYYY') and
	str_to_date('${to_date}', '%d-%m-%YYYY') `;

	if (vendor_id !== "all") {
		sql = sql + vendsql;
	}

	console.log("search purchase >> " + sql);

	pool.query(sql, function(err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching search purchase"), res);
		} else {
			return res.json(data);
		}
	});
});

stockRouter.get("/purchase-master/:id", (req, res) => {
	let purchase_id = req.params.id;

	let sql = `
	select p.*
from 
purchase p
where
p.id = '${purchase_id}' `;

	console.log("sq purchase >> " + sql);

	pool.query(sql, function(err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching purchase master"), res);
		} else {
			return res.json(data);
		}
	});
});

stockRouter.get("/purchase-details/:id", (req, res) => {
	let purchase_id = req.params.id;

	let sql = `
	select pd.*, 
pd.id as id, 
pd.purchase_id as purchase_id,
pd.product_id as product_id,
pd.qty as qty,
pd.unit_price as unit_price,
pd.mrp as mrp,
pd.batchdate as batchdate,
pd.tax as tax,
pd.igst as igst,
pd.cgst as cgst,
pd.sgst as sgst,
pd.taxable_value as tax_value,
pd.total_value as total_value,
p.product_code, p.description, p.packetsize, p.taxrate from 
purchase_detail pd,
product p
where
p.id = pd.product_id and
pd.purchase_id = '${purchase_id}' 
	 `;

	console.log("sq purchase >> " + sql);

	pool.query(sql, function(err, data) {
		if (err) {
			console.log("object error " + err);
			return handleError(new ErrorHandler("500", "Error fetching purchase master"), res);
		} else {
			return res.json(data);
		}
	});
});

stockRouter.post("/delete-purchase-details", (req, res) => {
	let id = req.body.id;
	let purchase_id = req.body.purchaseid;

	let query = `
	delete from purchase_detail where id = '${id}' `;

	pool.query(query, function(err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error deleting purchase details"), res);
		} else {
			return res.json({
				result: "success"
			});
		}
	});
});

module.exports = stockRouter;

stockRouter.post("/update-purchase-master", (req, res) => {
	updatePurchaseMaster(req, res);
});

updatePurchaseMaster = function(req, res) {
	let yourJsonObj = req.body;
	console.log(" check >< inside apply jobs ..." + JSON.stringify(yourJsonObj));

	const purchase_id = yourJsonObj["purchaseid"];
	console.log("dinesh" + purchase_id);
	const vendorValue = yourJsonObj["vendor"];
	const invoiceno = yourJsonObj["invoiceno"];

	let invoicedate = yourJsonObj["invoicedate"];
	if (yourJsonObj["invoicedate"] !== "") {
		invoicedate = moment(yourJsonObj["invoicedate"]).format("DD-MM-YYYY");
	}

	let order_date = yourJsonObj["orderdate"];

	if (yourJsonObj["orderdate"] !== "") {
		order_date = moment(yourJsonObj["orderdate"]).format("DD-MM-YYYY");
	}

	let lr_date = yourJsonObj["lrdate"];
	if (yourJsonObj["lrdate"] !== "") {
		lr_date = moment(yourJsonObj["lrdate"]).format("DD-MM-YYYY");
	}

	const no_of_boxes = yourJsonObj["noofboxes"];
	let received_date = yourJsonObj["orderrcvddt"];

	if (yourJsonObj["orderrcvddt"] !== "") {
		received_date = moment(yourJsonObj["orderrcvddt"]).format("DD-MM-YYYY");
	}

	const lr_no = yourJsonObj["lrno"];
	const order_no = yourJsonObj["orderno"];

	const no_of_items = yourJsonObj["noofitems"];
	const total_qty = yourJsonObj["totalqty"];
	const taxable_value = yourJsonObj["taxable_value"];
	const total_value = yourJsonObj["totalvalue"];
	const product_arr = yourJsonObj["productarr"];
	const transport_charges = yourJsonObj["transport_charges"];
	const unloading_charges = yourJsonObj["unloading_charges"];
	const misc_charges = yourJsonObj["misc_charges"];
	const net_total = yourJsonObj["net_total"];

	const igst = yourJsonObj["igst"];
	const cgst = yourJsonObj["cgst"];
	const sgst = yourJsonObj["sgst"];

	const status = yourJsonObj["status"];

	var today = new Date();
	today = moment(today).format("DD-MM-YYYY");

	var month = moment().format("M");
	var day = moment().format("D");
	var year = moment().format("YYYY");

	let query = `
	update purchase 
	set
	center_id = 1,
	vendor_id = '${vendorValue.id}',
	invoice_no = '${invoiceno}',
	invoice_date = '${invoicedate}',
	lr_no = '${lr_no}',
	lr_date = '${lr_date}',
	received_date = '${received_date}', 
	purchase_type = 'GST Inovoice',
	order_no = '${order_no}', 
	order_date = '${order_date}', 
	total_qty = '${total_qty}', 
	no_of_items = '${no_of_items}', 
	taxable_value = '${taxable_value}', 
	cgst = '${cgst}', 
	sgst = '${sgst}', 
	igst = '${igst}', 
	total_value = '${total_value}', 
	transport_charges = '${transport_charges}', 
	unloading_charges = '${unloading_charges}', 
	misc_charges = '${misc_charges}', 
	net_total = '${net_total}', 
	no_of_boxes = '${no_of_boxes}',
	status =  '${status}', 
	stock_inwards_datetime =  '${today}'
	where
		id = '${purchase_id}'

	`;

	pool.query(query, function(err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error updating purchase master"), res);
		} else {
			return res.json({
				result: "success"
			});
		}
	});
};

stockRouter.delete("/delete-purchase/:id", (req, res) => {
	let purchase_id = req.params.id;

	let sql = `
	delete from purchase where 
id = ${purchase_id} `;

	console.log("sq purchase >> " + sql);

	pool.query(sql, function(err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching purchase master"), res);
		} else {
			return res.json({
				result: "success"
			});
		}
	});
});
