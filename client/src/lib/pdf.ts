import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';
import type { Problem } from '@/types/problem';

function stripHtml(html: string): string {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const chars = text.split('');
  const lines: string[] = [];
  let currentLine = '';
  const charWidth = fontSize * 0.5;

  for (const char of chars) {
    if (char === '\n') {
      lines.push(currentLine);
      currentLine = '';
      continue;
    }
    if ((currentLine.length + 1) * charWidth > maxWidth) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine += char;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

export async function exportProblemToPDF(problem: Problem): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  const addNewPageIfNeeded = (requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
    }
  };

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  const title = `#${problem.id} ${problem.title}`;
  pdf.text(title, margin, currentY + 8);
  currentY += 15;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  const difficultyMap: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  };

  const infoText = `难度: ${difficultyMap[problem.difficulty] || problem.difficulty}  |  时间限制: ${problem.time_limit} ms  |  内存限制: ${problem.memory_limit} MB`;
  pdf.text(infoText, margin, currentY);
  currentY += 8;

  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  const addSection = async (title: string, content: string, isCode: boolean = false) => {
    if (!content || content.trim() === '') return;

    addNewPageIfNeeded(15);

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 30, 30);
    pdf.text(title, margin, currentY);
    currentY += 7;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);

    const plainContent = isCode ? content : stripHtml(content);
    const lines = wrapText(plainContent, contentWidth, 10);

    if (isCode) {
      const codeBlockHeight = Math.min(lines.length * 4.5 + 6, 80);
      addNewPageIfNeeded(codeBlockHeight + 5);

      pdf.setFillColor(245, 245, 245);
      pdf.setDrawColor(220, 220, 220);
      pdf.roundedRect(margin, currentY, contentWidth, codeBlockHeight, 2, 2, 'FD');

      pdf.setFont('courier', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(40, 40, 40);

      let lineY = currentY + 5;
      const maxLines = Math.min(lines.length, Math.floor((codeBlockHeight - 6) / 4.5));

      for (let i = 0; i < maxLines; i++) {
        pdf.text(lines[i], margin + 3, lineY);
        lineY += 4.5;
      }

      if (lines.length > maxLines) {
        pdf.setTextColor(120, 120, 120);
        pdf.text(`... (${lines.length - maxLines} more lines)`, margin + 3, lineY);
      }

      currentY += codeBlockHeight + 5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
    } else {
      for (const line of lines) {
        addNewPageIfNeeded(5);
        pdf.text(line, margin, currentY);
        currentY += 5;
      }
      currentY += 3;
    }
  };

  await addSection('题目描述', problem.description || '');

  await addSection('输入描述', problem.input_description || '');

  await addSection('输出描述', problem.output_description || '');

  if (problem.sample_cases && problem.sample_cases.length > 0) {
    addNewPageIfNeeded(25);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 30, 30);
    pdf.text('输入 / 输出样例', margin, currentY);
    currentY += 8;

    for (let i = 0; i < problem.sample_cases.length; i++) {
      const sample = problem.sample_cases[i];
      addNewPageIfNeeded(30);

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(80, 80, 80);
      pdf.text(`样例 ${i + 1}`, margin, currentY);
      currentY += 6;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('输入:', margin, currentY);
      currentY += 4;

      const inputLines = wrapText(sample.input || '(空输入)', contentWidth - 6, 9);
      const inputBlockHeight = Math.min(inputLines.length * 4 + 4, 25);

      pdf.setFillColor(250, 250, 250);
      pdf.setDrawColor(230, 230, 230);
      pdf.roundedRect(margin, currentY, contentWidth, inputBlockHeight, 1, 1, 'FD');

      pdf.setFont('courier', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(40, 40, 40);

      let lineY = currentY + 4;
      for (let j = 0; j < Math.min(inputLines.length, Math.floor((inputBlockHeight - 4) / 4)); j++) {
        pdf.text(inputLines[j], margin + 3, lineY);
        lineY += 4;
      }

      currentY += inputBlockHeight + 5;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text('输出:', margin, currentY);
      currentY += 4;

      const outputLines = wrapText(sample.output || '(空输出)', contentWidth - 6, 9);
      const outputBlockHeight = Math.min(outputLines.length * 4 + 4, 25);

      pdf.setFillColor(250, 250, 250);
      pdf.setDrawColor(230, 230, 230);
      pdf.roundedRect(margin, currentY, contentWidth, outputBlockHeight, 1, 1, 'FD');

      pdf.setFont('courier', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(40, 40, 40);

      lineY = currentY + 4;
      for (let j = 0; j < Math.min(outputLines.length, Math.floor((outputBlockHeight - 4) / 4)); j++) {
        pdf.text(outputLines[j], margin + 3, lineY);
        lineY += 4;
      }

      currentY += outputBlockHeight + 8;
    }
  } else if (problem.sample_input || problem.sample_output) {
    addNewPageIfNeeded(25);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 30, 30);
    pdf.text('输入 / 输出样例', margin, currentY);
    currentY += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('输入:', margin, currentY);
    currentY += 4;

    const inputLines = wrapText(problem.sample_input || '(空输入)', contentWidth - 6, 9);
    const inputBlockHeight = Math.min(inputLines.length * 4 + 4, 25);

    pdf.setFillColor(250, 250, 250);
    pdf.setDrawColor(230, 230, 230);
    pdf.roundedRect(margin, currentY, contentWidth, inputBlockHeight, 1, 1, 'FD');

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(40, 40, 40);

    let lineY = currentY + 4;
    for (let j = 0; j < Math.min(inputLines.length, Math.floor((inputBlockHeight - 4) / 4)); j++) {
      pdf.text(inputLines[j], margin + 3, lineY);
      lineY += 4;
    }

    currentY += inputBlockHeight + 5;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text('输出:', margin, currentY);
    currentY += 4;

    const outputLines = wrapText(problem.sample_output || '(空输出)', contentWidth - 6, 9);
    const outputBlockHeight = Math.min(outputLines.length * 4 + 4, 25);

    pdf.setFillColor(250, 250, 250);
    pdf.setDrawColor(230, 230, 230);
    pdf.roundedRect(margin, currentY, contentWidth, outputBlockHeight, 1, 1, 'FD');

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(40, 40, 40);

    lineY = currentY + 4;
    for (let j = 0; j < Math.min(outputLines.length, Math.floor((outputBlockHeight - 4) / 4)); j++) {
      pdf.text(outputLines[j], margin + 3, lineY);
      lineY += 4;
    }

    currentY += outputBlockHeight + 8;
  }

  await addSection('说明 / 提示', problem.hints || '');

  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);

  const fileName = `problem_${problem.id}_${problem.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.pdf`;
  pdf.save(fileName);
}

export async function exportProblemToPDFViaCanvas(problem: Problem): Promise<void> {
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 800px;
    padding: 40px;
    background: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  `;

  const difficultyMap: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  };

  const sampleCases = problem.sample_cases && problem.sample_cases.length > 0
    ? problem.sample_cases
    : problem.sample_input || problem.sample_output
      ? [{ input: problem.sample_input || '', output: problem.sample_output || '' }]
      : [];

  marked.setOptions({
    gfm: true,
    breaks: true,
  });

  const renderMarkdown = (content: string): string => {
    if (!content) return '';
    try {
      return marked.parse(content) as string;
    } catch {
      return content;
    }
  };

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  container.innerHTML = `
    <style>
      .pdf-content { color: #1f2937; line-height: 1.8; }
      .pdf-title { font-size: 24px; font-weight: bold; margin-bottom: 16px; color: #111827; text-align: center; }
      .pdf-meta { display: flex; justify-content: center; gap: 24px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; }
      .pdf-meta-item { font-size: 14px; color: #4b5563; }
      .pdf-meta-label { color: #6b7280; }
      .pdf-meta-value { font-weight: 600; color: #374151; margin-left: 4px; }
      .pdf-section { margin-bottom: 28px; }
      .pdf-section-title { font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
      .pdf-section-content { font-size: 14px; color: #374151; }
      .pdf-section-content p { margin: 0 0 12px 0; }
      .pdf-section-content p:last-child { margin-bottom: 0; }
      .pdf-section-content h1 { font-size: 20px; font-weight: bold; margin: 16px 0 8px 0; }
      .pdf-section-content h2 { font-size: 18px; font-weight: bold; margin: 14px 0 8px 0; }
      .pdf-section-content h3 { font-size: 16px; font-weight: bold; margin: 12px 0 6px 0; }
      .pdf-section-content ul { list-style: disc; margin: 8px 0; padding-left: 24px; }
      .pdf-section-content ol { list-style: decimal; margin: 8px 0; padding-left: 24px; }
      .pdf-section-content li { margin: 4px 0; }
      .pdf-section-content code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 13px; }
      .pdf-section-content pre { background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 12px 0; }
      .pdf-section-content pre code { background: none; padding: 0; }
      .pdf-section-content blockquote { border-left: 4px solid #d1d5db; padding-left: 16px; margin: 12px 0; color: #6b7280; font-style: italic; }
      .pdf-section-content table { border-collapse: collapse; width: 100%; margin: 12px 0; }
      .pdf-section-content th, .pdf-section-content td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
      .pdf-section-content th { background: #f3f4f6; font-weight: 600; }
      .pdf-section-content a { color: #2563eb; text-decoration: none; }
      .pdf-section-content img { max-width: 100%; height: auto; margin: 8px 0; border-radius: 6px; }
      .pdf-sample { margin-bottom: 24px; }
      .pdf-sample-title { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px; }
      .pdf-sample-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .pdf-sample-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
      .pdf-sample-label { font-size: 12px; color: #6b7280; margin-bottom: 8px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
      .pdf-sample-code { font-family: 'Courier New', Consolas, monospace; font-size: 13px; color: #1f2937; white-space: pre-wrap; word-break: break-all; line-height: 1.5; }
    </style>
    <div class="pdf-content">
      <div class="pdf-title">${problem.title}</div>
      <div class="pdf-meta">
        <span class="pdf-meta-item">
          <span class="pdf-meta-label">难度:</span><span class="pdf-meta-value">${difficultyMap[problem.difficulty] || problem.difficulty}</span>
        </span>
        <span class="pdf-meta-item">
          <span class="pdf-meta-label">时间限制:</span><span class="pdf-meta-value">${problem.time_limit} ms</span>
        </span>
        <span class="pdf-meta-item">
          <span class="pdf-meta-label">内存限制:</span><span class="pdf-meta-value">${problem.memory_limit} MB</span>
        </span>
      </div>

      <div class="pdf-section">
        <div class="pdf-section-title">题目描述</div>
        <div class="pdf-section-content">${renderMarkdown(problem.description || '暂无题目描述')}</div>
      </div>

      <div class="pdf-section">
        <div class="pdf-section-title">输入描述</div>
        <div class="pdf-section-content">${renderMarkdown(problem.input_description || '暂无输入描述')}</div>
      </div>

      <div class="pdf-section">
        <div class="pdf-section-title">输出描述</div>
        <div class="pdf-section-content">${renderMarkdown(problem.output_description || '暂无输出描述')}</div>
      </div>

      ${sampleCases.length > 0 ? `
        <div class="pdf-section">
          <div class="pdf-section-title">输入 / 输出样例</div>
          ${sampleCases.map((sample, index) => `
            <div class="pdf-sample">
              <div class="pdf-sample-title">样例 ${index + 1}</div>
              <div class="pdf-sample-grid">
                <div class="pdf-sample-box">
                  <div class="pdf-sample-label">输入</div>
                  <div class="pdf-sample-code">${escapeHtml(sample.input || '(空输入)')}</div>
                </div>
                <div class="pdf-sample-box">
                  <div class="pdf-sample-label">输出</div>
                  <div class="pdf-sample-code">${escapeHtml(sample.output || '(空输出)')}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${problem.hints ? `
        <div class="pdf-section">
          <div class="pdf-section-title">说明 / 提示</div>
          <div class="pdf-section-content">${renderMarkdown(problem.hints)}</div>
        </div>
      ` : ''}
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;

    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Generated by Nexious OJ', pageWidth / 2, pageHeight - 10, { align: 'center' });

    const fileName = `problem_${problem.id}_${problem.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.pdf`;
    pdf.save(fileName);
  } finally {
    document.body.removeChild(container);
  }
}
