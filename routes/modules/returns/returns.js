var pool = require("../../helpers/db");
const moment = require("moment");
const logger = require("./../../helpers/log4js");

// param: smd : sale_master_data
// NR: Not Received, A: Approved
const insertSaleReturns = (smd) => {
	var today = new Date();
	today = moment(today).format("DD-MM-YYYY");
	return new Promise((resolve, reject) => {
		let query = ` insert into sale_return (sale_id, return_date, center_id, to_return_amount,
                  to_receive_items, receive_status, refund_status, return_status )
                  VALUES ('${smd.sale_id}', '${today}', '${smd.center_id}' , '${smd.to_return_amount}', 
                  '${smd.to_receive_items}', 'NR', 'P', 'A')  `;

		pool.query(query, function (err, data) {
			if (err) {
				reject("Error inserting sale returns");
			} else {
				resolve(data.insertId);
			}
		});
	});
};

// srd: sale_return_details array, sale_master_data (smd)
const insertSaleReturnDetail = async (srd, sale_return_id, smd) => {
	return new Promise(async (resolve, reject) => {
		for (const k of srd) {
			console.log("received now " + k.received_now);
			let insertSaleDetailReturnFlag = await insertSaleDetailReturn(k, sale_return_id, smd);
			let updateSaleDetailFlag = await updateSaleDetail(k);
			let updateStockAfterReturnFlag = await updateStockAfterReturn(k.product_id, k.mrp, k.received_now);
		}
		resolve("done");
	});
};

const insertSaleDetailReturn = (srd, sale_return_id, smd) => {
	let sql = ` INSERT INTO sale_return_detail(sale_return_id, sale_id, sale_detail_id, return_qty, 
              reason, disc_percent, tax, mrp,
              igst, cgst, sgst, orig_sold_qty, taxable_value, total_value)
              VALUES
              ( '${sale_return_id}', '${smd.sale_id}', '${srd.id}', '${srd.received_now}', 
              'testing', '${srd.disc_percent}', '${srd.tax}', 
              '${srd.mrp}', '${srd.igst}', '${srd.cgst}', '${srd.sgst}', 
              '${srd.qty}', '${srd.taxable_value}', '${srd.total_value}') `;

	return new Promise((resolve, reject) => {
		pool.query(sql, function (err, data) {
			if (err) {
				reject("Error while inserting sale details return table");
			} else {
				resolve(data.insertId);
			}
		});
	});
};
const updateSaleDetail = (smd) => {
	// returned = received_now & sale_detail_id = id
	let sql = ` update sale_detail set returned = returned + '${smd.received_now}' where id = '${smd.id}' `;
	return new Promise((resolve, reject) => {
		pool.query(sql, function (err, data) {
			if (err) {
				console.log("dinesh " + JSON.stringify(err));
				reject("Error while updating sale details with returns");
			} else {
				resolve("success");
			}
		});
	});
};

const updateStockAfterReturn = (product_id, mrp, received_now) => {
	let sql = ` update stock set available_stock = available_stock + '${received_now}' where
  product_id = '${product_id}' and mrp = '${mrp}'  `;

	console.log("pring sql " + sql);

	return new Promise((resolve, reject) => {
		pool.query(sql, function (err, data) {
			if (err) {
				console.log("dinesh " + JSON.stringify(err));
				reject("Error while updating sale details with returns");
			} else {
				resolve("success");
			}
		});
	});
};

module.exports = {
	insertSaleReturns,
	insertSaleReturnDetail,
	insertSaleDetailReturn,
	updateSaleDetail,
	updateStockAfterReturn,
};
