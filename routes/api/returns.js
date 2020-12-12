// dines
// refund status - Pending (P), Partially Refunded (PR), Refunded (R)
// receive status - not received (NR) received (R), partially received (PR)
// status - approved (A), closed (C)

const express = require("express");
const returnsRouter = express.Router();
const logger = require("../../routes/helpers/log4js");

const { handleError, ErrorHandler } = require("./../helpers/error");

const { getReturns } = require("../modules/sales/returns.js");

const {
	insertSaleReturns,
	insertSaleReturnDetail,
	createCreditNote,
	updateCRAmntToCustomer,
	updateCRSequenceGenerator,
	getSequenceCrNote,
	updateCrNoteIdInSaleReturnTable,
} = require("../modules/returns/returns.js");

const moment = require("moment");
var pool = require("../helpers/db");

// get sale master to display in sale invoice component
returnsRouter.get("/get-sale-returns/:center_id", async (req, res) => {
	let center_id = req.params.center_id;
	let saleReturns = await getReturns(center_id);
	console.log("object..." + saleReturns);
	return res.json(saleReturns);
});

returnsRouter.post("/search-sale-return", (req, res) => {
	let center_id = req.body.centerid;

	let customer_id = req.body.customerid;
	let from_date = req.body.fromdate;
	let to_date = req.body.todate;

	let search_type = req.body.searchtype;
	let search_by = req.body.searchby;
	//let credit_note_no = req.body.credit_note_no;

	let sql = "";
	let query = "";

	if (search_type === "all") {
		if (from_date !== "") {
			from_date = moment(new Date(req.body.fromdate)).format("DD-MM-YYYY") + " 00:00:00";
		}

		if (to_date !== "") {
			to_date = moment(new Date(req.body.todate)).format("DD-MM-YYYY") + " 23:59:00";
		}

		let custsql = `and s.customer_id = '${customer_id}' `;

		sql = `select c.name, sr.id as sale_return_id, sr.sale_id as sale_id,  s.invoice_no as invoice_no, s.invoice_date as invoice_date,
		sr.return_date as return_date,
		sr.cr_note_id as cr_note_id, cn.credit_note_no, sr.center_id as center_id, sr.to_return_amount as to_return_amount, sr.amount_returned as amount_returned, 
		sr.refund_status as refund_status, 
		(CASE
			WHEN sr.refund_status = 'P' THEN 'Pending'
			WHEN sr.refund_status = 'PR' THEN 'Partially Refunded'
			WHEN sr.refund_status = 'R' THEN 'Refunded'
			END
			) AS refund_status_x,
		sr.to_receive_items as to_receive_items, sr.received_items as received_items, 
		sr.receive_status as receive_status, 
		(CASE
			WHEN sr.receive_status = 'R' THEN 'Received'
			WHEN sr.receive_status = 'PR' THEN 'Partially Received'
			WHEN sr.receive_status = 'NR' THEN 'Not Received'
			END
			) AS receive_status_x,
		sr.return_status as return_status,
		(CASE
			WHEN sr.return_status = 'C' THEN 'Close'
			WHEN sr.return_status = 'A' THEN 'Approved'
			END
			) AS return_status_x
		
		from 
		sale_return sr
		LEFT outer JOIN credit_note cn
					ON cn.id = sr.cr_note_id, 
		sale s,
		customer c
		where
		c.id = s.customer_id and
		sr.sale_id = s.id and
		sr.center_id = '${center_id}' and
		
		
				str_to_date(sr.return_date,  '%d-%m-%Y %T') between
						str_to_date('${from_date}',  '%d-%m-%Y %T') and
						str_to_date('${to_date}',  '%d-%m-%Y %T') 
						
						 `;

		if (customer_id !== "all") {
			sql = sql + custsql;
		}

		sql = sql + " order by sr.return_date desc ";

		logger.debug.debug("sql search sale " + sql);
	} else if (search_type !== "all") {
		query = ` 
		select c.name, sr.id as sale_return_id, sr.sale_id as sale_id, s.invoice_no as invoice_no, s.invoice_date as invoice_date,
		sr.return_date as return_date,
		sr.cr_note_id as cr_note_id, cn.credit_note_no, sr.center_id as center_id, sr.to_return_amount as to_return_amount, sr.amount_returned as amount_returned, 
		sr.refund_status as refund_status, 
		(CASE
			WHEN sr.refund_status = 'P' THEN 'Pending'
			WHEN sr.refund_status = 'PR' THEN 'Partially Refunded'
			WHEN sr.refund_status = 'R' THEN 'Refunded'
			END
			) AS refund_status_x,
		sr.to_receive_items as to_receive_items, sr.received_items as received_items, 
		sr.receive_status as receive_status, 
		(CASE
			WHEN sr.receive_status = 'R' THEN 'Received'
			WHEN sr.receive_status = 'PR' THEN 'Partially Received'
			END
			) AS receive_status_x,
		sr.return_status as return_status,
		(CASE
			WHEN sr.return_status = 'C' THEN 'Close'
			WHEN sr.return_status = 'A' THEN 'Approved'
			END
			) AS return_status_x
		
		from 
		sale_return sr
		LEFT outer JOIN credit_note cn
					ON cn.id = sr.cr_note_id, 
		sale s,
		customer c
		where
		c.id = s.customer_id and
		sr.sale_id = s.id and
		sr.center_id = '${center_id}' and `;

		if (search_type === "byinvoice") {
			query = query + ` s.invoice_no = '${search_by.trim()}' order by sr.return_date desc `;
		} else if (search_type === "bycreditnote") {
			query = query + ` cn.credit_note_no = '${search_by.trim()}' order by sr.return_date desc `;
		}
	}

	console.log("dinesh " + search_type === "all" ? sql : query);
	pool.query(search_type === "all" ? sql : query, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching search-sale-return"), res);
		} else {
			return res.json(data);
		}
	});
});

// returnsRouter.get("/get-sale-return-details/:center_id/:salre_return_id", (req, res) => {
// 	let center_id = req.params.center_id;
// 	let sale_return_id = req.params.salre_return_id;

// 	let sql = ` select
// 	p.id as product_id,
// p.product_code as product_code,
// p.description as description,
// 		sd.qty as original_sold_qty,
// 		srd.return_qty as return_qty,
// 		srd.received_qty as received_qty,
// 		sd.mrp, sd.disc_percent, sd.tax ,
// 		ROUND(srd.return_qty*sd.mrp*(100-sd.disc_percent)/(100+sd.tax), 2) as pretaxtotal,
// 		IF(s.igst != 0.00,
// 		s.igst, 0.00
// 		) as igsttax,

// 		IF(s.igst = 0.00,
// 		ROUND(((select pretaxtotal)*sd.tax/100 /2), 2), 0.00
// 		) as cgsttax,

// 		IF(s.igst = 0.00,
// 		ROUND(((select pretaxtotal)*sd.tax/100 /2), 2), 0.00
// 		) as sgsttax,

// 		ROUND((select pretaxtotal) + (select igsttax) + (select cgsttax) + (select sgsttax), 2) as total,

// 		IF(s.igst = 0.00,
// 		'yes', 'np'
// 		) as cgsttax,
// 		s.id as sale_id
// 		 from
// 		sale_return sr,
// 		sale_return_detail srd,
// 		sale s,
// 		sale_detail sd,
// 		product p
// 		where
// 		p.id = sd.product_id and
// 		sd.sale_id = s.id and
// 		sr.sale_id = s.id and
// 		srd.sale_return_id = sr.id and
// 		sd.id = srd.sale_detail_id and
// 		sr.center_id = ${center_id} and
// 		srd.sale_return_id = ${sale_return_id}
// 		`;

// 	logger.debug.debug("sql get-sale-return-details " + sql);

// 	pool.query(sql, function (err, data) {
// 		if (err) {
// 			return handleError(new ErrorHandler("500", "Error fetching get-sale-return-details"), res);
// 		} else {
// 			return res.json(data);
// 		}
// 	});
// });

returnsRouter.get("/get-sale-return-details/:center_id/:salre_return_id", (req, res) => {
	let center_id = req.params.center_id;
	let sale_return_id = req.params.salre_return_id;

	let sql = ` select p.id, p.product_code, p.description, srd.* from 
	sale_return_detail srd,
	product p,
	sale_detail sd
	where 
	p.id = sd.product_id and
	sd.id = srd.sale_detail_id and
	srd.sale_return_id = ${sale_return_id}
		`;

	logger.debug.debug("sql get-sale-return-details " + sql);

	pool.query(sql, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error fetching get-sale-return-details"), res);
		} else {
			return res.json(data);
		}
	});
});

returnsRouter.post("/update-sale-returns-received", (req, res) => {
	let returnArr = req.body;

	let count = 0;

	for (const k of returnArr) {
		let query = `			
					update sale_return_detail T1, sale_return T2
					set 
					T1.received_qty = T1.received_qty + ${k.received_now},
					T2.received_items = T2.received_items + ${k.received_now},
					T2.receive_status = IF(T2.to_receive_items = (T2.received_items + ${k.received_now}), 'R', T2.receive_status),
					T2.return_status = IF(T2.to_receive_items = (T2.received_items + ${k.received_now}), 'C', T2.return_status)
					where 
					T1.sale_return_id = T2.id and
					T1.id = '${k.id}'				
					`;

		pool.query(query, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler("500", "Error updating update-sale-returns-received"), res);
			} else {
			}
		});

		count++;
		if (count === returnArr.length) {
			res.json({
				result: "success",
			});
		}
	}
});

// get sale master to display in sale invoice component
returnsRouter.get("/show-receive-button/:center_id/:sale_return_id", async (req, res) => {
	let center_id = req.params.center_id;
	let sale_return_id = req.params.sale_return_id;

	let query = `
			select count(*) as cnt from sale_return_detail 
			where
			return_qty > received_qty and
			sale_return_id = ${sale_return_id} `;

	pool.query(query, function (err, data) {
		if (err) {
			return handleError(new ErrorHandler("500", "Error updating show-receive-button "), res);
		} else {
			return res.json(data);
		}
	});
});

// this.submitForm.push({
// 	'sale_id': this.salemasterdata.id,
// 	'center_id': this.salemasterdata.center_id,
// 	'to_return_amount': sum_to_return_amount,
// 	'to_receive_items': sum_to_return_items,
// });

/*
Sale return & Create Credit Note + update credit_amt in customer table
Steps: 
1. insert sale_return
2. update sale_details on how many returned 
3. insert sale_return_detail table with details of what is returned and at what price
4. Increase the stock
*/
returnsRouter.post("/add-sale-return", async (req, res) => {
	console.log(" inside add sale return ..." + JSON.stringify(req.body));
	let reqObject = req.body;

	let smd = reqObject[1]; // sale master data
	let srd = reqObject[0]; // salre return details

	const sale_return_id = await insertSaleReturns(smd);

	const job_completed = await insertSaleReturnDetail(srd, sale_return_id, smd);

	updateCRSequenceGenerator(smd.center_id);
	let fetchCRNoteNo = await getSequenceCrNote(smd.center_id);

	let cr_note_id_created = await createCreditNote(fetchCRNoteNo, smd.to_return_amount, "R");
	updateCrNoteIdInSaleReturnTable(cr_note_id_created, sale_return_id);
	let cr_note_updated = await updateCRAmntToCustomer(smd.sale_id, smd.to_return_amount);

	Promise.all([sale_return_id, job_completed, fetchCRNoteNo, cr_note_id_created, cr_note_updated]).then((result) => {
		return res.json("success");
	});
});

module.exports = returnsRouter;

// select c.name, sr.id as sale_return_id, sr.sale_id as sale_id,
// sr.cr_note_id as cr_note_id, sr.center_id as center_id, sr.to_return_amount as to_return_amount, sr.amount_returned as amount_returned, sr.refund_status as refund_status, sr.to_receive_items as to_receive_items, sr.received_items as received_items, sr.receive_status as receive_status, sr.return_status as return_status

// from
// sale_return sr,
// sale s,
// customer c
// where
// c.id = s.customer_id and
// sr.sale_id = s.id and
// sr.center_id = 2 and
// c.id = '328' and
// s.invoice_no = '20/11/00073' and
// 		str_to_date(sr.return_date,  '%d-%m-%Y %T') between
// 				str_to_date('23-11-2020',  '%d-%m-%Y %T') and
// 				str_to_date('23-11-2020',  '%d-%m-%Y %T')

// select
// sd.qty as original_sold_qty,
// srd.return_qty as return_qty,
// sd.mrp, sd.disc_percent, sd.tax ,
// ROUND(srd.return_qty*sd.mrp*(100-sd.disc_percent)/(100+sd.tax), 2) as pretaxtotal,
// IF(s.igst != 0.00,
// s.igst, 0.00
// ) as igsttax,

// IF(s.igst = 0.00,
// ROUND(((select pretaxtotal)*sd.tax/100 /2), 2), 0.00
// ) as cgsttax,

// IF(s.igst = 0.00,
// ROUND(((select pretaxtotal)*sd.tax/100 /2), 2), 0.00
// ) as sgsttax,

// ROUND((select pretaxtotal) + (select igsttax) + (select cgsttax) + (select sgsttax), 2) as total,

// IF(s.igst = 0.00,
// 'yes', 'np'
// ) as cgsttax,
// s.id as sale_id
//  from
// sale_return sr,
// sale_return_detail srd,
// sale s,
// sale_detail sd
// where
// sd.sale_id = s.id and
// sr.sale_id = s.id and
// srd.sale_return_id = sr.id and
// sd.id = srd.sale_detail_id and
// sr.center_id = 2

// select p.id, p.product_code, p.description, srd.* from
// sale_return_detail srd,
// product p,
// sale_detail sd
// where
// p.id = sd.product_id and
// sd.id = srd.sale_detail_id and
// srd.sale_return_id = 1

// "description": "Kit- Valve Guide With Stem Seal (Rv2)",
// 	"disc_percent": 15,
// 	"disc_type": "NET",
// 	"disc_value": 54.15,
// 	"id": 317,
// 	"igst": 0,
// 	"mrp": "361",
// 	"packetsize": 1,
// 	"product_code": "P000213",
// 	"product_id": 65615,
// 	"qty": 1,
// 	"returned": 0,
// 	"sale_id": 58,
// 	"sgst": 14,
// 	"cgst": 14,
// 	"tax": 28,
// 	"tax_value": 67.12,
// 	"taxable_value": 239.73,
// 	"taxrate": 28,
// 	"total_value": 306.85,
// 	"unit_price": 252.7,
// 	"received_now": 1
