import jsPDF from 'jspdf';
import { format } from 'date-fns';

const SEVERITY_COLORS = {
  high: [239, 68, 68],
  medium: [245, 158, 11],
  low: [34, 197, 94],
};

const QUALITY_COLORS = {
  excellent: [16, 185, 129],
  good: [6, 182, 212],
  fair: [245, 158, 11],
  poor: [239, 68, 68],
};

function drawSectionHeader(doc, text, y, pageWidth) {
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(14, y, pageWidth - 28, 9, 2, 2, 'F');
  doc.setTextColor(100, 220, 220);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(text.toUpperCase(), 18, y + 6.2);
  return y + 14;
}

function drawDivider(doc, y, pageWidth) {
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.3);
  doc.line(14, y, pageWidth - 14, y);
  return y + 5;
}

async function loadImageAsBase64(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function exportAnalysisPdf(analysis) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // ── Dark background ──────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // ── Header bar ───────────────────────────────────────────────────────────────
  doc.setFillColor(20, 30, 50);
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(6, 182, 212);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('PrintPerfect', margin, 14);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('AI Print Analysis Report', margin, 19.5);

  const dateStr = format(new Date(), "MMM d, yyyy 'at' h:mm a");
  doc.setTextColor(100, 116, 139);
  doc.text(dateStr, pageWidth - margin, 14, { align: 'right' });

  y = 28;

  // ── Quality badge ─────────────────────────────────────────────────────────────
  const quality = analysis.overall_quality || 'fair';
  const qualityLabel = quality.charAt(0).toUpperCase() + quality.slice(1) + ' Quality';
  const qColor = QUALITY_COLORS[quality] || QUALITY_COLORS.fair;

  doc.setFillColor(qColor[0], qColor[1], qColor[2], 0.15);
  doc.setFillColor(
    Math.round(qColor[0] * 0.15 + 15 * 0.85),
    Math.round(qColor[1] * 0.15 + 23 * 0.85),
    Math.round(qColor[2] * 0.15 + 42 * 0.85)
  );
  doc.roundedRect(margin, y, 52, 8, 2, 2, 'F');
  doc.setTextColor(...qColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(qualityLabel, margin + 3, y + 5.5);

  const defectCount = analysis.defects?.length || 0;
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${defectCount} ${defectCount === 1 ? 'issue' : 'issues'} detected`, pageWidth - margin, y + 5.5, { align: 'right' });

  y += 13;

  // ── Print image ───────────────────────────────────────────────────────────────
  const imageUrl = (analysis.all_image_urls && analysis.all_image_urls[0]) || analysis.image_url;
  if (imageUrl) {
    const imgData = await loadImageAsBase64(imageUrl);
    if (imgData) {
      const maxImgH = 65;
      const maxImgW = contentWidth;
      const ratio = imgData.width / imgData.height;
      let imgW = maxImgW;
      let imgH = imgW / ratio;
      if (imgH > maxImgH) { imgH = maxImgH; imgW = imgH * ratio; }
      const imgX = margin + (contentWidth - imgW) / 2;

      doc.setFillColor(30, 41, 59);
      doc.roundedRect(margin, y, contentWidth, imgH + 4, 3, 3, 'F');
      doc.addImage(imgData.dataUrl, 'JPEG', imgX, y + 2, imgW, imgH);
      y += imgH + 8;
    }
  }

  // ── AI Summary ────────────────────────────────────────────────────────────────
  if (analysis.summary) {
    y = drawSectionHeader(doc, 'AI Analysis Summary', y, pageWidth);
    doc.setFillColor(6, 78, 95);
    doc.roundedRect(margin, y - 2, contentWidth, 1, 1, 1, 'F'); // accent line

    doc.setTextColor(203, 213, 225);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(analysis.summary, contentWidth - 4);
    doc.text(summaryLines, margin + 2, y + 4);
    y += summaryLines.length * 5 + 8;
  }

  // ── Defects ───────────────────────────────────────────────────────────────────
  if (defectCount > 0) {
    y = drawSectionHeader(doc, `Detected Issues (${defectCount})`, y, pageWidth);

    for (const defect of analysis.defects) {
      // Check if we need a new page
      if (y > pageHeight - 50) {
        doc.addPage();
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        y = 15;
      }

      const sev = defect.severity || 'low';
      const sevColor = SEVERITY_COLORS[sev] || SEVERITY_COLORS.low;
      const sevBgR = Math.round(sevColor[0] * 0.1 + 20 * 0.9);
      const sevBgG = Math.round(sevColor[1] * 0.1 + 30 * 0.9);
      const sevBgB = Math.round(sevColor[2] * 0.1 + 48 * 0.9);

      // Defect card background
      const descLines = defect.description ? doc.splitTextToSize(defect.description, contentWidth - 18) : [];
      const causesCount = Math.min(defect.causes?.length || 0, 2);
      const solutionsCount = Math.min(defect.solutions?.length || 0, 2);
      const cardHeight = 8 + descLines.length * 4.5 + causesCount * 4 + solutionsCount * 4 + (causesCount > 0 ? 6 : 0) + (solutionsCount > 0 ? 6 : 0) + 4;

      doc.setFillColor(sevBgR, sevBgG, sevBgB);
      doc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, 'F');

      // Severity bar
      doc.setFillColor(...sevColor);
      doc.roundedRect(margin, y, 3, cardHeight, 1, 1, 'F');

      // Defect name
      doc.setTextColor(226, 232, 240);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text(defect.name || 'Unknown', margin + 7, y + 6);

      // Severity badge
      doc.setFillColor(...sevColor);
      const sevLabel = sev.charAt(0).toUpperCase() + sev.slice(1);
      doc.roundedRect(pageWidth - margin - 18, y + 2, 18, 5.5, 1, 1, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text(sevLabel, pageWidth - margin - 9, y + 6.2, { align: 'center' });

      let cardY = y + 9;

      if (descLines.length > 0) {
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(descLines, margin + 7, cardY);
        cardY += descLines.length * 4.5;
      }

      if (defect.causes && defect.causes.length > 0) {
        cardY += 3;
        doc.setTextColor(251, 191, 36);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Causes:', margin + 7, cardY);
        cardY += 4;
        doc.setTextColor(203, 213, 225);
        doc.setFont('helvetica', 'normal');
        defect.causes.slice(0, 2).forEach(cause => {
          doc.text(`• ${cause}`, margin + 10, cardY);
          cardY += 4;
        });
      }

      if (defect.solutions && defect.solutions.length > 0) {
        cardY += 2;
        doc.setTextColor(52, 211, 153);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Fixes:', margin + 7, cardY);
        cardY += 4;
        doc.setTextColor(203, 213, 225);
        doc.setFont('helvetica', 'normal');
        defect.solutions.slice(0, 2).forEach(sol => {
          const solLines = doc.splitTextToSize(`• ${sol}`, contentWidth - 20);
          doc.text(solLines, margin + 10, cardY);
          cardY += solLines.length * 4;
        });
      }

      y += cardHeight + 4;
    }
  } else {
    y = drawSectionHeader(doc, 'Quality Assessment', y, pageWidth);
    doc.setTextColor(52, 211, 153);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('✓  No defects detected — excellent print quality!', margin + 2, y + 2);
    y += 10;
  }

  // ── Printer Settings Suggestions ─────────────────────────────────────────────
  if (analysis.printer_settings_suggestions && analysis.printer_settings_suggestions.length > 0) {
    if (y > pageHeight - 60) {
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      y = 15;
    }
    y = drawSectionHeader(doc, 'Recommended Settings Adjustments', y, pageWidth);

    analysis.printer_settings_suggestions.slice(0, 6).forEach((suggestion, i) => {
      if (y > pageHeight - 15) {
        doc.addPage();
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        y = 15;
      }
      doc.setFillColor(22, 35, 58);
      doc.roundedRect(margin, y, contentWidth, 7.5, 1.5, 1.5, 'F');
      doc.setTextColor(6, 182, 212);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}.`, margin + 3, y + 5.2);
      doc.setTextColor(203, 213, 225);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(suggestion, contentWidth - 12);
      doc.text(lines[0], margin + 9, y + 5.2);
      y += 10;
    });
    y += 2;
  }

  // ── Community Comparison ──────────────────────────────────────────────────────
  const cc = analysis.community_comparison;
  if (cc) {
    if (y > pageHeight - 50) {
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      y = 15;
    }
    y = drawSectionHeader(doc, 'Community Quality Benchmark', y, pageWidth);

    const fields = [
      ['Overall Quality Score', cc.overall_quality_score != null ? `${Math.round(cc.overall_quality_score * 10) / 10} / 10` : null],
      ['Community Percentile', cc.community_percentile != null ? `Top ${cc.community_percentile}%` : null],
      ['Similar Prints Analyzed', cc.similar_prints_count != null ? `${cc.similar_prints_count}` : null],
      ['Common Defect', cc.most_common_defect || null],
    ].filter(([, v]) => v);

    fields.forEach(([label, value]) => {
      doc.setFillColor(22, 35, 58);
      doc.roundedRect(margin, y, contentWidth, 7.5, 1.5, 1.5, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(label + ':', margin + 3, y + 5.2);
      doc.setTextColor(226, 232, 240);
      doc.setFont('helvetica', 'bold');
      doc.text(value, pageWidth - margin - 3, y + 5.2, { align: 'right' });
      y += 10;
    });
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(20, 30, 50);
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated by PrintPerfect AI', margin, pageHeight - 3.5);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 3.5, { align: 'right' });
  }

  doc.save(`print-analysis-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
}