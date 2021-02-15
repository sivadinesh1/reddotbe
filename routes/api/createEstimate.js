const fs = require('fs');

// require dependencies
const PDFDocument = require('pdfkit');
const blobStream = require('blob-stream');

var util = require('../helpers/utils');
const logger = require('../helpers/log4js');

const { number2text } = require('../helpers/utils');

let line_x_start = 24;
let line_x_end = 600;
let sumqty = 0;
let itemqty = 0;

function createEstimate(
	saleMaster,
	saleDetails,
	customerDetails,
	centerDetails,

	path,
	res,
	print_type
) {
	let centerdata = centerDetails[0];
	let customerdata = customerDetails[0];
	let salemasterdata = saleMaster[0];
	let saledetailsdata = saleDetails;
	res.contentType('application/pdf');

	sumqty = saledetailsdata.reduce((total, e) => total + e.qty, 0);
	itemqty = saledetailsdata.length;

	let doc = new PDFDocument({
		'page-size': 'A4',
		dpi: 400,
		margin: 24,
		autoFirstPage: false,
		layout: 'portrait', // can be 'landscape'
	});

	// first check if print_type is an array
	if (Array.isArray(print_type)) {
		// loop through the different print types and add pages and send response
		print_type.forEach((e) => {
			doc.addPage();
			doc.font('Helvetica');
			generateHeader(doc, centerdata, e);
			generateCustomerInformation(doc, customerdata, salemasterdata);
			generateInvoiceTable(
				doc,
				salemasterdata,
				saledetailsdata,
				centerdata,
				e,
				customerdata
			);

			//		doc[counter].pipe(fs.createWriteStream(path));
		});
	}

	// pipe the resposne
	doc.end();
	doc.pipe(res);
}

function generateHeader(doc, centerdata, print_type) {
	doc.fillColor('#000000');
	doc
		.font('Helvetica-Bold')
		.fontSize(14)
		.text('Estimate', 10, 40, {
			align: 'center',
			lineGap: 2,
			characterSpacing: 1.2,
		})

		.moveDown();
}

function generateCustomerInformation(doc, customerdata, salemasterdata) {
	// first line before customer section
	generateHr(doc, line_x_start, line_x_end, 60);

	doc
		.fillColor('#000000')
		.fontSize(10)
		.text('Number       :    ' + salemasterdata.invoice_no, 410, 70);

	doc
		.fillColor('#000000')
		.fontSize(10)
		.text('Date             :    ' + salemasterdata.invoice_date, 410, 85);

	const customerInformationTop = 70;

	doc
		.fillColor('#000000')
		.fontSize(10)
		.text('NAME:' + customerdata.name, 40, customerInformationTop)
		.text('PLACE:', 40, 85); // fetch from FE

	doc
		.fillColor('#000000')

		.text('Phone: ' + customerdata.mobile, 40, 100)
		.moveDown();

	// line end of customer section
	generateHr(doc, line_x_start, line_x_end, 115);
}

function generateInvoiceTable(
	doc,
	salemasterdata,
	saledetailsdata,
	centerdata,
	print_type,
	customerdata
) {
	let i;
	let invoiceTableTop = 125;
	let x_start = 24;
	let isIGST = false;

	if (salemasterdata.igst !== 0 || salemasterdata.igst !== 0.0) {
		isIGST = true;
	}

	generateTableRow(
		doc,
		invoiceTableTop,
		'SNo',
		'PRODUCT NAME',
		'PCODE',
		' HSN ',
		' QTY ',
		' UOM ',
		' MRP ',
		'DIS%',
		' AMOUNT ',
		'SGST',
		'CGST',
		'NET AMNT',
		x_start,
		isIGST,
		'IGST'
	);

	generateHr(doc, line_x_start, line_x_end, invoiceTableTop + 13);

	let snow = 30;
	let pcodew = 60;
	let pdescw = 125;
	let hsnw = 42;
	let qtyw = 30;
	let uomw = 30;
	let mrpw = 44;
	let discpw = 25;
	let amountw = 45;
	let sgstw = 26;
	let cgstw = 26;
	let igstw = 51;
	let netw = 47;

	//runnig HEADER vertical lines SI
	doc
		.strokeColor('#000000')
		.moveTo(x_start + snow, 115)
		.lineWidth(1)
		.lineTo(x_start + snow, 136)

		.stroke();

	// product code
	doc
		.strokeColor('#000000')
		.moveTo(x_start + (snow + 1) + pcodew, 115)
		.lineWidth(1)
		.lineTo(x_start + (snow + 1) + pcodew, 136);

	// product desc
	doc
		.strokeColor('#000000')
		.moveTo(x_start + (snow + 1) + (pcodew + 1) + pdescw, 115)
		.lineWidth(1)
		.lineTo(x_start + (snow + 1) + (pcodew + 1) + pdescw, 136)

		.stroke();

	// // hsncode
	doc
		.strokeColor('#000000')
		.moveTo(x_start + (snow + 1) + (pcodew + 1) + (pdescw + 1) + hsnw, 115)
		.lineWidth(1)
		.lineTo(x_start + (snow + 1) + (pcodew + 1) + (pdescw + 1) + hsnw, 136)

		.stroke();

	// // qty
	doc
		.strokeColor('#000000')
		.moveTo(
			x_start + (snow + 1) + (pcodew + 1) + (pdescw + 1) + (hsnw + 1) + qtyw,
			115
		)
		.lineWidth(1)
		.lineTo(
			x_start + (snow + 1) + (pcodew + 1) + (pdescw + 1) + (hsnw + 1) + qtyw,
			136
		)

		.stroke();

	// // UOM
	doc
		.strokeColor('#000000')
		.moveTo(
			x_start +
				(snow + 1) +
				(pcodew + 1) +
				(pdescw + 1) +
				(hsnw + 1) +
				(qtyw + 1) +
				uomw,
			115
		)
		.lineWidth(1)
		.lineTo(
			x_start +
				(snow + 1) +
				(pcodew + 1) +
				(pdescw + 1) +
				(hsnw + 1) +
				(qtyw + 1) +
				uomw,
			136
		)

		.stroke();

	// // MRP
	doc
		.strokeColor('#000000')
		.moveTo(
			x_start +
				(snow + 1) +
				(pcodew + 1) +
				(pdescw + 1) +
				(hsnw + 1) +
				(qtyw + 1) +
				(uomw + 1) +
				mrpw,
			115
		)
		.lineWidth(1)
		.lineTo(
			x_start +
				(snow + 1) +
				(pcodew + 1) +
				(pdescw + 1) +
				(hsnw + 1) +
				(qtyw + 1) +
				(uomw + 1) +
				mrpw,
			136
		)

		.stroke();

	// // Disc %
	doc
		.strokeColor('#000000')
		.moveTo(
			x_start +
				(snow + 1) +
				(pcodew + 1) +
				(pdescw + 1) +
				(hsnw + 1) +
				(qtyw + 1) +
				(uomw + 1) +
				(mrpw + 1) +
				discpw,
			115
		)
		.lineWidth(1)
		.lineTo(
			x_start +
				(snow + 1) +
				(pcodew + 1) +
				(pdescw + 1) +
				(hsnw + 1) +
				(qtyw + 1) +
				(uomw + 1) +
				(mrpw + 1) +
				discpw,
			136
		)

		.stroke();

	// // Taxable Amount
	doc
		.strokeColor('#000000')
		.moveTo(
			x_start +
				(snow + 1) +
				(pcodew + 1) +
				(pdescw + 1) +
				(hsnw + 1) +
				(qtyw + 1) +
				(uomw + 1) +
				(mrpw + 1) +
				(discpw + 1) +
				amountw,
			115
		)
		.lineWidth(1)
		.lineTo(
			x_start +
				(snow + 1) +
				(pcodew + 1) +
				(pdescw + 1) +
				(hsnw + 1) +
				(qtyw + 1) +
				(uomw + 1) +
				(mrpw + 1) +
				(discpw + 1) +
				amountw,
			136
		)

		.stroke();

	if (!isIGST) {
		// SGST
		doc
			.strokeColor('#000000')
			.moveTo(
				x_start +
					(snow + 1) +
					(pcodew + 1) +
					(pdescw + 1) +
					(hsnw + 1) +
					(qtyw + 1) +
					(uomw + 1) +
					(mrpw + 1) +
					(discpw + 1) +
					(amountw + 1) +
					sgstw,
				115
			)
			.lineWidth(1)
			.lineTo(
				x_start +
					(snow + 1) +
					(pcodew + 1) +
					(pdescw + 1) +
					(hsnw + 1) +
					(qtyw + 1) +
					(uomw + 1) +
					(mrpw + 1) +
					(discpw + 1) +
					(amountw + 1) +
					sgstw,
				136
			)

			.stroke();

		// CGST
		doc
			.strokeColor('#000000')
			.moveTo(
				x_start +
					(snow + 1) +
					(pcodew + 1) +
					(pdescw + 1) +
					(hsnw + 1) +
					(qtyw + 1) +
					(uomw + 1) +
					(mrpw + 1) +
					(discpw + 1) +
					(amountw + 1) +
					(sgstw + 1) +
					cgstw,
				115
			)
			.lineWidth(1)
			.lineTo(
				x_start +
					(snow + 1) +
					(pcodew + 1) +
					(pdescw + 1) +
					(hsnw + 1) +
					(qtyw + 1) +
					(uomw + 1) +
					(mrpw + 1) +
					(discpw + 1) +
					(amountw + 1) +
					(sgstw + 1) +
					cgstw,
				136
			)

			.stroke();
	} else {
		//IGST
		doc
			.strokeColor('#000000')
			.moveTo(
				x_start +
					(snow + 1) +
					(pcodew + 1) +
					(pdescw + 1) +
					(hsnw + 1) +
					(qtyw + 1) +
					(uomw + 1) +
					(mrpw + 1) +
					(discpw + 1) +
					(amountw + 1) +
					igstw,
				115
			)
			.lineWidth(1)
			.lineTo(
				x_start +
					(snow + 1) +
					(pcodew + 1) +
					(pdescw + 1) +
					(hsnw + 1) +
					(qtyw + 1) +
					(uomw + 1) +
					(mrpw + 1) +
					(discpw + 1) +
					(amountw + 1) +
					igstw,
				136
			)

			.stroke();
	}

	saledetailsdata.forEach(function (k, idx) {
		if (idx === 0) {
			invoiceTableTop = invoiceTableTop + 16;
		} else {
			invoiceTableTop = invoiceTableTop + 11;
		}

		generateTableRow(
			doc,
			invoiceTableTop,
			idx + 1,
			k.description,
			k.product_code,
			k.hsncode,
			k.qty,
			k.unit,
			k.mrp,
			k.disc_percent,
			k.taxable_value,
			k.sgst,
			k.cgst,
			k.total_value,
			x_start,
			isIGST,
			k.igst
		);

		if (invoiceTableTop > 520) {
			doc.fontSize(14);
			doc.text('continue in next page', 50, invoiceTableTop + 50);
			doc.fontSize(8);
			invoiceTableTop = 216;
			doc.addPage({
				margin: 24,
			});
			// for each new page this adds the center and customer data
			generateHeader(doc, centerdata, print_type);
			generateCustomerInformation(doc, customerdata, salemasterdata);

			generateTableRow(
				doc,
				invoiceTableTop,
				'SNo',
				'PRODUCT NAME',
				'PCODE',
				' HSN ',
				' QTY ',
				' UOM ',
				' MRP ',
				'DIS%',
				' AMOUNT ',
				'SGST',
				'CGST',
				'NET AMNT',
				x_start,
				isIGST,
				'IGST'
			);

			generateHr(doc, line_x_start, line_x_end, invoiceTableTop + 10);
		}

		// RUNNING VERTICAL lines SALE DETAILS
		// Si.No
		doc
			.strokeColor('#000000')
			.moveTo(x_start + snow, invoiceTableTop - 6)
			.lineWidth(1)
			.lineTo(x_start + snow, 540) // this is the end point the line

			.stroke();

		// Product Code
		doc
			.strokeColor('#000000')
			.moveTo(x_start + (snow + 1) + pcodew, invoiceTableTop - 8)
			.lineWidth(1)
			.lineTo(x_start + (snow + 1) + pcodew, 540);

		// // Product Desc
		doc
			.strokeColor('#000000')
			.moveTo(x_start + (snow + 1) + (pcodew + 1) + pdescw, invoiceTableTop - 8)
			.lineWidth(1)
			.lineTo(x_start + (snow + 1) + (pcodew + 1) + pdescw, 540)

			.stroke();
		// // hsncode
		doc
			.strokeColor('#000000')
			.moveTo(
				x_start + (snow + 1) + (pcodew + 1) + (pdescw + 1) + hsnw,
				invoiceTableTop - 8
			)
			.lineWidth(1)
			.lineTo(x_start + (snow + 1) + (pcodew + 1) + (pdescw + 1) + hsnw, 540)

			.stroke();

		// // qty
		doc
			.strokeColor('#000000')
			.moveTo(
				x_start + (snow + 1) + (pcodew + 1) + (pdescw + 1) + (hsnw + 1) + qtyw,
				invoiceTableTop - 8
			)
			.lineWidth(1)
			.lineTo(
				x_start + (snow + 1) + (pcodew + 1) + (pdescw + 1) + (hsnw + 1) + qtyw,
				540
			)

			.stroke();

		// // UOM
		doc
			.strokeColor('#000000')
			.moveTo(
				x_start +
					(snow + 1) +
					(pcodew + 1) +
					(pdescw + 1) +
					(hsnw + 1) +
					(qtyw + 1) +
					uomw,
				invoiceTableTop - 8
			)
			.lineWidth(1)
			.lineTo(
				x_start +
					(snow + 1) +
					(pcodew + 1) +
					(pdescw + 1) +
					(hsnw + 1) +
					(qtyw + 1) +
					uomw,
				540
			)

			.stroke();

		//MRP
		doc
			.strokeColor('#000000')
			.moveTo(
				x_start +
					(snow + 1) +
					(pcodew + 1) +
					(pdescw + 1) +
					(hsnw + 1) +
					(qtyw + 1) +
					(uomw + 1) +
					mrpw,
				invoiceTableTop - 8
			)
			.lineWidth(1)
			.lineTo(
				x_start +
					(snow + 1) +
					(pcodew + 1) +
					(pdescw + 1) +
					(hsnw + 1) +
					(qtyw + 1) +
					(uomw + 1) +
					mrpw,
				540
			)

			.stroke();

		// disc
		doc
			.strokeColor('#000000')
			.moveTo(
				x_start +
					(snow + 1) +
					(pcodew + 1) +
					(pdescw + 1) +
					(hsnw + 1) +
					(qtyw + 1) +
					(uomw + 1) +
					(mrpw + 1) +
					discpw,
				invoiceTableTop - 8
			)
			.lineWidth(1)
			.lineTo(
				x_start +
					(snow + 1) +
					(pcodew + 1) +
					(pdescw + 1) +
					(hsnw + 1) +
					(qtyw + 1) +
					(uomw + 1) +
					(mrpw + 1) +
					discpw,
				540
			)

			.stroke();

		// taxable amount
		doc
			.strokeColor('#000000')
			.moveTo(
				x_start +
					(snow + 1) +
					(pcodew + 1) +
					(pdescw + 1) +
					(hsnw + 1) +
					(qtyw + 1) +
					(uomw + 1) +
					(mrpw + 1) +
					(discpw + 1) +
					amountw,
				invoiceTableTop - 8
			)
			.lineWidth(1)
			.lineTo(
				x_start +
					(snow + 1) +
					(pcodew + 1) +
					(pdescw + 1) +
					(hsnw + 1) +
					(qtyw + 1) +
					(uomw + 1) +
					(mrpw + 1) +
					(discpw + 1) +
					amountw,
				540
			)

			.stroke();
		if (!isIGST) {
			//sgst
			doc
				.strokeColor('#000000')
				.moveTo(
					x_start +
						(snow + 1) +
						(pcodew + 1) +
						(pdescw + 1) +
						(hsnw + 1) +
						(qtyw + 1) +
						(uomw + 1) +
						(mrpw + 1) +
						(discpw + 1) +
						(amountw + 1) +
						sgstw,
					invoiceTableTop - 8
				)
				.lineWidth(1)
				.lineTo(
					x_start +
						(snow + 1) +
						(pcodew + 1) +
						(pdescw + 1) +
						(hsnw + 1) +
						(qtyw + 1) +
						(uomw + 1) +
						(mrpw + 1) +
						(discpw + 1) +
						(amountw + 1) +
						sgstw,
					540
				)

				.stroke();
			//CGST
			doc
				.strokeColor('#000000')
				.moveTo(
					x_start +
						(snow + 1) +
						(pcodew + 1) +
						(pdescw + 1) +
						(hsnw + 1) +
						(qtyw + 1) +
						(uomw + 1) +
						(mrpw + 1) +
						(discpw + 1) +
						(amountw + 1) +
						(sgstw + 1) +
						cgstw,
					invoiceTableTop - 8
				)
				.lineWidth(1)
				.lineTo(
					x_start +
						(snow + 1) +
						(pcodew + 1) +
						(pdescw + 1) +
						(hsnw + 1) +
						(qtyw + 1) +
						(uomw + 1) +
						(mrpw + 1) +
						(discpw + 1) +
						(amountw + 1) +
						(sgstw + 1) +
						cgstw,
					540
				)

				.stroke();
		} else {
			//IGST
			doc
				.strokeColor('#000000')
				.moveTo(
					x_start +
						(snow + 1) +
						(pcodew + 1) +
						(pdescw + 1) +
						(hsnw + 1) +
						(qtyw + 1) +
						(uomw + 1) +
						(mrpw + 1) +
						(discpw + 1) +
						(amountw + 1) +
						igstw,
					invoiceTableTop - 8
				)
				.lineWidth(1)
				.lineTo(
					x_start +
						(snow + 1) +
						(pcodew + 1) +
						(pdescw + 1) +
						(hsnw + 1) +
						(qtyw + 1) +
						(uomw + 1) +
						(mrpw + 1) +
						(discpw + 1) +
						(amountw + 1) +
						igstw,
					540
				)

				.stroke();
		}
	});

	generateSummaryLeft(doc, saledetailsdata, isIGST, salemasterdata);
}

function generateSummaryLeft(doc, saledetailsdata, isIGST, salemasterdata) {
	let sum_SGST_0 = getSumByTaxtypeAndTaxPercent(
		saledetailsdata,
		'SGST',
		0
	).toFixed(2);
	let sum_CGST_0 = getSumByTaxtypeAndTaxPercent(
		saledetailsdata,
		'CGST',
		0
	).toFixed(2);
	let sum_IGST_0 = getSumByTaxtypeAndTaxPercent(
		saledetailsdata,
		'IGST',
		0
	).toFixed(2);

	let sum_SGST_5 = getSumByTaxtypeAndTaxPercent(
		saledetailsdata,
		'SGST',
		5
	).toFixed(2);
	let sum_CGST_5 = getSumByTaxtypeAndTaxPercent(
		saledetailsdata,
		'CGST',
		5
	).toFixed(2);
	let sum_IGST_5 = getSumByTaxtypeAndTaxPercent(
		saledetailsdata,
		'IGST',
		5
	).toFixed(2);

	let sum_SGST_12 = getSumByTaxtypeAndTaxPercent(
		saledetailsdata,
		'SGST',
		12
	).toFixed(2);
	let sum_CGST_12 = getSumByTaxtypeAndTaxPercent(
		saledetailsdata,
		'CGST',
		12
	).toFixed(2);
	let sum_IGST_12 = getSumByTaxtypeAndTaxPercent(
		saledetailsdata,
		'IGST',
		12
	).toFixed(2);

	let sum_SGST_18 = getSumByTaxtypeAndTaxPercent(
		saledetailsdata,
		'SGST',
		18
	).toFixed(2);
	let sum_CGST_18 = getSumByTaxtypeAndTaxPercent(
		saledetailsdata,
		'CGST',
		18
	).toFixed(2);
	let sum_IGST_18 = getSumByTaxtypeAndTaxPercent(
		saledetailsdata,
		'IGST',
		18
	).toFixed(2);

	let sum_SGST_28 = getSumByTaxtypeAndTaxPercent(
		saledetailsdata,
		'SGST',
		28
	).toFixed(2);
	let sum_CGST_28 = getSumByTaxtypeAndTaxPercent(
		saledetailsdata,
		'CGST',
		28
	).toFixed(2);
	let sum_IGST_28 = getSumByTaxtypeAndTaxPercent(
		saledetailsdata,
		'IGST',
		28
	).toFixed(2);

	let GST_0 = +sum_SGST_0 / 2 + +sum_CGST_0 / 2 + +sum_IGST_0;
	let GST_5 = +sum_SGST_5 / 2 + +sum_CGST_5 / 2 + +sum_IGST_5;
	let GST_12 = +sum_SGST_12 / 2 + +sum_CGST_12 / 2 + +sum_IGST_12;
	let GST_18 = +sum_SGST_18 / 2 + +sum_CGST_18 / 2 + +sum_IGST_18;
	let GST_28 = +sum_SGST_28 / 2 + +sum_CGST_28 / 2 + +sum_IGST_28;

	let sumDiscountPercent_0 = getSumByDiscountPercent(
		saledetailsdata,
		0
	).toFixed(2);
	let sumDiscountPercent_5 = getSumByDiscountPercent(
		saledetailsdata,
		5
	).toFixed(2);
	let sumDiscountPercent_12 = getSumByDiscountPercent(
		saledetailsdata,
		12
	).toFixed(2);
	let sumDiscountPercent_18 = getSumByDiscountPercent(
		saledetailsdata,
		18
	).toFixed(2);
	let sumDiscountPercent_28 = getSumByDiscountPercent(
		saledetailsdata,
		28
	).toFixed(2);

	let sumTaxablePercent_0 = getSumByTaxableByPercent(
		saledetailsdata,
		0
	).toFixed(2);
	let sumTaxablePercent_5 = getSumByTaxableByPercent(
		saledetailsdata,
		5
	).toFixed(2);
	let sumTaxablePercent_12 = getSumByTaxableByPercent(
		saledetailsdata,
		12
	).toFixed(2);
	let sumTaxablePercent_18 = getSumByTaxableByPercent(
		saledetailsdata,
		18
	).toFixed(2);
	let sumTaxablePercent_28 = getSumByTaxableByPercent(
		saledetailsdata,
		28
	).toFixed(2);

	let sumTotalPercent_0 = getSumByTotalByPercent(saledetailsdata, 0).toFixed(2);
	let sumTotalPercent_5 = getSumByTotalByPercent(saledetailsdata, 5).toFixed(2);
	let sumTotalPercent_12 = getSumByTotalByPercent(saledetailsdata, 12).toFixed(
		2
	);
	let sumTotalPercent_18 = getSumByTotalByPercent(saledetailsdata, 18).toFixed(
		2
	);
	let sumTotalPercent_28 = getSumByTotalByPercent(saledetailsdata, 28).toFixed(
		2
	);

	let total_0 =
		+GST_0 + +sumDiscountPercent_0 + +sumTaxablePercent_0 + +sumTotalPercent_0;
	let total_5 =
		+GST_5 + +sumDiscountPercent_5 + +sumTaxablePercent_5 + +sumTotalPercent_5;
	let total_12 =
		+GST_12 +
		+sumDiscountPercent_12 +
		+sumTaxablePercent_12 +
		+sumTotalPercent_12;
	let total_18 =
		+GST_18 +
		+sumDiscountPercent_18 +
		+sumTaxablePercent_18 +
		+sumTotalPercent_18;
	let total_28 =
		+GST_28 +
		+sumDiscountPercent_28 +
		+sumTaxablePercent_28 +
		+sumTotalPercent_28;

	let subtotalAllTax =
		+sumTaxablePercent_0 +
		+sumTaxablePercent_5 +
		+sumTaxablePercent_12 +
		+sumTaxablePercent_18 +
		+sumTaxablePercent_28;
	let discountAllTax =
		+sumDiscountPercent_0 +
		+sumDiscountPercent_5 +
		+sumDiscountPercent_12 +
		+sumDiscountPercent_18 +
		+sumDiscountPercent_28;
	let totalAllTax =
		+sumTotalPercent_0 +
		+sumTotalPercent_5 +
		+sumTotalPercent_12 +
		+sumTotalPercent_18 +
		+sumTotalPercent_28;

	let SGSTAllTax =
		+sum_SGST_0 / 2 +
		+sum_SGST_5 / 2 +
		+sum_SGST_12 / 2 +
		+sum_SGST_18 / 2 +
		+sum_SGST_28 / 2;
	let CGSTAllTax =
		+sum_CGST_0 / 2 +
		+sum_CGST_5 / 2 +
		+sum_CGST_12 / 2 +
		+sum_CGST_18 / 2 +
		+sum_CGST_28 / 2;
	let IGSTAllTax =
		+sum_IGST_0 + +sum_IGST_5 + +sum_IGST_12 + +sum_IGST_18 + +sum_IGST_28;

	let finalTotalAllTax =
		+sumTotalPercent_0 +
		+sumTotalPercent_5 +
		+sumTotalPercent_12 +
		+sumTotalPercent_18 +
		+sumTotalPercent_28;

	// adjusting footer section 1 height
	let start = 539;
	generateHr(doc, line_x_start, line_x_end, start);
	doc.font('Helvetica-Bold');

	generateSummaryRightTableRow(
		doc,
		start + 10,
		totalAllTax,
		discountAllTax,
		SGSTAllTax * 2,
		CGSTAllTax * 2,
		finalTotalAllTax,
		isIGST,
		IGSTAllTax,
		salemasterdata
	);
	generateHr(doc, line_x_start, line_x_end, start + 30);
}

function generateTableRow(
	doc,
	y,
	idx,
	product_description,
	product_code,
	hsn,
	qty,
	uom,
	mrp,
	disc_percent,
	amount,
	sgst,
	cgst,
	net_amount,
	x_start,
	isIGST,
	igst
) {
	doc.fillColor('#000000');

	let snow = 29;
	let pcodew = 59;
	let pdescw = 124;
	let hsnw = 41;
	let qtyw = 29;
	let uomw = 29;
	let mrpw = 44;
	let discpw = 24;
	let amountw = 44;
	let sgstw = 25;
	let cgstw = 25;
	let igstw = 50;
	let netw = 48;

	// Si.No Id
	if (idx === 'SNo') {
		doc.fontSize(8).text(idx, x_start, y, { width: snow - 5, align: 'left' });
	} else {
		doc.fontSize(8).text(idx, x_start, y, { width: snow - 5, align: 'left' });
	}

	// P.CODE
	if (product_code === 'PCODE') {
		doc.text(product_code, x_start + (snow + 2), y, {
			width: pcodew,
			align: 'left',
		});
	} else {
		doc.text(product_code, x_start + (snow + 3), y, {
			width: pcodew,
			align: 'left',
		});
	}

	if (product_description !== 'PRODUCT NAME') {
		doc.text(
			product_description.length > 33
				? product_description.substr(0, 29) + '...'
				: product_description,
			x_start + (snow + 2) + (pcodew + 3),
			y,
			{
				width: pdescw,
				align: 'left',
				ellipsis: true,
			}
		);
	} else {
		doc.text(product_description, x_start + (snow + 2) + (pcodew + 2), y, {
			width: pdescw,
			align: 'left',
		});
	}

	// HSNCode
	if (hsn === ' HSN ') {
		doc.text(hsn, x_start + (snow + 2) + (pcodew + 2) + (pdescw + 2), y, {
			width: hsnw,
			align: 'center',
		});
	} else {
		doc.text(hsn, x_start + (snow + 2) + (pcodew + 2) + (pdescw + 3), y, {
			width: hsnw,
			align: 'left',
		});
	}

	if (qty === ' QTY ') {
		doc.text(
			qty,
			x_start + (snow + 2) + (pcodew + 2) + (pdescw + 2) + (hsnw + 2),
			y,
			{ width: qtyw - 1, align: 'right' }
		);
	} else {
		doc.text(
			qty,
			x_start + (snow + 2) + (pcodew + 2) + (pdescw + 2) + (hsnw + 2),
			y,
			{ width: qtyw - 3, align: 'right' }
		); // ADJUST FROM RIGHT
	}

	if (uom === ' UOM ') {
		doc.text(
			uom,
			x_start +
				(snow + 2) +
				(pcodew + 2) +
				(pdescw + 2) +
				(hsnw + 2) +
				(qtyw + 2),
			y,
			{ width: uomw, align: 'center' }
		);
	} else {
		doc.text(
			uom,
			x_start +
				(snow + 2) +
				(pcodew + 2) +
				(pdescw + 2) +
				(hsnw + 2) +
				(qtyw + 2),
			y,
			{ width: uomw, align: 'center' }
		);
	}

	if (mrp === ' MRP ') {
		doc.text(
			mrp,
			x_start +
				(snow + 2) +
				(pcodew + 2) +
				(pdescw + 2) +
				(hsnw + 2) +
				(qtyw + 2) +
				(uomw + 2),
			y,
			{ width: mrpw - 1, align: 'center' }
		);
	} else {
		doc.text(
			(+mrp).toFixed(2),
			x_start +
				(snow + 2) +
				(pcodew + 2) +
				(pdescw + 2) +
				(hsnw + 2) +
				(qtyw + 2) +
				(uomw + 2),
			y,
			{
				width: mrpw - 3,
				align: 'right',
			}
		);
	}

	if (disc_percent === 'DIS%') {
		doc.text(
			disc_percent,
			x_start +
				(snow + 2) +
				(pcodew + 2) +
				(pdescw + 2) +
				(hsnw + 2) +
				(qtyw + 2) +
				(uomw + 2) +
				(mrpw + 2),
			y,
			{
				width: discpw,
				align: 'center',
			}
		);
	} else {
		doc.text(
			disc_percent.toFixed(2),
			x_start +
				(snow + 2) +
				(pcodew + 2) +
				(pdescw + 2) +
				(hsnw + 2) +
				(qtyw + 2) +
				(uomw + 2) +
				(mrpw + 2),
			y,
			{
				width: discpw - 2,
				align: 'right',
			}
		);
	}

	if (amount === ' AMOUNT ') {
		doc.text(
			amount,
			x_start +
				(snow + 2) +
				(pcodew + 2) +
				(pdescw + 2) +
				(hsnw + 2) +
				(qtyw + 2) +
				(uomw + 2) +
				(mrpw + 2) +
				(discpw + 2),
			y,
			{
				width: amountw - 3,
				align: 'right',
			}
		);
	} else {
		doc.text(
			amount.toFixed(2),
			x_start +
				(snow + 2) +
				(pcodew + 2) +
				(pdescw + 2) +
				(hsnw + 2) +
				(qtyw + 2) +
				(uomw + 2) +
				(mrpw + 2) +
				(discpw + 2),
			y,
			{
				width: amountw - 3,
				align: 'right',
			}
		);
	}

	if (sgst === 'SGST' && !isIGST) {
		doc.text(
			sgst,
			x_start +
				(snow + 2) +
				(pcodew + 2) +
				(pdescw + 2) +
				(hsnw + 2) +
				(qtyw + 2) +
				(uomw + 2) +
				(mrpw + 2) +
				(discpw + 2) +
				(amountw + 2),
			y,
			{ width: sgstw, align: 'center' }
		);
	} else if (!isIGST) {
		doc.text(
			sgst.toFixed(2),
			x_start +
				(snow + 2) +
				(pcodew + 2) +
				(pdescw + 2) +
				(hsnw + 2) +
				(qtyw + 2) +
				(uomw + 2) +
				(mrpw + 2) +
				(discpw + 2) +
				(amountw + 2),
			y,
			{ width: sgstw - 3, align: 'right' }
		);
	}

	if (cgst === 'CGST' && !isIGST) {
		doc.text(
			cgst,
			x_start +
				(snow + 2) +
				(pcodew + 2) +
				(pdescw + 2) +
				(hsnw + 2) +
				(qtyw + 2) +
				(uomw + 2) +
				(mrpw + 2) +
				(discpw + 2) +
				(amountw + 2) +
				(sgstw + 2),
			y,
			{ width: cgstw - 1, align: 'right' }
		);
	} else if (!isIGST) {
		doc.text(
			cgst.toFixed(2),
			x_start +
				(snow + 2) +
				(pcodew + 2) +
				(pdescw + 2) +
				(hsnw + 2) +
				(qtyw + 2) +
				(uomw + 2) +
				(mrpw + 2) +
				(discpw + 2) +
				(amountw + 2) +
				(sgstw + 2),
			y,
			{ width: cgstw - 3, align: 'right' }
		);
	}

	if (igst === 'IGST' && isIGST) {
		doc.text(
			igst,

			x_start +
				(snow + 2) +
				(pcodew + 2) +
				(pdescw + 2) +
				(hsnw + 2) +
				(qtyw + 2) +
				(uomw + 2) +
				(mrpw + 2) +
				(discpw + 2) +
				(amountw + 2),
			y,
			{ width: igstw, align: 'center' }
		);
	} else if (isIGST) {
		doc.text(
			igst.toFixed(2),

			x_start +
				(snow + 2) +
				(pcodew + 2) +
				(pdescw + 2) +
				(hsnw + 2) +
				(qtyw + 2) +
				(uomw + 2) +
				(mrpw + 2) +
				(discpw + 2) +
				(amountw + 2),
			y,
			{ width: igstw - 20, align: 'right' }
		);
	}

	if (net_amount === 'NET AMNT') {
		doc.text(
			net_amount,
			x_start +
				(snow + 2) +
				(pcodew + 2) +
				(pdescw + 2) +
				(hsnw + 2) +
				(qtyw + 2) +
				(uomw + 2) +
				(mrpw + 2) +
				(discpw + 2) +
				(amountw + 2) +
				(igstw + 2),
			y,
			{ width: netw - 1, align: 'right' }
		);
	} else {
		doc.text(
			net_amount.toFixed(2),
			x_start +
				(snow + 2) +
				(pcodew + 2) +
				(pdescw + 2) +
				(hsnw + 2) +
				(qtyw + 2) +
				(uomw + 2) +
				(mrpw + 2) +
				(discpw + 2) +
				(amountw + 2) +
				(igstw + 2),
			y,
			{ width: netw - 1, align: 'right' }
		);
	}
}

// FINAL SUMMARY TOTAL LEFT
function generateSummaryLeftTableRow(
	doc,
	y,
	classhead,
	subtotal,
	disc,
	amount,
	sgst,
	cgst,
	gst,
	total,
	isIGST,
	igst
) {
	doc.fillColor('#000000');
	doc.fontSize(9).text(classhead, 24, y, { width: 40, align: 'left' });
	if (subtotal === 'SUB TOTAL') {
		doc.text(subtotal, 64, y, { width: 50, align: 'right' });
	} else {
		doc.text((+subtotal + +disc).toFixed(2), 64, y, {
			width: 50,
			align: 'right',
		});
	}

	if (disc === 'DISC') {
		doc.text(disc, 113, y, { width: 49, align: 'right' });
	} else {
		doc.text((+disc).toFixed(2), 113, y, { width: 49, align: 'right' });
	}
	if (amount === 'AMOUNT') {
		doc.text(amount, 169, y, { width: 49, align: 'right' });
	} else {
		doc.text((+amount).toFixed(2), 169, y, { width: 49, align: 'right' });
	}

	if (!isIGST) {
		if (sgst === 'SGST') {
			doc.text(sgst, 225, y, { width: 49, align: 'right' });
		} else {
			doc.text((+sgst / 2).toFixed(2), 225, y, { width: 49, align: 'right' });
		}

		if (cgst === 'CGST') {
			doc.text(cgst, 281, y, { width: 49, align: 'right' });
		} else {
			doc.text((+cgst / 2).toFixed(2), 281, y, { width: 49, align: 'right' });
		}

		if (gst === 'GST') {
			doc.text(gst, 337, y, { width: 49, align: 'right' });
		} else {
			doc.text((+gst).toFixed(2), 337, y, { width: 49, align: 'right' });
		}
		if (total === 'TOTAL') {
			doc.text(total, 393, y, { width: 49, align: 'right' });
		} else {
			doc.text((+total).toFixed(2), 393, y, { width: 49, align: 'right' });
		}
	} else if (isIGST) {
		if (igst === 'IGST') {
			doc.text(igst, 225, y, { width: 39, align: 'right' });
		} else {
			doc.text((+igst).toFixed(2), 225, y, { width: 39, align: 'right' });
		}

		if (gst === 'GST') {
			doc.text(gst, 281, y, { width: 49, align: 'right' });
		} else {
			doc.text((+gst).toFixed(2), 281, y, { width: 49, align: 'right' });
		}

		if (total === 'TOTAL') {
			doc.text(total, 337, y, { width: 49, align: 'right' });
		} else {
			doc.text((+total).toFixed(2), 337, y, { width: 49, align: 'right' });
		}
	}
}
//Final SUMMARY TOTAL RIGHT BOX
function generateSummaryRightTableRow(
	doc,
	y,
	subtotal,
	discount,
	sgst,
	cgst,
	finalTotalAllTax,
	isIGST,
	igst,
	salemasterdata
) {
	doc.fillColor('#000000');

	let finalSumTotal = +(
		+finalTotalAllTax +
		+salemasterdata.transport_charges +
		+salemasterdata.unloading_charges +
		+salemasterdata.misc_charges
	);

	doc
		.fillColor('#000000')
		.fontSize(10)
		.text('Total Items:' + sumqty, 200, y);

	doc
		.fillColor('#000000')
		.fontSize(10)
		.text('Total Qty:' + itemqty, 300, y);

	doc.font('Helvetica-Bold');
	doc
		.text('TOTAL', 480, y, { width: 70, align: 'left' })

		.text(
			roundOffFn(finalSumTotal, 'rounding').toLocaleString('en-IN'),
			500,
			y,
			{
				width: 70,
				align: 'right',
			}
		)
		.font('Helvetica');
}

function generateHr(doc, line_x_start, line_x_end, y) {
	doc
		.strokeColor('#000000')
		.lineWidth(1)
		.moveTo(line_x_start, y)
		.lineTo(line_x_end, y)
		.stroke();
}

function getSumByTaxtypeAndTaxPercent(dataArr, tax_type, tax_percent) {
	return dataArr
		.filter((arr) => {
			if (tax_type === 'IGST') {
				return arr.igst === tax_percent;
			} else if (tax_type === 'CGST') {
				return arr.cgst === tax_percent / 2;
			} else if (tax_type === 'SGST') {
				return arr.sgst === tax_percent / 2;
			}
		})
		.reduce((a, c) => {
			return a + c.taxable_value * (tax_percent / 100);
		}, 0);
}

function getSumByDiscountPercent(dataArr, tax_percent) {
	return dataArr
		.filter((arr) => arr.tax === tax_percent)
		.reduce((a, c) => {
			return a + c.disc_value;
		}, 0);
}

function getSumByTaxableByPercent(dataArr, tax_percent) {
	return dataArr
		.filter((arr) => arr.tax === tax_percent)
		.reduce((a, c) => {
			return a + c.taxable_value;
		}, 0);
}

function getSumByTotalByPercent(dataArr, tax_percent) {
	return dataArr
		.filter((arr) => arr.tax === tax_percent)
		.reduce((a, c) => {
			return a + c.total_value;
		}, 0);
}

function roundOffFn(value, param) {
	if (param === 'rounding') {
		return Math.round(+value.toFixed(2));
	} else if (param === 'withoutrounding') {
		return +value.toFixed(2);
	}
}

module.exports = {
	createEstimate,
};
