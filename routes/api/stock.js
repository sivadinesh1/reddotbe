const express = require("express");
const stockRouter = express.Router();

const mysql = require("mysql");
const moment = require("moment");

var pool = require("./../helpers/db");

const { getSalesMaster, getSalesDetails } = require("../modules/sales/sales.js");

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

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error seacrching draft purchase"), res);
		} else {
			return res.json(data);
		}
	});
});

// str_to_date(stock_inwards_datetime, '%Y-%m-%d %T') between
// str_to_date('2020-05-01 00:00:00', '%Y-%m-%d %T') and
// str_to_date('2020-05-08 23:59:00', '%Y-%m-%d %T')

stockRouter.get("/search-purchase/:centerid/:vendorid/:status/:fromdate/:todate", (req, res) => {
	let center_id = req.params.centerid;
	let status = req.params.status;
	let vendor_id = req.params.vendorid;
	let from_date = req.params.fromdate;
	let to_date = req.params.todate;

	if (from_date !== "") {
		from_date = moment(req.params.fromdate).format("DD-MM-YYYY") + " 00:00:00";
	}

	if (to_date !== "") {
		to_date = moment(req.params.todate).format("DD-MM-YYYY") + " 23:59:00";
	}

	let vendsql = `and p.vendor_id = '${vendor_id}' `;
	let statussql = `and p.status = '${status}' `;

	let sql = `select p.*, v.id as vendor_id, v.name as vendor_name
	from
	purchase p,
	vendor v
	where
	v.id = p.vendor_id and
	
	p.center_id = '${center_id}' and
	str_to_date(stock_inwards_datetime,  '%d-%m-%Y %T') between
	str_to_date('${from_date}',  '%d-%m-%Y %T') and
	str_to_date('${to_date}',  '%d-%m-%Y %T') `;

	if (vendor_id !== "all") {
		sql = sql + vendsql;
	}

	if (status !== "all") {
		sql = sql + statussql;
	}

	console.log("search purchase >> " + sql);

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching search purchase"), res);
		} else {
			return res.json(data);
		}
	});
});

stockRouter.get("/search-sales/:centerid/:customerid/:status/:fromdate/:todate", (req, res) => {
	let center_id = req.params.centerid;
	let status = req.params.status;
	let customer_id = req.params.customerid;
	let from_date = req.params.fromdate;
	let to_date = req.params.todate;

	if (from_date !== "") {
		from_date = moment(req.params.fromdate).format("DD-MM-YYYY") + " 00:00:00";
	}

	if (to_date !== "") {
		to_date = moment(req.params.todate).format("DD-MM-YYYY") + " 23:59:00";
	}

	let custsql = `and s.customer_id = '${customer_id}' `;
	let statussql = `and s.status = '${status}' `;

	let sql = `select s.*, c.id as customer_id, c.name as customer_name
        from
        sale s,
        customer c
        where
        c.id = s.customer_id and
        
				s.center_id = '${center_id}' and
				
				str_to_date(sale_datetime,  '%d-%m-%Y %T') between
				str_to_date('${from_date}',  '%d-%m-%Y %T') and
				str_to_date('${to_date}',  '%d-%m-%Y %T') `;

	// str_to_date(sale_datetime, '%d-%m-%YYYY') between
	// str_to_date('${from_date}', '%d-%m-%YYYY') and
	// str_to_date('${to_date}', '%d-%m-%YYYY')  `;

	if (customer_id !== "all") {
		sql = sql + custsql;
	}

	if (status !== "all") {
		sql = sql + statussql;
	}

	console.log("search sales >> " + sql);

	pool.query(sql, function (err, data) {
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

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching purchase master"), res);
		} else {
			return res.json(data);
		}
	});
});

// get sale master records
stockRouter.get("/sales-master/:id", (req, res) => {
	// @from Sales file
	getSalesMaster(`${req.params.id}`, (err, rows) => {
		if (err) return handleError(new ErrorHandler("500", "Error fetching sales master"), res);
		return res.json(rows);
	});
});

// get sale details records
stockRouter.get("/sale-details/:id", (req, res) => {
	// @from Sales file
	getSalesDetails(`${req.params.id}`, (err, rows) => {
		if (err) return handleError(new ErrorHandler("500", "Error fetching sales master"), res);
		return res.json(rows);
	});
});

stockRouter.post("/delete-sale-details", (req, res) => {
	let id = req.body.id;

	let query = `
	delete from sale_detail where id = '${id}' `;

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

	pool.query(sql, function (err, data) {
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
	console.log("delete purchase details id > " + id);

	pool.query(query, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error deleting purchase details"), res);
		} else {
			return res.json({
				result: "success",
			});
		}
	});
});

module.exports = stockRouter;

stockRouter.delete("/delete-purchase/:id", (req, res) => {
	let purchase_id = req.params.id;

	let sql = `
	delete from purchase where 
id = ${purchase_id} `;

	console.log("sq purchase >> " + sql);

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching purchase master"), res);
		} else {
			return res.json({
				result: "success",
			});
		}
	});
});
