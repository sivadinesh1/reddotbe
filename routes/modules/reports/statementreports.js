var pool = require('../../helpers/db');
const moment = require('moment');
const logger = require('./../../helpers/log4js');

const getStatement = (center_id, customer_id, start_date, end_date) => {
	let query = ` 
  select 
any_value(l.center_id) as center_id, 
any_value(l.customer_id) as customer_id, 
any_value(l.ledger_detail) as txn_type, 
any_value(l.credit_amt) as credit_amt, 
any_value(l.debit_amt) as debit_amt, 
any_value(l.balance_amt) as balance_amt, 
any_value(l.ledger_date) as ledger_date,
	(select s.invoice_no from sale s where s.id = l.invoice_ref_id) as invoice_ref_id,
any_value((select p.payment_no from payment p where p.id = l.payment_ref_id)) as payment_ref_id
	 from ledger l
	 where 
	 l.center_id =  '${center_id}' and l.customer_id = '${customer_id}' and
	 ledger_date between '${start_date}' and '${end_date}'
	 group by invoice_ref_id, payment_ref_id
	 order by ledger_date
  
  `;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

const getVendorStatement = (center_id, vendor_id, start_date, end_date) => {
	let query = ` 
  select 
any_value(l.center_id) as center_id, 
any_value(l.vendor_id) as vendor_id, 
any_value(l.ledger_detail) as txn_type, 
any_value(l.credit_amt) as credit_amt, 
any_value(l.debit_amt) as debit_amt, 
any_value(l.balance_amt) as balance_amt, 
any_value(l.ledger_date) as ledger_date,
	(select s.invoice_no from purchase s where s.id = l.purchase_ref_id) as purchase_ref_id,
any_value((select p.vendor_payment_no from vendor_payment p where p.id = l.payment_ref_id)) as payment_ref_id
	 from purchase_ledger l
	 where 
	 l.center_id =  '${center_id}' and l.vendor_id = '${vendor_id}' and
	 ledger_date between '${start_date}' and '${end_date}'
	 group by purchase_ref_id, payment_ref_id
	 order by ledger_date
  
  `;

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});
};

module.exports = {
	getStatement,
	getVendorStatement,
};
