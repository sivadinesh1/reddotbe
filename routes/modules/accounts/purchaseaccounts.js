var pool = require('../../helpers/db');
// const logger = require("../../helpers/log4js");
const logger = require('../../helpers/log4js');
const { toTimeZone, currentTimeInTimeZone } = require('../../helpers/utils');

const moment = require('moment');

const addPurchaseLedgerRecord = (insertValues, purchase_ref_id, callback) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	// balance amount is taken from querying purchase_ledger table, with Limit 1, check the subquery.
	let query = `
INSERT INTO purchase_ledger ( center_id, vendor_id, purchase_ref_id, ledger_detail, credit_amt, balance_amt, ledger_date)
VALUES
  ( ? , ?, ?, 'purchase', ?, IFNULL((select balance_amt from (select (balance_amt) as balance_amt
    FROM purchase_ledger
    where center_id = '${insertValues.centerid}'  and vendor_id = '${insertValues.vendorctrl.id}'
    ORDER BY  id DESC
    LIMIT 1) a), 0) + '${insertValues.net_total}', '${today}'
  ) `;

	let values = [
		insertValues.centerid,
		insertValues.vendorctrl.id,
		purchase_ref_id,
		insertValues.net_total,
	];

	return new Promise(function (resolve, reject) {
		pool.query(query, values, async function (err, data) {
			if (err) {
				reject(err);
			}
			let updateVendorBalance = await updateVendorBalanceAmount(
				insertValues.vendorctrl.id
			);
			resolve(data);
		});
	});
};

const addReversePurchaseLedgerRecord = (insertValues, purchase_ref_id) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	// balance amount is taken from querying purchase ledger table, with Limit 1, check the subquery.
	let query = `
INSERT INTO purchase_ledger ( center_id, vendor_id, purchase_ref_id, ledger_detail, debit_amt, balance_amt, ledger_date)
VALUES
	( ? , ?, ?, 'Purchase Reversal', 
	
	IFNULL((select credit_amt from (select (credit_amt) as credit_amt
    FROM purchase_ledger
		where center_id = '${insertValues.centerid}'  and vendor_id = '${insertValues.vendorctrl.id}'
		and ledger_detail = 'Invoice' and purchase_ref_id = '${purchase_ref_id}'
    ORDER BY  id DESC
		LIMIT 1) a), 0),
		
		(
			
	
	 IFNULL((select balance_amt from (select (balance_amt ) as balance_amt
    FROM purchase_ledger
		where center_id = '${insertValues.centerid}'  and vendor_id = '${insertValues.vendorctrl.id}'
		
    ORDER BY  id DESC
		LIMIT 1) a), 0)
		-
		IFNULL((select credit_amt from (select (credit_amt) as credit_amt
			FROM purchase_ledger
			where center_id = '${insertValues.centerid}'  and vendor_id = '${insertValues.vendorctrl.id}'
			and ledger_detail = 'purchase' and purchase_ref_id = '${purchase_ref_id}'
			ORDER BY  id DESC
			LIMIT 1) a), 0)
		
		), '${today}'
  ) `;

	let values = [
		insertValues.centerid,
		insertValues.vendorctrl.id,
		purchase_ref_id,
	];

	return new Promise(function (resolve, reject) {
		pool.query(query, values, async function (err, data) {
			if (err) {
				return reject(err);
			}
			let updateVendorBalance = await updateVendorBalanceAmount(
				insertValues.vendorctrl.id
			);
			return resolve(data);
		});
	});
};

const addPurchaseLedgerAfterReversalRecord = (
	insertValues,
	purchase_ref_id
) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	// balance amount is taken from querying purchase ledger table, with Limit 1, check the subquery.
	let query = `
INSERT INTO purchase_ledger ( center_id, vendor_id, purchase_ref_id, ledger_detail, credit_amt, balance_amt, ledger_date)
VALUES
  ( ? , ?, ?, 'purchase', ?, (credit_amt + IFNULL((select balance_amt from (select (balance_amt) as balance_amt
    FROM purchase_ledger
    where center_id = '${insertValues.centerid}'  and vendor_id = '${insertValues.vendorctrl.id}'
    ORDER BY  id DESC
    LIMIT 1) a), 0)), '${today}'
  ) `;

	let values = [
		insertValues.centerid,
		insertValues.vendorctrl.id,
		purchase_ref_id,
		insertValues.net_total,
	];

	return new Promise(function (resolve, reject) {
		pool.query(query, values, async function (err, data) {
			if (err) {
				return reject(err);
			}
			let updateVendorBalance = await updateVendorBalanceAmount(
				insertValues.vendorctrl.id
			);
			return resolve(data);
		});
	});
};

const updateVendorBalanceAmount = (vendor_id) => {
	let qryUpdate = '';

	qryUpdate = `
	update vendor v set v.balance_amt = (
		select balance_amt from purchase_ledger l where l.vendor_id = '${vendor_id}' 
		order by id desc
		limit 1)
		where 
		v.id = '${vendor_id}'  
		 `;

	return new Promise(function (resolve, reject) {
		pool.query(qryUpdate, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

const getPurchaseInvoiceByCenter = (
	center_id,
	from_date,
	to_date,
	vendor_id,
	searchtype,
	invoiceno,
	callback
) => {
	let query = `	select p.id as purchase_id, 
	p.center_id as center_id, 
	p.vendor_id as vendor_id, 
	p.invoice_no as invoice_no, 
	p.invoice_date as invoice_date, 
	abs(datediff(STR_TO_DATE(p.invoice_date,'%d-%m-%Y'), CURDATE())) as aging_days,
	p.net_total as invoice_amt, 
	v.name as vendor_name, v.address1 as vendor_address1,
	v.address2 as vendor_address2,
	(select
		(
				 CASE
						WHEN  sum(pd.applied_amount) = p.net_total THEN 'PAID'
						WHEN  (sum(pd.applied_amount) <= p.net_total &&  sum(pd.applied_amount) > 0 )THEN 'PARTIALLY PAID'
		
						ELSE 'NOT PAID'
				END)  as payment_status
		 
		from 
			vendor_payment_detail pd, 
			vendor_payment p2
		where 
			pd.purchase_ref_id = p.id and 
			pd.vend_pymt_ref_id = p2.id and 
			p2.is_cancelled = 'NO') as payment_status,
	IFNULL((select sum(pd.applied_amount) from vendor_payment_detail pd, vendor_payment p2
		where pd.purchase_ref_id = p.id and pd.vend_pymt_ref_id = p2.id and p2.is_cancelled = 'NO'), 0) as paid_amount,
	(p.net_total - IFNULL((select sum(pd.applied_amount) from vendor_payment_detail pd, vendor_payment p2
		where pd.purchase_ref_id = p.id and pd.vend_pymt_ref_id = p2.id and p2.is_cancelled = 'NO'), 0)) as 
		bal_amount
	from purchase p, vendor v
	where
		p.center_id = '${center_id}' and
		p.vendor_id = v.id 
	
	`;

	if (vendor_id !== undefined && searchtype === 'all') {
		query =
			query +
			` and STR_TO_DATE(p.invoice_date,'%d-%m-%Y') between
		str_to_date('${from_date}', '%d-%m-%YYYY') and
		str_to_date('${to_date}', '%d-%m-%YYYY')`;
	}

	if (vendor_id !== undefined && vendor_id !== 'all' && searchtype === 'all') {
		query = query + ` and	p.vendor_id = '${vendor_id}' `;
	}

	if (searchtype === 'invonly') {
		query = query + ` and p.invoice_no = '${invoiceno}' `;
	}

	pool.query(query, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

const updateVendorPymtSequenceGenerator = (center_id) => {
	let qryUpdateSqnc = '';

	qryUpdateSqnc = `
		update financialyear set vendor_pymt_seq = vendor_pymt_seq + 1 where 
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

const getVendorPymtSequenceNo = (cloneReq) => {
	let pymtNoQry = '';

	pymtNoQry = ` select concat('${moment(cloneReq.pymt_date).format(
		'YY'
	)}', "/", '${moment(cloneReq.pymt_date).format(
		'MM'
	)}', "/", lpad(vendor_pymt_seq, 5, "0")) as pymtNo from financialyear 
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

const addVendorPaymentMaster = async (
	cloneReq,
	pymtNo,
	insertValues,
	callback
) => {
	// (1) Updates payment seq in tbl financialyear, then {returns} formated sequence {YY/MM/PYMTSEQ}

	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let values = [
		cloneReq.centerid,
		cloneReq.vendor.id,
		pymtNo,
		insertValues.receivedamount,
		cloneReq.vendor.credit_amt,
		moment(insertValues.receiveddate).format('DD-MM-YYYY'),
		insertValues.pymtmode,
		insertValues.bankref,
		insertValues.pymtref,
	];

	let query = `
		INSERT INTO vendor_payment ( center_id, vendor_id, vendor_payment_no, payment_now_amt, advance_amt_used, pymt_date, pymt_mode_ref_id, bank_ref, pymt_ref, last_updated)
		VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, '${today}' ) `;

	return new Promise(function (resolve, reject) {
		pool.query(query, values, async function (err, data) {
			if (err) {
				return reject(callback(err));
			}

			await updateVendorLastPaidDate(
				cloneReq.vendor.id,
				insertValues.receiveddate
			);

			return resolve(callback(null, data));
		});
	});
};

const addVendorPaymentLedgerRecord = (
	insertValues,
	payment_ref_id,
	receivedamount,
	purchase_ref_id,
	callback
) => {
	let today = currentTimeInTimeZone('Asia/Kolkata', 'YYYY-MM-DD HH:mm:ss');

	let query = `
	INSERT INTO purchase_ledger ( center_id, vendor_id, purchase_ref_id, payment_ref_id, ledger_detail, debit_amt, balance_amt, ledger_date)
	VALUES
		( ? , ?, '${purchase_ref_id}', ?, 'Payment', ?, IFNULL((select balance_amt from (select (balance_amt) as balance_amt
			FROM purchase_ledger
			where center_id = '${insertValues.vendor.center_id}'  and vendor_id = '${insertValues.vendor.id}'
			ORDER BY  id DESC
			LIMIT 1) a), 0) - '${receivedamount}', '${today}'
		) `;

	let values = [
		insertValues.vendor.center_id,
		insertValues.vendor.id,
		payment_ref_id,
		receivedamount,
	];

	pool.query(query, values, async function (err, data) {
		if (err) {
			return callback(err);
		}
		let updateVendorBalance = await updateVendorBalanceAmount(
			insertValues.vendor.id
		);
		return callback(null, data);
	});
};

const updateVendorCredit = (balanceamount, center_id, vendor_id) => {
	let qryUpdateSqnc = '';

	//~ bitwise operator. Bitwise does not negate a number exactly. eg:  ~1000 is -1001, not -1000 (a = ~a + 1)
	balanceamount = ~balanceamount + 1;

	qryUpdateSqnc = `
		update vendor set credit_amt = credit_amt + ${balanceamount} where 
		center_id = '${center_id}' and  
		id = '${vendor_id}'
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

const updateVendorCreditMinus = (creditusedamount, center_id, vendor_id) => {
	let qryUpdateSqnc = '';

	qryUpdateSqnc = `
		update vendor set credit_amt = credit_amt - ${creditusedamount} where 
		center_id = '${center_id}' and  
		id = '${vendor_id}'
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

const updateVendorLastPaidDate = (vendor_id, last_paid_date) => {
	let dt = moment(last_paid_date).format('YYYY-MM-DD');
	let qryUpdate = `
	update vendor c set c.last_paid_date = '${dt}' 
		where c.id = '${vendor_id}' 
		 `;

	return new Promise(function (resolve, reject) {
		pool.query(qryUpdate, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

const getVendorPaymentsByCenter = (
	center_id,
	from_date,
	to_date,
	vendor_id,
	searchtype,
	invoiceno,
	callback
) => {
	let query = `
	select 
	c.name as vendor_name,
	c.id as vendor_id,
	pymt_mode_name as pymt_mode_name,
	p.bank_ref as bank_ref,
	p.pymt_ref as pymt_ref,
	p.vendor_payment_no as payment_no,
 DATE_FORMAT(STR_TO_DATE(p.pymt_date,'%d-%m-%Y'), '%d-%b-%Y') as pymt_date,
	p.advance_amt_used as advance_amt_used,
	pymt_mode_ref_id as pymt_mode_ref_id,
	pymt_ref as pymt_ref,
	last_updated as last_updated,
	s.invoice_no as invoice_no, 
	DATE_FORMAT(STR_TO_DATE(s.invoice_date,'%d-%m-%Y'), '%d-%b-%Y') as invoice_date,
	pd.applied_amount as applied_amount
	from 
				 vendor_payment p,
				 vendor_payment_detail pd,
				 purchase s,
				 vendor c,
				 payment_mode pm
				 where 
				 pm.id = p.pymt_mode_ref_id and
				 c.id = p.vendor_id and
				 p.id = pd.vend_pymt_ref_id and
				 pd.purchase_ref_id = s.id and
				 p.center_id = '${center_id}' `;

	if (vendor_id !== undefined && searchtype === 'all') {
		query =
			query +
			` and STR_TO_DATE(s.invoice_date,'%d-%m-%Y') between
		str_to_date('${from_date}', '%d-%m-%YYYY') and
		str_to_date('${to_date}', '%d-%m-%YYYY')`;
	}

	if (vendor_id !== undefined && vendor_id !== 'all' && searchtype === 'all') {
		query = query + ` and	p.vendor_id = '${vendor_id}' `;
	}

	if (searchtype === 'invonly') {
		query = query + ` and s.invoice_no = '${invoiceno}' `;
	}

	query = query + ` order by pymt_date desc  `;

	pool.query(query, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

const getPurchaseInvoiceByVendors = (
	center_id,
	vendor_id,
	from_date,
	to_date,
	searchtype,
	invoiceno,
	callback
) => {
	let query = `	select s.id as purchase_id, s.center_id as center_id, s.vendor_id as vendor_id, s.invoice_no as invoice_no, 
	s.invoice_date as invoice_date, 
	abs(datediff(STR_TO_DATE(s.invoice_date,'%d-%m-%Y'), CURDATE())) as aging_days,
	s.net_total as invoice_amt, 
	s.purchase_type as purchase_type, 
	c.name as vendor_name, c.address1 as vendor_address1,
	c.address2 as vendor_address2,
	(select
	(
			 CASE
					WHEN  sum(pd.applied_amount) = s.net_total THEN 'PAID'
					WHEN  (sum(pd.applied_amount) <= s.net_total &&  sum(pd.applied_amount) > 0 )THEN 'PARTIALLY PAID'
	
					ELSE 'NOT PAID'
			END)  as payment_status
	
	from vendor_payment_detail pd, vendor_payment p2
	where pd.purchase_ref_id = s.id and pd.vend_pymt_ref_id = p2.id and p2.is_cancelled = 'NO') as payment_status,
	IFNULL((select sum(pd.applied_amount) from vendor_payment_detail pd, vendor_payment p2
	where pd.purchase_ref_id = s.id and pd.vend_pymt_ref_id = p2.id and p2.is_cancelled = 'NO'), 0) as paid_amount,
	(s.net_total - IFNULL((select sum(pd.applied_amount) from vendor_payment_detail pd, vendor_payment p2
	where pd.purchase_ref_id = s.id and pd.vend_pymt_ref_id = p2.id and p2.is_cancelled = 'NO'), 0)) as 
	bal_amount
	from purchase s, vendor c
	where
	c.id = '${vendor_id}' and
	s.center_id = '${center_id}' and
	s.vendor_id = c.id 

	`;

	if (vendor_id !== undefined && searchtype === 'all') {
		query =
			query +
			` and STR_TO_DATE(s.invoice_date,'%d-%m-%Y') between
		str_to_date('${from_date}', '%d-%m-%YYYY') and
		str_to_date('${to_date}', '%d-%m-%YYYY')`;
	}

	if (vendor_id !== undefined && vendor_id !== 'all' && searchtype === 'all') {
		query = query + ` and	s.vendor_id = '${vendor_id}' `;
	}

	if (searchtype === 'invonly') {
		query = query + ` and s.invoice_no = '${invoiceno}' `;
	}

	// stock issue should also be pulled out, check
	pool.query(query, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

const getPaymentsByVendors = (
	center_id,
	vendor_id,
	from_date,
	to_date,
	searchtype,
	invoiceno,
	callback
) => {
	let query = ` select p.*, pd.applied_amount as applied_amount, s.invoice_no as invoice_no, 
	s.invoice_date as invoice_date, s.net_total as invoice_amount,  pm.pymt_mode_name as pymt_mode from 
        vendor_payment p,
        vendor_payment_detail pd,
				purchase s,
				payment_mode pm
				where 
				pm.id = p.pymt_mode_ref_id and
        p.id = pd.vend_pymt_ref_id and
        pd.purchase_ref_id = s.id and
        p.center_id =   '${center_id}' `;

	if (vendor_id !== undefined && searchtype === 'all') {
		query =
			query +
			` and STR_TO_DATE(s.invoice_date,'%d-%m-%Y') between
					str_to_date('${from_date}', '%d-%m-%YYYY') and
					str_to_date('${to_date}', '%d-%m-%YYYY')`;
	}

	if (vendor_id !== undefined && vendor_id !== 'all' && searchtype === 'all') {
		query = query + ` and	p.vendor_id = '${vendor_id}' `;
	}

	if (searchtype === 'invonly') {
		query = query + ` and s.invoice_no = '${invoiceno}' `;
	}

	query = query + ` order by id desc  `;

	pool.query(query, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

const getPymtTransactionByVendors = (center_id, vendor_id, callback) => {
	let query = ` 
	select 
	p.id as id, p.center_id as center_id, p.vendor_id as vendor_id,
	p.vendor_payment_no as payment_no,
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
  	vendor_payment p,
		vendor_payment_mode pm
	where 
		pm.id = p.pymt_mode_ref_id and
		p.center_id = '${center_id}' and p.vendor_id = '${vendor_id}'
	order by last_updated desc `;

	pool.query(query, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

const getLedgerByVendors = (center_id, vendor_id, callback) => {
	let query = ` select l.center_id, l.vendor_id, l.ledger_detail, l.credit_amt, l.debit_amt, l.balance_amt, l.ledger_date,
	(select s.invoice_no from purchase s where s.id = l.purchase_ref_id) as purchase_ref_id,
	(select p.vendor_payment_no from vendor_payment p where p.id = l.payment_ref_id) as payment_ref_id
	 from purchase_ledger l
	 where 
	 l.center_id =  '${center_id}' and l.vendor_id = '${vendor_id}' order by l.id desc  `;

	pool.query(query, function (err, data) {
		if (err) {
			return callback(err);
		}
		return callback(null, data);
	});
};

module.exports = {
	addPurchaseLedgerRecord,
	addReversePurchaseLedgerRecord,
	addPurchaseLedgerAfterReversalRecord,
	getPurchaseInvoiceByCenter,
	getVendorPymtSequenceNo,
	updateVendorPymtSequenceGenerator,
	addVendorPaymentLedgerRecord,
	addVendorPaymentMaster,
	updateVendorCredit,
	updateVendorCreditMinus,
	updateVendorBalanceAmount,
	updateVendorLastPaidDate,
	getVendorPaymentsByCenter,
	getPurchaseInvoiceByVendors,
	getPaymentsByVendors,
	getLedgerByVendors,
};
