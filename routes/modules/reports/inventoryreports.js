var pool = require('../../helpers/db');
const moment = require('moment');
const logger = require('./../../helpers/log4js');

const { handleError, ErrorHandler } = require('./../../helpers/error');

const getProductInventoryReport = (center_id, product_code, product_id, callback) => {
	let query = ` select ih.id, module, p.id as product_id, p.product_code as product_code, p.description as product_description,
  p.mrp as mrp,
  b.name as brand_name,  ih.module,

  (select invoice_no from purchase where id = ih.purchase_id) as pur_inv_no,
  (select invoice_no from sale where id = ih.sale_id) as invoice_no,
  (select cn.credit_note_no 
  from 
  sale_return sr1,
  credit_note cn
  where 
  sr1.cr_note_id = cn.id and
  sr1.id = ih.sale_return_id) as credit_note_no,

  (select invoice_date from purchase where id = ih.purchase_id) as pur_invoice_date,
(select invoice_date from sale where id = ih.sale_id) as sale_invoice_date,
(select return_date from sale_return where id = ih.sale_return_id) as sale_return_date,

  ih.actn as actn, ih.actn_type as action_type, abs(ih.txn_qty) as txn_qty, ih.stock_level as stock_level,
  txn_date as txn_date,
  ih.sale_id as sale_id,  
  s.customer_id as customer_id,
  sr.customer_id as sale_return_customer_id,
  (select c1.name as customer_name from customer c1 where c1.id =   s.customer_id ) as customer_name,
  ih.purchase_id as purchase_id, pr.vendor_id,
  (select v1.name as vendor_name from vendor v1 where v1.id =   pr.vendor_id ) as vendor_name,
  (select c1.name as customer_name from customer c1 where c1.id =   sr.customer_id ) as sale_return_customer_name
  from 
  item_history ih
  LEFT outer JOIN purchase pr 
  ON pr.id  = ih.purchase_id
  LEFT outer JOIN sale s 
  ON s.id  = ih.sale_id
  LEFT outer JOIN sale_return sr 
  ON sr.id  = ih.sale_return_id,
  product p,
  brand b
  where 
  b.id = p.brand_id and
  p.id = ih.product_ref_id and
  p.id = '${product_id}' and
  ih.center_id = '${center_id}'
  order by ih.id desc
  
  
  `;
	// product_ref_id = '${product_id}'
	// lateer include this to the search, as of now, fetch all

	pool.query(query, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

const getProductInventoryReportShort = (center_id, product_code, product_id, callback) => {
	let query = ` select ih.id, module, p.id as product_id, p.product_code as product_code, p.description as product_description,
  p.mrp as mrp,
  b.name as brand_name,  ih.module,

  (select invoice_no from purchase where id = ih.purchase_id) as pur_inv_no,
  (select invoice_no from sale where id = ih.sale_id) as invoice_no,
  (select cn.credit_note_no 
  from 
  sale_return sr1,
  credit_note cn
  where 
  sr1.cr_note_id = cn.id and
  sr1.id = ih.sale_return_id) as credit_note_no,

  (select invoice_date from purchase where id = ih.purchase_id) as pur_invoice_date,
(select invoice_date from sale where id = ih.sale_id) as sale_invoice_date,
(select return_date from sale_return where id = ih.sale_return_id) as sale_return_date,

  ih.actn as actn, ih.actn_type as action_type, abs(ih.txn_qty) as txn_qty, ih.stock_level as stock_level,
  txn_date as txn_date,
  ih.sale_id as sale_id,  
  s.customer_id as customer_id,
  sr.customer_id as sale_return_customer_id,
  (select c1.name as customer_name from customer c1 where c1.id =   s.customer_id ) as customer_name,
  ih.purchase_id as purchase_id, pr.vendor_id,
  (select v1.name as vendor_name from vendor v1 where v1.id =   pr.vendor_id ) as vendor_name,
  (select c1.name as customer_name from customer c1 where c1.id =   sr.customer_id ) as sale_return_customer_name
  from 
  item_history ih
  LEFT outer JOIN purchase pr 
  ON pr.id  = ih.purchase_id
  LEFT outer JOIN sale s 
  ON s.id  = ih.sale_id
  LEFT outer JOIN sale_return sr 
  ON sr.id  = ih.sale_return_id,
  product p,
  brand b
  where 
  b.id = p.brand_id and
  p.id = ih.product_ref_id and
  p.id = '${product_id}' and
  ih.center_id = '${center_id}'
  order by ih.id desc
  
  
  `;
	// product_ref_id = '${product_id}'
	// lateer include this to the search, as of now, fetch all

	pool.query(query, function (err, data) {
		if (err) return callback(err);
		return callback(null, data);
	});
};

const fullStockReport = (center_id, mrp_split, res) => {
	let query = '';

	if (mrp_split === true) {
		query = `
      select b2.name,  
      product_code, 
      description, 
      mrp, 
      (select sum(s2.available_stock) from stock s2 where s2.product_id = p.id ) available_stock, 
      unit,
      packetsize, 
      purchase_price , 
      hsncode, 
      taxrate,  
      rackno 
      from product p , brand b2 
      where p.center_id = '${center_id}'
      and p.brand_id = b2.id 
      and p.center_id = b2.center_id
      `;
	} else {
		query = `
      select b.name, p.product_code, p.description,
      s.product_id, s.mrp, s.available_stock,
      p.unit, p.packetsize, p.hsncode, 
      p.mrp, p.purchase_price,
      p.rackno, p.taxrate
      from 
      product p,
      brand b,
      stock s
      where 
      s.product_id = p.id and
      p.brand_id = b.id and
      p.center_id = '${center_id}'
      group by
      s.product_id, s.mrp, s.available_stock `;
	}

	return new Promise(function (resolve, reject) {
		pool.query(query, function (err, data) {
			if (err) {
				return handleError(new ErrorHandler('500', `fullStockReport ${query} `, err), res);
			}
			resolve(data);
		});
	});
};

module.exports = {
	getProductInventoryReport,
	fullStockReport,
};
