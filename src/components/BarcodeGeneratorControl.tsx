'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Barcode,
  RefreshCw,
  Download,
  Share2,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Sliders,
  Sparkles,
  Upload,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  LayoutGrid,
  Rows,
  Info,
} from 'lucide-react';
import LabelPreviewZoomToolbar from './LabelPreviewZoomToolbar';
import LabelHoverMagnifier from './LabelHoverMagnifier';
import FullScreenLabelPreviewModal from './FullScreenLabelPreviewModal';
import { useDragToPan } from '@/hooks/useDragToPan';
import {
  BarcodeFormat,
  INCH_SIZES,
  MAX_BARCODE_LIMIT,
  parseBarcodeEntries,
  generateBarcodeData,
  generateMultipleBarcodes,
  parseBarcodeFile,
  downloadBarcodesPdf,
  downloadBarcodePng,
  downloadAllBarcodesPng,
  shareBarcodeItem,
  getWhatsAppShareUrl,
  getEmailShareUrl,
  validateBarcodeDimensionsInches,
  copyBarcodeImageToClipboard,
  BarcodeGenerationResult,
  BarcodePdfLayout,
} from '@/utils/barcodeEnhance';

export interface BarcodeGeneratorControlProps {
  value: string;
  onChange: (value: string) => void;
  onGenerateNew?: () => void;
  barcodeType: BarcodeFormat;
  onBarcodeTypeChange: (type: BarcodeFormat) => void;
  widthInches: number;
  onWidthInchesChange: (width: number) => void;
  heightInches: number;
  onHeightInchesChange: (height: number) => void;
  onCodeGenerated?: (dataUrl: string) => void;
  pdfLayout?: BarcodePdfLayout;
  onPdfLayoutChange?: (layout: BarcodePdfLayout) => void;
}

export default function BarcodeGeneratorControl({
  value,
  onChange,
  onGenerateNew,
  barcodeType,
  onBarcodeTypeChange,
  widthInches,
  onWidthInchesChange,
  heightInches,
  onHeightInchesChange,
  onCodeGenerated,
  pdfLayout: pdfLayoutProp,
  onPdfLayoutChange,
}: BarcodeGeneratorControlProps) {
  const [results, setResults] = useState<BarcodeGenerationResult[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [shareMenuOpen, setShareMenuOpen] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [previewView, setPreviewView] = useState<'row' | 'column'>('row');
  const [internalPdfLayout, setInternalPdfLayout] = useState<BarcodePdfLayout>('row');
  const [barcodeZoom, setBarcodeZoom] = useState<number>(1.0);
  const [barcodeMagnifierActive, setBarcodeMagnifierActive] = useState<boolean>(true);
  const [isBarcodeFullScreenOpen, setIsBarcodeFullScreenOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shareDropdownRef = useRef<HTMLDivElement>(null);
  const shareTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Barcode preview click-and-drag hand tool with mouse-wheel zoom
  const barcodeViewportRef = useRef<HTMLDivElement>(null);
  const { panProps: barcodePanProps, cursorClass: barcodeCursorClass } = useDragToPan({
    externalRef: barcodeViewportRef,
    zoom: barcodeZoom,
    onZoomChange: setBarcodeZoom,
    minZoom: 0.4,
    maxZoom: 2.5,
    enableWheelZoom: true,
  });

  // Close share dropdown helper
  const closeShareMenu = () => {
    if (shareTimeoutRef.current) {
      clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = null;
    }
    setShareMenuOpen(false);
  };

  // Close share dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!shareMenuOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        shareDropdownRef.current &&
        !shareDropdownRef.current.contains(event.target as Node)
      ) {
        closeShareMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeShareMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shareMenuOpen]);

  // Clean up any pending hover timer on unmount
  useEffect(() => {
    return () => {
      if (shareTimeoutRef.current) {
        clearTimeout(shareTimeoutRef.current);
      }
    };
  }, []);

  const activePdfLayout = pdfLayoutProp !== undefined ? pdfLayoutProp : internalPdfLayout;

  const handlePdfLayoutChange = (newLayout: BarcodePdfLayout) => {
    setInternalPdfLayout(newLayout);
    onPdfLayoutChange?.(newLayout);
  };

  // Parse comma-separated entries, capped at 500 max limit
  const rawEntries = parseBarcodeEntries(value);
  const entries = rawEntries.slice(0, MAX_BARCODE_LIMIT);

  // Validate inch dimensions
  const dimensionValidation = validateBarcodeDimensionsInches(barcodeType, widthInches, heightInches);

  // Generate barcodes whenever entries, format, or inch dimensions change
  useEffect(() => {
    let isCancelled = false;

    async function updateCodes() {
      if (entries.length === 0) {
        setResults([]);
        setGenerationError('Barcode data is required. Enter characters, numbers, or text to generate.');
        return;
      }

      if (!dimensionValidation.valid) {
        setResults([]);
        setGenerationError(dimensionValidation.error || 'Invalid dimensions.');
        return;
      }

      setIsGenerating(true);
      try {
        const generated = await generateMultipleBarcodes(
          entries,
          barcodeType,
          widthInches,
          heightInches
        );

        if (isCancelled) return;

        setResults(generated);

        const firstError = generated.find((g) => !g.success)?.error;
        if (firstError && generated.every((g) => !g.success)) {
          setGenerationError(firstError);
        } else {
          setGenerationError(null);
        }

        // Notify parent of the primary barcode image for label card synchronization
        const firstValid = generated.find((g) => g.success && g.pngDataUrl);
        if (firstValid) {
          onCodeGenerated?.(firstValid.pngDataUrl);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setResults([]);
          setGenerationError(err?.message || 'Error generating barcodes.');
        }
      } finally {
        if (!isCancelled) {
          setIsGenerating(false);
        }
      }
    }

    updateCodes();

    return () => {
      isCancelled = true;
    };
  }, [value, barcodeType, widthInches, heightInches, dimensionValidation.valid]);

  // Toast feedback timeout
  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  // Handle format switch
  const handleTypeChange = (newType: BarcodeFormat) => {
    if (newType === barcodeType) return;
    onBarcodeTypeChange(newType);
    const newDefaults = INCH_SIZES[newType].standard;
    onWidthInchesChange(newDefaults.width);
    onHeightInchesChange(newDefaults.height);
  };

  // Preset sizes in inches (only Standard and Large)
  const applyPreset = (preset: 'standard' | 'large') => {
    const presetValues = INCH_SIZES[barcodeType][preset];
    onWidthInchesChange(presetValues.width);
    onHeightInchesChange(presetValues.height);
  };

  // Excel / CSV File Upload Handler (Max 500 barcodes enforced)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await parseBarcodeFile(file, MAX_BARCODE_LIMIT);
      if (res.success && res.entries.length > 0) {
        // Enforce 500 barcode limit and preserve original order
        const limitedBarcodes = res.entries.slice(0, MAX_BARCODE_LIMIT);
        onChange(limitedBarcodes.join('\n'));

        if (res.trimmed || (res.totalCount && res.totalCount > MAX_BARCODE_LIMIT)) {
          setFeedbackMessage(
            'Your Excel file contains more than 500 barcode numbers. Only the first 500 numbers will be processed.'
          );
        } else {
          setFeedbackMessage(
            `Imported ${limitedBarcodes.length} barcode entries from ${file.name}!`
          );
        }
      } else {
        setFeedbackMessage(res.error || 'No valid barcode entries found in the file.');
      }
    } catch (err: any) {
      setFeedbackMessage(`Error reading file: ${err?.message || 'Invalid format'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Download PDF Handler
  const handleDownloadPdf = () => {
    const validResults = results.filter((r) => r.success && r.pngDataUrl);
    if (validResults.length === 0) {
      setFeedbackMessage('Please enter valid barcode data first.');
      return;
    }

    const success = downloadBarcodesPdf({
      results: validResults,
      type: barcodeType,
      widthInches,
      heightInches,
      layout: activePdfLayout,
      margin: 0.105,
      gapX: 0.07,
      gapY: 0.14,
    });

    if (success) {
      setFeedbackMessage(
        validResults.length === 1
          ? `Downloaded PDF (${activePdfLayout === 'row' ? 'Row Wise' : 'Column Wise'}) for ${validResults[0].text}!`
          : `Downloaded PDF (${activePdfLayout === 'row' ? 'Row Wise' : 'Column Wise'}) containing ${validResults.length} barcodes!`
      );
    } else {
      setFeedbackMessage('Failed to generate PDF document.');
    }
  };

  // Download PNG Handler
  const handleDownloadPng = () => {
    const validResults = results.filter((r) => r.success && r.pngDataUrl);
    if (validResults.length === 0) {
      setFeedbackMessage('Please enter valid barcode data first.');
      return;
    }

    if (validResults.length === 1) {
      const item = validResults[0];
      const sanitized = item.text.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const filename = `${barcodeType.toLowerCase()}-${sanitized}-${widthInches}x${heightInches}in.png`;
      downloadBarcodePng({
        dataUrl: item.pngDataUrl,
        filename,
      });
      setFeedbackMessage(`Downloaded PNG for ${item.text}!`);
    } else {
      downloadAllBarcodesPng(validResults, barcodeType, widthInches, heightInches);
      setFeedbackMessage(`Downloading ${validResults.length} barcode PNG images...`);
    }
  };

  // Device Share Handler
  const handleShareDevice = async () => {
    const validResults = results.filter((r) => r.success && r.pngDataUrl);
    if (validResults.length === 0) {
      setFeedbackMessage('Please enter valid barcode data first.');
      return;
    }
    const item = validResults[0];
    const sanitized = item.text.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const filename = `${barcodeType.toLowerCase()}-${sanitized}.png`;
    const res = await shareBarcodeItem({
      dataUrl: item.pngDataUrl,
      text: item.text,
      type: barcodeType,
      filename,
    });
    setFeedbackMessage(res.message);
    closeShareMenu();
  };

  // WhatsApp Share Handler
  const handleShareWhatsApp = () => {
    if (entries.length === 0) return;
    const shareText = entries.join(', ');
    const url = getWhatsAppShareUrl(shareText, barcodeType);
    window.open(url, '_blank', 'noopener,noreferrer');
    closeShareMenu();
  };

  // Email Share Handler
  const handleShareEmail = () => {
    if (entries.length === 0) return;
    const shareText = entries.join(', ');
    const url = getEmailShareUrl(shareText, barcodeType, widthInches, heightInches);
    window.location.href = url;
    closeShareMenu();
  };

  // Copy Single or All Codes to Clipboard (Text)
  const handleCopyCode = async (textToCopy: string, index?: number) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      if (index !== undefined) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      }
      setFeedbackMessage('Barcode text copied to clipboard!');
    } catch {
      setFeedbackMessage('Failed to copy to clipboard.');
    }
  };

  // Copy Complete Barcode Image to Clipboard (for Preview Cards)
  const handleCopyBarcodeImage = async (item: BarcodeGenerationResult, index: number) => {
    try {
      const res = await copyBarcodeImageToClipboard(item);
      if (res.success) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
        if (res.method === 'image' || res.method === 'html') {
          setFeedbackMessage(`Barcode #${index + 1} (${item.text}) image copied! Ready to paste into Word, WhatsApp, Excel, etc.`);
        } else {
          setFeedbackMessage(`Barcode #${index + 1} text copied to clipboard.`);
        }
      } else {
        setFeedbackMessage(res.error || 'Failed to copy to clipboard.');
      }
    } catch {
      // Fallback: Copy tracking text if image copy fails
      try {
        await navigator.clipboard.writeText(item.text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
        setFeedbackMessage(`Barcode #${index + 1} text copied.`);
      } catch {
        setFeedbackMessage('Failed to copy barcode image.');
      }
    }
  };

  const validCount = results.filter((r) => r.success).length;

  // Hover handlers for Share Code dropdown
  const handleShareMouseEnter = () => {
    if (shareTimeoutRef.current) {
      clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = null;
    }
    if (validCount > 0 && !generationError) {
      setShareMenuOpen(true);
    }
  };

  const handleShareMouseLeave = () => {
    if (shareTimeoutRef.current) {
      clearTimeout(shareTimeoutRef.current);
    }
    // 0.5 seconds (500ms) latency before closing after cursor moves out of the option
    shareTimeoutRef.current = setTimeout(() => {
      setShareMenuOpen(false);
      shareTimeoutRef.current = null;
    }, 500);
  };

  const handleShareButtonClick = () => {
    if (shareTimeoutRef.current) {
      clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = null;
    }
    setShareMenuOpen((prev) => !prev);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start w-full">
      {/* LEFT PANEL: CONFIGURATION & ACTIONS (6 COLS) */}
      <div className="lg:col-span-6 xl:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Header & Generate New No */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-[#0F4C3A]">
            {barcodeType === 'QR' ? (
              <QrCode className="w-5 h-5 text-[#1E8262]" />
            ) : (
              <Barcode className="w-5 h-5 text-[#1E8262]" />
            )}
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">
                Barcode / QR Code Generator
              </h3>
              <p className="text-[10.5px] text-helper-blue font-bold">
                Encode tracking, alphanumeric text, or custom numbers in real-time
              </p>
            </div>
          </div>

          {onGenerateNew && (
            <button
              type="button"
              onClick={onGenerateNew}
              className="text-[10px] text-[#1E8262] font-black uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/60 hover:bg-emerald-100 transition-colors"
              title="Generate a unique random consignment tracking number"
            >
              <RefreshCw className="w-3 h-3" />
              Generate New No
            </button>
          )}
        </div>

        {/* 1. BARCODE DATA INPUT & EXCEL/CSV UPLOAD (MULTI-LINE TEXTAREA) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase">
              Barcode / Tracking Data *
            </label>

            <div className="flex items-center gap-2.5">
              {/* Upload Excel / CSV Option */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-[10px] text-[#0F4C3A] font-bold uppercase tracking-wider hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors bg-white shadow-2xs disabled:opacity-50"
                title="Upload Excel (.xlsx, .xls) or CSV (.csv) containing barcode values"
              >
                {isUploading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-[#1E8262]" />
                ) : (
                  <Upload className="w-3 h-3 text-[#1E8262]" />
                )}
                <span>Upload Excel / CSV</span>
              </button>

              {/* Character & Count Indicator */}
              <span className="text-[10px] font-bold text-helper-blue">
                {entries.length === 0
                  ? '0 entries • 0 chars'
                  : entries.length === 1
                  ? `1 entry • ${value.length} chars`
                  : `${entries.length} entries • ${value.length} chars`}
              </span>
            </div>
          </div>

          {/* 500 Barcode Limit Informational Note */}
          <div className="mb-2.5 flex items-start sm:items-center gap-2 bg-blue-50 border border-blue-200 text-blue-900 px-3 py-2 rounded-xl text-[11px] leading-relaxed shadow-2xs">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
            <p className="font-medium">
              <span className="font-bold">Note:</span> You can upload a maximum of 500 barcode numbers per file. If your file contains more than 500 numbers, only the first 500 will be processed.
            </p>
          </div>

          <div className="relative">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={6}
              className={`w-full text-xs font-mono font-bold tracking-wider p-3 border rounded-xl focus:outline-none transition-colors resize-y min-h-[140px] leading-relaxed ${
                !value.trim() || generationError
                  ? 'border-amber-300 bg-amber-50/20 focus:border-amber-500'
                  : 'border-slate-200 bg-slate-50/50 focus:border-[#1E8262] focus:ring-2 focus:ring-emerald-500/20'
              }`}
              placeholder={"Enter one code per line or comma-separated values:\ne.g.\nGT2610311173\nGT2610311174\nGT2610311175"}
            />
            {value.trim() && (
              <button
                type="button"
                onClick={() => handleCopyCode(value.trim())}
                className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/50 transition-colors cursor-pointer"
                title="Copy all barcode text"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-helper-blue mt-1 font-bold">
            Enter each code on a separate line or comma-separated. Automatically generates individual barcodes.
          </p>
        </div>

        {/* 2. BARCODE TYPE SELECTION & SIZE PRESETS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Barcode Format / Type
            </label>
            <div className="relative">
              <select
                value={barcodeType}
                onChange={(e) => handleTypeChange(e.target.value as BarcodeFormat)}
                className="w-full text-xs font-black uppercase px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E8262] bg-white cursor-pointer shadow-2xs"
              >
                <option value="CODE128">CODE128 (1D Linear Barcode)</option>
                <option value="QR">2D QR (Quick Response Code)</option>
              </select>
            </div>
          </div>

          {/* Size Presets: Standard and Large only */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Size Presets
            </label>
            <div className="flex items-center gap-2 h-[38px]">
              <button
                type="button"
                onClick={() => applyPreset('standard')}
                className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer text-center"
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => applyPreset('large')}
                className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer text-center"
              >
                Large
              </button>
            </div>
          </div>
        </div>

        {/* 3. BARCODE DIMENSIONS IN INCHES (WIDTH & HEIGHT) */}
        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#1E8262]" />
              Barcode Dimensions (Width & Height)
            </span>
            <span className="text-[9.5px] font-bold text-helper-blue">Values in inches (in)</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Width (in)
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min={INCH_SIZES[barcodeType].minWidth}
                  max={INCH_SIZES[barcodeType].maxWidth}
                  step={0.05}
                  value={widthInches}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onWidthInchesChange(isNaN(val) ? 0 : val);
                  }}
                  className={`w-full text-xs font-mono font-bold px-3 py-1.5 border rounded-lg focus:outline-none ${
                    widthInches < INCH_SIZES[barcodeType].minWidth ||
                    widthInches > INCH_SIZES[barcodeType].maxWidth
                      ? 'border-red-400 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-[#1E8262]'
                  }`}
                />
              </div>
              <span className="text-[9px] text-helper-blue font-bold mt-0.5 block">
                Range: {INCH_SIZES[barcodeType].minWidth.toFixed(2)} - {INCH_SIZES[barcodeType].maxWidth.toFixed(2)} in
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Height (in)
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min={INCH_SIZES[barcodeType].minHeight}
                  max={INCH_SIZES[barcodeType].maxHeight}
                  step={0.05}
                  value={heightInches}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onHeightInchesChange(isNaN(val) ? 0 : val);
                  }}
                  className={`w-full text-xs font-mono font-bold px-3 py-1.5 border rounded-lg focus:outline-none ${
                    heightInches < INCH_SIZES[barcodeType].minHeight ||
                    heightInches > INCH_SIZES[barcodeType].maxHeight
                      ? 'border-red-400 bg-red-50/30'
                      : 'border-slate-300 bg-white focus:border-[#1E8262]'
                  }`}
                />
              </div>
              <span className="text-[9px] text-helper-blue font-bold mt-0.5 block">
                Range: {INCH_SIZES[barcodeType].minHeight.toFixed(2)} - {INCH_SIZES[barcodeType].maxHeight.toFixed(2)} in
              </span>
            </div>
          </div>

          {/* Validation warning if dimensions out of bounds */}
          {!dimensionValidation.valid && (
            <div className="flex items-start gap-1.5 text-red-600 text-[10px] font-bold bg-red-50 p-2 rounded-lg border border-red-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{dimensionValidation.error}</span>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: ACTIONS BAR + DEDICATED LIVE CODE PREVIEW (6 COLS) */}
      <div className="lg:col-span-6 xl:col-span-6 sticky top-6 space-y-4">
        {/* ACTION BAR: DOWNLOAD PDF | DOWNLOAD PNG | SHARE CODE */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          {/* Print Layout Selection for Downloaded PDF */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                Print Layout
              </span>
              <p className="text-[10px] text-helper-blue font-bold">
                Choose arrangement for downloaded PDF labels
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs select-none transition-colors">
                <input
                  type="radio"
                  name="pdfPrintLayout"
                  value="row"
                  checked={activePdfLayout === 'row'}
                  onChange={() => handlePdfLayoutChange('row')}
                  className="w-4 h-4 text-[#0F4C3A] focus:ring-[#1E8262] border-slate-300 cursor-pointer accent-[#0F4C3A]"
                />
                <span className={activePdfLayout === 'row' ? 'text-[#0F4C3A] font-black' : 'text-slate-600 font-medium'}>
                  Row Wise
                </span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer text-xs select-none transition-colors">
                <input
                  type="radio"
                  name="pdfPrintLayout"
                  value="column"
                  checked={activePdfLayout === 'column'}
                  onChange={() => handlePdfLayoutChange('column')}
                  className="w-4 h-4 text-[#0F4C3A] focus:ring-[#1E8262] border-slate-300 cursor-pointer accent-[#0F4C3A]"
                />
                <span className={activePdfLayout === 'column' ? 'text-[#0F4C3A] font-black' : 'text-slate-600 font-medium'}>
                  Column Wise
                </span>
              </label>
            </div>
          </div>

          {/* Barcode Type Selector (Code 128 Barcode vs 2D QR Code) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                Barcode Type
              </span>
              <p className="text-[10px] text-helper-blue font-bold">
                Select linear barcode or 2D QR code format
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs select-none transition-colors">
                <input
                  type="radio"
                  name="barcodeTypeRightSelector"
                  value="CODE128"
                  checked={barcodeType === 'CODE128'}
                  onChange={() => handleTypeChange('CODE128')}
                  className="w-4 h-4 text-[#0F4C3A] focus:ring-[#1E8262] border-slate-300 cursor-pointer accent-[#0F4C3A]"
                />
                <span
                  className={
                    barcodeType === 'CODE128'
                      ? 'text-[#0F4C3A] font-black flex items-center gap-1.5'
                      : 'text-slate-600 font-medium flex items-center gap-1.5'
                  }
                >
                  <Barcode className="w-3.5 h-3.5 text-[#1E8262]" />
                  Code 128
                </span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer text-xs select-none transition-colors">
                <input
                  type="radio"
                  name="barcodeTypeRightSelector"
                  value="QR"
                  checked={barcodeType === 'QR'}
                  onChange={() => handleTypeChange('QR')}
                  className="w-4 h-4 text-[#0F4C3A] focus:ring-[#1E8262] border-slate-300 cursor-pointer accent-[#0F4C3A]"
                />
                <span
                  className={
                    barcodeType === 'QR'
                      ? 'text-[#0F4C3A] font-black flex items-center gap-1.5'
                      : 'text-slate-600 font-medium flex items-center gap-1.5'
                  }
                >
                  <QrCode className="w-3.5 h-3.5 text-[#1E8262]" />
                  2D QR Code
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* 1. Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={validCount === 0 || Boolean(generationError)}
              className="inline-flex items-center justify-center gap-1.5 bg-[#0F4C3A] hover:bg-[#155d47] text-white py-2.5 px-3 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
              title={`Download scannable PDF in ${activePdfLayout === 'row' ? 'Row Wise' : 'Column Wise'} layout`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-300" />
              <span>Download PDF</span>
            </button>

            {/* 2. Download PNG */}
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={validCount === 0 || Boolean(generationError)}
              className="inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white py-2.5 px-3 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
              title="Download barcode(s) as high-resolution PNG image"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download PNG</span>
            </button>

            {/* 3. Share Code */}
            <div
              className="relative"
              ref={shareDropdownRef}
              onMouseEnter={handleShareMouseEnter}
              onMouseLeave={handleShareMouseLeave}
            >
              <button
                type="button"
                onClick={handleShareButtonClick}
                disabled={validCount === 0 || Boolean(generationError)}
                aria-expanded={shareMenuOpen}
                aria-haspopup="true"
                className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#0F4C3A] py-2.5 px-3 rounded-xl text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-200 shadow-2xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-[#1E8262]" />
                <span>Share Code</span>
              </button>

              {/* Share Dropdown Menu */}
              {shareMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-50 space-y-1 before:absolute before:-top-3 before:left-0 before:right-0 before:h-3 before:content-['']">
                  <div className="px-2.5 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Share Options
                  </div>

                  <button
                    type="button"
                    onClick={handleShareDevice}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-[#0F4C3A] rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#1E8262]" />
                    <span>Device Share (Native)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-[#0F4C3A] rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Share on WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareEmail}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-[#0F4C3A] rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>Share via Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleCopyCode(value.trim());
                      closeShareMenu();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-[#0F4C3A] rounded-lg transition-colors text-left cursor-pointer border-t border-slate-100"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Code Text</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Message Banner */}
          {feedbackMessage && (
            <div className="mt-2.5 flex items-center justify-between bg-[#0F4C3A] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs animate-in fade-in slide-in-from-top-1">
              <span>{feedbackMessage}</span>
              <button
                type="button"
                onClick={() => setFeedbackMessage(null)}
                className="text-white/70 hover:text-white ml-2 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* LIVE CODE PREVIEW WORKSTATION */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          {/* Preview Panel Header with Row / Column View Toggle */}
          <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1E8262]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                LIVE CODE PREVIEW{' '}
                {results.length > 0 && (
                  <span className="text-slate-500 font-bold">
                    ({validCount} OF {results.length} {results.length === 1 ? 'CODE' : 'CODES'})
                  </span>
                )}
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Row / Column View Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPreviewView('row')}
                  className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    previewView === 'row'
                      ? 'bg-white text-[#0F4C3A] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Row View (Horizontal row grid layout)"
                >
                  <LayoutGrid className="w-3 h-3 text-[#1E8262]" />
                  <span>Row View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewView('column')}
                  className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    previewView === 'column'
                      ? 'bg-white text-[#0F4C3A] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Column View (Single vertical column layout)"
                >
                  <Rows className="w-3 h-3 text-[#1E8262]" />
                  <span>Column View</span>
                </button>
              </div>

              {/* Independent Barcode Zoom Controls */}
              <LabelPreviewZoomToolbar
                zoom={barcodeZoom}
                onZoomChange={setBarcodeZoom}
                onFitToPreview={() => {
                  const el = document.getElementById('barcode-preview-viewport');
                  if (el) {
                    const availW = el.clientWidth - 32;
                    const targetW = previewView === 'row' ? 520 : 380;
                    const fit = Math.max(0.5, Math.min(2.0, Math.floor((availW / targetW) * 20) / 20));
                    setBarcodeZoom(fit);
                  } else {
                    setBarcodeZoom(1.0);
                  }
                }}
                compact
                onFullScreen={() => setIsBarcodeFullScreenOpen(true)}
                magnifierActive={barcodeMagnifierActive}
                onToggleMagnifier={() => setBarcodeMagnifierActive((prev) => !prev)}
              />

              <span className="text-[10px] font-mono font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                {barcodeType} • {widthInches.toFixed(2)}×{heightInches.toFixed(2)} in
              </span>

              {validCount > 0 && !generationError && (
                <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> SCANNABLE
                </span>
              )}
            </div>
          </div>

          {/* Live Preview Scrollable Content Container with Hand Tool Drag-to-Pan */}
          <div className="p-3 bg-slate-50/50">
            <div
              id="barcode-preview-viewport"
              ref={barcodeViewportRef}
              {...barcodePanProps}
              className={`min-h-[300px] max-h-[calc(100vh-220px)] overflow-y-auto bg-slate-100/70 border border-slate-200 rounded-xl p-2 flex flex-col items-center justify-center relative shadow-inner ${barcodeCursorClass}`}
              style={{
                ...barcodePanProps.style,
              }}
            >
            {/* Subtle background grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                backgroundSize: '12px 12px',
              }}
            />

            {generationError && results.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-3 max-w-[340px]">
                <AlertCircle className="w-7 h-7 text-amber-500 mb-1.5 animate-pulse" />
                <p className="text-xs font-bold text-amber-800 leading-snug">{generationError}</p>
                {barcodeType === 'CODE128' && generationError.includes('Unsupported character') && (
                  <button
                    type="button"
                    onClick={() => handleTypeChange('QR')}
                    className="mt-2 text-[10px] font-black uppercase tracking-wider text-white bg-[#0F4C3A] hover:bg-[#155d47] px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    Switch to 2D QR Code
                  </button>
                )}
              </div>
            ) : (
              <div
                style={{
                  width: barcodeZoom !== 1 ? `${Math.round(100 * barcodeZoom)}%` : '100%',
                  transform: barcodeZoom !== 1 ? `scale(${barcodeZoom})` : undefined,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out, width 0.15s ease-out',
                }}
                className="w-full flex flex-col items-center z-10"
              >
                <LabelHoverMagnifier
                  zoom={barcodeZoom}
                  disabled={!barcodeMagnifierActive}
                  onOpenFullScreen={() => setIsBarcodeFullScreenOpen(true)}
                  className="w-full flex flex-col items-center"
                >
                {results.length > 1 ? (
                  /* MULTIPLE BARCODES PREVIEW CONTAINER */
                  <div
                    className={`w-full p-0.5 z-10 ${
                      previewView === 'row'
                        ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2'
                        : 'space-y-2'
                    }`}
                  >
                    {results.map((item, idx) => (
                      <div
                        key={`${item.text}-${idx}`}
                        className={`label-card-target bg-white p-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col relative hover:border-slate-300 transition-colors overflow-hidden ${
                          previewView === 'row'
                            ? 'justify-between min-h-[115px]'
                            : 'items-center justify-center'
                        }`}
                      >
                        {/* Top Bar with Entry Index and Value */}
                        <div className="w-full flex items-center justify-between border-b border-slate-100 pb-1 mb-1.5 gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-mono font-black text-black truncate" title={item.text}>
                              {item.text}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyBarcodeImage(item, idx)}
                            className="text-[10px] text-slate-500 hover:text-[#0F4C3A] flex items-center gap-1 font-bold cursor-pointer shrink-0"
                            title="Copy complete barcode image to clipboard"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedIndex === idx ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>

                        {item.success && item.pngDataUrl ? (
                          <div className="flex flex-col items-center justify-center w-full py-0.5 overflow-hidden">
                            <img
                              src={item.pngDataUrl}
                              alt={`${barcodeType} ${item.text}`}
                              className={`object-contain max-w-full ${
                                previewView === 'row' ? 'max-h-[110px]' : 'max-h-[140px]'
                              }`}
                              style={{
                                maxWidth: '100%',
                                width: `${Math.round(widthInches * 96)}px`,
                                height: `${Math.round(heightInches * 96)}px`,
                              }}
                            />
                          </div>
                        ) : (
                          <div className="text-[11px] font-bold text-red-600 py-2 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{item.error || 'Failed to generate code'}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : results.length === 1 && results[0].success && results[0].pngDataUrl ? (
                  /* SINGLE BARCODE PREVIEW */
                  <div className="w-full p-0.5 z-10">
                    <div className="label-card-target bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col relative hover:border-slate-300 transition-colors">
                      {/* Top Bar with Entry Index and Value */}
                      <div className="w-full flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2 gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                            #1
                          </span>
                          <span className="text-xs font-mono font-black text-black truncate" title={results[0].text}>
                            {results[0].text}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyBarcodeImage(results[0], 0)}
                          className="text-[10px] text-slate-500 hover:text-[#0F4C3A] flex items-center gap-1 font-bold cursor-pointer shrink-0"
                          title="Copy complete barcode image to clipboard"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedIndex === 0 ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>

                      <div className="flex flex-col items-center justify-center w-full py-2 overflow-hidden">
                        <img
                          src={results[0].pngDataUrl}
                          alt={`${barcodeType} ${results[0].text}`}
                          className="object-contain max-w-full max-h-[180px]"
                          style={{
                            maxWidth: '100%',
                            width: `${Math.round(widthInches * 96)}px`,
                            height: `${Math.round(heightInches * 96)}px`,
                          }}
                        />
                      </div>

                      {barcodeType === 'QR' && (
                        <div className="mt-2 text-center">
                          <span className="text-xs font-mono font-bold text-slate-800 break-all bg-white px-2.5 py-1 rounded border border-slate-200 inline-block max-w-[280px] truncate shadow-2xs">
                            {results[0].text}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 text-xs font-medium py-12">
                    Generating preview...
                  </div>
                )}
                </LabelHoverMagnifier>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Full-Screen Barcode Preview Modal (90-95% Viewport) */}
    <FullScreenLabelPreviewModal
      isOpen={isBarcodeFullScreenOpen}
      onClose={() => setIsBarcodeFullScreenOpen(false)}
      title="FULL-SCREEN BARCODE INSPECTION"
      badge={
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-emerald-400 rounded border border-slate-700">
          {barcodeType} • {widthInches}×{heightInches} in
        </span>
      }
      targetWidthPx={Math.round(widthInches * 96)}
      targetHeightPx={Math.round(heightInches * 96)}
    />
  </div>
);
}
