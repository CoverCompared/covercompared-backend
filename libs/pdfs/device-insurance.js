var PdfPrinter = require("pdfmake");
var fs = require('fs');
const uuid = require("uuid");
var path = require('path');

const deviceInsurance = () => {
    var docDefinition = {
        pageMargins: [25, 35, 25, 35],
        content: [
            {
                fontSize: 9,
                layout: 'headerLineOnly',
                table: {
                    headerRows: 1,
                    widths: [147, 111, 267],
                    body: [
                        [
                            {
                                image: path.join(__dirname, 'cover-compared.png'),
                                // height*2.94
                                height: 50, width: 147,
                                alignment: "left"
                            },
                            {
                                image: path.join(__dirname, 'p4l.png'),
                                // height*5.55
                                height: 20, width: 111,
                                alignment: "left", marginTop: 22
                            },
                            {
                                marginTop: 28, text: "Date: 21-12-2021", alignment: "right", fontSize: 11,
                            },
                        ],
                    ]
                }
            },
            {
                fontSize: 9,
                marginTop: 15,
                columns: [
                    {
                        width: '50%',
                        layout: 'headerLineOnly',
                        table: {
                            widths: ["auto", "*"],
                            alignment: "left",
                            body: [
                                ["", ""],
                                [{ text: "Device Insurance", colSpan: 2, fontSize: 11, bold: true }],
                                ["Policy ID : ", "DEVICE-1160359"],
                                ["First Name : ", "Romik"],
                                ["Last Name : ", "Makavana"],
                                ["Phone : ", "9913357614"],
                                ["Email : ", "makavanaromik1214@gmail.com"]
                            ]
                        }
                    },
                    {
                        width: '50%',
                        layout: 'headerLineOnly',
                        table: {
                            widths: ["auto", "*"],
                            alignment: "left",
                            body: [
                                ["", ""],
                                [{ text: "Device Details", colSpan: 2, fontSize: 11, bold: true }],
                                ["Device Type", { text: "Mobile Phone", alignment: "right" }],
                                ["Device Brand", { text: "ACER", alignment: "right" }],
                                ["Device Value", { text: "Below USD 300 USD", alignment: "right" }],
                                ["Purchase Month", { text: "Less than 12 months", alignment: "right" }],
                                ["Device Model", { text: "Iconia Talk S, 2GB RAM, 32GB STORAGE", alignment: "right" }],
                            ]
                        }
                    },
                ],
            },
            {
                fontSize: 9,
                marginTop: 50,
                columns: [
                    { width: "50%", text: "" },
                    {
                        width: '50%',
                        layout: { defaultBorder: false, },
                        table: {
                            widths: ["auto", "*"],
                            alignment: "left",
                            body: [
                                ["", ""],
                                [{ text: "Payment Details", colSpan: 2, fontSize: 11, bold: true }],
                                ["Premium", { text: "30.38 USD", alignment: "right" }],
                                ["Discount", { text: "30.38 USD", alignment: "right" }],
                                [{ text: "Tax", border: [false, false, false, true] }, { text: "30.38 USD", alignment: "right", border: [false, false, false, true] }],
                                [{ text: "Total", fontSize: 12, bold: true }, { text: "30.38 USD", alignment: "right", fontSize: 12, bold: true }],
                            ]
                        }
                    },
                ]
            }
        ]
    };

    var fonts = {
        Roboto: {
            normal: `${__dirname}/fonts/Roboto/Roboto-Regular.ttf`,
            bold: `${__dirname}/fonts/Roboto/Roboto-Medium.ttf`,
            italics: `${__dirname}/fonts/Roboto/Roboto-Italic.ttf`,
            bolditalics: `${__dirname}/fonts/Roboto/Roboto-MediumItalic.ttf`
        }
    };


    var printer = new PdfPrinter(fonts);
    var pdfDoc = printer.createPdfKitDocument(docDefinition);
    const pdfFileName = `test.pdf`;
    // const pdfFileName = `${uuid.v4()}.pdf`;
    const pdfPath = `${__dirname}/../../uploads/receipts/${pdfFileName}`;
    pdfDoc.pipe(fs.createWriteStream(pdfPath));
    pdfDoc.end();
}

module.exports = deviceInsurance;