import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { PUBLIC_REGISTRATION_URL } from '../constants.js';

// Error correction level "M" (~15% recoverable) is the usual sweet spot for a
// printed poster: tolerant of smudges and glare without inflating the module
// count (which would make each square smaller and harder to scan from afar).
const QR_OPTS = { errorCorrectionLevel: 'M', margin: 1, color: { dark: '#000000', light: '#ffffff' } };

// A4 portrait, in millimetres.
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 12;

export default function QrCodeCard() {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // On-screen preview.
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(PUBLIC_REGISTRATION_URL, { ...QR_OPTS, width: 512 })
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError('Could not generate the QR code.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function downloadPdf() {
    setBusy(true);
    setError(null);
    try {
      // jsPDF is ~350KB, and this button is rarely used — load it on demand so
      // it never lands in the main bundle.
      const { jsPDF } = await import('jspdf');

      // Draw the QR as vector rectangles rather than embedding a bitmap: it
      // stays razor-sharp at any print size (the whole point of "as big as
      // possible") and keeps the file at a few KB instead of ~12MB.
      const qr = QRCode.create(PUBLIC_REGISTRATION_URL, {
        errorCorrectionLevel: QR_OPTS.errorCorrectionLevel,
      });

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.text('Scan to Register', PAGE_W / 2, 22, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13);
      doc.setTextColor(90);
      doc.text('TGI FLOW  |  Mon, Jul 20, 2026  |  1:00-5:00 PM', PAGE_W / 2, 31, {
        align: 'center',
      });

      // As big as the page allows: the QR is square, so the page width (minus
      // margins) is the limit — there is more vertical room than horizontal.
      const qrSize = PAGE_W - MARGIN * 2;
      const qrX = MARGIN;
      const qrY = 40;

      const count = qr.modules.size;
      // 4 empty modules of "quiet zone" all round — scanners need it to find
      // the code, and it is part of the QR spec.
      const QUIET = 4;
      const cell = qrSize / (count + QUIET * 2);

      doc.setFillColor(255, 255, 255);
      doc.rect(qrX, qrY, qrSize, qrSize, 'F');

      doc.setFillColor(0, 0, 0);
      for (let row = 0; row < count; row++) {
        // Merge each horizontal run of dark modules into a single rectangle:
        // fewer shapes, and no hairline seams between neighbours.
        let runStart = -1;
        for (let col = 0; col <= count; col++) {
          const dark = col < count && qr.modules.get(row, col);
          if (dark && runStart === -1) runStart = col;
          if (!dark && runStart !== -1) {
            doc.rect(
              qrX + (runStart + QUIET) * cell,
              qrY + (row + QUIET) * cell,
              (col - runStart) * cell,
              cell,
              'F'
            );
            runStart = -1;
          }
        }
      }

      doc.setFontSize(11);
      doc.setTextColor(120);
      doc.text(PUBLIC_REGISTRATION_URL, PAGE_W / 2, Math.min(qrY + qrSize + 12, PAGE_H - 12), {
        align: 'center',
      });

      doc.save('flow-registration-qr.pdf');
    } catch {
      setError('Could not build the PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-slate-50 px-6 py-8 text-center ring-1 ring-slate-100">
      <p className="text-sm font-semibold text-slate-700">Registration QR code</p>
      <p className="-mt-2 text-xs text-slate-400">Scan to open the registration form.</p>

      {previewUrl && (
        <img
          src={previewUrl}
          alt={`QR code linking to ${PUBLIC_REGISTRATION_URL}`}
          className="h-44 w-44 rounded-lg bg-white p-2 shadow-sm"
        />
      )}

      <a
        href={PUBLIC_REGISTRATION_URL}
        target="_blank"
        rel="noreferrer"
        className="break-all text-xs text-blue-600 hover:underline"
      >
        {PUBLIC_REGISTRATION_URL}
      </a>

      <button
        type="button"
        onClick={downloadPdf}
        disabled={busy || !previewUrl}
        className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path
            d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {busy ? 'Building PDF…' : 'Download PDF for printing'}
      </button>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
