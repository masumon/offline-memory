// Shared PDF layout engine for the bundled in-app documents (AI-engine guide,
// privacy & terms). Content is a flat list of typed blocks; this renders them to
// an A4 PDF with pdf-lib's standard fonts. Dev-only.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const EMERALD = rgb(0.043, 0.478, 0.333); // #0B7A55
export const INK = rgb(0.09, 0.11, 0.10);
export const MUTED = rgb(0.36, 0.40, 0.37);
export const CODE_BG = rgb(0.94, 0.95, 0.93);
export const RULE = rgb(0.85, 0.87, 0.84);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const MAX_W = PAGE_W - MARGIN * 2;

function wrap(text, font, size, maxW) {
  const out = [];
  for (const rawLine of String(text).split('\n')) {
    let line = '';
    for (const word of rawLine.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxW && line) {
        out.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    out.push(line);
  }
  return out;
}

/**
 * blocks: array of { type, text, muted? }
 *   h1 | h2 | h3 | p | li | code | rule | space
 * meta: { title, author }
 * footer: string
 * Returns a Uint8Array (PDF bytes).
 */
export async function renderDoc(blocks, { title, author = 'Offline Memory', footer } = {}) {
  const doc = await PDFDocument.create();
  if (title) doc.setTitle(title);
  doc.setAuthor(author);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensure = (space) => {
    if (y - space < MARGIN + 24) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const draw = (text, { f = font, size = 10.5, color = INK, gap = 5, indent = 0 } = {}) => {
    const lh = size * 1.45;
    for (const line of wrap(text, f, size, MAX_W - indent)) {
      ensure(lh);
      page.drawText(line, { x: MARGIN + indent, y: y - size, size, font: f, color });
      y -= lh;
    }
    y -= gap;
  };

  for (const block of blocks) {
    if (block.type === 'h1') {
      ensure(36);
      page.drawText(block.text, { x: MARGIN, y: y - 22, size: 22, font: bold, color: EMERALD });
      y -= 36;
    } else if (block.type === 'h2') {
      y -= 8;
      ensure(24);
      page.drawText(block.text, { x: MARGIN, y: y - 14, size: 13.5, font: bold, color: INK });
      y -= 22;
    } else if (block.type === 'h3') {
      y -= 4;
      ensure(18);
      page.drawText(block.text, { x: MARGIN, y: y - 11, size: 11, font: bold, color: MUTED });
      y -= 17;
    } else if (block.type === 'p') {
      draw(block.text, { color: block.muted ? MUTED : INK, size: block.muted ? 9 : 10.5 });
    } else if (block.type === 'li') {
      ensure(15);
      page.drawText('•', { x: MARGIN + 2, y: y - 10.5, size: 10.5, font: bold, color: EMERALD });
      draw(block.text, { indent: 16 });
    } else if (block.type === 'code') {
      const lines = wrap(block.text, mono, 9, MAX_W - 20);
      const boxH = lines.length * 12.5 + 16;
      ensure(boxH + 6);
      page.drawRectangle({ x: MARGIN, y: y - boxH, width: MAX_W, height: boxH, color: CODE_BG, borderColor: RULE, borderWidth: 1 });
      let cy = y - 14;
      for (const line of lines) {
        page.drawText(line, { x: MARGIN + 10, y: cy - 9, size: 9, font: mono, color: INK });
        cy -= 12.5;
      }
      y -= boxH + 10;
    } else if (block.type === 'rule') {
      ensure(14);
      page.drawLine({ start: { x: MARGIN, y: y - 6 }, end: { x: PAGE_W - MARGIN, y: y - 6 }, thickness: 1, color: RULE });
      y -= 16;
    } else if (block.type === 'space') {
      y -= block.size ?? 10;
    }
  }

  if (footer) {
    for (const p of doc.getPages()) {
      p.drawText(footer, { x: MARGIN, y: MARGIN - 24, size: 8, font, color: MUTED });
    }
  }

  return doc.save();
}
