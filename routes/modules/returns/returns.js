var pool = require('../../helpers/db');
const moment = require('moment');
const logger = require('./../../helpers/log4js');
const { toTimeZone, currentTimeInTimeZone, toTimeZoneFrmt } = require('./../../helpers/utils');

// param: smd : sale_master_data
// NR: Not Received, A: Approved
const insertSaleReturns = (smd) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'DD-MM-YYYY');

	return new Promise((resolve, reject) => {
		let query = ` insert into sale_return (sale_id, return_date, center_id, to_return_amount,
                  to_receive_items, receive_status, refund_status, return_status )
                  VALUES ('${smd.sale_id}', '${today}', '${smd.center_id}' , '${smd.to_return_amount}', 
                  '${smd.to_receive_items}', 'NR', 'R', 'A')  `;

		pool.query(query, function (err, data) {
			if (err) {
				reject('Error inserting sale returns');
			} else {
				resolve(data.insertId);
			}
		});
	});
};

// Insert sale_return_detail table with details of what is returned and at what price
// Increase the stock
// srd: sale_return_details array, sale_master_data (smd)
const insertSaleReturnDetail = async (srd, sale_return_id, smd) => {
	return new Promise(async (resolve, reject) => {
		for (const k of srd) {
			let insertSaleDetailReturnFlag = await insertSaleDetailReturn(k, sale_return_id, smd);
			let updateSaleDetailFlag = await updateSaleDetail(k);
			let updateStockAfterReturnFlag = await updateStockAfterReturn(k.product_id, k.mrp, k.received_now);
		}
		resolve('done');
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
				reject('Error while inserting sale details return table');
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
				reject('Error while updating sale details with returns' + JSON.stringify(err));
			} else {
				resolve('success');
			}
		});
	});
};

const updateStockAfterReturn = (product_id, mrp, received_now) => {
	let sql = ` update stock set available_stock = available_stock + '${received_now}' where
  product_id = '${product_id}' and mrp = '${mrp}'  `;

	return new Promise((resolve, reject) => {
		pool.query(sql, function (err, data) {
			if (err) {
				reject('Error while updating sale details with returns' + JSON.stringify(err));
			} else {
				resolve('success');
			}
		});
	});
};

const createCreditNote = (credit_note_no, credit_note_total_amount, refund_status) => {
	let sql = ` INSERT INTO credit_note(credit_note_no, credit_note_total_amount, refund_status)
              VALUES
							( '${credit_note_no}', '${credit_note_total_amount}', '${refund_status}' ) `;

	return new Promise((resolve, reject) => {
		pool.query(sql, function (err, data) {
			if (err) {
				reject('Error while inserting createCreditNote ');
			} else {
				resolve(data.insertId);
			}
		});
	});
};

// format and send sequence #
function getSequenceCrNote(center_id) {
	let invNoQry = '';

	invNoQry = ` select concat('${currentTimeInTimeZone('Asia/Kolkata', 'YY')}', "/", '${currentTimeInTimeZone(
		'Asia/Kolkata',
		'MM'
	)}', "/", lpad(cr_note_seq, 5, "0")) as crNoteNo from financialyear 
				where 
				center_id = '${center_id}' and  
				CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;

	return new Promise(function (resolve, reject) {
		pool.query(invNoQry, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data[0].crNoteNo);
		});
	});
}

// Update Sequence in financial Year tbl when its fresh sale insert
function updateCRSequenceGenerator(center_id) {
	let qryUpdateSqnc = '';

	qryUpdateSqnc = `
		update financialyear set cr_note_seq = cr_note_seq + 1 where 
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

function updateCRAmntToCustomer(sale_id, credit_amt) {
	let qryUpdateSqnc = `
		update customer c, sale s
		set 
		c.credit_amt = c.credit_amt + ${credit_amt}
		where
		s.customer_id = c.id and
		s.id = '${sale_id}' `;

	return new Promise(function (resolve, reject) {
		pool.query(qryUpdateSqnc, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
}

function updateCrNoteIdInSaleReturnTable(cr_note_id, sale_return_id) {
	let qryUpdateSqnc = `
	update sale_return set cr_note_id = ${cr_note_id}
	where id = 	${sale_return_id}	 `;

	return new Promise(function (resolve, reject) {
		pool.query(qryUpdateSqnc, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
}

module.exports = {
	insertSaleReturns,
	insertSaleReturnDetail,
	insertSaleDetailReturn,
	updateSaleDetail,
	updateStockAfterReturn,
	createCreditNote,
	updateCRAmntToCustomer,
	updateCRSequenceGenerator,
	getSequenceCrNote,
	updateCrNoteIdInSaleReturnTable,
};
