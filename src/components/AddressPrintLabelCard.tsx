'use client';

import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { ShippingLabelTemplateData } from '@/lib/shippingLabel';

export interface FieldFormatting {
  bold: boolean;
  underline: boolean;
  fontSize: number; // in pt
}

export interface SectionFormatting {
  companyName: FieldFormatting;
  contactPerson: FieldFormatting;
  mobile: FieldFormatting;
  address1: FieldFormatting;
  pincode: FieldFormatting;
  city: FieldFormatting;
  state: FieldFormatting;
}

export const DEFAULT_TO_FORMATTING: SectionFormatting = {
  companyName: { bold: true, underline: false, fontSize: 13 },
  contactPerson: { bold: true, underline: false, fontSize: 10 },
  mobile: { bold: true, underline: false, fontSize: 10 },
  address1: { bold: false, underline: false, fontSize: 10 },
  pincode: { bold: true, underline: false, fontSize: 10 },
  city: { bold: true, underline: false, fontSize: 10 },
  state: { bold: true, underline: false, fontSize: 10 },
};

export const DEFAULT_FROM_FORMATTING: SectionFormatting = {
  companyName: { bold: true, underline: false, fontSize: 12 },
  contactPerson: { bold: true, underline: false, fontSize: 10 },
  mobile: { bold: true, underline: false, fontSize: 10 },
  address1: { bold: false, underline: false, fontSize: 10 },
  pincode: { bold: true, underline: false, fontSize: 10 },
  city: { bold: true, underline: false, fontSize: 10 },
  state: { bold: true, underline: false, fontSize: 10 },
};

export interface AddressPrintData {
  // Consignee (TO)
  to_name: string;
  to_contact_person?: string;
  to_include_contact_person?: boolean;
  to_mobile: string;
  to_address: string;
  to_address_line_1?: string;
  to_city?: string;
  to_state?: string;
  to_address_html?: string;
  to_pincode: string;
  to_text_case?: 'normal' | 'uppercase' | 'lowercase';
  to_formatting?: SectionFormatting;

  // Consignor (FROM)
  from_name: string;
  from_contact_person?: string;
  from_include_contact_person?: boolean;
  from_mobile: string;
  from_address: string;
  from_address_line_1?: string;
  from_city?: string;
  from_state?: string;
  from_address_html?: string;
  from_pincode: string;
  from_text_case?: 'normal' | 'uppercase' | 'lowercase';
  from_formatting?: SectionFormatting;

  // Metadata
  tracking_number?: string;
  courier_company?: string;
  courier_logo?: string;
  date?: string;
  time?: string;
  package_count?: string;
}

export interface AddressPrintLabelCardProps {
  template: ShippingLabelTemplateData;
  data: AddressPrintData;
  id?: string;
  scale?: number;
  onQrGenerated?: (dataUrl: string) => void;
  onBarcodeGenerated?: (dataUrl: string) => void;
}

interface TopRoutingBarcodeProps {
  trackingNumber?: string;
  isA4: boolean;
  isSmall: boolean;
  targetWidthPx: number;
  heightInches: number;
  onBarcodeGenerated?: (dataUrl: string) => void;
}

function TopRoutingBarcode({
  trackingNumber,
  isA4,
  isSmall,
  targetWidthPx,
  heightInches,
  onBarcodeGenerated,
}: TopRoutingBarcodeProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isValid, setIsValid] = useState<boolean>(true);

  const cleanTracking = trackingNumber ? trackingNumber.trim() : '';

  // Barcode dimensions tailored to the label size
  const barcodeHeight = isA4
    ? 52
    : heightInches >= 5.0
    ? 40
    : heightInches >= 3.5
    ? 32
    : 22;

  const textFontSizePt = isA4
    ? 12
    : heightInches >= 5.0
    ? 10
    : heightInches >= 3.5
    ? 9
    : 7.5;

  const marginBottom = isA4
    ? '18px'
    : heightInches >= 5.0
    ? '14px'
    : heightInches >= 3.5
    ? '10px'
    : '6px';

  // Dynamic bar width multiplier to guarantee it never overflows label boundaries
  const estimatedModules = cleanTracking.length * 11 + 55;
  const paddingSidesPx = isA4 ? 190 : isSmall ? 38 : 64;
  const availableWidthPx = Math.max(100, targetWidthPx - paddingSidesPx);
  const barWidth = Math.max(
    1.0,
    Math.min(
      isA4 ? 2.5 : isSmall ? 1.5 : 1.9,
      Math.floor((availableWidthPx / Math.max(50, estimatedModules)) * 10) / 10
    )
  );

  useEffect(() => {
    if (!svgRef.current || !cleanTracking) {
      setIsValid(false);
      return;
    }

    try {
      JsBarcode(svgRef.current, cleanTracking, {
        format: 'CODE128',
        displayValue: false, // Centered human-readable tracking number rendered cleanly beneath
        margin: 0,
        height: barcodeHeight,
        width: barWidth,
        background: 'transparent',
        lineColor: '#000000',
      });
      setIsValid(true);

      if (onBarcodeGenerated && typeof document !== 'undefined') {
        try {
          const tempCanvas = document.createElement('canvas');
          JsBarcode(tempCanvas, cleanTracking, {
            format: 'CODE128',
            displayValue: false,
            margin: 0,
            height: barcodeHeight,
            width: barWidth,
            background: '#ffffff',
            lineColor: '#000000',
          });
          onBarcodeGenerated(tempCanvas.toDataURL('image/png'));
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Failed to render Code 128 barcode for value:', cleanTracking, err);
      setIsValid(false);
    }
  }, [cleanTracking, barcodeHeight, barWidth, onBarcodeGenerated]);

  if (!cleanTracking || !isValid) return null;

  return (
    <div
      style={{ marginBottom }}
      className="w-full flex flex-col items-center justify-center shrink-0"
    >
      <svg
        ref={svgRef}
        style={{
          height: `${barcodeHeight}px`,
          width: 'auto',
          maxWidth: '100%',
          display: 'block',
        }}
      />
      <div
        style={{
          fontSize: `${textFontSizePt}pt`,
          letterSpacing: '0.12em',
          lineHeight: 1.25,
          fontWeight: 700,
          color: '#000000',
          marginTop: '2.5px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        }}
        className="text-center font-mono select-all tracking-wider"
      >
        {cleanTracking}
      </div>
    </div>
  );
}

export default function AddressPrintLabelCard({
  template,
  data,
  id = 'address-label-live-preview',
  scale = 1,
  onBarcodeGenerated,
}: AddressPrintLabelCardProps) {
  const heightInches = template.heightInches || 6.0;
  const widthInches = template.widthInches || 4.0;
  const targetWidthPx = Math.round(widthInches * 96);
  const targetHeightPx = Math.round(heightInches * 96);

  const isA4 = template.sizePreset === 'a4' || widthInches >= 8.0 || heightInches >= 10.0;
  const isSmall = heightInches <= 3.0;

  const toCaseClass =
    data.to_text_case === 'lowercase'
      ? 'lowercase'
      : data.to_text_case === 'normal'
      ? 'normal-case'
      : 'uppercase';
  const fromCaseClass =
    data.from_text_case === 'lowercase'
      ? 'lowercase'
      : data.from_text_case === 'normal'
      ? 'normal-case'
      : 'uppercase';

  const toContactPersonClean =
    data.to_include_contact_person && data.to_contact_person ? data.to_contact_person.trim() : '';
  const fromContactPersonClean =
    data.from_include_contact_person && data.from_contact_person ? data.from_contact_person.trim() : '';

  const toFmt = data.to_formatting || DEFAULT_TO_FORMATTING;
  const fromFmt = data.from_formatting || DEFAULT_FROM_FORMATTING;

  return (
    <div
      className={`relative select-none ${
        scale !== 1 ? 'overflow-hidden flex items-center justify-center' : 'flex flex-col items-center'
      }`}
      style={
        scale !== 1
          ? {
              width: `${Math.round(targetWidthPx * scale)}px`,
              height: `${Math.round(targetHeightPx * scale)}px`,
            }
          : undefined
      }
    >
      <div
        id={id}
        style={{
          width: `${targetWidthPx}px`,
          height: `${targetHeightPx}px`,
          maxHeight: `${targetHeightPx}px`,
          padding: isA4 ? '25mm' : isSmall ? '5mm' : '8mm',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: isA4 ? '0 0' : scale !== 1 ? 'top left' : 'top center',
          position: isA4 && scale !== 1 ? 'absolute' : 'relative',
          top: 0,
          left: 0,
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          color: '#000000',
        }}
        className="bg-white text-black flex flex-col justify-start items-start overflow-hidden box-border border-0 shadow-sm"
      >
        {/* ========================================================================= */}
        {/* TOP ROUTING BARCODE (CODE 128) - RENDERED WHEN TRACKING NUMBER IS ENTERED */}
        {/* ========================================================================= */}
        <TopRoutingBarcode
          trackingNumber={data.tracking_number}
          isA4={isA4}
          isSmall={isSmall}
          targetWidthPx={targetWidthPx}
          heightInches={heightInches}
          onBarcodeGenerated={onBarcodeGenerated}
        />

        {/* ========================================================================= */}
        {/* SECTION 1: TO ADDRESS (PLAIN FORMAT, SIMPLIFIED HEADING)                  */}
        {/* ========================================================================= */}
        <div className="w-full text-left leading-normal">
          {/* Simplified Heading: TO */}
          <div className="font-black uppercase tracking-wider text-black text-[13px] sm:text-[14px] mb-1.5">
            TO
          </div>

          {/* Recipient / Company Name */}
          <div
            style={{
              fontWeight: toFmt.companyName.bold ? 900 : 400,
              textDecoration: toFmt.companyName.underline ? 'underline' : 'none',
              fontSize: `${toFmt.companyName.fontSize}pt`,
              lineHeight: 1.25,
            }}
            className={`leading-snug text-black break-words ${toCaseClass}`}
          >
            {data.to_name || 'Recipient / Company Name'}
          </div>

          {/* Contact Person (if provided) */}
          {toContactPersonClean && (
            <div
              style={{
                fontWeight: toFmt.contactPerson.bold ? 700 : 400,
                textDecoration: toFmt.contactPerson.underline ? 'underline' : 'none',
                fontSize: `${toFmt.contactPerson.fontSize}pt`,
                lineHeight: 1.3,
              }}
              className={`text-slate-800 break-words mt-0.5 ${toCaseClass}`}
            >
              Attn: {toContactPersonClean}
            </div>
          )}

          {/* Address Line 1 / Formatted HTML */}
          {data.to_address_html ? (
            <div
              style={{
                fontWeight: toFmt.address1.bold ? 700 : 400,
                textDecoration: toFmt.address1.underline ? 'underline' : 'none',
                fontSize: `${toFmt.address1.fontSize}pt`,
                lineHeight: 1.4,
              }}
              className="leading-relaxed text-slate-900 break-words mt-1"
              dangerouslySetInnerHTML={{ __html: data.to_address_html }}
            />
          ) : (
            <div
              style={{
                fontWeight: toFmt.address1.bold ? 700 : 400,
                textDecoration: toFmt.address1.underline ? 'underline' : 'none',
                fontSize: `${toFmt.address1.fontSize}pt`,
                lineHeight: 1.4,
              }}
              className="leading-relaxed text-slate-900 break-words mt-1"
            >
              {data.to_address_line_1 || data.to_address || 'Address Line 1'}
            </div>
          )}

          {/* City, State, and Pincode */}
          {(() => {
            const hasCity = Boolean(data.to_city);
            const hasState = Boolean(data.to_state);
            const hasPin = Boolean(data.to_pincode && data.to_pincode.trim());
            if (!hasCity && !hasState && !hasPin) return null;

            return (
              <div className={`break-words mt-1 flex flex-wrap items-baseline gap-x-1.5 ${toCaseClass}`}>
                {hasCity && (
                  <span
                    style={{
                      fontWeight: toFmt.city.bold ? 700 : 400,
                      textDecoration: toFmt.city.underline ? 'underline' : 'none',
                      fontSize: `${toFmt.city.fontSize}pt`,
                    }}
                    className="text-slate-900"
                  >
                    {data.to_city}{hasState ? ',' : ''}
                  </span>
                )}
                {hasState && (
                  <span
                    style={{
                      fontWeight: toFmt.state.bold ? 700 : 400,
                      textDecoration: toFmt.state.underline ? 'underline' : 'none',
                      fontSize: `${toFmt.state.fontSize}pt`,
                    }}
                    className="text-slate-900"
                  >
                    {data.to_state}
                  </span>
                )}
                {hasPin && (
                  <span
                    style={{
                      fontWeight: toFmt.pincode.bold ? 700 : 400,
                      textDecoration: toFmt.pincode.underline ? 'underline' : 'none',
                      fontSize: `${toFmt.pincode.fontSize}pt`,
                    }}
                    className="text-slate-900"
                  >
                    {hasCity || hasState ? `- ${data.to_pincode.trim()}` : `PIN: ${data.to_pincode.trim()}`}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Mobile Number (if provided) */}
          {data.to_mobile && data.to_mobile.trim() !== '—' && (
            <div
              style={{
                fontWeight: toFmt.mobile.bold ? 700 : 400,
                textDecoration: toFmt.mobile.underline ? 'underline' : 'none',
                fontSize: `${toFmt.mobile.fontSize}pt`,
                lineHeight: 1.3,
              }}
              className="text-black mt-1"
            >
              Mobile: <span className="font-mono">{data.to_mobile}</span>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* EXACTLY 3 CM (30 MM) GAP BETWEEN CONTENT OF TO AND FROM ADDRESS BLOCKS     */}
        {/* ========================================================================= */}
        <div
          style={{
            height: isSmall ? '8mm' : '30mm',
            minHeight: isSmall ? '8mm' : '30mm',
            width: '100%',
            flexShrink: 0,
          }}
          aria-hidden="true"
        />

        {/* ========================================================================= */}
        {/* SECTION 2: FROM ADDRESS (PLAIN FORMAT, SIMPLIFIED HEADING)                */}
        {/* ========================================================================= */}
        <div className="w-full text-left leading-normal">
          {/* Simplified Heading: FROM */}
          <div className="font-black uppercase tracking-wider text-black text-[13px] sm:text-[14px] mb-1.5">
            FROM
          </div>

          {/* Sender / Company Name */}
          <div
            style={{
              fontWeight: fromFmt.companyName.bold ? 900 : 400,
              textDecoration: fromFmt.companyName.underline ? 'underline' : 'none',
              fontSize: `${fromFmt.companyName.fontSize}pt`,
              lineHeight: 1.25,
            }}
            className={`leading-snug text-black break-words ${fromCaseClass}`}
          >
            {data.from_name || 'Sender / Company Name'}
          </div>

          {/* Contact Person (if provided) */}
          {fromContactPersonClean && (
            <div
              style={{
                fontWeight: fromFmt.contactPerson.bold ? 700 : 400,
                textDecoration: fromFmt.contactPerson.underline ? 'underline' : 'none',
                fontSize: `${fromFmt.contactPerson.fontSize}pt`,
                lineHeight: 1.3,
              }}
              className={`text-slate-800 break-words mt-0.5 ${fromCaseClass}`}
            >
              Attn: {fromContactPersonClean}
            </div>
          )}

          {/* Address Line 1 / Formatted HTML */}
          {data.from_address_html ? (
            <div
              style={{
                fontWeight: fromFmt.address1.bold ? 700 : 400,
                textDecoration: fromFmt.address1.underline ? 'underline' : 'none',
                fontSize: `${fromFmt.address1.fontSize}pt`,
                lineHeight: 1.4,
              }}
              className="leading-relaxed text-slate-800 break-words mt-1"
              dangerouslySetInnerHTML={{ __html: data.from_address_html }}
            />
          ) : (
            <div
              style={{
                fontWeight: fromFmt.address1.bold ? 700 : 400,
                textDecoration: fromFmt.address1.underline ? 'underline' : 'none',
                fontSize: `${fromFmt.address1.fontSize}pt`,
                lineHeight: 1.4,
              }}
              className="leading-relaxed text-slate-800 break-words mt-1"
            >
              {data.from_address_line_1 || data.from_address || 'Address Line 1'}
            </div>
          )}

          {/* City, State, and Pincode */}
          {(() => {
            const hasCity = Boolean(data.from_city);
            const hasState = Boolean(data.from_state);
            const hasPin = Boolean(data.from_pincode && data.from_pincode.trim());
            if (!hasCity && !hasState && !hasPin) return null;

            return (
              <div className={`break-words mt-1 flex flex-wrap items-baseline gap-x-1.5 ${fromCaseClass}`}>
                {hasCity && (
                  <span
                    style={{
                      fontWeight: fromFmt.city.bold ? 700 : 400,
                      textDecoration: fromFmt.city.underline ? 'underline' : 'none',
                      fontSize: `${fromFmt.city.fontSize}pt`,
                    }}
                    className="text-slate-900"
                  >
                    {data.from_city}{hasState ? ',' : ''}
                  </span>
                )}
                {hasState && (
                  <span
                    style={{
                      fontWeight: fromFmt.state.bold ? 700 : 400,
                      textDecoration: fromFmt.state.underline ? 'underline' : 'none',
                      fontSize: `${fromFmt.state.fontSize}pt`,
                    }}
                    className="text-slate-900"
                  >
                    {data.from_state}
                  </span>
                )}
                {hasPin && (
                  <span
                    style={{
                      fontWeight: fromFmt.pincode.bold ? 700 : 400,
                      textDecoration: fromFmt.pincode.underline ? 'underline' : 'none',
                      fontSize: `${fromFmt.pincode.fontSize}pt`,
                    }}
                    className="text-slate-900"
                  >
                    {hasCity || hasState ? `- ${data.from_pincode.trim()}` : `PIN: ${data.from_pincode.trim()}`}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Mobile Number (if provided) */}
          {data.from_mobile && data.from_mobile.trim() !== '—' && (
            <div
              style={{
                fontWeight: fromFmt.mobile.bold ? 700 : 400,
                textDecoration: fromFmt.mobile.underline ? 'underline' : 'none',
                fontSize: `${fromFmt.mobile.fontSize}pt`,
                lineHeight: 1.3,
              }}
              className="text-black mt-1"
            >
              Mobile: <span className="font-mono">{data.from_mobile}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
