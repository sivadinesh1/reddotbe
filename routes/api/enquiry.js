/** @format */

const express = require("express");
const enquiryRoute = express.Router();
const { handleError, ErrorHandler } = require("./../helpers/error");

var pool = require("./../helpers/db");
const moment = require("moment");

enquiryRoute.post("/draft-enquiry", (req, res) => {
	let jsonObj = req.body;

	console.log("object>>> draft enquiry...");
	let today = new Date();

	let now = new Date();

	today = moment(today).format("DD-MM-YYYY");

	now = moment(now).format("YYYY-MM-DD HH:mm:ss");

	var objectKeysArray = Object.keys(jsonObj);
	objectKeysArray.forEach(function (objKey) {
		var objValue = jsonObj[objKey];
		console.log("object..MAIN VAL draft enquiry.." + JSON.stringify(objValue));

		// first update enquiry table with STATUS = 'D'
		let upQry1 = `update enquiry set estatus = 'D' where id = '${objValue.enquiry_id}' `;

		pool.query(upQry1, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler("500", "Error Updating draft-enquiry."), res);
			}
		});

		// then update enquiry details table with STATUS = 'D' & with updated values
		let upQuery1 = `update enquiry_detail
		set
		product_id = '${objValue.product_id}',
		stock_id = ${objValue.stockid},
		giveqty = '${objValue.giveqty}',
		processed = '${objValue.processed}',
		status = 'D'
		where id = '${objValue.id}' `;

		let upQuery2 = `update enquiry_detail
			set
			product_id = null,
			stock_id = null,
			giveqty = '${objValue.giveqty}',
			processed = '${objValue.processed}',
			status = 'D'
			where id = '${objValue.id}' `;

		let uQrys = objValue.product_id === null ? upQuery2 : upQuery1;

		console.log("object upQuery1 a> g " + uQrys);
		pool.query(uQrys, function (err, data) {
			if (err) {
				console.log("dinesh " + JSON.stringify(err));
				return handleError(new ErrorHandler("500", "Error Updating draft-enquiry."), res);
			}
		});
	});

	res.json({
		result: "success",
	});
});

enquiryRoute.post("/move-to-sale", (req, res) => {
	let jsonObj = req.body;

	console.log("object>>> move-to-sale");
	let today = new Date();

	let now = new Date();

	today = moment(today).format("DD-MM-YYYY");

	now = moment(now).format("YYYY-MM-DD HH:mm:ss");

	var objectKeysArray = Object.keys(jsonObj);
	objectKeysArray.forEach(function (objKey) {
		var objValue = jsonObj[objKey];
		console.log("object..MAIN VAL." + JSON.stringify(objValue));

		console.log("(objValue.product_id " + objValue.product_id);

		if (objValue.product_id === "" || objValue.product_id === null) {
			console.log("this is a back order ");
			// b - full back order
			// updt enq_det_tbl status as B , giveqty = 0
			// insert backorder tbl with reason prodcut code not found

			let upQuery = `update enquiry_detail
			set
			giveqty = '0',
			status = 'B'
			where id = '${objValue.id}' `;

			pool.query(upQuery, function (err, data) {
				if (err) {
					return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
				}
			});

			let insQry = `INSERT INTO backorder (center_id, customer_id, enquiry_detail_id, qty, reason, status, order_date)
			VALUES ('${objValue.center_id}', '${objValue.customer_id}', '${objValue.id}', '${objValue.askqty}', 'Product Code Not found', 'O', '${today}') `;

			pool.query(insQry, function (err, data) {
				if (err) {
					return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
				}
			});
		}

		if (objValue.askqty > objValue.giveqty) {
			//p- partial fullfilment
			// updt enq_det_tbl status as P, give qty = actual given
			// insert backorder tbl with reason Partial fullfillmeent

			const bqty = objValue.askqty - objValue.giveqty;

			let upQuery1 = `update enquiry_detail
			set
			product_id = '${objValue.product_id}',
			stock_id = '${objValue.stockid}',
			giveqty = '${objValue.giveqty}',
			processed = '${objValue.processed}',
			status = 'P'
			where id = '${objValue.id}' `;

			console.log("object upQuery1 a> g " + upQuery1);

			pool.query(upQuery1, function (err, data) {
				if (err) {
					return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
				}
			});

			let insQry2 = `INSERT INTO backorder (center_id, enquiry_detail_id, qty, reason, status, order_date)
			VALUES ('${objValue.center_id}', '${objValue.id}', '${bqty}', 'Partial fullfillmeent', 'O', '${today}') `;

			console.log("object insQry2 a>g " + insQry2);

			pool.query(insQry2, function (err, data) {
				if (err) {
					return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
				}
			});
		}

		if (objValue.giveqty >= objValue.askqty && objValue.product_id !== "" && objValue.product_id !== null) {
			// F- fullfilled
			// updt enq_det_tbl status as F, give qty = actual given

			let upQuery3 = `update enquiry_detail
			set
			product_id = '${objValue.product_id}',
			stock_id = '${objValue.stockid}',
			giveqty = '${objValue.giveqty}',
			processed = '${objValue.processed}',
			status = 'F'
			where id = '${objValue.id}' `;

			pool.query(upQuery3, function (err, data) {
				if (err) {
					return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
				}
			});
		}

		let upQuery4 = `update enquiry
		set
		estatus = 'P', processed_date = '${now}'
		where id = '${objValue.enquiry_id}' `;

		pool.query(upQuery4, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
			}
		});
	});

	res.json({
		result: "success",
	});
});

// todo this end point not used, check and delete
enquiryRoute.post("/update-giveqty-enquiry-details", (req, res) => {
	let giveqty = req.body.giveqty;
	let id = req.body.enqdetailid;

	let query = `update enquiry_detail
	set
	giveqty = '${giveqty}'
	where id = '${id}' `;

	pool.query(query, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
		} else {
		}
	});
});

enquiryRoute.get("/update-customer/:id/:enqid", (req, res) => {
	let id = req.params.id;
	let enqid = req.params.enqid;
	let query = `update enquiry
	set
	customer_id = '${id}'
	where id = '${enqid}' `;

	pool.query(query, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error Updating customer id."), res);
		} else {
			res.json({
				result: "success",
			});
		}
	});
});

// todo, can be deleted, check and delete
enquiryRoute.post("/update-status-enquiry-details", (req, res) => {
	let status = req.body.status;
	let id = req.body.enqdetailid;

	if (status === "B") {
		let query = `update enquiry_detail
		set
		product_id = null,
		status = '${status}'
		where id = '${id}' `;

		console.log("object>><<" + query);

		pool.query(query, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
			} else {
			}
		});
	}
});

enquiryRoute.post("/update-enquiry-details", (req, res) => {
	let jsonObj = req.body;

	var objectKeysArray = Object.keys(jsonObj);
	objectKeysArray.forEach(function (objKey) {
		var objValue = jsonObj[objKey];
	});
});

enquiryRoute.post("/insert-enquiry-details", (req, res) => {
	let jsonObj = req.body;
	console.log("insert enq " + JSON.stringify(jsonObj));
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");
	let query = `INSERT INTO enquiry ( center_id, customer_id, enquiry_date, estatus, remarks) 
							values ( '${jsonObj.center_id}', '${jsonObj.customerctrl.id}', '${today}', 'O','${jsonObj.remarks}')`;

	pool.query(query, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
		} else {
			let tmpid = data.insertId;
			console.log("TCL: tmpid", tmpid);

			const prodArr = jsonObj["productarr"];
			// prodArr.reverse();
			console.log("TCL: prodArr", prodArr);

			prodArr.forEach(function (k) {
				console.log(".........xx..." + k.notes);
				let query1 = `INSERT INTO enquiry_detail ( enquiry_id, product_id, askqty, product_code, notes, status)
							values ( '${tmpid}', (select id from product where product_code='${k.product_code}'), '${k.quantity}', '${k.product_code}', '${k.notes}', 'O')`;
				pool.query(query1, function (err, data) {
					if (err) {
						return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
					} else {
					}
				});
			});
		}
	});
	res.json({
		result: "success",
	});
});

// enquiryRoute.post("/add-more-enquiry-details", (req, res) => {
// 	let jsonObj = req.body;

// 	var today = new Date();
// 	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

// 	const prodArr = jsonObj["productarr"];
// 	console.log("TCL: prodArr", prodArr.length);

// 	let newProdArr = [];

// 	prodArr.forEach(function (k) {
// 		console.log(".........xx..." + k.notes);
// 		let query1 = `INSERT INTO enquiry_detail ( enquiry_id, product_id, askqty, product_code, notes, status)
// 							values ( '${req.body.enquiry_id}', (select id from product where product_code='${k.product_code}'), '${k.quantity}', '${k.product_code}', '${k.notes}', 'O')`;
// 		pool.query(query1, function (err, data) {
// 			if (err) {
// 				return handleError(new ErrorHandler("500", "Error add-more-enquiry-details."), res);
// 			} else {
// 				let tmpid = data.insertId;

// 				let sql = `
// 				select orig.*, s.available_stock, s.id as stock_pk
// 				from
// 				(select ed.*, c.id as customer_id, c.name, c.address1, c.address2, c.district, c.pin, c.gst, c.mobile2, e.remarks, e.estatus,
// 					p.id as pid, p.center_id, p.vendor_id, p.product_code as pcode, p.description as pdesc, p.unit, p.packetsize, p.hsncode,
// 					p.currentstock, p.unit_price, p.mrp, p.purchase_price,
// 					p.salesprice, p.rackno, p.location, p.maxdiscount, p.taxrate,
// 					p.minqty, p.itemdiscount, p.reorderqty, p.avgpurprice,
// 					p.avgsaleprice, p.margin
// 					from
// 					enquiry e,
// 					customer c,
// 					enquiry_detail ed
// 					LEFT outer JOIN product p
// 					ON p.id = ed.product_id where
// 					e.id = ed.enquiry_id and
// 					e.customer_id = c.id and ed.id =  ${tmpid}) as orig
// 					LEFT outer JOIN stock s
// 					ON orig.product_id = s.product_id and
// 					s.mrp = orig.mrp `;

// 				//		console.log("get enq details1 " + sql);

// 				pool.query(sql, function (err, data) {
// 					if (err) {
// 						return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
// 					} else {
// 						console.log("dinesh >> " + JSON.stringify(data));
// 						newProdArr.push(data[0]);
// 						console.log("pring the new prod arr " + JSON.stringify(newProdArr));

// 						if (newProdArr.length === prodArr.length) {
// 							res.json({
// 								result: newProdArr,
// 							});
// 						}
// 					}
// 				});
// 			}
// 		});
// 	});
// });

enquiryRoute.post("/add-more-enquiry-details", (req, res) => {
	let jsonObj = req.body;

	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	const prodArr = jsonObj["productarr"];
	console.log("TCL: prodArr", prodArr.length);

	let newProdArr = [];

	prodArr.forEach(function (k) {
		console.log(".........xx..." + k.notes);
		let query1 = `INSERT INTO enquiry_detail ( enquiry_id, product_id, askqty, product_code, notes, status)
							values ( '${req.body.enquiry_id}', (select id from product where product_code='${k.product_code}'), '${k.quantity}', '${k.product_code}', '${k.notes}', 'O')`;
		pool.query(query1, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler("500", "Error add-more-enquiry-details."), res);
			} else {
				let tmpid = data.insertId;
				newProdArr.push(tmpid);

				if (newProdArr.length === prodArr.length) {
					newProdArr = [];

					let sql = `
				select orig.*, s.available_stock, s.id as stock_pk
				from
				(select ed.*, c.id as customer_id, c.name, c.address1, c.address2, c.district, c.pin, c.gst, c.mobile2, e.remarks, e.estatus,
					p.id as pid, p.center_id, p.vendor_id, p.product_code as pcode, p.description as pdesc, p.unit, p.packetsize, p.hsncode,
					p.currentstock, p.unit_price, p.mrp, p.purchase_price,
					p.salesprice, p.rackno, p.location, p.maxdiscount, p.taxrate,
					p.minqty, p.itemdiscount, p.reorderqty, p.avgpurprice,
					p.avgsaleprice, p.margin
					from
					enquiry e,
					customer c,
					enquiry_detail ed
					LEFT outer JOIN product p
					ON p.id = ed.product_id where
					e.id = ed.enquiry_id and
					e.customer_id = c.id and ed.id =  ${tmpid}) as orig
					LEFT outer JOIN stock s
					ON orig.product_id = s.product_id and
					s.mrp = orig.mrp `;

					pool.query(sql, function (err, data) {
						if (err) {
							return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
						} else {
							console.log("dinesh >> " + JSON.stringify(data));
							newProdArr.push(data[0]);
							console.log("pring the new prod arr " + JSON.stringify(newProdArr));

							if (newProdArr.length === prodArr.length) {
								res.json({
									result: newProdArr,
								});
							}
						}
					});
				}
			}
		});
	});
});

enquiryRoute.get("/open-enquiries/:centerid/:status", (req, res) => {
	let centerid = req.params.centerid;
	let status = req.params.status;

	let sql = `select e.id, e.enquiry_date, e.estatus, c.name as custname,
  
	(select count(*) from enquiry_detail where enquiry_id = e.id)
	as noofitems
	from enquiry e, customer c
	where 
		e.customer_id = c.id and
	estatus = '${status}' and e.center_id = '${centerid}'
	order by 
	enquiry_date desc`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
		} else {
			return res.json(data);
		}
	});
});

enquiryRoute.get("/get-enquiry-details/:enqid", (req, res) => {
	let enqid = req.params.enqid;
	console.log("TCL: enqid", enqid);

	let sql = `
	

select orig.*, s.available_stock, s.id as stock_pk
from
(select ed.*, c.id as customer_id, c.name, c.address1, c.address2, c.district, c.pin, c.gst, c.mobile2, e.remarks, e.estatus,
	p.id as pid, p.center_id, p.brand_id, p.product_code as pcode, p.description as pdesc, p.unit, p.packetsize, p.hsncode,
	p.currentstock, p.unit_price, p.mrp, p.purchase_price,
	p.salesprice, p.rackno, p.location, p.maxdiscount, p.taxrate, 
	p.minqty, p.itemdiscount, p.reorderqty, p.avgpurprice,
	p.avgsaleprice, p.margin
	from 
	enquiry e,
	customer c,
	enquiry_detail ed
	LEFT outer JOIN product p
	ON p.id = ed.product_id where
	e.id = ed.enquiry_id and
	e.customer_id = c.id and e.id =  ${enqid}) as orig
	LEFT outer JOIN stock s
	ON orig.product_id = s.product_id and
	s.mrp = orig.mrp
	`;
	//	console.log("get enq details " + sql);

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
		} else {
			return res.json(data);
		}
	});
});

enquiryRoute.get("/get-customer-data/:enqid", (req, res) => {
	let enqid = req.params.enqid;

	let sql = `select c.*, s.code 
	from
	customer c,
	enquiry e,
	state s
	where
	e.customer_id = c.id and
	s.id = c.state_id and
	e.id = ${enqid}
	`;

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
		} else {
			return res.json(data);
		}
	});
});

enquiryRoute.get("/get-enquired-product-data/:centerid/:customerid/:enqid/:invdt", (req, res) => {
	let centerid = req.params.centerid;
	let customerid = req.params.customerid;
	let enqid = req.params.enqid;
	let orderdate = req.params.invdt;

	// fetch values only of enq detail status in {P - processed, F - fullfilled} B- backorder is ignored
	let sql = `select a.product_code as product_code, a.description, a.mrp, a.taxrate, b.available_stock,
	ed.giveqty as qty, a.unit_price, a.id as product_id, b.id as stock_pk, e.enquiry_date,
	IFNULL(
	(
	select concat(value,'~',type)
	from discount
	where str_to_date('${orderdate}','%d-%m-%Y')  
	between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') and
  customer_id = '${customerid}' and
	gst_slab = a.taxrate and
	a.brand_id = discount.brand_id and
  discount.brand_id = a.brand_id
	), 
	
	(  select concat(value,'~',type) 
from discount 
where str_to_date('28-07-2020','%d-%m-%Y')  
between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') and
customer_id = '${customerid}' and
gst_slab = a.taxrate and
discount.brand_id = 0 )
	
	) as disc_info
	
	
	from 
	enquiry e,
	enquiry_detail ed,
	product a, 
	stock b
	where
	e.id = ed.enquiry_id and
	ed.product_id = a.id and
	a.id = b.product_id and
	b.id = ed.stock_id and
	ed.status in ('P', 'F')  and
	ed.giveqty != 0 and
	e.id = ${enqid}
	`;
	console.log("object # get-enquired-product-data " + sql);
	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
		} else {
			return res.json(data);
		}
	});
});

enquiryRoute.get("/back-order/:centerid", (req, res) => {
	let centerid = req.params.centerid;

	let sql = `SELECT c.name as customer_name, p.product_code as product_code, p.id as product_id,
	p.description as description, ed.notes, ed.askqty, ed.giveqty, b.reason, b.order_date, s.available_stock
	FROM 
	backorder b, 
	enquiry_detail ed,
	product p,
	stock s, customer c
	WHERE 
	s.product_id = p.id and c.id = b.customer_id and
	b.enquiry_detail_id = ed.id and
	p.id = ed.product_id and
	str_to_date(order_date, '%d-%m-%YYYY') BETWEEN DATE_SUB(NOW(), INTERVAL 30 DAY) AND NOW()
	union all
	SELECT c.name as customer_name, "N/A" as product_code, "N/A" as product_id, "N/A" as description, ed.notes, ed.askqty, ed.giveqty, b.reason, 
	b.order_date, "N/A" as available_stock FROM 
	backorder b, customer c,
	enquiry_detail ed
	WHERE 
	b.enquiry_detail_id = ed.id and
	c.id = b.customer_id and
	ed.product_id is null and
	str_to_date(order_date, '%d-%m-%YYYY') BETWEEN DATE_SUB(NOW(), INTERVAL 30 DAY) AND NOW();
	`;

	console.log("SHOW THE QRY " + sql);

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error Updating move to sale."), res);
		} else {
			return res.json(data);
		}
	});
});

enquiryRoute.get("/search-enquiries/:centerid/:customerid/:status/:fromdate/:todate", (req, res) => {
	let center_id = req.params.centerid;
	let status = req.params.status;
	let customer_id = req.params.customerid;
	let from_date = req.params.fromdate;
	let to_date = req.params.todate;

	if (from_date !== "") {
		from_date = moment(new Date(req.params.fromdate)).format("DD-MM-YYYY");
	}

	if (to_date !== "") {
		to_date = moment(new Date(req.params.todate)).format("DD-MM-YYYY");
	}

	let custsql = `and e.customer_id = '${customer_id}' `;

	let sql = `select e.*, c.id as customer_id, c.name as customer_name,
    	case e.estatus
				when 'O' then 'New'
				when 'D' then 'Draft'
				when 'E' then 'Executed'
				when 'P' then 'Invoice Ready'
				when 'C' then 'Completed'
				when 'X' then 'Cancelled'
    end as status_txt,
	(select count(*) from enquiry_detail where enquiry_id = e.id)
	as noofitems
	from
	enquiry e,
	customer c
	where
	c.id = e.customer_id and

	e.center_id =  '${center_id}' and
	str_to_date(DATE_FORMAT(enquiry_date,'%d-%m-%YYYY') , '%d-%m-%YYYY') between
	str_to_date('${from_date}', '%d-%m-%YYYY') and
	str_to_date('${to_date}', '%d-%m-%YYYY')  `;

	if (customer_id !== "all") {
		sql = sql + custsql;
	}

	if (status !== "all") {
		sql = sql + ` and e.estatus =  '${status}' `;
	}

	console.log("search enquiry >> " + sql);

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching search enquiry"), res);
		} else {
			return res.json(data);
		}
	});
});

module.exports = enquiryRoute;
