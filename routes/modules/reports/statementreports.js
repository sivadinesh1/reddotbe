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

const getItemWiseSale = (
	center_id,
	brand_id,
	start_date,
	end_date,
	sale_type,
	start,
	end
) => {
	let query = ` 
		select 
			p2.product_code , 
			p2.description , 
			p2.brand_id , 
			b.name as brand_name,
			sum(sd.qty) qty, 
			sum(sd.taxable_value)/sum(sd.qty) avg_SP 
		from 
			sale s2 , 
			sale_detail sd , 
			product p2,
			brand b 
		where 
			b.id = p2.brand_id and
			s2.id = sd.sale_id and  
			s2.center_id = '${center_id}' and 
			sd.product_id = p2.id `;

	if (brand_id !== 'all') {
		query = query + ` and p2.brand_id = '${brand_id}' `;
	}

	if (sale_type !== 'all') {
		query = query + ` and s2.sale_type  = '${sale_type}' `;
	}

	query =
		query +
		` 
	and str_to_date(sale_datetime,  '%d-%m-%Y %T') between
	str_to_date('${start_date}',  '%d-%m-%Y %T') and
	str_to_date('${end_date}',  '%d-%m-%Y %T') 	
	
	group by 
		p2.product_code , 
		p2.description , 
		p2.brand_id
	order by 
		qty desc
	
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
	getItemWiseSale,
};
