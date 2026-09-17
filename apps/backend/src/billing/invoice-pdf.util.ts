import PDFDocument from 'pdfkit';

/**
 * Genera un PDF de factura básico. El diseño de marca (logo, colores) se
 * conecta al módulo Settings en la Fase 12 (branding configurable, punto 45).
 */
export function generateInvoicePdf(invoice: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Factura', { align: 'right' });
    doc.fontSize(10).fillColor('#555').text(invoice.number, { align: 'right' });
    doc.moveDown(2);

    doc.fillColor('#000').fontSize(12).text(`Cliente: ${invoice.customer.firstName} ${invoice.customer.lastName}`);
    if (invoice.customer.documentId) doc.text(`Documento: ${invoice.customer.documentId}`);
    if (invoice.customer.address) doc.text(`Dirección: ${invoice.customer.address}`);
    doc.moveDown();

    doc.text(`Fecha de emisión: ${new Date(invoice.issuedAt).toLocaleDateString('es-DO')}`);
    doc.text(`Fecha de vencimiento: ${new Date(invoice.dueDate).toLocaleDateString('es-DO')}`);
    doc.text(`Estado: ${invoice.status}`);
    doc.moveDown();

    const total = Number(invoice.amount) - Number(invoice.discount) + Number(invoice.surcharge);
    doc.fontSize(11).text(`Subtotal: ${invoice.currency} ${Number(invoice.amount).toFixed(2)}`);
    if (Number(invoice.discount) > 0) doc.text(`Descuento: -${invoice.currency} ${Number(invoice.discount).toFixed(2)}`);
    if (Number(invoice.surcharge) > 0) doc.text(`Recargo: +${invoice.currency} ${Number(invoice.surcharge).toFixed(2)}`);
    doc.fontSize(14).text(`Total: ${invoice.currency} ${total.toFixed(2)}`, { underline: true });

    if (invoice.payments?.length) {
      doc.moveDown().fontSize(12).text('Pagos registrados:');
      invoice.payments.forEach((p: any) => {
        doc.fontSize(10).text(`  • ${new Date(p.paidAt).toLocaleDateString('es-DO')} — ${invoice.currency} ${Number(p.amount).toFixed(2)} (${p.method})`);
      });
    }

    if (invoice.notes) {
      doc.moveDown().fontSize(9).fillColor('#555').text(invoice.notes);
    }

    doc.end();
  });
}
