var pool = require("../../helpers/db");
// const logger = require("../../helpers/log4js");
const logger = require("./../../helpers/log4js");

const moment = require("moment");

const addSaleLedgerRecord = (insertValues, invoice_ref_id, callback) => {
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");
	// balance amount is taken from querying ledger table, with Limit 1, check the subquery.
	let query = `
INSERT INTO ledger ( center_id, customer_id, invoice_ref_id, ledger_detail, credit_amt, balance_amt, ledger_date)
VALUES
  ( ? , ?, ?, 'invoice', ?, IFNULL((select balance_amt from (select (balance_amt) as balance_amt
    FROM ledger
    where center_id = '${insertValues.center_id}'  and customer_id = '${insertValues.customerctrl.id}'
    ORDER BY  id DESC
    LIMIT 1) a), 0) + '${insertValues.net_total}', '${today}'
  ) `;

	let values = [insertValues.center_id, insertValues.customerctrl.id, invoice_ref_id, insertValues.net_total];

	pool.query(query, values, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

// reverse sale ledger entry if it is update of completed sale
// if multiple invoices are there the balance amount has to be taken from the last record, so consiously we ignore invoice ref id

const addReverseSaleLedgerRecord = (insertValues, invoice_ref_id, callback) => {
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	// balance amount is taken from querying ledger table, with Limit 1, check the subquery.
	let query = `
INSERT INTO ledger ( center_id, customer_id, invoice_ref_id, ledger_detail, debit_amt, balance_amt, ledger_date)
VALUES
	( ? , ?, ?, 'Invoice Reversal', 
	
	IFNULL((select credit_amt from (select (credit_amt) as credit_amt
    FROM ledger
		where center_id = '${insertValues.center_id}'  and customer_id = '${insertValues.customerctrl.id}'
		and ledger_detail = 'Invoice' and invoice_ref_id = '${invoice_ref_id}'
    ORDER BY  id DESC
		LIMIT 1) a), 0),
		
		(
			
	
	 IFNULL((select balance_amt from (select (balance_amt ) as balance_amt
    FROM ledger
		where center_id = '${insertValues.center_id}'  and customer_id = '${insertValues.customerctrl.id}'
		
    ORDER BY  id DESC
		LIMIT 1) a), 0)
		-
		IFNULL((select credit_amt from (select (credit_amt) as credit_amt
			FROM ledger
			where center_id = '${insertValues.center_id}'  and customer_id = '${insertValues.customerctrl.id}'
			and ledger_detail = 'Invoice' and invoice_ref_id = '${invoice_ref_id}'
			ORDER BY  id DESC
			LIMIT 1) a), 0)
		
		), '${today}'
  ) `;

	let values = [insertValues.center_id, insertValues.customerctrl.id, invoice_ref_id];

	pool.query(query, values, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

const addSaleLedgerAfterReversalRecord = (insertValues, invoice_ref_id, callback) => {
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");
	// balance amount is taken from querying ledger table, with Limit 1, check the subquery.
	let query = `
INSERT INTO ledger ( center_id, customer_id, invoice_ref_id, ledger_detail, credit_amt, balance_amt, ledger_date)
VALUES
  ( ? , ?, ?, 'Invoice', ?, (credit_amt + IFNULL((select balance_amt from (select (balance_amt) as balance_amt
    FROM ledger
    where center_id = '${insertValues.center_id}'  and customer_id = '${insertValues.customerctrl.id}'
    ORDER BY  id DESC
    LIMIT 1) a), 0)), '${today}'
  ) `;

	let values = [insertValues.center_id, insertValues.customerctrl.id, invoice_ref_id, insertValues.net_total];

	pool.query(query, values, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

const addPaymentLedgerRecord = (insertValues, payment_ref_id, receivedamount, sale_ref_id, callback) => {
	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	let query = `
	INSERT INTO ledger ( center_id, customer_id, invoice_ref_id, payment_ref_id, ledger_detail, debit_amt, balance_amt, ledger_date)
	VALUES
		( ? , ?, '${sale_ref_id}', ?, 'Payment', ?, IFNULL((select balance_amt from (select (balance_amt) as balance_amt
			FROM ledger
			where center_id = '${insertValues.customer.center_id}'  and customer_id = '${insertValues.customer.id}'
			ORDER BY  id DESC
			LIMIT 1) a), 0) - '${receivedamount}', '${today}'
		) `;

	let values = [insertValues.customer.center_id, insertValues.customer.id, payment_ref_id, receivedamount];

	pool.query(query, values, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

const addPaymentMaster = async (cloneReq, pymtNo, insertValues, callback) => {
	// (1) Updates payment seq in tbl financialyear, then {returns} formated sequence {YY/MM/PYMTSEQ}

	var today = new Date();
	today = moment(today).format("YYYY-MM-DD HH:mm:ss");

	let values = [
		cloneReq.centerid,
		cloneReq.customer.id,
		pymtNo,
		insertValues.receivedamount,
		cloneReq.customer.credit_amt,
		moment(insertValues.receiveddate).format("DD-MM-YYYY"),
		insertValues.pymtmode,
		insertValues.bankref,
		insertValues.pymtref,
	];

	let query = `
		INSERT INTO payment ( center_id, customer_id, payment_no, payment_now_amt, advance_amt_used, pymt_date, pymt_mode_ref_id, bank_ref, pymt_ref, last_updated)
		VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, '${today}' ) `;

	return new Promise(function (resolve, reject) {
		pool.query(query, values, function (err, data) {
			if (err) {
				return reject(callback(err));
			}
			return resolve(callback(null, data));
		});
	});
};

const updatePymtSequenceGenerator = (center_id) => {
	let qryUpdateSqnc = "";

	qryUpdateSqnc = `
		update financialyear set pymt_seq = pymt_seq + 1 where 
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
};

const getPymtSequenceNo = (cloneReq) => {
	let pymtNoQry = "";

	pymtNoQry = ` select concat('${moment(cloneReq.pymt_date).format("YY")}', "/", '${moment(cloneReq.pymt_date).format(
		"MM",
	)}', "/", lpad(pymt_seq, 5, "0")) as pymtNo from financialyear 
				where 
				center_id = '${cloneReq.centerid}' and  
				CURDATE() between str_to_date(startdate, '%d-%m-%Y') and str_to_date(enddate, '%d-%m-%Y') `;

	return new Promise(function (resolve, reject) {
		pool.query(pymtNoQry, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data[0].pymtNo);
		});
	});
};

const getPaymentsByCustomers = (center_id, customer_id, callback) => {
	let query = ` select p.*, pd.applied_amount as applied_amount, s.invoice_no as invoice_no, 
	s.invoice_date as invoice_date, s.net_total as invoice_amount,  pm.pymt_mode_name as pymt_mode from 
        payment p,
        payment_detail pd,
				sale s,
				payment_mode pm
				where 
				pm.id = p.pymt_mode_ref_id and
        p.id = pd.pymt_ref_id and
        pd.sale_ref_id = s.id and
        p.center_id =   '${center_id}' and p.customer_id = '${customer_id}' order by id desc  `;

	pool.query(query, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

const getPymtTransactionByCustomers = (center_id, customer_id, callback) => {
	let query = ` 
	select 
	p.id as id, p.center_id as center_id, p.customer_id as customer_id,
	p.payment_no as payment_no,
		p.payment_now_amt as payment_now_amt,
		p.advance_amt_used as advance_amt_used,
		str_to_date(p.pymt_date, '%d-%m-%YYYY') as pymt_date,
		p.pymt_mode_ref_id as pymt_mode_ref_id,
		p.bank_ref as bank_ref,
		p.pymt_ref as pymt_ref,
		p.is_cancelled as is_cancelled,
		p.cancelled_date as cancelled_date,
		p.createdby as createdby,
		p.last_updated as last_updated,
	
	pm.pymt_mode_name as pymt_mode
 	from
  	payment p,
		payment_mode pm
	where 
		pm.id = p.pymt_mode_ref_id and
		p.center_id = '${center_id}' and p.customer_id = '${customer_id}'
	order by last_updated desc `;

	pool.query(query, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

const getPaymentsByCenter = (center_id, callback) => {
	let query = `
	select 
	c.name as customer_name,
	pymt_mode_name as pymt_mode_name,
	p.payment_no as payment_no,
 DATE_FORMAT(STR_TO_DATE(p.pymt_date,'%d-%m-%Y'), '%d-%b-%Y') as pymt_date,
	p.advance_amt_used as advance_amt_used,
	pymt_mode_ref_id as pymt_mode_ref_id,
	pymt_ref as pymt_ref,
	last_updated as last_updated,
	s.invoice_no as invoice_no, 
	DATE_FORMAT(STR_TO_DATE(s.invoice_date,'%d-%m-%Y'), '%d-%b-%Y') as invoice_date,
	pd.applied_amount as applied_amount
	from 
				 payment p,
				 payment_detail pd,
				 sale s,
				 customer c,
				 payment_mode pm
				 where 
				 pm.id = p.pymt_mode_ref_id and
				 c.id = p.customer_id and
				 p.id = pd.pymt_ref_id and
				 pd.sale_ref_id = s.id and
				 p.center_id = '${center_id}' order by pymt_date desc 
				 
				 
	`;

	pool.query(query, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

const getPymtTransactionsByCenter = (center_id, callback) => {
	let query = `
	select 
	c.name as customer_name,
	pymt_mode_name as pymt_mode_name,
	p.payment_no as payment_no,
	 DATE_FORMAT(STR_TO_DATE(p.pymt_date,'%d-%m-%Y'), '%d-%b-%Y') as pymt_date,
	 p.payment_now_amt as paid_amount,
	p.advance_amt_used as advance_amt_used,
	pymt_mode_ref_id as pymt_mode_ref_id,
	pymt_ref as pymt_ref,
	last_updated as last_updated
from 
	payment p,
	customer c,
	payment_mode pm
where 
	pm.id = p.pymt_mode_ref_id and
	c.id = p.customer_id and
	p.center_id = '${center_id}' order by pymt_date desc 
	
	`;

	pool.query(query, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

const getLedgerByCustomers = (center_id, customer_id, callback) => {
	let query = ` select l.center_id, l.customer_id, l.ledger_detail, l.credit_amt, l.debit_amt, l.balance_amt, l.ledger_date,
	(select s.invoice_no from sale s where s.id = l.invoice_ref_id) as invoice_ref_id,
	(select p.payment_no from payment p where p.id = l.payment_ref_id) as payment_ref_id
	 from ledger l
	 where 
	 l.center_id =  '${center_id}' and l.customer_id = '${customer_id}' order by l.id desc  `;

	pool.query(query, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

const getSaleInvoiceByCustomers = (center_id, customer_id, callback) => {
	// let query = ` select * from sale where sale_type = 'gstinvoice' and center_id =  '${center_id}' and customer_id = '${customer_id}' order by id desc `;

	let query = `	select s.id as sale_id, s.center_id as center_id, s.customer_id as customer_id, s.invoice_no as invoice_no, s.invoice_date as invoice_date, s.net_total as invoice_amt, s.sale_type as sale_type, c.name as customer_name, c.address1 as customer_address1,
	c.address2 as customer_address2,
	(select
	(
			 CASE
					WHEN  sum(pd.applied_amount) = s.net_total THEN 'PAID'
					WHEN  (sum(pd.applied_amount) <= s.net_total &&  sum(pd.applied_amount) > 0 )THEN 'PARTIALLY PAID'
	
					ELSE 'NOT PAID'
			END)  as payment_status
	
	from payment_detail pd, payment p2
	where pd.sale_ref_id = s.id and pd.pymt_ref_id = p2.id and p2.is_cancelled = 'NO') as payment_status,
	IFNULL((select sum(pd.applied_amount) from payment_detail pd, payment p2
	where pd.sale_ref_id = s.id and pd.pymt_ref_id = p2.id and p2.is_cancelled = 'NO'), 0) as paid_amount,
	(s.net_total - IFNULL((select sum(pd.applied_amount) from payment_detail pd, payment p2
	where pd.sale_ref_id = s.id and pd.pymt_ref_id = p2.id and p2.is_cancelled = 'NO'), 0)) as 
	bal_amount
	from sale s, customer c
	where
	c.id = '${customer_id}' and
	s.center_id = '${center_id}' and
	s.customer_id = c.id and
	s.sale_type= 'gstinvoice'
	`;

	pool.query(query, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

const getSaleInvoiceByCenter = (center_id, callback) => {
	let query = `	select s.id as sale_id, s.center_id as center_id, s.customer_id as customer_id, s.invoice_no as invoice_no, s.invoice_date as invoice_date, s.net_total as invoice_amt, s.sale_type as sale_type, c.name as customer_name, c.address1 as customer_address1,
	c.address2 as customer_address2,
	(select
	(
			 CASE
					WHEN  sum(pd.applied_amount) = s.net_total THEN 'PAID'
					WHEN  (sum(pd.applied_amount) <= s.net_total &&  sum(pd.applied_amount) > 0 )THEN 'PARTIALLY PAID'
	
					ELSE 'NOT PAID'
			END)  as payment_status
	 
	from payment_detail pd, payment p2
	where pd.sale_ref_id = s.id and pd.pymt_ref_id = p2.id and p2.is_cancelled = 'NO') as payment_status,
	IFNULL((select sum(pd.applied_amount) from payment_detail pd, payment p2
	where pd.sale_ref_id = s.id and pd.pymt_ref_id = p2.id and p2.is_cancelled = 'NO'), 0) as paid_amount,
	(s.net_total - IFNULL((select sum(pd.applied_amount) from payment_detail pd, payment p2
	where pd.sale_ref_id = s.id and pd.pymt_ref_id = p2.id and p2.is_cancelled = 'NO'), 0)) as 
	bal_amount
	from sale s, customer c
	where
	
	s.center_id = '${center_id}' and
	s.customer_id = c.id and
	s.sale_type= 'gstinvoice'
	`;

	pool.query(query, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

const updateCustomerCredit = (balanceamount, center_id, customer_id) => {
	let qryUpdateSqnc = "";

	//~ bitwise operator. Bitwise does not negate a number exactly. eg:  ~1000 is -1001, not -1000 (a = ~a + 1)
	balanceamount = ~balanceamount + 1;

	qryUpdateSqnc = `
		update customer set credit_amt = credit_amt + ${balanceamount} where 
		center_id = '${center_id}' and  
		id = '${customer_id}'
		 `;

	return new Promise(function (resolve, reject) {
		pool.query(qryUpdateSqnc, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

const updateCustomerCreditMinus = (creditusedamount, center_id, customer_id) => {
	let qryUpdateSqnc = "";

	qryUpdateSqnc = `
		update customer set credit_amt = credit_amt - ${creditusedamount} where 
		center_id = '${center_id}' and  
		id = '${customer_id}'
		 `;

	return new Promise(function (resolve, reject) {
		pool.query(qryUpdateSqnc, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

module.exports = {
	addSaleLedgerRecord,
	addPaymentMaster,
	getLedgerByCustomers,
	getSaleInvoiceByCustomers,
	getPaymentsByCustomers,
	addPaymentLedgerRecord,
	updatePymtSequenceGenerator,
	getPymtSequenceNo,
	getPaymentsByCenter,
	getPymtTransactionsByCenter,
	getSaleInvoiceByCenter,
	updateCustomerCredit,
	updateCustomerCreditMinus,
	addReverseSaleLedgerRecord,
	addSaleLedgerAfterReversalRecord,
	getPymtTransactionByCustomers,
};

// select s.id as sale_id, s.center_id as center_id, s.customer_id as customer_id, s.invoice_no as invoice_no, s.invoice_date as invoice_date, s.net_total as invoice_amt, s.sale_type as sale_type, c.name as customer_name, c.address1 as customer_address1,
// c.address2 as customer_address2,
// (select sum(pd.applied_amount) from payment_detail pd, payment p2
// where pd.sale_ref_id = s.id and pd.pymt_ref_id = p2.id and p2.is_cancelled = 'NO') as paid_amout
// from sale s, customer c
// where
// c.id = 4 and
// s.customer_id = c.id and
// s.sale_type= 'gstinvoice'

// select s.id as sale_id, s.center_id as center_id, s.customer_id as customer_id, s.invoice_no as invoice_no, s.invoice_date as invoice_date, s.net_total as invoice_amt, s.sale_type as sale_type, c.name as customer_name, c.address1 as customer_address1,
// c.address2 as customer_address2,
// (select
// (
//      CASE
//         WHEN  sum(pd.applied_amount) = s.net_total THEN 'paid'
//         WHEN  sum(pd.applied_amount) = s.net_total THEN 'paid'

//         ELSE 'UN PAID'
//     END)  as paid_amout

// from payment_detail pd, payment p2
// where pd.sale_ref_id = s.id and pd.pymt_ref_id = p2.id and p2.is_cancelled = 'NO') as paid_amout
// from sale s, customer c
// where
// c.id = 4 and
// s.customer_id = c.id and
// s.sale_type= 'gstinvoice'
