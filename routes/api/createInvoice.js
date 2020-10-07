const fs = require("fs");

// require dependencies
const PDFDocument = require("pdfkit");
const blobStream = require("blob-stream");

var util = require("./../helpers/utils");
const logger = require("../../routes/helpers/log4js");

const { number2text } = require("./../helpers/utils");

let line_x_start = 24;
let line_x_end = 571;

function createInvoice(saleMaster, saleDetails, customerDetails, centerDetails, invoice, path, res) {
	let centerdata = centerDetails[0];
	let customerdata = customerDetails[0];
	let salemasterdata = saleMaster[0];
	let saledetailsdata = saleDetails;
	// {'page-size':'A4', 'dpi':400}
	// options = { 'disable-smart-shrinking': ''}
	let doc = new PDFDocument({
		"page-size": "A4",
		dpi: 400,
		margin: 24,
		layout: "portrait", // can be 'landscape'
	});
	doc.font("Helvetica");
	generateHeader(doc, centerdata);
	generateCustomerInformation(doc, customerdata, salemasterdata);
	generateInvoiceTable(doc, salemasterdata, saledetailsdata);
	generateFooterSummary(doc, centerdata);

	doc.end();
	doc.pipe(fs.createWriteStream(path));

	var stream = doc.pipe(blobStream());
	// stream.on("finish", function() {

	// get a blob you can do whatever you like with
	// const blob = stream.toBlob("application/pdf");

	// doc.pipe(blob);

	// or get a blob URL for display in the browser
	// const url = stream.toBlobURL('application/pdf');
	// 	// iframe.src = url;
	// res.send(url);
	// });

	res.contentType("application/pdf");

	doc.pipe(res);
}

function generateHeader(doc, centerdata) {
	doc.image("tractor.png", 24, 24, { width: 70 }).fillColor("blue");

	doc
		.font("Helvetica-Bold")
		.fontSize(14)
		.text(centerdata.name, 10, 40, { align: "center", lineGap: 2, characterSpacing: 1.2 })
		.font("Helvetica")
		.fontSize(9)

		.text(centerdata.tagline, { align: "center", lineGap: 1.5, characterSpacing: 1 })
		.text(centerdata.address1 + "," + centerdata.address2 + ", " + centerdata.district + "-" + centerdata.pin, {
			align: "center",
			lineGap: 1.5,
		})

		.text("GSTIN : " + centerdata.gst, { align: "center", lineGap: 1.5 })
		.text("Email: " + centerdata.email, { align: "center", lineGap: 1.5 })

		.text("Phone : " + centerdata.phone + " & " + centerdata.mobile, 410, 92)

		.image("swaraj.png", 475, 62, { width: 80 })

		.moveDown();
}

function generateCustomerInformation(doc, customerdata, salemasterdata) {
	// first line before customer section
	generateHr(doc, line_x_start, line_x_end, 109);

	doc.fillColor("#444444").fontSize(13).text("To", 24, 117);

	doc.fillColor("#444444").fontSize(13).text("GST INVOICE", 380, 117, { align: "center" });

	doc
		.strokeColor("#aaaaaa")
		.moveTo(400, 136)
		.lineTo(550, 136)

		.stroke();

	doc
		.fillColor("#444444")
		.fontSize(10)
		.text("BILL No.           :    " + salemasterdata.invoice_no, 410, 145);

	doc
		.fillColor("#444444")
		.fontSize(10)
		.text("BILL Date         :    " + salemasterdata.invoice_date, 410, 160);

	const customerInformationTop = 136;

	doc.fontSize(10).text(customerdata.name, 40, customerInformationTop).text(customerdata.address1, 40, 151).text(customerdata.address2, 40, 166);

	if (customerdata.district === "") {
		doc
			.text(customerdata.code + " " + customerdata.description, 40, 181)
			.text("Phone: " + customerdata.phone + " " + customerdata.gst, 40, 196)
			.moveDown();
	} else {
		doc
			.text(customerdata.district, 50, 181)
			.text(customerdata.code + " " + customerdata.description, 40, 196)
			.text("Phone: " + customerdata.phone + " GSTIN: " + customerdata.gst, 40, 211)
			.moveDown();
	}

	// line end of customer section
	generateHr(doc, line_x_start, line_x_end, 210);
}

function generateInvoiceTable(doc, salemasterdata, saledetailsdata) {
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
		"SNo",
		" PRODUCT NAME",
		"PCODE",
		" HSN ",
		" QTY ",
		" UOM ",
		" MRP ",
		"DIS%",
		" AMOUNT ",
		"SGST",
		"CGST",
		" NET AMOUNT ",
		x_start,
		isIGST,
		"IGST",
	);

	generateHr(doc, line_x_start, line_x_end, invoiceTableTop + 13);

	//runnig header vertical lines SI
	doc
		.strokeColor("#aaaaaa")
		.moveTo(x_start + 29, 210)
		.lineWidth(1)
		.lineTo(x_start + 29, 230)

		.stroke();
	// product desc
	doc
		.strokeColor("#aaaaaa")
		.moveTo(x_start + 29 + 149, 210)
		.lineWidth(1)
		.lineTo(x_start + 29 + 149, 229)

		.stroke();
	// hsncode
	doc
		.strokeColor("#aaaaaa")
		.moveTo(x_start + 29 + 150 + 42, 210)
		.lineWidth(1)
		.lineTo(x_start + 29 + 150 + 42, 229)

		.stroke();
	// qty
	doc
		.strokeColor("#aaaaaa")
		.moveTo(x_start + 29 + 150 + 42 + 29, 210)
		.lineWidth(1)
		.lineTo(x_start + 29 + 150 + 42 + 29, 229)

		.stroke();

	// UOM
	doc
		.strokeColor("#aaaaaa")
		.moveTo(x_start + 29 + 150 + 42 + 29 + 29, 210)
		.lineWidth(1)
		.lineTo(x_start + 29 + 150 + 42 + 29 + 29, 230)

		.stroke();

	// MRP
	doc
		.strokeColor("#aaaaaa")
		.moveTo(x_start + 29 + 150 + 42 + 29 + 29 + 50, 210)
		.lineWidth(1)
		.lineTo(x_start + 29 + 150 + 42 + 29 + 29 + 50, 230)

		.stroke();

	// Disc %
	doc
		.strokeColor("#aaaaaa")
		.moveTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29, 210)
		.lineWidth(1)
		.lineTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29, 230)

		.stroke();

	// Taxable Amount
	doc
		.strokeColor("#aaaaaa")
		.moveTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50, 210)
		.lineWidth(1)
		.lineTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50, 230)

		.stroke();

	if (!isIGST) {
		// SGST
		doc
			.strokeColor("#aaaaaa")
			.moveTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50 + 29, 210)
			.lineWidth(1)
			.lineTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50 + 29, 230)

			.stroke();

		// CGST
		doc
			.strokeColor("#aaaaaa")
			.moveTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50 + 29 + 29, 210)
			.lineWidth(1)
			.lineTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50 + 29 + 29, 230)

			.stroke();
	} else {
		//IGST
		doc
			.strokeColor("#aaaaaa")
			.moveTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50 + 29 + 29, 210)
			.lineWidth(1)
			.lineTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50 + 29 + 29, 230)

			.stroke();
	}

	saledetailsdata.forEach(function (k, idx) {
		invoiceTableTop = invoiceTableTop + 20;

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
			k.igst,
		);

		if (invoiceTableTop > 515) {
			doc.fontSize(14);
			doc.text("continue in next page", 50, invoiceTableTop + 50);
			doc.fontSize(8);
			invoiceTableTop = 60;
			doc.addPage({
				margin: 24,
			});
		}

		// all vertical lines comes here
		// Si.No
		doc
			.strokeColor("#aaaaaa")
			.moveTo(x_start + 29, invoiceTableTop - 6)
			.lineWidth(1)
			.lineTo(x_start + 29, 525) // this is the end point the line

			.stroke();
		// Product Desc
		doc
			.strokeColor("#aaaaaa")
			.moveTo(x_start + 29 + 149, invoiceTableTop - 8)
			.lineWidth(1)
			.lineTo(x_start + 29 + 149, 525)

			.stroke();
		// hsncode
		doc
			.strokeColor("#aaaaaa")
			.moveTo(x_start + 29 + 150 + 42, invoiceTableTop - 8)
			.lineWidth(1)
			.lineTo(x_start + 29 + 150 + 42, 525)

			.stroke();

		// qty
		doc
			.strokeColor("#aaaaaa")
			.moveTo(x_start + 29 + 150 + 42 + 29, invoiceTableTop - 8)
			.lineWidth(1)
			.lineTo(x_start + 29 + 150 + 42 + 29, 525)

			.stroke();

		// UOM
		doc
			.strokeColor("#aaaaaa")
			.moveTo(x_start + 29 + 150 + 42 + 29 + 29, invoiceTableTop - 6)
			.lineWidth(1)
			.lineTo(x_start + 29 + 150 + 42 + 29 + 29, 525)

			.stroke();
		// disc
		doc
			.strokeColor("#aaaaaa")
			.moveTo(x_start + 29 + 150 + 42 + 29 + 29 + 50, invoiceTableTop - 6)
			.lineWidth(1)
			.lineTo(x_start + 29 + 150 + 42 + 29 + 29 + 50, 525)

			.stroke();
		// taxable amount
		doc
			.strokeColor("#aaaaaa")
			.moveTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29, invoiceTableTop - 6)
			.lineWidth(1)
			.lineTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29, 525)

			.stroke();
		if (!isIGST) {
			//sgst
			doc
				.strokeColor("#aaaaaa")
				.moveTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50, invoiceTableTop - 6)
				.lineWidth(1)
				.lineTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50, 525)

				.stroke();
			//CGST
			doc
				.strokeColor("#aaaaaa")
				.moveTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50 + 29, invoiceTableTop - 6)
				.lineWidth(1)
				.lineTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50 + 29, 525)

				.stroke();
		} else {
			//IGST
			doc
				.strokeColor("#aaaaaa")
				.moveTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50, invoiceTableTop - 6)
				.lineWidth(1)
				.lineTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50, 525)

				.stroke();
		}

		// NET AMOUNT
		doc
			.strokeColor("#aaaaaa")
			.moveTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50 + 29 + 29, invoiceTableTop - 6)
			.lineWidth(1)
			.lineTo(x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50 + 29 + 29, 525)

			.stroke();
	});

	generateSummaryLeft(doc, saledetailsdata, isIGST, salemasterdata);
}

function generateSummaryLeft(doc, saledetailsdata, isIGST, salemasterdata) {
	let sum_SGST_0 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "SGST", 0).toFixed(2);
	let sum_CGST_0 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "CGST", 0).toFixed(2);
	let sum_IGST_0 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "IGST", 0).toFixed(2);

	let sum_SGST_5 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "SGST", 5).toFixed(2);
	let sum_CGST_5 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "CGST", 5).toFixed(2);
	let sum_IGST_5 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "IGST", 5).toFixed(2);

	let sum_SGST_12 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "SGST", 12).toFixed(2);
	let sum_CGST_12 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "CGST", 12).toFixed(2);
	let sum_IGST_12 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "IGST", 12).toFixed(2);

	let sum_SGST_18 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "SGST", 18).toFixed(2);
	let sum_CGST_18 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "CGST", 18).toFixed(2);
	let sum_IGST_18 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "IGST", 18).toFixed(2);

	let sum_SGST_28 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "SGST", 28).toFixed(2);
	let sum_CGST_28 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "CGST", 28).toFixed(2);
	let sum_IGST_28 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "IGST", 28).toFixed(2);

	let GST_0 = +sum_SGST_0 + +sum_CGST_0 + +sum_IGST_0;
	let GST_5 = +sum_SGST_5 + +sum_CGST_5 + +sum_IGST_5;
	let GST_12 = +sum_SGST_12 + +sum_CGST_12 + +sum_IGST_12;
	let GST_18 = +sum_SGST_18 + +sum_CGST_18 + +sum_IGST_18;
	let GST_28 = +sum_SGST_28 + +sum_CGST_28 + +sum_IGST_28;

	let sumDiscountPercent_0 = getSumByDiscountPercent(saledetailsdata, 0).toFixed(2);
	let sumDiscountPercent_5 = getSumByDiscountPercent(saledetailsdata, 5).toFixed(2);
	let sumDiscountPercent_12 = getSumByDiscountPercent(saledetailsdata, 12).toFixed(2);
	let sumDiscountPercent_18 = getSumByDiscountPercent(saledetailsdata, 18).toFixed(2);
	let sumDiscountPercent_28 = getSumByDiscountPercent(saledetailsdata, 28).toFixed(2);

	let sumTaxablePercent_0 = getSumByTaxableByPercent(saledetailsdata, 0).toFixed(2);
	let sumTaxablePercent_5 = getSumByTaxableByPercent(saledetailsdata, 5).toFixed(2);
	let sumTaxablePercent_12 = getSumByTaxableByPercent(saledetailsdata, 12).toFixed(2);
	let sumTaxablePercent_18 = getSumByTaxableByPercent(saledetailsdata, 18).toFixed(2);
	let sumTaxablePercent_28 = getSumByTaxableByPercent(saledetailsdata, 28).toFixed(2);

	let sumTotalPercent_0 = getSumByTotalByPercent(saledetailsdata, 0).toFixed(2);
	let sumTotalPercent_5 = getSumByTotalByPercent(saledetailsdata, 5).toFixed(2);
	let sumTotalPercent_12 = getSumByTotalByPercent(saledetailsdata, 12).toFixed(2);
	let sumTotalPercent_18 = getSumByTotalByPercent(saledetailsdata, 18).toFixed(2);
	let sumTotalPercent_28 = getSumByTotalByPercent(saledetailsdata, 28).toFixed(2);

	let total_0 = +GST_0 + +sumDiscountPercent_0 + +sumTaxablePercent_0 + +sumTotalPercent_0;
	let total_5 = +GST_5 + +sumDiscountPercent_5 + +sumTaxablePercent_5 + +sumTotalPercent_5;
	let total_12 = +GST_12 + +sumDiscountPercent_12 + +sumTaxablePercent_12 + +sumTotalPercent_12;
	let total_18 = +GST_18 + +sumDiscountPercent_18 + +sumTaxablePercent_18 + +sumTotalPercent_18;
	let total_28 = +GST_28 + +sumDiscountPercent_28 + +sumTaxablePercent_28 + +sumTotalPercent_28;

	let subtotalAllTax = +sumTaxablePercent_0 + +sumTaxablePercent_5 + +sumTaxablePercent_12 + +sumTaxablePercent_18 + +sumTaxablePercent_28;
	let discountAllTax = +sumDiscountPercent_0 + +sumDiscountPercent_5 + +sumDiscountPercent_12 + +sumDiscountPercent_18 + +sumDiscountPercent_28;
	let totalAllTax = +sumTotalPercent_0 + +sumTotalPercent_5 + +sumTotalPercent_12 + +sumTotalPercent_18 + +sumTotalPercent_28;
	let SGSTAllTax = +sum_SGST_0 + +sum_SGST_5 + +sum_SGST_12 + +sum_SGST_18 + +sum_SGST_28;
	let CGSTAllTax = +sum_CGST_0 + +sum_CGST_5 + +sum_CGST_12 + +sum_CGST_18 + +sum_CGST_28;
	let IGSTAllTax = +sum_IGST_0 + +sum_IGST_5 + +sum_IGST_12 + +sum_IGST_18 + +sum_IGST_28;

	let finalTotalAllTax = +sumTotalPercent_0 + +sumTotalPercent_5 + +sumTotalPercent_12 + +sumTotalPercent_18 + +sumTotalPercent_28;

	let start = 530;
	generateHr(doc, line_x_start, line_x_end, start);
	doc.font("Helvetica-Bold");
	generateSummaryLeftTableRow(doc, start + 10, "CLASS", "SUB TOTAL", "DISC", "AMOUNT", "SGST", "CGST", "GST", "TOTAL", isIGST, "IGST");
	doc.font("Helvetica");
	generateSummaryLeftTableRow(
		doc,
		start + 25,
		"GST 5%",
		sumTotalPercent_5,
		sumDiscountPercent_5,
		sumTaxablePercent_5,
		sum_SGST_5,
		sum_CGST_5,
		GST_5,
		sumTotalPercent_5,
		isIGST,
		sum_IGST_5,
	);
	generateSummaryLeftTableRow(
		doc,
		start + 40,
		"GST 12%",
		sumTotalPercent_12,
		sumDiscountPercent_12,
		sumTaxablePercent_12,
		sum_SGST_12,
		sum_CGST_12,
		GST_12,
		sumTotalPercent_12,
		isIGST,
		sum_IGST_12,
	);
	generateSummaryLeftTableRow(
		doc,
		start + 55,
		"GST 18%",
		sumTotalPercent_18,
		sumDiscountPercent_18,
		sumTaxablePercent_18,
		sum_SGST_18,
		sum_CGST_18,
		GST_18,
		sumTotalPercent_18,
		isIGST,
		sum_CGST_18,
	);
	generateSummaryLeftTableRow(
		doc,
		start + 70,
		"GST 28%",
		sumTotalPercent_28,
		sumDiscountPercent_28,
		sumTaxablePercent_28,
		sum_SGST_28,
		sum_CGST_28,
		GST_28,
		sumTotalPercent_28,
		isIGST,
		sum_CGST_28,
	);
	generateSummaryLeftTableRow(
		doc,
		start + 85,
		"GST 0%",
		sumTotalPercent_0,
		sumDiscountPercent_0,
		sumTaxablePercent_0,
		sum_SGST_0,
		sum_CGST_0,
		GST_0,
		sumTotalPercent_0,
		isIGST,
		sum_CGST_0,
	);

	generateHr(doc, line_x_start, line_x_end, start + 97);

	doc.font("Helvetica-Bold");
	generateSummaryLeftTableRow(
		doc,
		start + 105,
		"TOTAL",
		totalAllTax,
		discountAllTax,
		subtotalAllTax,

		SGSTAllTax,
		CGSTAllTax,
		SGSTAllTax + CGSTAllTax + IGSTAllTax,
		finalTotalAllTax,
		isIGST,
		IGSTAllTax,
	);
	doc.font("Helvetica");

	generateSummaryRightTableRow(
		doc,
		start + 10,
		totalAllTax,
		discountAllTax,
		SGSTAllTax,
		CGSTAllTax,
		finalTotalAllTax,
		isIGST,
		IGSTAllTax,
		salemasterdata,
	);
	generateHr(doc, line_x_start, line_x_end, start + 120);
	numberToText(doc, finalTotalAllTax, start);
	generateHr(doc, line_x_start, line_x_end, start + 137);
}

function numberToText(doc, finalTotalAllTax, start) {
	doc.font("Helvetica-Bold");
	doc.fontSize(9).text(number2text(finalTotalAllTax), 24, start + 125, {
		align: "left",
	});
	doc.font("Helvetica");
}

function generateFooter(doc) {
	doc.fontSize(10).text("Payment is due within 15 days. Thank you for your business.", 50, 780, {
		align: "center",
		width: 500,
	});
}

function generateToBlock(doc, customerdata) {
	doc.fontSize(11).text("To", 50, 350);
}

function generateFooterSummary(doc, centerdata) {
	let start = 675;

	doc
		.fontSize(8)
		.text("Terms & Conditions:", 24, start)
		.text("Goods once sold will not be taken back or exchanged.", { lineGap: 1.8 })
		.text("Bills not paid due date will attract 24% interest.", { lineGap: 1.8 })
		.text("All disputes subject to Jurisdication only.", { lineGap: 1.8 })
		.text("Prescribed Sales Tax declaration will be given.", { lineGap: 1.8 });

	doc
		.strokeColor("#aaaaaa")
		.lineWidth(1)
		.moveTo(24, start + 54)
		.lineTo(280, start + 54)
		.stroke();

	doc
		.fontSize(8)
		.text("Certified that the particulars given above are true and correct", 24, start + 60, { lineGap: 1.8 })
		.text("and the amount indicated represents the price actually charged.", 24, start + 70, { lineGap: 1.8 });

	doc
		.fontSize(8)
		.font("Helvetica-Bold")
		.text("OUR BANK        : KARUR VYSYA BANK", 320, start, { lineGap: 1.8 })
		.text("A/C NAME          : 1121135000015560", 320, start + 10, { lineGap: 1.8 })
		.text("A/C NO               : IFSC -KVBL0001121,", 320, start + 20, { lineGap: 1.8 });
	doc.font("Times-BoldItalic");
	doc.fontSize(6).text("Plz pay Cash/Cheque/DD in favour of 'THE THIRUMURUGAN TRACTOR SPARES'.", 320, start + 35, { lineGap: 1.8 });

	doc.fontSize(7).text("For    " + centerdata.name, 330, start + 50);
	doc.fontSize(7).text("Authorised signatory", 400, start + 70);

	//	doc.fontSize(8).text("Checked By    " + centerdata.name, 350, 680);
	//	doc.fontSize(8).text("  E.&O.E.", 350, 700);

	// doc.fontSize(8).text("Prepared by:", 50, 800).text("Packed by:", 150, 800).text("Checked by:", 250, 800).text("Authorised signatory:", 350, 800);
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
	igst,
) {
	logger.debug.debug("sang " + igst);
	// Si.No Id
	if (idx === "SNo") {
		doc.fontSize(8).text(idx, x_start, y, { width: 29, align: "center" });
	} else {
		doc.fontSize(8).text(idx, x_start, y, { width: 29, align: "center" });
	}

	// if headeing PCODE ignore else details (DESC + CODE) 30th is vertical line
	if (product_code === "PCODE") {
		doc.text(product_description, x_start + 31, y, { width: 170, align: "left" });
	}

	if (product_code !== "PCODE") {
		doc.text(product_code, x_start + 31, y, { width: 149, align: "left" });
		doc.text(product_description, x_start + 31, y + 10, { width: 149, align: "left", ellipsis: true });
	}

	// HSNCode
	doc.text(hsn, x_start + 31 + 149, y, { width: 40, align: "center" });

	if (qty === " QTY ") {
		doc.text(qty, x_start + 31 + 149 + 42, y, { width: 29, align: "center" });
	} else {
		doc.text(qty, x_start + 31 + 149 + 42, y, { width: 25, align: "right" });
	}

	if (uom === "UOM") {
		doc.text(uom, x_start + 29 + 150 + 42 + 29, y, { width: 29, align: "center" });
	} else {
		doc.text(uom, x_start + 29 + 150 + 42 + 29, y, { width: 25, align: "right" });
	}

	if (mrp === "MRP") {
		doc.text(mrp, x_start + 29 + 150 + 42 + 29 + 29, y, { width: 50, align: "center" });
	} else {
		doc.text(mrp, x_start + 29 + 150 + 42 + 29 + 29, y, { width: 45, align: "right" });
	}

	if (disc_percent === "DIS%") {
		doc.text(disc_percent, x_start + 29 + 150 + 42 + 29 + 29 + 50, y, { width: 29, align: "center" });
	} else {
		doc.text(disc_percent, x_start + 29 + 150 + 42 + 29 + 29 + 50, y, { width: 24, align: "right" });
	}

	doc.text(amount, x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29, y, { width: 45, align: "right" });

	if (sgst === "SGST" && !isIGST) {
		doc.text(sgst, x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50, y, { width: 29, align: "center" });
	} else if (!isIGST) {
		doc.text(sgst, x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50, y, { width: 25, align: "right" });
	}

	if (cgst === "CGST" && !isIGST) {
		doc.text(cgst, x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50 + 29, y, { width: 29, align: "center" });
	} else if (!isIGST) {
		doc.text(cgst, x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50 + 29, y, { width: 25, align: "right" });
	}

	if (igst === "IGST" && isIGST) {
		doc.text(igst, x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50, y, { width: 58, align: "center" });
	} else if (isIGST) {
		doc.text(igst, x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50, y, { width: 50, align: "center" });
	}

	doc.text(net_amount, x_start + 29 + 150 + 42 + 29 + 29 + 50 + 29 + 50 + 29 + 29, y, { width: 60, align: "right" });
}

function generateSummaryLeftTableRow(doc, y, classhead, subtotal, disc, amount, sgst, cgst, gst, total, isIGST, igst) {
	doc.fontSize(9).text(classhead, 24, y, { width: 40, align: "left" });
	if (subtotal === "SUB TOTAL") {
		doc.text(subtotal, 64, y, { width: 50, align: "right" });
	} else {
		doc.text((+subtotal).toFixed(2), 64, y, { width: 50, align: "right" });
	}

	if (disc === "DISC") {
		doc.text(disc, 113, y, { width: 49, align: "right" });
	} else {
		doc.text((+disc).toFixed(2), 113, y, { width: 49, align: "right" });
	}
	if (amount === "AMOUNT") {
		doc.text(amount, 169, y, { width: 49, align: "right" });
	} else {
		doc.text((+amount).toFixed(2), 169, y, { width: 49, align: "right" });
	}

	if (!isIGST) {
		if (sgst === "SGST") {
			doc.text(sgst, 225, y, { width: 49, align: "right" });
		} else {
			doc.text((+sgst).toFixed(2), 225, y, { width: 49, align: "right" });
		}

		if (cgst === "CGST") {
			doc.text(cgst, 281, y, { width: 49, align: "right" });
		} else {
			doc.text((+cgst).toFixed(2), 281, y, { width: 49, align: "right" });
		}

		if (gst === "GST") {
			doc.text(gst, 337, y, { width: 49, align: "right" });
		} else {
			doc.text((+gst).toFixed(2), 337, y, { width: 49, align: "right" });
		}
		if (total === "TOTAL") {
			doc.text(total, 393, y, { width: 49, align: "right" });
		} else {
			doc.text((+total).toFixed(2), 393, y, { width: 49, align: "right" });
		}
	} else if (isIGST) {
		if (igst === "IGST") {
			doc.text(igst, 225, y, { width: 39, align: "right" });
		} else {
			doc.text((+igst).toFixed(2), 225, y, { width: 39, align: "right" });
		}

		if (gst === "GST") {
			doc.text(gst, 281, y, { width: 49, align: "right" });
		} else {
			doc.text((+gst).toFixed(2), 281, y, { width: 49, align: "right" });
		}

		if (total === "TOTAL") {
			doc.text(total, 337, y, { width: 49, align: "right" });
		} else {
			doc.text((+total).toFixed(2), 337, y, { width: 49, align: "right" });
		}
	}
}

function generateSummaryRightTableRow(doc, y, subtotal, discount, sgst, cgst, finalTotalAllTax, isIGST, igst, salemasterdata) {
	logger.debug.debug("dineh " + JSON.stringify(salemasterdata));
	doc
		.fontSize(9)
		.font("Helvetica-Bold")
		.text("SUB TOTAL", 460, y, { width: 70, align: "left" })
		.font("Helvetica")
		.text((+subtotal).toFixed(2), 510, y, { width: 70, align: "right" })

		.text("DISCOUNT", 460, y + 15, { width: 70, align: "left" })

		.text((+discount).toFixed(2), 510, y + 15, { width: 70, align: "right" });

	if (!isIGST) {
		doc
			.text("SGST", 460, y + 30, { width: 70, align: "left" })

			.text((+sgst).toFixed(2), 510, y + 30, { width: 70, align: "right" })

			.text("CGST", 460, y + 45, { width: 70, align: "left" })

			.text((+cgst).toFixed(2), 510, y + 45, { width: 70, align: "right" });
	} else if (isIGST) {
		doc
			.text("IGST", 460, y + 30, { width: 70, align: "left" })

			.text((+igst).toFixed(2), 510, y + 30, { width: 70, align: "right" });
	}

	doc
		.text("Cr/Dr NOTE", 460, y + 60, { width: 70, align: "left" })

		.text(0.0, 510, y + 60, { width: 70, align: "right" })

		.text("Misc.", 460, y + 75, { width: 70, align: "left" })

		.text((+(+salemasterdata.transport_charges + +salemasterdata.unloading_charges + +salemasterdata.misc_charges)).toFixed(2), 510, y + 75, {
			width: 70,
			align: "right",
		})
		.font("Helvetica-Bold")
		.text("TOTAL", 460, y + 95, { width: 70, align: "left" })

		.text(
			(+(+finalTotalAllTax + +salemasterdata.transport_charges + +salemasterdata.unloading_charges + +salemasterdata.misc_charges)).toFixed(2),
			510,
			y + 95,
			{
				width: 70,
				align: "right",
			},
		)
		.font("Helvetica");
}

function generateHr(doc, line_x_start, line_x_end, y) {
	doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(line_x_start, y).lineTo(line_x_end, y).stroke();
}

function formatCurrency(cents) {
	return "$" + (cents / 100).toFixed(2);
}

function formatDate(date) {
	const day = date.getDate();
	const month = date.getMonth() + 1;
	const year = date.getFullYear();

	return year + "/" + month + "/" + day;
}

function getSumByTaxtypeAndTaxPercent(dataArr, tax_type, tax_percent) {
	return dataArr
		.filter((arr) => {
			if (tax_type === "IGST") {
				return arr.igst === tax_percent;
			} else if (tax_type === "CGST") {
				return arr.cgst === tax_percent / 2;
			} else if (tax_type === "SGST") {
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

module.exports = {
	createInvoice,
};

// Array.from(Array(120)).forEach(function (k, idx) {
