const fs = require("fs");

// require dependencies
const PDFDocument = require("pdfkit");
const blobStream = require("blob-stream");

function createInvoice(saleMaster, saleDetails, customerDetails, centerDetails, invoice, path, res) {
	// console.log("salemasterdata " + JSON.stringify(saleMaster));
	// console.log("saledetailsdata  " + JSON.stringify(saleDetails));

	// console.log("customerdata " + JSON.stringify(customerDetails));
	// console.log("centerdata " + JSON.stringify(centerDetails));

	let centerdata = centerDetails[0];
	let customerdata = customerDetails[0];
	let salemasterdata = saleMaster[0];
	let saledetailsdata = saleDetails;

	let doc = new PDFDocument({ size: "A4", margin: 20 });

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
		.image("tractor.png", 20, 25, { width: 80 })
		.fillColor("#444444")

		.fontSize(14)
		.text(centerdata.name, { align: "center", lineGap: 1.4 })
		.fontSize(10)
		.text(centerdata.tagline, { align: "center", lineGap: 1.4 })
		.text(centerdata.address1, { align: "center", lineGap: 1.4 })
		.text(centerdata.address2, { align: "center", lineGap: 1.4 })
		.text(centerdata.district + "-" + centerdata.pin, { align: "center", lineGap: 1.4 })

		.text(centerdata.gst, { align: "center", lineGap: 1.4 })
		.text(centerdata.email, { align: "center", lineGap: 1.4 })
		.text(centerdata.phone, 430, 90)
		.text(centerdata.mobile, 500, 90)
		.image("swaraj.png", 480, 35, { width: 80 })

		.moveDown();
}

function generateCustomerInformation(doc, invoice) {
	doc.fillColor("#444444").fontSize(20).text("Invoice", 50, 160);

	generateHr(doc, 185);

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

	doc.font("Helvetica-Bold");
	generateTableRow(doc, invoiceTableTop, "SNo", "Item", "Description", "Unit Cost", "Quantity", "Line Total");
	generateHr(doc, invoiceTableTop + 20);
	doc.font("Helvetica");

	// Array.from(Array(120)).forEach(function (k, idx) {
	saledetailsdata.forEach(function (k, idx) {
		invoiceTableTop = invoiceTableTop + 44;

		console.log("object >> " + JSON.stringify(k));
		// generateTableRow(doc, position, k.description, k.product_code, k.qty, k.qty, k.qty);

		generateTableRow(doc, invoiceTableTop, idx + 1, k.product_code, k.description, k.qty, k.qty, k.qty);

		//		generateHr(doc, positionY + 20);

		if (invoiceTableTop > 700) {
			invoiceTableTop = 60;
			//	positionY = 80;
			doc.addPage();
		}

		// console.log("position Y " + positionY);
		// console.log("invoiceTableTop Y " + invoiceTableTop);
	});

	// for (i = 0; i < invoice.items.length; i++) {
	// 	const item = invoice.items[i];
	// 	const position = invoiceTableTop + (i + 1) * 30;
	// 	generateTableRow(
	// 		doc,
	// 		position,
	// 		item.item,
	// 		item.description,
	// 		formatCurrency(item.amount / item.quantity),
	// 		item.quantity,
	// 		formatCurrency(item.amount),
	// 	);

	// 	generateHr(doc, position + 20);
	// }

	// const subtotalPosition = invoiceTableTop + (i + 1) * 30;
	// generateTableRow(doc, subtotalPosition, "", "", "Subtotal", "", formatCurrency(invoice.subtotal));

	// const paidToDatePosition = subtotalPosition + 20;
	// generateTableRow(doc, paidToDatePosition, "", "", "Paid To Date", "", formatCurrency(invoice.paid));

	// const duePosition = paidToDatePosition + 25;
	// doc.font("Helvetica-Bold");
	// generateTableRow(doc, duePosition, "", "", "Balance Due", "", formatCurrency(invoice.subtotal - invoice.paid));
	// doc.font("Helvetica");
}

function generateFooter(doc) {
	doc.fontSize(10).text("Payment is due within 15 days. Thank you for your business.", 50, 780, {
		align: "center",
		width: 500,
	});
}

function generateTableRow(doc, y, idx, item, description, unitCost, quantity, lineTotal) {
	console.log("position Y " + y);

	doc
		.fontSize(10)
		.text(idx, 20, y, { width: 100, align: "left" })
		.text(item, 50, y, { width: 100, align: "left" })
		.text(description, 150, y, { width: 200, align: "left" })
		.text(unitCost, 240, y, { width: 90, align: "right" })
		.text(quantity, 330, y, { width: 90, align: "right" })
		.text(lineTotal, 420, y, { width: 90, align: "right" });
}

function generateHr(doc, y) {
	doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(20, y).lineTo(550, y).stroke();
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

module.exports = {
	createInvoice,
};
