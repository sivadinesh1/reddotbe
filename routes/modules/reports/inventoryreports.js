var pool = require("../../helpers/db");
const moment = require("moment");

const getProductInventoryReport = (center_id, product_id, callback) => {
	let query = ` select ih.id, module, p.id as product_id, p.description as product_description, ih.module,

  IFNULL((select invoice_no from purchase where id = ih.purchase_id), (select invoice_no from sale where id = ih.sale_id)) as invoice_no,
  
  ih.actn as actn, ih.actn_type as action_type, ih.txn_qty as txn_qty, ih.stock_level as stock_level,
  txn_date as txn_date
  from 
  item_history ih,
  product p
  where 
  p.id = ih.product_ref_id and
  ih.center_id = '${center_id}'
  
  order by txn_date, id desc
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
