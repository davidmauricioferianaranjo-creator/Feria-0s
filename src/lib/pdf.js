// Utilidad ligera para generar PDFs simples sin dependencias externas.
// Mantiene el flujo descargable en PDF mientras el backend genera documentos definitivos.
function cleanPdfText(value = '') {
  return String(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\u0020-\u007E]/g, (char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 ? char : ' ';
    })
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapLine(line, max = 86) {
  const words = cleanPdfText(line).split(/\s+/);
  const lines = [];
  let current = '';
  words.forEach(word => {
    if (!word) return;
    const next = current ? current + ' ' + word : word;
    if (next.length > max) { if (current) lines.push(current); current = word; }
    else current = next;
  });
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

export function downloadSimplePdf({ filename = 'documento.pdf', title = 'Documento', subtitle = 'Feria Design Studio', lines = [] }) {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 54;
  const startY = 780;
  const lineHeight = 14;
  const safeLines = [title, subtitle, '', ...lines].flatMap(line => wrapLine(line, 78));
  const pages = [];
  let current = [];
  let y = startY;
  safeLines.forEach(line => {
    if (y < 60) { pages.push(current); current = []; y = startY; }
    current.push({ text: line, y });
    y -= lineHeight;
  });
  if (current.length) pages.push(current);

  const objects = [];
  function add(obj) { objects.push(obj); return objects.length; }
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];
  pages.forEach(page => {
    const streamLines = [
      'BT',
      '/F1 11 Tf',
      '14 TL',
      `${marginX} ${startY} Td`,
    ];
    page.forEach((line, idx) => {
      const fontSize = idx === 0 && line.text === title ? 18 : idx === 1 && line.text === subtitle ? 10 : 11;
      if (idx === 0 || idx === 1) streamLines.push(`/F1 ${fontSize} Tf`);
      streamLines.push(`${marginX} ${line.y} Td`);
      streamLines.push(`(${cleanPdfText(line.text)}) Tj`);
      streamLines.push(`-${marginX} -${line.y} Td`);
      if (idx === 1) streamLines.push('/F1 11 Tf');
    });
    streamLines.push('ET');
    const stream = streamLines.join('\n');
    const contentId = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });
  const pagesId = add(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  // Corregir parent de cada página ahora que conocemos pagesId.
  pageIds.forEach(id => { objects[id - 1] = objects[id - 1].replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`); });

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(off => { pdf += String(off).padStart(10, '0') + ' 00000 n \n'; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
