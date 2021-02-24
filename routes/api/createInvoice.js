const fs = require('fs');

// require dependencies
const PDFDocument = require('pdfkit');
const blobStream = require('blob-stream');

var util = require('./../helpers/utils');
const logger = require('../../routes/helpers/log4js');

const { number2text } = require('./../helpers/utils');

let line_x_start = 24;
let line_x_end = 571;

function createInvoice(
	saleMaster,
	saleDetails,
	customerDetails,
	centerDetails,
	path,
	res,
	print_type,
	print_ship_to
) {
	let centerdata = centerDetails[0];
	let customerdata = customerDetails[0];
	let salemasterdata = saleMaster[0];
	let saledetailsdata = saleDetails;
	res.contentType('application/pdf');

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

			if (print_ship_to) {
				generateShippingInformation(doc, customerdata, salemasterdata);
			}

			generateInvoiceTable(
				doc,
				salemasterdata,
				saledetailsdata,
				centerdata,
				e,
				customerdata
			);
			generateFooterSummary(doc, centerdata);

			//		doc[counter].pipe(fs.createWriteStream(path));
		});
	}

	//	var stream = doc.pipe(blobStream());
	// stream.on("finish", function() {

	// get a blob you can do whatever you like with
	// const blob = stream.toBlob("application/pdf");

	// doc.pipe(blob);

	// or get a blob URL for display in the browser
	// const url = stream.toBlobURL('application/pdf');
	//  // iframe.src = url;
	// res.send(url);
	// });

	// pipe the resposne
	doc.end();
	doc.pipe(res);
}

function generateHeader(doc, centerdata, print_type) {
	doc.image('tractor.png', 24, 24, { width: 70 }).fillColor('darkblue');

	doc
		.font('Helvetica')
		.fontSize(10)
		.text(print_type, 400, 20, { align: 'right' })
		.font('Helvetica');

	doc.fillColor('#000000');
	doc
		.font('Helvetica-Bold')
		.fontSize(14)
		.text(centerdata.name, 10, 40, {
			align: 'center',
			lineGap: 2,
			characterSpacing: 1.2,
		})
		.font('Helvetica')
		.fontSize(9)

		.text(centerdata.tagline, {
			align: 'center',
			lineGap: 1.5,
			characterSpacing: 1,
		})
		.text(
			centerdata.address1 +
				',' +
				centerdata.address2 +
				', ' +
				centerdata.district +
				'-' +
				centerdata.pin,
			{
				align: 'center',
				lineGap: 1.5,
			}
		)

		.text('GSTIN : ' + centerdata.gst, { align: 'center', lineGap: 1.5 })
		.text('Email: ' + centerdata.email, { align: 'center', lineGap: 1.5 })

		.text('Phone : ' + centerdata.phone + ' & ' + centerdata.mobile, 410, 92)

		.image('swaraj.png', 475, 62, { width: 80 })

		.moveDown();
}

function generateCustomerInformation(doc, customerdata, salemasterdata) {
	// first line before customer section
	generateHr(doc, line_x_start, line_x_end, 109);

	doc.fillColor('#000000').fontSize(13).text('To', 24, 117);

	let invoice_type =
		salemasterdata.sale_type === 'gstinvoice' ? 'GST INVOICE' : 'STOCK ISSUE';

	doc
		.fillColor('#000000')
		.fontSize(12)
		.text(invoice_type, 440, 119, { align: 'center' });
	doc.fillColor('#000000');
	doc
		.strokeColor('#000000')
		.moveTo(460, 136)
		.lineTo(570, 136)

		.stroke();

	doc
		.fillColor('#000000')
		.fontSize(10)
		.text('BILL No.     : ' + salemasterdata.invoice_no, 460, 145);

	doc
		.fillColor('#000000')
		.fontSize(10)
		.text('BILL Date    : ' + salemasterdata.invoice_date, 460, 160);

	const customerInformationTop = 136;

	if (customerdata.name === 'Walk In') {
		doc
			.fillColor('#000000')
			.fontSize(10)
			.text(
				customerdata.name + salemasterdata.retail_customer_name,
				40,
				customerInformationTop
			)
			.text(
				customerdata.address1 + salemasterdata.retail_customer_address,
				40,
				151
			);
	} else {
		doc
			.fillColor('#000000')
			.fontSize(10)
			.text(customerdata.name, 40, customerInformationTop)
			.text(customerdata.address1, 40, 151);
	}

	if (customerdata.district !== '') {
		doc.text(
			customerdata.address2 + ', District: ' + customerdata.district,
			40,
			166
		);
	} else {
		doc.text(customerdata.address2, 40, 166);
	}

	doc
		.fillColor('#000000')
		.text(
			'State: ' + customerdata.code + '-' + customerdata.description,
			40,
			181
		)
		.text(
			'Phone: ' + customerdata.mobile + ' GSTIN: ' + customerdata.gst,
			40,
			196
		)
		.moveDown();

	// line end of customer section
	generateHr(doc, line_x_start, line_x_end, 210);
}

function generateShippingInformation(doc, customerdata, salemasterdata) {
	// first line before customer section
	generateHr(doc, line_x_start, line_x_end, 109);

	doc.fillColor('#000000').fontSize(12).text('Ship To', 260, 117);

	const customerInformationTop = 136;

	if (customerdata.name === 'Walk In') {
		doc
			.fillColor('#000000')
			.fontSize(10)
			.text(
				customerdata.name + salemasterdata.retail_customer_name,
				40,
				customerInformationTop
			)
			.text(
				customerdata.csa_address1 + salemasterdata.retail_customer_address,
				40,
				151
			);
	} else {
		doc
			.fillColor('#000000')
			.fontSize(10)
			.text(customerdata.name, 270, customerInformationTop)
			.text(customerdata.csa_address1, 270, 151);
	}

	if (customerdata.csa_district !== '') {
		doc.text(
			customerdata.csa_address2 + ', District: ' + customerdata.cas_district,
			270,
			166
		);
	} else {
		doc.text(customerdata.csa_address2, 270, 166);
	}

	doc
		.fillColor('#000000')
		.text(
			'State: ' + customerdata.csa_code + '-' + customerdata.csa_description,
			270,
			181
		)
		.text(
			'Phone: ' + customerdata.mobile + ' GSTIN: ' + customerdata.gst,
			270,
			196
		)
		.moveDown();

	// line end of customer section
	generateHr(doc, line_x_start, line_x_end, 210);
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
	let invoiceTableTop = 216;
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
		.moveTo(x_start + snow, 210)
		.lineWidth(1)
		.lineTo(x_start + snow, 230)

		.stroke();

	// product code
	doc
		.strokeColor('#000000')
		.moveTo(x_start + (snow + 1) + pcodew, 210)
		.lineWidth(1)
		.lineTo(x_start + (snow + 1) + pcodew, 229);

	// product desc
	doc
		.strokeColor('#000000')
		.moveTo(x_start + (snow + 1) + (pcodew + 1) + pdescw, 210)
		.lineWidth(1)
		.lineTo(x_start + (snow + 1) + (pcodew + 1) + pdescw, 229)

		.stroke();

	// // hsncode
	doc
		.strokeColor('#000000')
		.moveTo(x_start + (snow + 1) + (pcodew + 1) + (pdescw + 1) + hsnw, 210)
		.lineWidth(1)
		.lineTo(x_start + (snow + 1) + (pcodew + 1) + (pdescw + 1) + hsnw, 229)

		.stroke();

	// // qty
	doc
		.strokeColor('#000000')
		.moveTo(
			x_start + (snow + 1) + (pcodew + 1) + (pdescw + 1) + (hsnw + 1) + qtyw,
			210
		)
		.lineWidth(1)
		.lineTo(
			x_start + (snow + 1) + (pcodew + 1) + (pdescw + 1) + (hsnw + 1) + qtyw,
			229
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
			210
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
			229
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
			210
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
			229
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
			210
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
			229
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
			210
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
			229
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
				210
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
				229
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
				210
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
				229
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
				210
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
				229
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
			//generateCustomerInformation(doc, customerdata, salemasterdata);

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
	generateSummaryLeftTableRow(
		doc,
		start + 10,
		'CLASS',
		'SUB TOTAL',
		'DISC',
		'AMOUNT',
		'SGST',
		'CGST',
		'GST',
		'TOTAL',
		isIGST,
		'IGST'
	);
	doc.font('Helvetica');
	generateSummaryLeftTableRow(
		doc,
		start + 25,
		'GST 5%',
		sumTotalPercent_5,
		sumDiscountPercent_5,
		sumTaxablePercent_5,
		sum_SGST_5,
		sum_CGST_5,
		GST_5,
		sumTotalPercent_5,
		isIGST,
		sum_IGST_5
	);
	generateSummaryLeftTableRow(
		doc,
		start + 40,
		'GST 12%',
		sumTotalPercent_12,
		sumDiscountPercent_12,
		sumTaxablePercent_12,
		sum_SGST_12,
		sum_CGST_12,
		GST_12,
		sumTotalPercent_12,
		isIGST,
		sum_IGST_12
	);
	generateSummaryLeftTableRow(
		doc,
		start + 55,
		'GST 18%',
		sumTotalPercent_18,
		sumDiscountPercent_18,
		sumTaxablePercent_18,
		sum_SGST_18,
		sum_CGST_18,
		GST_18,
		sumTotalPercent_18,
		isIGST,
		sum_CGST_18
	);
	generateSummaryLeftTableRow(
		doc,
		start + 70,
		'GST 28%',
		sumTotalPercent_28,
		sumDiscountPercent_28,
		sumTaxablePercent_28,
		sum_SGST_28,
		sum_CGST_28,
		GST_28,
		sumTotalPercent_28,
		isIGST,
		sum_CGST_28
	);
	generateSummaryLeftTableRow(
		doc,
		start + 85,
		'GST 0%',
		sumTotalPercent_0,
		sumDiscountPercent_0,
		sumTaxablePercent_0,
		sum_SGST_0,
		sum_CGST_0,
		GST_0,
		sumTotalPercent_0,
		isIGST,
		sum_CGST_0
	);

	generateHr(doc, line_x_start, line_x_end, start + 97);

	doc.font('Helvetica-Bold');
	generateSummaryLeftTableRow(
		doc,
		start + 105,
		'TOTAL',
		totalAllTax,
		discountAllTax,
		subtotalAllTax,

		SGSTAllTax * 2,
		CGSTAllTax * 2,
		SGSTAllTax + CGSTAllTax + IGSTAllTax,
		finalTotalAllTax,
		isIGST,
		IGSTAllTax
	);
	doc.font('Helvetica');

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
	generateHr(doc, line_x_start, line_x_end, start + 120);
	numberToText(doc, finalTotalAllTax, start);
	generateHr(doc, line_x_start, line_x_end, start + 137);
}

function numberToText(doc, finalTotalAllTax, start) {
	doc.font('Helvetica-Bold');
	doc
		.fontSize(9)
		.text(
			number2text(roundOffFn(finalTotalAllTax, 'rounding')),
			24,
			start + 125,
			{
				align: 'left',
			}
		);
	doc.font('Helvetica');
}

function generateFooter(doc) {
	doc
		.fontSize(10)
		.text(
			'Payment is due within 15 days. Thank you for your business.',
			50,
			780,
			{
				align: 'center',
				width: 500,
			}
		);
}

function generateToBlock(doc, customerdata) {
	doc.fontSize(11).text('To', 50, 350);
}

function generateFooterSummary(doc, centerdata) {
	// adjusting footer section 2
	let start = 680;

	doc
		.fontSize(8)
		.text('Terms & Conditions:', 24, start)
		.text('Goods once sold will not be taken back or exchanged.', {
			lineGap: 1.8,
		})
		.text('Bills not paid due date will attract 24% interest.', {
			lineGap: 1.8,
		})
		.text('All disputes subject to Jurisdication only.', { lineGap: 1.8 })
		.text('Prescribed Sales Tax declaration will be given.', { lineGap: 1.8 });

	doc
		.strokeColor('#000000')
		.lineWidth(1)
		.moveTo(24, start + 54)
		.lineTo(280, start + 54)
		.stroke();

	doc
		.fontSize(8)
		.text(
			'Certified that the particulars given above are true and correct',
			24,
			start + 60,
			{ lineGap: 1.8 }
		)
		.text(
			'and the amount indicated represents the price actually charged.',
			24,
			start + 70,
			{ lineGap: 1.8 }
		);

	doc
		.fontSize(8)
		.font('Helvetica-Bold')
		.text('OUR BANK        : ' + centerdata.bankname, 320, start, {
			lineGap: 1.8,
		})
		.text('A/C NAME          : ' + centerdata.accountname, 320, start + 10, {
			lineGap: 1.8,
		})
		.text('A/C NO               : ' + centerdata.accountno, 320, start + 20, {
			lineGap: 1.8,
		});
	doc.font('Times-BoldItalic');
	doc
		.fontSize(6)
		.text(
			`Plz pay Cash/Cheque/DD in favour of '${centerdata.accountname}'.`,
			320,
			start + 30,
			{ lineGap: 1.4 }
		);

	doc.fontSize(7).text('For    ' + centerdata.accountname, 400, start + 40);
	doc.fontSize(7).text('Authorised signatory', 400, start + 75);

	//  doc.fontSize(8).text("Checked By    " + centerdata.name, 350, 680);
	//  doc.fontSize(8).text("  E.&O.E.", 350, 700);

	// doc.fontSize(8).text("Prepared by:", 50, 800).text("Packed by:", 150, 800).text("Checked by:", 250, 800).text("Authorised signatory:", 350, 800);
	doc.fontSize(8).text('Software By: 97316 16386', 250, 758);
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

	// if (igst === "IGST" && isIGST) {
	// 	doc.text(
	// 		net_amount,
	// 		x_start +
	// 			(snow + 2) +
	// 			(pcodew + 2) +
	// 			(pdescw + 2) +
	// 			(hsnw + 2) +
	// 			(qtyw + 2) +
	// 			(uomw + 2) +
	// 			(mrpw + 2) +
	// 			(discpw + 2) +
	// 			(amountw + 2) +
	// 			(igstw + 2),
	// 		y,
	// 		{ width: netw - 1, align: "right" },
	// 	);
	// } else {
	// 	doc.text(
	// 		net_amount,
	// 		x_start +
	// 			(snow + 2) +
	// 			(pcodew + 2) +
	// 			(pdescw + 2) +
	// 			(hsnw + 2) +
	// 			(qtyw + 2) +
	// 			(uomw + 2) +
	// 			(mrpw + 2) +
	// 			(discpw + 2) +
	// 			(amountw + 2) +
	// 			(sgstw + 2) +
	// 			(cgstw + 2),
	// 		y,
	// 		{
	// 			width: netw - 1,
	// 			align: "right",
	// 		},
	// 	);
	// }
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
	doc
		.fontSize(9)
		.font('Helvetica-Bold')
		.text('SUB TOTAL', 450, y, { width: 70, align: 'left' })
		.font('Helvetica')
		.text((+subtotal + +discount).toFixed(2), 500, y, {
			width: 70,
			align: 'right',
		})

		.text('DISCOUNT', 450, y + 15, { width: 70, align: 'left' })

		.text((+discount).toFixed(2), 500, y + 15, { width: 70, align: 'right' });

	if (!isIGST) {
		doc
			.text('SGST', 450, y + 30, { width: 70, align: 'left' })

			.text((+sgst / 2).toFixed(2), 500, y + 30, { width: 70, align: 'right' })

			.text('CGST', 450, y + 45, { width: 70, align: 'left' })

			.text((+cgst / 2).toFixed(2), 500, y + 45, { width: 70, align: 'right' });
	} else if (isIGST) {
		doc
			.text('IGST', 450, y + 30, { width: 70, align: 'left' })

			.text((+igst).toFixed(2), 500, y + 30, { width: 70, align: 'right' });
	}

	doc
		.text('Misc.', 450, y + 60, { width: 70, align: 'left' })

		.text(
			(+(
				+salemasterdata.transport_charges +
				+salemasterdata.unloading_charges +
				+salemasterdata.misc_charges
			)).toFixed(2),
			500,
			y + 60,
			{
				width: 70,
				align: 'right',
			}
		);

	let finalSumTotal = +(
		+finalTotalAllTax +
		+salemasterdata.transport_charges +
		+salemasterdata.unloading_charges +
		+salemasterdata.misc_charges
	);

	doc
		.text('ROUNDED OFF', 450, y + 75, { width: 70, align: 'left' })

		.text(
			(
				roundOffFn(finalSumTotal, 'rounding') -
				roundOffFn(finalSumTotal, 'withoutrounding')
			).toFixed(2),
			500,
			y + 75,
			{
				width: 70,
				align: 'right',
			}
		);

	doc.font('Helvetica-Bold');
	doc
		.text('TOTAL', 450, y + 95, { width: 70, align: 'left' })

		.text(
			roundOffFn(finalSumTotal, 'rounding').toLocaleString('en-IN'),
			500,
			y + 95,
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

function formatCurrency(cents) {
	return '$' + (cents / 100).toFixed(2);
}

function formatDate(date) {
	const day = date.getDate();
	const month = date.getMonth() + 1;
	const year = date.getFullYear();

	return year + '/' + month + '/' + day;
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
	createInvoice,
};

// Array.from(Array(120)).forEach(function (k, idx) {
