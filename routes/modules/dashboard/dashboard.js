var pool = require('../../helpers/db');
const moment = require('moment');
const logger = require('./../../helpers/log4js');

const getInquirySummary = (center_id, from_date, to_date, callback) => {
	let query = ` select 
  IFNULL(SUM(CASE WHEN e.estatus = 'O' THEN 1 ELSE 0 END), 0) AS 'new',
  IFNULL(SUM(CASE WHEN e.estatus = 'D' THEN 1 ELSE 0 END), 0) AS 'draft',
  IFNULL(SUM(CASE WHEN e.estatus = 'E' THEN 1 ELSE 0 END), 0) AS 'executed',
  IFNULL(SUM(CASE WHEN e.estatus = 'P' THEN 1 ELSE 0 END), 0) AS 'invoiceready',
  IFNULL(SUM(CASE WHEN e.estatus = 'C' THEN 1 ELSE 0 END), 0) AS 'completed',
  IFNULL(SUM(CASE WHEN e.estatus = 'X' THEN 1 ELSE 0 END), 0) AS 'cancelled'                   
from
enquiry e
where
e.center_id =  '${center_id}' and
str_to_date(DATE_FORMAT(enquiry_date,'%d-%m-%YYYY') , '%d-%m-%YYYY') between
str_to_date('${from_date}', '%d-%m-%YYYY') and
str_to_date('${to_date}', '%d-%m-%YYYY')  `;

	pool.query(query, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

const getSalesSummary = (center_id, from_date, to_date, callback) => {
	let query = ` select 
  IFNULL(SUM(CASE WHEN s.status = 'C' THEN 1 ELSE 0 END), 0) AS 'completed',
  IFNULL(SUM(CASE WHEN s.status = 'D' THEN 1 ELSE 0 END), 0) AS 'draft'
from
sale s
where
s.center_id =  '${center_id}' and
STR_TO_DATE(s.invoice_date,'%d-%m-%Y') between
str_to_date('${from_date}', '%d-%m-%YYYY') and
str_to_date('${to_date}', '%d-%m-%YYYY')      
 `;

	pool.query(query, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

const getPurchaseSummary = (center_id, from_date, to_date, callback) => {
	let query = ` select 
  IFNULL(SUM(CASE WHEN p.status = 'C' THEN 1 ELSE 0 END), 0) AS 'completed',
  IFNULL(SUM(CASE WHEN p.status = 'D' THEN 1 ELSE 0 END), 0) AS 'draft'
from
purchase p
where
p.center_id =  '${center_id}' and
STR_TO_DATE(p.invoice_date,'%d-%m-%Y') between
str_to_date('${from_date}', '%d-%m-%YYYY') and
str_to_date('${to_date}', '%d-%m-%YYYY')          
 `;

	pool.query(query, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

const getSaleTotal = (center_id, from_date, to_date, callback) => {
	let query = ` 

  select 
    IFNULL(SUM(s.net_total), 0) AS 'sales_total'
  from
  sale s
  where
  s.center_id =  '${center_id}' and
STR_TO_DATE(s.invoice_date,'%d-%m-%Y') between
str_to_date('${from_date}', '%d-%m-%YYYY') and
str_to_date('${to_date}', '%d-%m-%YYYY')      
          
 `;

	pool.query(query, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

const getCenterSummary = (center_id, from_date, to_date, callback) => {
	let query = ` select tbl1.active_customers, tbl2.active_vendors from (
    select count(*) as 'active_customers' from customer where isactive = 'A' and center_id = '${center_id}' ) as tbl1,
    (
    select count(*) as 'active_vendors' from vendor where isactive = 'A' and center_id = '${center_id}'
    ) as tbl2 `;

	pool.query(query, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

const getReceivablesOutstanding = (center_id, from_date, to_date, callback) => {
	let query = ` select customer_id, (sum(credit_amt) - sum(debit_amt)) as balance from 
  ledger l
  where
  l.center_id = '${center_id}' 
  group by
  customer_id
   `;

	pool.query(query, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

const getPaymentsByCustomers = (center_id, from_date, to_date, callback) => {
	let query = ` select c.name as customer_name, p.payment_now_amt
  from 
  payment p,
  customer c
  where
  c.id = p.customer_id and
  p.center_id =  '${center_id}' and
  STR_TO_DATE(p.pymt_date,'%d-%m-%Y') between
  str_to_date('${from_date}', '%d-%m-%YYYY') and
  str_to_date('${to_date}', '%d-%m-%YYYY')    
   `;

	pool.query(query, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

const topClients = (center_id, limit) => {
	let query = `
		select c.name as customer_name, s.customer_id as id, sum(net_total) as sum_total
		from 
			sale s,
			customer c
		where
			c.id = s.customer_id and
			s.center_id = '${center_id}'
			group by customer_id 
		order by
			sum_total desc
			limit ${limit} `;

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
	getInquirySummary,
	getSalesSummary,
	getPurchaseSummary,
	getSaleTotal,
	getCenterSummary,
	getReceivablesOutstanding,
	getPaymentsByCustomers,
	topClients,
};
