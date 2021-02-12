var pool = require('../../helpers/db');
const moment = require('moment');
const logger = require('./../../helpers/log4js');

const getProductInventoryReport = (center_id, product_code, callback) => {
	let query = ` select ih.id, module, p.id as product_id, p.product_code as product_code, p.description as product_description,
  b.name as brand_name,  ih.module,

  IFNULL((select invoice_no from purchase where id = ih.purchase_id), (select invoice_no from sale where id = ih.sale_id)) as invoice_no,
  IFNULL((select invoice_date from purchase where id = ih.purchase_id), (select invoice_date from sale where id = ih.sale_id)) as invoice_date,

  ih.actn as actn, ih.actn_type as action_type, abs(ih.txn_qty) as txn_qty, ih.stock_level as stock_level,
  txn_date as txn_date,
  ih.sale_id as sale_id,  
  s.customer_id as customer_id, 
  (select c1.name as customer_name from customer c1 where c1.id =   s.customer_id ) as customer_name,
  ih.purchase_id as purchase_id, pr.vendor_id,
  (select v1.name as vendor_name from vendor v1 where v1.id =   pr.vendor_id ) as vendor_name
  from 
  item_history ih
  LEFT outer JOIN purchase pr 
  ON pr.id  = ih.purchase_id
  LEFT outer JOIN sale s 
  ON s.id  = ih.sale_id,
  product p,
  brand b
  where 
  b.id = p.brand_id and
  p.id = ih.product_ref_id and
  p.product_code like '%${product_code}%' and
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

module.exports = {
	getProductInventoryReport,
};
