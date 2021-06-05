var pool = require('../../helpers/db');
const moment = require('moment');
const logger = require('./../../helpers/log4js');

const getStatement = (center_id, customer_id, start_date, end_date, sale_type) => {
	let query = `
		select STR_TO_DATE(a.ref_date , '%d-%m-%Y') ref_date_f, a.name,a.place ,a.type, a.refn , a.									invoice_amount , a.Received_Amount, a.id as id
		From (
			select s.invoice_no refn ,s.invoice_date ref_date, "Invoice" type,
			(select c.name from customer c where c.id = s.customer_id) name ,
			(select c.district from customer c where c.id = s.customer_id) place 
			, s.net_total invoice_amount , "" Received_Amount, s.customer_id as id 
			From  sale s 
		where s.center_id = '${center_id}'
		and s.sale_type = '${sale_type}'
		and s.status = 'C'
		 `;

	query =
		query +
		`
	and str_to_date(s.invoice_date,  '%d-%m-%Y %T') between
	str_to_date('${start_date}',  '%d-%m-%Y %T') and
	str_to_date('${end_date}',  '%d-%m-%Y %T') 	
	`;

	if (customer_id !== 'all') {
		query = query + ` and s.customer_id = '${customer_id}' `;
	}

	query =
		query +
		` union
			select 
				p.bank_ref refn, p.pymt_date ref_date, "Payment" type,
				(select c.name from customer c where c.id = p.customer_id) name 	,
				(select c.district from customer c where c.id = p.customer_id) place, 
				"" invoice_amount , p.payment_now_amt Received_Amount, p.customer_id as id 
			From
				payment p
			where
				p.center_id = '${center_id}'
				and p.is_cancelled = 'NO'
				 `;

	query =
		query +
		`
				and str_to_date(p.pymt_date,  '%d-%m-%Y %T') between
				str_to_date('${start_date}',  '%d-%m-%Y %T') and
				str_to_date('${end_date}',  '%d-%m-%Y %T') 	
				`;

	if (customer_id !== 'all') {
		query = query + ` and p.customer_id = '${customer_id}' `;
	}

	query = query + ` )a order by a.name , ref_date_f `;

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

const getItemWiseSale = (center_id, brand_id, start_date, end_date, sale_type, start, end) => {
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

const getReceivablesClosingBalance = (center_id, customer_id, start_date, end_date, sale_type) => {
	let query = `
						select id, name , district, sum(invcd +  pymnt_rcvd*-1) as balance
						From 
						(
						select c2.id, c2.name , c2.district , IFNULL( sum(s.net_total),0) invcd, '0' pymnt_rcvd
						from sale s , customer c2 
						where s.center_id = '${center_id}'
						and s.status = 'C'
						and s.sale_type = '${sale_type}' `;

	if (customer_id !== 'all') {
		query = query + ` and s.customer_id = '${customer_id}' `;
	}

	query =
		query +
		` and c2.center_id = s.center_id 
						and c2.id = s.customer_id `;

	query =
		query +
		`	and STR_TO_DATE(s.invoice_date,'%d-%m-%y') <= STR_TO_DATE('${end_date}','%d-%m-%y')
						group by c2.id,c2.name , c2.district 
						UNION 
						select c2.id,c2.name , c2.district,'0' invcd, IFNULL(sum(p2.payment_now_amt ),0) pymnt_rcvd
						from payment p2 , customer c2 
						where p2.center_id = '${center_id}' `;

	if (customer_id !== 'all') {
		query = query + ` and p2.customer_id = '${customer_id}' `;
	}

	query =
		query +
		`
					and c2.center_id = p2.center_id 
					and c2.id = p2.customer_id `;

	query = query + ` and  STR_TO_DATE(p2.pymt_date,'%d-%m-%y') <= STR_TO_DATE('${end_date}','%d-%m-%y') 	`;

	query =
		query +
		` GROUP by c2.id,c2.name , c2.district
					) a 
					group by id, name , district
					order by a.name

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

const getReceivablesOpeningBalance = (center_id, customer_id, start_date, end_date, sale_type) => {
	let query = `
						select id, name , district, sum(invcd +  pymnt_rcvd*-1) as balance
						From 
						(
						select c2.id, c2.name , c2.district , IFNULL( sum(s.net_total),0) invcd, '0' pymnt_rcvd
						from sale s , customer c2 
						where s.center_id = '${center_id}'
						and s.status = 'C'
						and s.sale_type = '${sale_type}' `;

	if (customer_id !== 'all') {
		query = query + ` and s.customer_id = '${customer_id}' `;
	}

	query =
		query +
		` and c2.center_id = s.center_id 
						and c2.id = s.customer_id `;

	query =
		query +
		`	and STR_TO_DATE(s.invoice_date,'%d-%m-%y') < STR_TO_DATE('${start_date}','%d-%m-%y')
						group by c2.id,c2.name , c2.district 
						UNION 
						select c2.id,c2.name , c2.district,'0' invcd, IFNULL(sum(p2.payment_now_amt ),0) pymnt_rcvd
						from payment p2 , customer c2 
						where p2.center_id = '${center_id}' `;

	if (customer_id !== 'all') {
		query = query + ` and p2.customer_id = '${customer_id}' `;
	}

	query =
		query +
		`
					and c2.center_id = p2.center_id 
					and c2.id = p2.customer_id `;

	query = query + ` and  STR_TO_DATE(p2.pymt_date,'%d-%m-%y') < STR_TO_DATE('${start_date}','%d-%m-%y') 	`;

	query =
		query +
		` GROUP by c2.id,c2.name , c2.district
					) a 
					group by id, name , district
					order by a.name

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
	getReceivablesClosingBalance,
	getReceivablesOpeningBalance,
};
