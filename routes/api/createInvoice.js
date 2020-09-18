const fs = require("fs");

// require dependencies
const PDFDocument = require("pdfkit");
const blobStream = require("blob-stream");

function createInvoice(saleMaster, saleDetails, customerDetails, centerDetails, invoice, path, res) {
	let centerdata = centerDetails[0];
	let customerdata = customerDetails[0];
	let salemasterdata = saleMaster[0];
	let saledetailsdata = saleDetails;

	//	let doc = new PDFDocument({ size: "A4", margin: 20 });

	let doc = new PDFDocument({
		size: "A4",
		margin: 36,
		layout: "portrait", // can be 'landscape'
	});

	// drawPageMarginLine(doc);

	generateHeader(doc, centerdata);
	generateCustomerInformation(doc, invoice);
	generateInvoiceTable(doc, invoice, saledetailsdata);
	generateFooter(doc);

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
	doc
		.image("tractor.png", 42, 42, { width: 80 })
		.fillColor("blue")

		.fontSize(14)
		.text(centerdata.name, 50, 42, { align: "center", lineGap: 1.4 })
		.fontSize(9)
		// .text(centerdata.tagline, 52, 60, { align: "center", lineGap: 1.4 })
		.text(centerdata.tagline, 52, 60, { align: "center", lineGap: 1.8 })
		.text(centerdata.address1 + "," + centerdata.address2, { align: "center", lineGap: 1.8 })
		//	.text(centerdata.address2, { align: "center", lineGap: 1.4 })
		.text(centerdata.district + "-" + centerdata.pin, { align: "center", lineGap: 1.4 })

		.text(centerdata.gst, { align: "center", lineGap: 1.4 })
		.text(centerdata.email, { align: "center", lineGap: 1.4 })
		.text(centerdata.phone, 430, 90)
		.text(centerdata.mobile, 500, 90)
		.image("swaraj.png", 472, 42, { width: 80 })

		.moveDown();
}

function generateCustomerInformation(doc, invoice) {
	doc.fillColor("#444444").fontSize(20).text("Invoice", 50, 160);

	generateHr(doc, 130);

	const customerInformationTop = 200;

	doc
		.fontSize(10)
		.text("Invoice Number:", 50, customerInformationTop)
		.font("Helvetica-Bold")
		.text(invoice.invoice_nr, 150, customerInformationTop)
		.font("Helvetica")
		.text("Invoice Date:", 50, customerInformationTop + 15)
		.text(formatDate(new Date()), 150, customerInformationTop + 15)
		.text("Balance Due:", 50, customerInformationTop + 30)
		.text(formatCurrency(invoice.subtotal - invoice.paid), 150, customerInformationTop + 30)

		.font("Helvetica-Bold")
		.text(invoice.shipping.name, 300, customerInformationTop)
		.font("Helvetica")
		.text(invoice.shipping.address, 300, customerInformationTop + 15)
		.text(invoice.shipping.city + ", " + invoice.shipping.state + ", " + invoice.shipping.country, 300, customerInformationTop + 30)
		.moveDown();

	generateHr(doc, 252);
}

function generateInvoiceTable(doc, invoice, saledetailsdata) {
	let i;
	let invoiceTableTop = 290;

	//doc.font("Helvetica-Bold");
	generateTableRow(
		doc,
		invoiceTableTop,
		"SNo",
		"PRODUCT NAME",
		"PCODE",
		"HSN",
		"QTY",
		"UOM",
		"UNIT RATE",
		"DIS %",
		"AMOUNT",
		"SGST",
		"CGST",
		"NET AMOUNT",
	);

	generateHr(doc, invoiceTableTop + 20);

	doc
		.strokeColor("#aaaaaa")
		.moveTo(33, 280)
		.lineWidth(1)
		.lineTo(33, 620) // this is the end point the line

		.stroke();

	saledetailsdata.forEach(function (k, idx) {
		invoiceTableTop = invoiceTableTop + 44;

		console.log("object >> " + JSON.stringify(k));

		generateTableRow(
			doc,
			invoiceTableTop,
			idx + 1,
			k.description,
			k.product_code,
			k.hsncode,
			k.qty,
			k.mrp,
			k.disc_percent,
			k.total_value,
			k.sgst,
			k.cgst,
			k.total_value,
		);

		//		generateHr(doc, positionY + 20);

		if (invoiceTableTop > 700) {
			invoiceTableTop = 60;
			//	positionY = 80;
			doc.addPage({
				margin: 36,
			});
		}
	});

	generateSummaryLeft(doc, saledetailsdata);
}

function generateSummaryLeft(doc, saledetailsdata) {
	let sum_SGST_0 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "SGST", 0);
	let sum_CGST_0 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "CGST", 0);
	let sum_IGST_0 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "IGST", 0);

	let sum_SGST_5 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "SGST", 5);
	let sum_CGST_5 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "CGST", 5);
	let sum_IGST_5 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "IGST", 5);

	let sum_SGST_12 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "SGST", 12);
	let sum_CGST_12 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "CGST", 12);
	let sum_IGST_12 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "IGST", 12);

	let sum_SGST_18 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "SGST", 18);
	let sum_CGST_18 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "CGST", 18);
	let sum_IGST_18 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "IGST", 18);

	let sum_SGST_28 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "SGST", 28);
	let sum_CGST_28 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "CGST", 28);
	let sum_IGST_28 = getSumByTaxtypeAndTaxPercent(saledetailsdata, "IGST", 28);

	let GST_0 = sum_SGST_0 + sum_SGST_0 + sum_SGST_0;
	let GST_5 = sum_SGST_5 + sum_SGST_5 + sum_SGST_5;
	let GST_12 = sum_SGST_12 + sum_SGST_12 + sum_SGST_12;
	let GST_18 = sum_SGST_18 + sum_SGST_18 + sum_SGST_18;
	let GST_28 = sum_SGST_28 + sum_SGST_28 + sum_SGST_28;

	let sumDiscountPercent_0 = getSumByDiscountPercent(saledetailsdata, 0);
	let sumDiscountPercent_5 = getSumByDiscountPercent(saledetailsdata, 5);
	let sumDiscountPercent_12 = getSumByDiscountPercent(saledetailsdata, 12);
	let sumDiscountPercent_18 = getSumByDiscountPercent(saledetailsdata, 18);
	let sumDiscountPercent_28 = getSumByDiscountPercent(saledetailsdata, 28);

	let sumTaxablePercent_0 = getSumByTaxableByPercent(saledetailsdata, 0);
	let sumTaxablePercent_5 = getSumByTaxableByPercent(saledetailsdata, 5);
	let sumTaxablePercent_12 = getSumByTaxableByPercent(saledetailsdata, 12);
	let sumTaxablePercent_18 = getSumByTaxableByPercent(saledetailsdata, 18);
	let sumTaxablePercent_28 = getSumByTaxableByPercent(saledetailsdata, 28);

	let sumTotalPercent_0 = getSumByTotalByPercent(saledetailsdata, 0);
	let sumTotalPercent_5 = getSumByTotalByPercent(saledetailsdata, 5);
	let sumTotalPercent_12 = getSumByTotalByPercent(saledetailsdata, 12);
	let sumTotalPercent_18 = getSumByTotalByPercent(saledetailsdata, 18);
	let sumTotalPercent_28 = getSumByTotalByPercent(saledetailsdata, 28);

	console.log("will it print " + sumTotalPercent_12);
	console.log("will it sumTotalPercent_18 >> " + sumTotalPercent_18);
	console.log("will it print " + sumTotalPercent_28);

	console.log("will it print " + sumTaxablePercent_12);
	console.log("will it sumTaxablePercent_18 >> " + sumTaxablePercent_18);
	console.log("will it print " + sumTaxablePercent_28);

	let total_0 = GST_0 + sumDiscountPercent_0 + sumTaxablePercent_0 + sumTotalPercent_0;
	let total_5 = GST_5 + sumDiscountPercent_5 + sumTaxablePercent_5 + sumTotalPercent_5;
	let total_12 = GST_12 + sumDiscountPercent_12 + sumTaxablePercent_12 + sumTotalPercent_12;
	let total_18 = GST_18 + sumDiscountPercent_18 + sumTaxablePercent_18 + sumTotalPercent_18;
	let total_28 = GST_28 + sumDiscountPercent_28 + sumTaxablePercent_28 + sumTotalPercent_28;

	let subtotalAllTax = sumTaxablePercent_0 + sumTaxablePercent_5 + sumTaxablePercent_12 + sumTaxablePercent_18 + sumTaxablePercent_28;
	let discountAllTax = sumDiscountPercent_0 + sumDiscountPercent_5 + sumDiscountPercent_12 + sumDiscountPercent_18 + sumDiscountPercent_28;
	let totalAllTax = sumTotalPercent_0 + sumTotalPercent_5 + sumTotalPercent_12 + sumTotalPercent_18 + sumTotalPercent_28;
	let SGSTAllTax = sum_SGST_0 + sum_SGST_5 + sum_SGST_12 + sum_SGST_18 + sum_SGST_28;
	let CGSTAllTax = sum_CGST_0 + sum_CGST_5 + sum_CGST_12 + sum_CGST_18 + sum_CGST_28;
	let IGSTAllTax = sum_IGST_0 + sum_IGST_5 + sum_IGST_12 + sum_IGST_18 + sum_IGST_28;

	let finalTotalAllTax = total_0 + total_5 + total_12 + total_18 + total_28;

	generateSummaryLeftTableRow(doc, 300, "class", "subtotal", "disc", "amount", "sgst", "cgst", "gst", "total");
}

function generateFooter(doc) {
	doc.fontSize(10).text("Payment is due within 15 days. Thank you for your business.", 50, 780, {
		align: "center",
		width: 500,
	});
}

function generateTableRow(doc, y, idx, product_description, product_code, hsn, qty, uom, mrp, disc_percent, amount, sgst, cgst, net_amount) {
	console.log("position Y " + y);

	doc
		.moveTo(42, 250)
		.fontSize(10)
		.text(idx, 0, y, { width: 36, align: "center" })
		.text(product_description, 36, y, { width: 144, align: "left" })
		.text(product_code, 180, y, { width: 50, align: "center" })
		.text(hsn, 230, y, { width: 36, align: "center" })
		.text(qty, 266, y, { width: 36, align: "center" })
		.text(uom, 296, y, { width: 30, align: "center" })
		.text(mrp, 326, y, { width: 30, align: "center" })
		.text(disc_percent, 360, y, { width: 20, align: "center" })
		.text(amount, 380, y, { width: 50, align: "center" })
		.text(sgst, 430, y, { width: 30, align: "center" })
		.text(cgst, 460, y, { width: 30, align: "center" })
		.text(net_amount, 490, y, { width: 60, align: "center" });
}

function generateSummaryLeftTableRow(doc, y, classhead, subtotal, disc, amount, sgst, cgst, gst, total) {
	doc
		.moveTo(42, 300)
		.fontSize(10)
		.text(classhead, 0, y, { width: 36, align: "center" })
		.text(subtotal, 36, y, { width: 144, align: "left" })
		.text(disc, 180, y, { width: 50, align: "center" })
		.text(amount, 230, y, { width: 36, align: "center" })
		.text(sgst, 266, y, { width: 36, align: "center" })
		.text(cgst, 296, y, { width: 30, align: "center" })
		.text(gst, 326, y, { width: 30, align: "center" })
		.text(total, 360, y, { width: 20, align: "center" });
}

function generateHr(doc, y) {
	doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(42, y).lineTo(550, y).stroke();
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
			return (a + c.disc_value).toFixed(2);
		}, 0);
}

function getSumByTaxableByPercent(dataArr, tax_percent) {
	return dataArr
		.filter((arr) => arr.tax === tax_percent)
		.reduce((a, c) => {
			return (a + c.taxable_value).toFixed(2);
		}, 0);
}

function getSumByTotalByPercent(dataArr, tax_percent) {
	return dataArr
		.filter((arr) => arr.tax === tax_percent)
		.reduce((a, c) => {
			return (a + c.total_value).toFixed(2);
		}, 0);
}

module.exports = {
	createInvoice,
};

// Array.from(Array(120)).forEach(function (k, idx) {
