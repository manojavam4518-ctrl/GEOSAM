'use client';

import React, { useState } from 'react';
import Modal from '@/components/Modal';
import { Share2, Mail, MessageSquare, Copy, Download, Check, AlertCircle } from 'lucide-react';

interface ShareMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBlob: Blob | null;
  pdfFilename: string;
  shareUrl?: string; // Optional public link if saved in DB
  customerName?: string;
  courier?: string;
  service?: string;
  origin?: string;
  destination?: string;
  weight?: string;
  amount?: string;
  companyName?: string;
  authorizedPerson?: string;
  quoteNumber?: string;
}

export default function ShareMenuModal({
  isOpen,
  onClose,
  pdfBlob,
  pdfFilename,
  shareUrl,
  customerName = 'Customer',
  courier = 'N/A',
  service = 'N/A',
  origin = 'N/A',
  destination = 'N/A',
  weight = '0',
  amount = '0.00',
  companyName = 'GEO TRANSIT',
  authorizedPerson = 'Authorized Signatory',
  quoteNumber = 'N/A',
}: ShareMenuModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Construct sharing texts
  const whatsappMessage = `Hello ${customerName},

Please find the quotation for your shipment.

Courier: ${courier}
Service: ${service}
Origin: ${origin}
Destination: ${destination}
Chargeable Weight: ${weight} KG
Shipping Rate: ₹${amount}

${shareUrl ? `You can view the quotation online here: ${shareUrl}\n` : ''}
Please review the quotation.

Thank you,
${companyName}`;

  const emailSubject = `Quotation ${quoteNumber} – ${companyName}`;
  const emailBody = `Dear ${customerName},

Please find the quotation for your shipment.

Courier Company: ${courier}
Service: ${service}
Origin: ${origin}
Destination: ${destination}
Chargeable Weight: ${weight} KG
Quoted Amount: ₹${amount}

${shareUrl ? `You can view the quotation details online at: ${shareUrl}\n` : ''}
Please find the quotation PDF attached.

Regards,
${authorizedPerson}
${companyName}`;

  const handleWhatsAppShare = async () => {
    setShareStatus('idle');
    try {
      // 1. Try file sharing via Web Share API first
      if (pdfBlob && navigator.canShare) {
        const file = new File([pdfBlob], pdfFilename, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Quotation ${quoteNumber}`,
            text: whatsappMessage,
          });
          setShareStatus('success');
          setStatusMessage('Quotation shared via Web Share API.');
          return;
        }
      }
    } catch (err: any) {
      console.warn('Web Share file API failed or aborted:', err);
    }

    // 2. Fallback: Pre-filled WhatsApp link
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(waUrl, '_blank');
    setShareStatus('success');
    setStatusMessage('WhatsApp web/app opened! Please attach the downloaded PDF manually.');
  };

  const handleEmailShare = () => {
    const mailto = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailto, '_blank');
    setShareStatus('success');
    setStatusMessage('Email client opened. Please attach the downloaded PDF manually.');
  };

  const handleNativeShare = async () => {
    setShareStatus('idle');
    if (!navigator.share) {
      setShareStatus('error');
      setStatusMessage('Web Share API is not supported on this browser/device.');
      return;
    }

    try {
      if (pdfBlob) {
        const file = new File([pdfBlob], pdfFilename, { type: 'application/pdf' });
        const shareData: ShareData = {
          title: `Quotation ${quoteNumber}`,
          text: whatsappMessage,
        };

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }

        await navigator.share(shareData);
        setShareStatus('success');
        setStatusMessage('Shared successfully!');
      } else {
        await navigator.share({
          title: `Quotation ${quoteNumber}`,
          text: whatsappMessage,
          url: shareUrl,
        });
        setShareStatus('success');
        setStatusMessage('Shared link successfully!');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setShareStatus('error');
        setStatusMessage(`Sharing failed: ${err.message}`);
      }
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) {
      setShareStatus('error');
      setStatusMessage('No public share link is available for this document.');
      return;
    }
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    setShareStatus('success');
    setStatusMessage('Quotation link copied to clipboard.');
  };

  const handleDownloadPDF = () => {
    if (!pdfBlob) {
      setShareStatus('error');
      setStatusMessage('No PDF data available to download.');
      return;
    }
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', pdfFilename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
    setShareStatus('success');
    setStatusMessage('PDF download triggered successfully.');
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Quotation / Document" size="md">
      <div className="space-y-5 py-2">
        <p className="text-xs text-slate-500 font-medium">
          Choose a method to share the generated document (<strong>{pdfFilename}</strong>) with your customer.
        </p>

        {/* Share buttons stack */}
        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="w-full bg-[#E8F5E9] hover:bg-[#C8E6C9] border border-emerald-200 text-[#0F4C3A] py-3 px-4 rounded-xl text-xs font-bold transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 flex items-center justify-between shadow-xs hover:shadow-md group cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <MessageSquare className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition" />
              WhatsApp Share
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold italic">Message & File Attachment</span>
          </button>

          <button
            type="button"
            onClick={handleEmailShare}
            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-3 px-4 rounded-xl text-xs font-bold transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 flex items-center justify-between shadow-xs hover:shadow-md group cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Mail className="w-5 h-5 text-blue-500 group-hover:scale-110 transition" />
              Gmail / Email client
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">Subject & Body Pre-filled</span>
          </button>

          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full bg-[#F3E5F5] hover:bg-[#E1BEE7] border border-purple-200 text-purple-900 py-3 px-4 rounded-xl text-xs font-bold transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 flex items-center justify-between shadow-xs hover:shadow-md group cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Share2 className="w-5 h-5 text-purple-600 group-hover:scale-110 transition" />
              Device Share Menu (Web Share)
            </span>
            <span className="text-[10px] text-purple-700 font-semibold">Android / iOS System</span>
          </button>

          {shareUrl && (
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 py-3 px-4 rounded-xl text-xs font-bold transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 flex items-center justify-between shadow-xs hover:shadow-md group cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                {copiedLink ? <Check className="w-5 h-5 text-amber-600" /> : <Copy className="w-5 h-5 text-amber-600 group-hover:scale-110 transition" />}
                Copy Quotation Link
              </span>
              <span className="text-[10px] text-amber-600 font-semibold">{copiedLink ? 'Copied!' : 'Secure URL'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadPDF}
            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-between shadow-sm group"
          >
            <span className="flex items-center gap-2.5">
              <Download className="w-5 h-5 text-slate-600 group-hover:scale-110 transition" />
              Download Local PDF copy
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">A4 PDF file</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {shareStatus !== 'idle' && (
          <div className={`p-3 rounded-lg border text-xs font-medium flex items-start gap-2 ${
            shareStatus === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-[#0F4C3A]'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {shareStatus === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-800 text-white font-bold py-2 px-6 rounded-lg text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
