import jsPDF from 'jspdf';
import {
  ProformaInvoiceInput,
  ProformaInvoiceRecord,
  ProformaInvoiceItem,
  formatRelationshipDisplay,
  formatNameWithTitle,
} from '@/lib/proformaInvoiceDb';

export type ProformaInvoicePdfData =
  | ProformaInvoiceInput
  | ProformaInvoiceRecord
  | (ProformaInvoiceInput & { id?: string });

/**
 * HTML character escaper to prevent XSS / broken markup in print and PDF generation
 */
function escapeHtml(text?: string | number | null): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates standalone, pristine A4 HTML specifically engineered for 300 DPI PDF rasterization and printing.
 *
 * Requirements Met:
 * 1. Clean typography: Arial, Helvetica, sans-serif
 * 2. Ample line-height (1.45 - 1.5) preventing character and line overlapping
 * 3. Proper cell padding (6px - 12px) preventing text from touching borders
 * 4. Natural word-wrapping (break-word) without text truncation or clipping
 * 5. Distinct headings, company names, addresses, contacts, and emails
 * 6. Perfectly formatted Goods table with 6+ rows, aligned HSN, Qty, Rate, and Value INR
 * 7. Value in Words clearly separated and legible
 * 8. Full legal Declaration statement with comfortable reading layout
 * 9. Signature image preserved cleanly WITHOUT the blue "✓ DIGITAL SIGNATURE" mark
 */
export function generateProformaInvoicePrintHtml(data: ProformaInvoicePdfData): string {
  const invoiceNumber = data.invoiceNumber || '1516';
  const invoiceDate = data.invoiceDate || '29.03.2025';

  // Consignor info
  const consignorName = formatNameWithTitle(data.consignorTitle, data.consignorName) || '_____________________________________';
  const consignorRelationshipStr = formatRelationshipDisplay(
    data.consignorRelationshipType,
    data.consignorRelationshipName
  );
  const consignorAddressParts = [
    data.consignorAddress,
    data.consignorCity,
    data.consignorState,
    data.consignorPincode,
    data.consignorCountry,
  ].filter(Boolean);
  const consignorAddressStr = consignorAddressParts.length > 0
    ? consignorAddressParts.join(', ')
    : 'Address, City, State, PIN, Country';

  const consignorContactStr = data.consignorContact
    ? `${data.consignorCountryCode && !data.consignorContact.startsWith('+') ? `${data.consignorCountryCode} ` : ''}${data.consignorContact}`
    : data.consignorCountryCode || '';

  // Consignee info
  const consigneeName = formatNameWithTitle(data.consigneeTitle, data.consigneeName) || '_____________________________________';
  const consigneeRelationshipStr = formatRelationshipDisplay(
    data.consigneeRelationshipType,
    data.consigneeRelationshipName
  );
  const consigneeAddressParts = [
    data.consigneeAddress,
    data.consigneeCity,
    data.consigneeState,
    data.consigneePincode,
    data.consigneeCountry,
  ].filter(Boolean);
  const consigneeAddressStr = consigneeAddressParts.length > 0
    ? consigneeAddressParts.join(', ')
    : 'Address, City, State, PIN, Country';

  const consigneeContactStr = data.consigneeContact
    ? `${data.consigneeCountryCode && !data.consigneeContact.startsWith('+') ? `${data.consigneeCountryCode} ` : ''}${data.consigneeContact}`
    : data.consigneeCountryCode || '';

  // KYC details
  let kycDisplay = data.kycNumber || '6566 1068 9680';
  if (data.kycMasked && data.kycNumber) {
    kycDisplay = data.kycNumber.replace(/\d(?=\d{4})/g, '•');
  }

  // Items table: guarantee at least 6 initial rows
  const rawItems = (data.items && data.items.length > 0) ? data.items : [];
  const totalRowsCount = Math.max(6, rawItems.length);
  const tableRows: ProformaInvoiceItem[] = [];
  for (let i = 0; i < totalRowsCount; i++) {
    const existing = rawItems[i];
    if (existing) {
      tableRows.push(existing);
    } else {
      tableRows.push({
        id: `empty-row-${i + 1}`,
        sNo: i + 1,
        description: '',
        hsnCode: '',
        quantity: '',
        rate: '',
        valueInr: 0,
      });
    }
  }

  const totalValueStr = (data.totalValue || 0).toLocaleString('en-IN');
  const valueInWords = data.valueInWords || 'ZERO ONLY';
  const declarationText = data.declarationText ||
    'We declare that invoice shows the actual price of goods described and that all particulars are true and correct.';

  return `
    <div style="
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      background: #FFFFFF;
      color: #000000;
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    ">
      <!-- Main Master Outer Border: Exactly 190mm width, 2px solid black, overflow hidden prevents border clipping -->
      <div style="
        border: 2px solid #000000;
        box-sizing: border-box;
        background: #FFFFFF;
        width: 100%;
        overflow: hidden;
      ">
        <!-- 1. TOP HEADER: PROFORMA INVOICE -->
        <div style="
          border-bottom: 2px solid #000000;
          padding: 9px 12px;
          text-align: center;
          box-sizing: border-box;
          width: 100%;
        ">
          <h1 style="
            margin: 0;
            padding: 0;
            font-size: 15px;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #000000;
          ">PROFORMA INVOICE</h1>
        </div>

        <!-- 2. BLOCK 1: CONSIGNOR (Left 50%) & DATE / INVOICE / KYC (Right 50%) -->
        <!-- FULL-WIDTH HORIZONTAL DIVIDER LINE AT BOTTOM OF CONSIGNOR SECTION -->
        <div style="
          display: flex;
          border-bottom: 2px solid #000000;
          box-sizing: border-box;
          width: 100%;
        ">
          <!-- LEFT 50%: CONSIGNOR -->
          <div style="
            width: 50%;
            border-right: 2px solid #000000;
            padding: 9px 12px;
            box-sizing: border-box;
          ">
            <div style="
              font-weight: 700;
              text-decoration: underline;
              font-size: 12.5px;
              letter-spacing: 0.5px;
              margin-bottom: 5px;
              text-transform: uppercase;
            ">CONSIGNOR</div>
            <div style="
              font-weight: 700;
              font-size: 10.2px;
              line-height: 1.4;
              margin-bottom: 4px;
              word-break: break-word;
            ">${escapeHtml(consignorName)}</div>
            ${consignorRelationshipStr ? `
              <div style="
                font-weight: 700;
                font-size: 9.2px;
                line-height: 1.35;
                margin-bottom: 4px;
                color: #000000;
                word-break: break-word;
              ">${escapeHtml(consignorRelationshipStr)}</div>
            ` : ''}
            <div style="
              font-size: 9.2px;
              line-height: 1.45;
              color: #111111;
              margin-bottom: 5px;
              word-break: break-word;
            ">${escapeHtml(consignorAddressStr)}</div>
            ${consignorContactStr ? `
              <div style="
                font-size: 9.2px;
                line-height: 1.4;
                color: #111111;
                margin-bottom: 3px;
              "><span style="font-weight: 700;">Contact:</span> <span style="font-family: monospace, Arial; font-weight: 500;">${escapeHtml(consignorContactStr)}</span></div>
            ` : ''}
            <div style="
              font-size: 9.2px;
              line-height: 1.4;
              color: #111111;
              word-break: break-all;
            "><span style="font-weight: 700;">E - Mail ID:</span> <span style="font-weight: 400;">${escapeHtml(data.consignorEmail || '_________________________')}</span></div>
          </div>

          <!-- RIGHT 50%: Date, Invoice No, KYC Details -->
          <div style="
            width: 50%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
          ">
            <!-- Row 1: Date -->
            <div style="
              display: flex;
              border-bottom: 1px solid #000000;
              box-sizing: border-box;
            ">
              <div style="
                width: 50%;
                padding: 6px 10px;
                border-right: 1px solid #000000;
                font-size: 11.5px;
                font-weight: 700;
                box-sizing: border-box;
              ">Date : <span style="font-family: monospace, Arial; font-weight: 500; font-size: 9.8px;">${escapeHtml(invoiceDate)}</span></div>
              <div style="width: 50%; padding: 6px 10px; box-sizing: border-box;"></div>
            </div>

            <!-- Row 2: Invoice No -->
            <div style="
              padding: 6px 10px;
              border-bottom: 1px solid #000000;
              font-size: 11.5px;
              font-weight: 700;
              box-sizing: border-box;
            ">invoice no: <span style="font-family: monospace, Arial; font-weight: 500; font-size: 9.8px;">${escapeHtml(invoiceNumber)}</span></div>

            <!-- Blank spacing box - horizontal line immediately above KYC DETAILS removed -->
            <div style="min-height: 14px; box-sizing: border-box;"></div>

            <!-- Row 3: KYC DETAILS (Divider line immediately above KYC DETAILS removed) -->
            <div style="
              padding: 6px 10px 10px 10px;
              text-align: center;
              box-sizing: border-box;
            ">
              <div style="
                font-size: 12.5px;
                font-weight: 800;
                letter-spacing: 0.5px;
                margin-bottom: 2px;
                text-transform: uppercase;
              ">KYC DETAILS</div>
              <div style="
                font-size: 12px;
                font-weight: 700;
                text-decoration: underline;
                margin-bottom: 3px;
                text-transform: uppercase;
              ">${escapeHtml(data.kycType || 'AADHAR NO')}</div>
              <div style="
                font-family: monospace, Arial;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 1.2px;
              ">${escapeHtml(kycDisplay)}</div>
            </div>
          </div>
        </div>

        <!-- 3. BLOCK 2: CONSIGNEE (Left 50%) & COUNTRY OF ORIGIN / DESTINATION (Right 50%) -->
        <!-- FULL-WIDTH HORIZONTAL DIVIDER LINE AT BOTTOM OF CONSIGNEE SECTION -->
        <div style="
          display: flex;
          border-bottom: 2px solid #000000;
          box-sizing: border-box;
          width: 100%;
        ">
          <!-- LEFT 50%: CONSIGNEE -->
          <div style="
            width: 50%;
            border-right: 2px solid #000000;
            padding: 9px 12px;
            box-sizing: border-box;
          ">
            <div style="
              font-weight: 700;
              text-decoration: underline;
              font-size: 12.5px;
              letter-spacing: 0.5px;
              margin-bottom: 5px;
              text-transform: uppercase;
            ">CONSIGNEE</div>
            <div style="
              font-weight: 700;
              font-size: 10.2px;
              line-height: 1.4;
              margin-bottom: 4px;
              word-break: break-word;
            ">${escapeHtml(consigneeName)}</div>
            ${consigneeRelationshipStr ? `
              <div style="
                font-weight: 700;
                font-size: 9.2px;
                line-height: 1.35;
                margin-bottom: 4px;
                color: #000000;
                word-break: break-word;
              ">${escapeHtml(consigneeRelationshipStr)}</div>
            ` : ''}
            <div style="
              font-size: 9.2px;
              line-height: 1.45;
              color: #111111;
              margin-bottom: 5px;
              word-break: break-word;
            ">${escapeHtml(consigneeAddressStr)}</div>
            ${consigneeContactStr ? `
              <div style="
                font-size: 9.2px;
                line-height: 1.4;
                color: #111111;
                margin-bottom: 3px;
              "><span style="font-weight: 700;">Contact:</span> <span style="font-family: monospace, Arial; font-weight: 500;">${escapeHtml(consigneeContactStr)}</span></div>
            ` : ''}
            <div style="
              font-size: 9.2px;
              line-height: 1.4;
              color: #111111;
              word-break: break-all;
            "><span style="font-weight: 700;">E - Mail ID:</span> <span style="font-weight: 400;">${escapeHtml(data.consigneeEmail || '_________________________')}</span></div>
          </div>

          <!-- RIGHT 50%: Country of Origin of Goods & Country of Final Destination -->
          <div style="
            width: 50%;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            box-sizing: border-box;
          ">
            <!-- Blank spacer to align country section neatly -->
            <div style="flex: 1; min-height: 15px;"></div>

            <!-- Sub-row 1: Field Labels with Underline -->
            <div style="
              display: flex;
              border-top: 1px solid #000000;
              border-bottom: 1px solid #000000;
              box-sizing: border-box;
            ">
              <div style="
                width: 50%;
                padding: 6px 8px;
                border-right: 1px solid #000000;
                box-sizing: border-box;
                text-align: center;
              ">
                <span style="
                  font-size: 11.5px;
                  font-weight: 700;
                  text-decoration: underline;
                  display: inline-block;
                ">Country of Origin of Goods</span>
              </div>

              <div style="
                width: 50%;
                padding: 6px 8px;
                box-sizing: border-box;
                text-align: center;
              ">
                <span style="
                  font-size: 11.5px;
                  font-weight: 700;
                  text-decoration: underline;
                  display: inline-block;
                ">Country of Final Destination</span>
              </div>
            </div>

            <!-- Sub-row 2: Field Values beneath the horizontal line -->
            <div style="
              display: flex;
              box-sizing: border-box;
            ">
              <div style="
                width: 50%;
                padding: 7px 8px;
                border-right: 1px solid #000000;
                box-sizing: border-box;
                min-height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
              ">
                <span style="
                  font-size: 9.8px;
                  font-weight: 500;
                  word-break: break-word;
                  color: #000000;
                ">${escapeHtml(data.countryOfOrigin || 'India')}</span>
              </div>

              <div style="
                width: 50%;
                padding: 7px 8px;
                box-sizing: border-box;
                min-height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
              ">
                <span style="
                  font-size: 9.8px;
                  font-weight: 500;
                  word-break: break-word;
                  color: #000000;
                ">${escapeHtml(data.countryOfFinalDestination || '-')}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. BLOCK 3: SHIPMENT 3x2 MINI-TABLE (Left 50%) & RIGHT REMARKS (Right 50%) -->
        <div style="
          display: flex;
          border-bottom: 2px solid #000000;
          box-sizing: border-box;
        ">
          <!-- Left Column: 3x2 Table -->
          <div style="
            width: 50%;
            border-right: 2px solid #000000;
            display: grid;
            grid-template-columns: 1fr 1fr;
            box-sizing: border-box;
          ">
            <div style="
              padding: 5px 8px;
              border-bottom: 1px solid #000000;
              border-right: 1px solid #000000;
              box-sizing: border-box;
            ">
              <div style="font-size: 11px; font-weight: 700; text-decoration: underline; margin-bottom: 2px; text-align: left;">Pre Carriage by</div>
              <div style="font-size: 9.2px; color: #111111; word-break: break-word; text-align: center; display: flex; align-items: center; justify-content: center; min-height: 18px;">${escapeHtml(data.preCarriageBy || '-')}</div>
            </div>

            <div style="
              padding: 5px 8px;
              border-bottom: 1px solid #000000;
              box-sizing: border-box;
            ">
              <div style="font-size: 11px; font-weight: 700; text-decoration: underline; margin-bottom: 2px; text-align: left;">Place of Receipt by Pre-carrier</div>
              <div style="font-size: 9.2px; color: #111111; word-break: break-word; text-align: center; display: flex; align-items: center; justify-content: center; min-height: 18px;">${escapeHtml(data.placeOfReceiptByPreCarrier || '-')}</div>
            </div>

            <div style="
              padding: 5px 8px;
              border-bottom: 1px solid #000000;
              border-right: 1px solid #000000;
              box-sizing: border-box;
            ">
              <div style="font-size: 11px; font-weight: 700; text-decoration: underline; margin-bottom: 2px; text-align: left;">Vessel/Flight No</div>
              <div style="font-size: 9.2px; color: #111111; word-break: break-word; text-align: center; display: flex; align-items: center; justify-content: center; min-height: 18px;">${escapeHtml(data.vesselFlightNo || '-')}</div>
            </div>

            <div style="
              padding: 5px 8px;
              border-bottom: 1px solid #000000;
              box-sizing: border-box;
            ">
              <div style="font-size: 11px; font-weight: 700; text-decoration: underline; margin-bottom: 2px; text-align: left;">Port of Loading</div>
              <div style="font-size: 9.2px; color: #111111; word-break: break-word; text-align: center; display: flex; align-items: center; justify-content: center; min-height: 18px;">${escapeHtml(data.portOfLoading || '-')}</div>
            </div>

            <div style="
              padding: 5px 8px;
              border-right: 1px solid #000000;
              box-sizing: border-box;
            ">
              <div style="font-size: 11px; font-weight: 700; text-decoration: underline; margin-bottom: 2px; text-align: left;">Port of Discharge</div>
              <div style="font-size: 9.2px; color: #111111; word-break: break-word; text-align: center; display: flex; align-items: center; justify-content: center; min-height: 18px;">${escapeHtml(data.portOfDischarge || '-')}</div>
            </div>

            <div style="
              padding: 5px 8px;
              box-sizing: border-box;
            ">
              <div style="font-size: 11px; font-weight: 700; text-decoration: underline; margin-bottom: 2px; text-align: left;">Final Destination</div>
              <div style="font-size: 9.2px; color: #111111; word-break: break-word; text-align: center; display: flex; align-items: center; justify-content: center; min-height: 18px;">${escapeHtml(data.finalDestination || '-')}</div>
            </div>
          </div>

          <!-- Right Column: Shipping remarks / terms -->
          <div style="
            width: 50%;
            padding: 8px 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9.5px;
            color: #666666;
            font-style: italic;
            box-sizing: border-box;
          ">
            <span>(Export shipping terms &amp; package marks)</span>
          </div>
        </div>

        <!-- 5. BLOCK 4: GOODS DESCRIPTION AND VALUATION TABLE -->
        <div style="width: 100%; border-bottom: 2px solid #000000; box-sizing: border-box;">
          <table style="
            width: 100%;
            border-collapse: collapse;
            box-sizing: border-box;
            table-layout: fixed;
          ">
            <thead>
              <tr style="border-bottom: 2px solid #000000; font-weight: 700; font-size: 10.5px; background: #F1F5F9;">
                <th style="width: 8%; border-right: 1px solid #000000; padding: 5px 4px; text-align: center; box-sizing: border-box;">S.NO</th>
                <th style="width: 42%; border-right: 1px solid #000000; padding: 5px 8px; text-align: center; box-sizing: border-box;">DISCRIPTION OF GOODS</th>
                <th style="width: 16%; border-right: 1px solid #000000; padding: 5px 6px; text-align: center; box-sizing: border-box;">HSN CODE</th>
                <th style="width: 10%; border-right: 1px solid #000000; padding: 5px 4px; text-align: center; box-sizing: border-box;">QTY</th>
                <th style="width: 11%; border-right: 1px solid #000000; padding: 5px 6px; text-align: center; box-sizing: border-box;">RATE</th>
                <th style="width: 13%; padding: 5px 6px; text-align: center; box-sizing: border-box;">VALUE INR</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows.map((row) => {
                const qtyVal = row.quantity !== '' && row.quantity !== undefined ? escapeHtml(row.quantity) : '';
                const rateVal = row.rate !== '' && row.rate !== undefined ? escapeHtml(row.rate) : '';
                const valInr = row.valueInr ? Number(row.valueInr).toLocaleString('en-IN') : '';

                return `
                  <tr style="height: 16px; min-height: 16px; font-size: 8.2px; line-height: 1.25;">
                    <td style="border-bottom: 1px solid #000000; border-right: 1px solid #000000; text-align: center; font-weight: 600; padding: 2px 4px; vertical-align: middle; box-sizing: border-box;">
                      ${escapeHtml(row.sNo)}
                    </td>
                    <td style="border-bottom: 1px solid #000000; border-right: 1px solid #000000; padding: 2px 8px; vertical-align: middle; word-break: break-word; box-sizing: border-box;">
                      ${escapeHtml(row.description || '')}
                    </td>
                    <td style="border-bottom: 1px solid #000000; border-right: 1px solid #000000; text-align: center; font-family: monospace, Arial; padding: 2px 4px; vertical-align: middle; box-sizing: border-box;">
                      ${escapeHtml(row.hsnCode || '')}
                    </td>
                    <td style="border-bottom: 1px solid #000000; border-right: 1px solid #000000; text-align: center; font-family: monospace, Arial; font-weight: 500; padding: 2px 4px; vertical-align: middle; box-sizing: border-box;">
                      ${qtyVal}
                    </td>
                    <td style="border-bottom: 1px solid #000000; border-right: 1px solid #000000; text-align: right; font-family: monospace, Arial; font-weight: 500; padding: 2px 8px; vertical-align: middle; box-sizing: border-box;">
                      ${rateVal}
                    </td>
                    <td style="border-bottom: 1px solid #000000; text-align: right; font-family: monospace, Arial; font-weight: 600; padding: 2px 8px; vertical-align: middle; box-sizing: border-box;">
                      ${valInr}
                    </td>
                  </tr>
                `;
              }).join('')}

              <!-- TOTAL VALUE ROW (Repositioned text towards the right, closer to amount column) -->
              <tr style="border-top: 2px solid #000000; font-weight: 800; font-size: 11.2px;">
                <td colspan="5" style="
                  border-right: 1px solid #000000;
                  padding: 4px 14px 4px 8px;
                  text-align: right;
                  letter-spacing: 1px;
                  vertical-align: middle;
                  box-sizing: border-box;
                ">
                  TOTAL VALUE:
                </td>
                <td style="
                  padding: 4px 10px;
                  text-align: right;
                  font-family: monospace, Arial;
                  font-weight: 800;
                  font-size: 10.2px;
                  vertical-align: middle;
                  box-sizing: border-box;
                ">
                  ${totalValueStr}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 6. BLOCK 5: VALUE IN WORDS (Full Width Row) -->
        <div style="
          border-bottom: 2px solid #000000;
          padding: 6px 12px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.5px;
          line-height: 1.45;
          text-transform: uppercase;
          word-break: break-word;
          box-sizing: border-box;
        ">
          VALUE IN WORDS: <span style="font-weight: 400; font-size: 9.8px; font-family: Arial, sans-serif;">${escapeHtml(valueInWords)}</span>
        </div>

        <!-- 7. BLOCK 6: DECLARATION (Left 50%) & SIGNATURE & DATE (Right 50%) -->
        <div style="
          display: flex;
          min-height: 115px;
          box-sizing: border-box;
        ">
          <!-- Left Column: Legal Declaration Statement -->
          <div style="
            width: 50%;
            padding: 9px 12px;
            border-right: 2px solid #000000;
            box-sizing: border-box;
            font-size: 10.5px;
            line-height: 1.5;
          ">
            <div style="
              font-weight: 700;
              text-decoration: underline;
              font-size: 12.5px;
              margin-bottom: 5px;
            ">Declaration :</div>
            <div style="
              font-size: 10.5px;
              line-height: 1.5;
              color: #000000;
              word-break: break-word;
            ">${escapeHtml(declarationText)}</div>
          </div>

          <!-- Right Column: Signature and Date (Horizontally Centered within this cell) -->
          <div style="
            width: 50%;
            padding: 9px 14px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            box-sizing: border-box;
          ">
            <!-- Signature Image Container: Horizontally Centered, +10% Enlarged -->
            <div style="
              width: 100%;
              height: 66px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 6px;
            ">
              ${data.signatureBase64 && data.signatureBase64.startsWith('data:image') ? `
                <img
                  src="${data.signatureBase64}"
                  alt="Consignee Signature"
                  style="
                    max-height: 62px;
                    max-width: 210px;
                    object-fit: contain;
                    display: block;
                    margin: 0 auto;
                  "
                />
              ` : `
                <div style="
                  height: 48px;
                  border-bottom: 1px solid #777777;
                  width: 195px;
                  margin: 0 auto;
                "></div>
              `}
            </div>

            <!-- Signature & Date Label: Horizontally Centered -->
            <div style="
              width: 100%;
              text-align: center;
              font-weight: 800;
              font-size: 12.5px;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              color: #000000;
            ">
              <span>SIGNATURE &amp; DATE</span>
              ${data.signatureDate ? `
                <span style="
                  font-family: monospace, Arial;
                  font-weight: 600;
                  font-size: 10px;
                  color: #222222;
                  margin-left: 6px;
                ">(${escapeHtml(data.signatureDate)})</span>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Pure Vector Fallback Generator using jsPDF native API
 */
export function generateVectorProformaInvoicePdf(data: ProformaInvoicePdfData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190mm
  const colHalf = contentWidth / 2; // 95mm
  let curY = margin;

  // Outer Border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(margin, margin, contentWidth, 277);

  // 1. Header
  curY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('PROFORMA INVOICE', pageWidth / 2, curY, { align: 'center' });
  curY += 4;
  doc.line(margin, curY, margin + contentWidth, curY);

  const block1Top = curY;
  const block1Height = 65;

  // Vertical split line
  doc.line(margin + colHalf, block1Top, margin + colHalf, block1Top + block1Height);

  // Left Column: CONSIGNOR & CONSIGNEE
  const consignorRelationshipStr = formatRelationshipDisplay(
    data.consignorRelationshipType,
    data.consignorRelationshipName
  );
  const consigneeRelationshipStr = formatRelationshipDisplay(
    data.consigneeRelationshipType,
    data.consigneeRelationshipName
  );

  // 2. BAND 1: CONSIGNOR & DATE / INVOICE / KYC (Full-width divider at bottom)
  const band1Top = curY;
  const band1Height = 33; // mm

  // Vertical split line
  doc.line(margin + colHalf, band1Top, margin + colHalf, band1Top + band1Height);

  // Left Column of Band 1: CONSIGNOR
  let leftY = band1Top + 4.5;
  doc.setFontSize(9.8);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSIGNOR', margin + 3, leftY);
  leftY += 4.5;
  const consignorDisplayName = formatNameWithTitle(data.consignorTitle, data.consignorName) || '__________________________';
  doc.text(consignorDisplayName, margin + 3, leftY);
  if (consignorRelationshipStr) {
    leftY += 3.8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text(consignorRelationshipStr, margin + 3, leftY);
  }
  leftY += 3.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  const consignorAddr = [data.consignorAddress, data.consignorCity, data.consignorState, data.consignorPincode, data.consignorCountry].filter(Boolean).join(', ');
  doc.text(consignorAddr || 'Address, City, State, PIN, Country', margin + 3, leftY, { maxWidth: colHalf - 6 });
  leftY += 6.5;
  if (data.consignorContact) {
    doc.setFont('helvetica', 'bold');
    doc.text('Contact: ', margin + 3, leftY);
    const cW = doc.getTextWidth('Contact: ');
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.consignorCountryCode || ''} ${data.consignorContact}`, margin + 3 + cW, leftY);
    leftY += 3.8;
  }
  doc.setFont('helvetica', 'bold');
  doc.text('E - Mail ID: ', margin + 3, leftY);
  const emW = doc.getTextWidth('E - Mail ID: ');
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.consignorEmail || '-'}`, margin + 3 + emW, leftY);

  // Right Column of Band 1: Date, Invoice No, KYC
  const rightX = margin + colHalf + 3;
  let rightY = band1Top + 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.7);
  doc.text('Date : ', rightX, rightY);
  const dateW = doc.getTextWidth('Date : ');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text(`${data.invoiceDate || '29.03.2025'}`, rightX + dateW, rightY);
  rightY += 5;
  doc.line(margin + colHalf, rightY, margin + contentWidth, rightY);

  rightY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.7);
  doc.text('invoice no: ', rightX, rightY);
  const invW = doc.getTextWidth('invoice no: ');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text(`${data.invoiceNumber || '1516'}`, rightX + invW, rightY);
  rightY += 5;
  doc.line(margin + colHalf, rightY, margin + contentWidth, rightY);

  // KYC
  rightY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.8);
  doc.text('KYC DETAILS', margin + colHalf + colHalf / 2, rightY, { align: 'center' });
  rightY += 3.8;
  doc.text(data.kycType || 'AADHAR NO', margin + colHalf + colHalf / 2, rightY, { align: 'center' });
  rightY += 3.8;
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.6);
  doc.text(data.kycNumber || '6566 1068 9680', margin + colHalf + colHalf / 2, rightY, { align: 'center' });

  // FULL-WIDTH HORIZONTAL DIVIDER LINE AT BOTTOM OF CONSIGNOR SECTION
  curY = band1Top + band1Height;
  doc.line(margin, curY, margin + contentWidth, curY);

  // 3. BAND 2: CONSIGNEE & COUNTRY OF ORIGIN / DESTINATION (Full-width divider at bottom)
  const band2Top = curY;
  const band2Height = 32; // mm

  // Vertical split line
  doc.line(margin + colHalf, band2Top, margin + colHalf, band2Top + band2Height);

  // Left Column of Band 2: CONSIGNEE
  leftY = band2Top + 4.5;
  doc.setFontSize(9.8);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSIGNEE', margin + 3, leftY);
  leftY += 4.5;
  const consigneeDisplayName = formatNameWithTitle(data.consigneeTitle, data.consigneeName) || '__________________________';
  doc.text(consigneeDisplayName, margin + 3, leftY);
  if (consigneeRelationshipStr) {
    leftY += 3.8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text(consigneeRelationshipStr, margin + 3, leftY);
  }
  leftY += 3.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  const consigneeAddr = [data.consigneeAddress, data.consigneeCity, data.consigneeState, data.consigneePincode, data.consigneeCountry].filter(Boolean).join(', ');
  doc.text(consigneeAddr || 'Address, City, State, PIN, Country', margin + 3, leftY, { maxWidth: colHalf - 6 });
  leftY += 6.5;
  if (data.consigneeContact) {
    doc.setFont('helvetica', 'bold');
    doc.text('Contact: ', margin + 3, leftY);
    const ccW = doc.getTextWidth('Contact: ');
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.consigneeCountryCode || ''} ${data.consigneeContact}`, margin + 3 + ccW, leftY);
    leftY += 3.8;
  }
  doc.setFont('helvetica', 'bold');
  doc.text('E - Mail ID: ', margin + 3, leftY);
  const cemW = doc.getTextWidth('E - Mail ID: ');
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.consigneeEmail || '-'}`, margin + 3 + cemW, leftY);

  // Right Column of Band 2: Country of Origin & Destination
  const countryTopY = band2Top + 14;
  doc.line(margin + colHalf, countryTopY, margin + contentWidth, countryTopY);

  const countryDividerX = margin + colHalf + colHalf / 2;
  doc.line(countryDividerX, countryTopY, countryDividerX, band2Top + band2Height);

  // Field Labels (centered with underline)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.6);
  doc.text('Country of Origin of Goods', margin + colHalf + colHalf / 4, countryTopY + 4, { align: 'center' });
  doc.text('Country of Final Destination', countryDividerX + colHalf / 4, countryTopY + 4, { align: 'center' });

  // Horizontal divider line beneath both country fields
  const countryDividerLineY = countryTopY + 6.5;
  doc.line(margin + colHalf, countryDividerLineY, margin + contentWidth, countryDividerLineY);

  // Values beneath the horizontal line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.text(data.countryOfOrigin || 'India', margin + colHalf + colHalf / 4, countryDividerLineY + 6, { align: 'center' });
  doc.text(data.countryOfFinalDestination || '-', countryDividerX + colHalf / 4, countryDividerLineY + 6, { align: 'center' });

  // FULL-WIDTH HORIZONTAL DIVIDER LINE AT BOTTOM OF CONSIGNEE SECTION
  curY = band2Top + band2Height;
  doc.line(margin, curY, margin + contentWidth, curY);

  // 4. Transportation Row (All 6 entered values centered horizontally & vertically)
  const transportTop = curY;
  const transportHeight = 24;
  doc.line(margin + colHalf, transportTop, margin + colHalf, transportTop + transportHeight);

  // 3x2 grid
  const cellW = colHalf / 2;
  const cellH = transportHeight / 3;
  const cell1Center = margin + cellW / 2;
  const cell2Center = margin + cellW + cellW / 2;

  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');

  // Pre Carriage | Place of Receipt
  doc.text('Pre Carriage by', margin + 2, transportTop + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text(data.preCarriageBy || '-', cell1Center, transportTop + 6.8, { align: 'center' });

  doc.line(margin + cellW, transportTop, margin + cellW, transportTop + transportHeight);
  doc.line(margin, transportTop + cellH, margin + colHalf, transportTop + cellH);

  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('Place of Receipt by Pre-carrier', margin + cellW + 2, transportTop + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text(data.placeOfReceiptByPreCarrier || '-', cell2Center, transportTop + 6.8, { align: 'center' });

  // Vessel | Port of Loading
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('Vessel/Flight No', margin + 2, transportTop + cellH + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text(data.vesselFlightNo || '-', cell1Center, transportTop + cellH + 6.8, { align: 'center' });

  doc.line(margin, transportTop + cellH * 2, margin + colHalf, transportTop + cellH * 2);

  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('Port of Loading', margin + cellW + 2, transportTop + cellH + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text(data.portOfLoading || '-', cell2Center, transportTop + cellH + 6.8, { align: 'center' });

  // Port of Discharge | Final Destination
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('Port of Discharge', margin + 2, transportTop + cellH * 2 + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text(data.portOfDischarge || '-', cell1Center, transportTop + cellH * 2 + 6.8, { align: 'center' });

  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('Final Destination', margin + cellW + 2, transportTop + cellH * 2 + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text(data.finalDestination || '-', cell2Center, transportTop + cellH * 2 + 6.8, { align: 'center' });

  // Right terms
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('(Export shipping terms & package marks)', margin + colHalf + colHalf / 2, transportTop + transportHeight / 2, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  curY = transportTop + transportHeight;
  doc.line(margin, curY, margin + contentWidth, curY);

  // 5. Goods Table (Header font size reduced by 10%, entries by 5%, row height by 30%, S.NO separators)
  const tableHeaderY = curY;
  const headerH = 6.5;

  // Background shading for Goods Table Header row: #F1F5F9 (matches Live Preview & Print)
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, tableHeaderY, contentWidth, headerH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8); // +15% from 6.8

  const colSno = 15; // 15mm (generous padding, S.NO completely inside)
  const colDesc = 79; // 79mm (adjusted so total = 190mm)
  const colHsn = 32;
  const colQty = 20;
  const colRate = 22;
  const colVal = 22;

  const rawItems = (data.items && data.items.length > 0) ? data.items : [];
  const rowsCount = Math.max(6, rawItems.length);
  const rowH = 4.4; // 20% reduction from 5.5mm
  const goodsTableBottomY = tableHeaderY + headerH + rowsCount * rowH;

  let xPos = margin;
  doc.text('S.NO', xPos + colSno / 2, tableHeaderY + 4.2, { align: 'center' });
  xPos += colSno;
  doc.line(xPos, tableHeaderY, xPos, goodsTableBottomY);
  doc.text('DISCRIPTION OF GOODS', xPos + colDesc / 2, tableHeaderY + 4.2, { align: 'center' });
  xPos += colDesc;
  doc.line(xPos, tableHeaderY, xPos, goodsTableBottomY);
  doc.text('HSN CODE', xPos + colHsn / 2, tableHeaderY + 4.2, { align: 'center' });
  xPos += colHsn;
  doc.line(xPos, tableHeaderY, xPos, goodsTableBottomY);
  doc.text('QTY', xPos + colQty / 2, tableHeaderY + 4.2, { align: 'center' });
  xPos += colQty;
  doc.line(xPos, tableHeaderY, xPos, goodsTableBottomY);
  doc.text('RATE', xPos + colRate / 2, tableHeaderY + 4.2, { align: 'center' });
  xPos += colRate;
  doc.line(xPos, tableHeaderY, xPos, goodsTableBottomY);
  doc.text('VALUE INR', xPos + colVal / 2, tableHeaderY + 4.2, { align: 'center' });

  curY = tableHeaderY + headerH;
  doc.line(margin, curY, margin + contentWidth, curY);

  for (let i = 0; i < rowsCount; i++) {
    const item = rawItems[i];
    let rowX = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2); // 10-15% reduction
    doc.text(String(i + 1), rowX + colSno / 2, curY + 3.1, { align: 'center' });
    rowX += colSno;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2); // 10-15% reduction
    if (item && item.description) {
      doc.text(item.description, rowX + 2, curY + 3.1, { maxWidth: colDesc - 4 });
    }
    rowX += colDesc;

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.2);
    if (item && item.hsnCode) {
      doc.text(item.hsnCode, rowX + colHsn / 2, curY + 3.1, { align: 'center' });
    }
    rowX += colHsn;

    if (item && item.quantity !== '') {
      doc.text(String(item.quantity), rowX + colQty / 2, curY + 3.1, { align: 'center' });
    }
    rowX += colQty;

    if (item && item.rate !== '') {
      doc.text(String(item.rate), rowX + colRate - 2, curY + 3.1, { align: 'right' });
    }
    rowX += colRate;

    doc.setFont('courier', 'bold');
    if (item && item.valueInr) {
      doc.text(Number(item.valueInr).toLocaleString('en-IN'), rowX + colVal - 2, curY + 3.1, { align: 'right' });
    }

    curY += rowH;
    // Draw horizontal separator between rows across full width (including S.NO column)
    doc.line(margin, curY, margin + contentWidth, curY);
  }

  // Total Value Row (repositioned text towards the right, closer to amount column)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.3);
  doc.text('TOTAL VALUE:', margin + contentWidth - colVal - 4, curY + 4, { align: 'right' });
  doc.setFont('courier', 'bold');
  doc.text((data.totalValue || 0).toLocaleString('en-IN'), margin + contentWidth - 2, curY + 4, { align: 'right' });

  curY += 6;
  doc.line(margin, curY, margin + contentWidth, curY);

  // 6. Value in Words Row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.3);
  doc.text('VALUE IN WORDS: ', margin + 3, curY + 4.5);
  const valWordsLabelW = doc.getTextWidth('VALUE IN WORDS: ');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.text(`${data.valueInWords || 'ZERO ONLY'}`, margin + 3 + valWordsLabelW, curY + 4.5, { maxWidth: contentWidth - 6 - valWordsLabelW });

  curY += 7.5;
  doc.line(margin, curY, margin + contentWidth, curY);

  // 7. Declaration & Signature
  doc.line(margin + colHalf, curY, margin + colHalf, 287);

  // Declaration
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.6);
  doc.text('Declaration :', margin + 3, curY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const declText = data.declarationText || 'We declare that invoice shows the actual price of goods described and that all particulars are true and correct.';
  doc.text(declText, margin + 3, curY + 10, { maxWidth: colHalf - 6 });

  // Signature (Horizontally centered in the right 50% signature cell, enlarged by 10%)
  const sigCenterX = margin + colHalf + colHalf / 2;
  if (data.signatureBase64 && data.signatureBase64.startsWith('data:image')) {
    try {
      const sigImgW = 44; // 10% larger than 40
      const sigImgH = 16.5; // 10% larger than 15
      const sigImgY = Math.max(curY + 4, 283 - sigImgH - 2);
      doc.addImage(data.signatureBase64, 'PNG', sigCenterX - sigImgW / 2, sigImgY, sigImgW, sigImgH);
    } catch (e) {
      console.warn('Could not add signature image to PDF:', e);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.8);
  const sigDateStr = data.signatureDate ? ` (${data.signatureDate})` : '';
  doc.text(`SIGNATURE & DATE${sigDateStr}`, sigCenterX, 283, { align: 'center' });

  return doc;
}

/**
 * Generate A4 PDF for Proforma Invoice using high-resolution unscaled DOM rasterization
 * with 100% vector fallback.
 */
export async function generateProformaInvoicePdf(
  data: ProformaInvoicePdfData
): Promise<jsPDF> {
  // If in browser, create dedicated pristine unscaled A4 container
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '718px'; // 190mm printable width at 96 DPI (190 / 25.4 * 96 = 718.11px)
    container.style.background = '#FFFFFF';
    container.style.color = '#000000';
    container.style.zIndex = '-9999';
    container.style.transform = 'none'; // Absolutely NO scaling transforms!
    container.innerHTML = generateProformaInvoicePrintHtml(data);

    document.body.appendChild(container);

    try {
      // Allow any embedded signature image to fully decode
      const img = container.querySelector('img');
      if (img && !img.complete) {
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 300);
        });
      }

      const html2canvas = (await import('html2canvas-pro')).default;
      const canvas = await html2canvas(container, {
        scale: 2.5, // 240-300 DPI crisp print resolution without memory overload
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        windowWidth: 718,
      });

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = 210; // mm
      const pageHeight = 297; // mm
      const margin = 10; // Exactly 1 cm (10 mm) empty margin on all four sides
      const contentWidth = pageWidth - margin * 2; // 190 mm
      const contentHeight = pageHeight - margin * 2; // 277 mm
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      if (imgHeight <= contentHeight) {
        // Fits comfortably within a single A4 page with 1cm margins on all 4 sides
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeight, undefined, 'FAST');
      } else {
        // Multi-page slicing: ensure 1cm margin on all 4 sides of EVERY page
        const maxChunkHeightPx = Math.floor((canvas.width * contentHeight) / contentWidth);
        let renderedHeightPx = 0;
        let pageIndex = 0;

        while (renderedHeightPx < canvas.height) {
          if (pageIndex > 0) {
            doc.addPage('a4', 'portrait');
          }

          const currentChunkHeightPx = Math.min(maxChunkHeightPx, canvas.height - renderedHeightPx);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = currentChunkHeightPx;
          const ctx = pageCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(
              canvas,
              0, renderedHeightPx, canvas.width, currentChunkHeightPx,
              0, 0, canvas.width, currentChunkHeightPx
            );
          }

          const chunkImgData = pageCanvas.toDataURL('image/png');
          const chunkMmHeight = (currentChunkHeightPx * contentWidth) / canvas.width;
          doc.addImage(chunkImgData, 'PNG', margin, margin, contentWidth, chunkMmHeight, undefined, 'FAST');

          renderedHeightPx += currentChunkHeightPx;
          pageIndex++;
        }
      }

      return doc;
    } catch (err) {
      console.warn('DOM capture fallback to vector jsPDF for proforma invoice:', err);
    } finally {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  }

  // Fallback to pure vector jsPDF
  return generateVectorProformaInvoicePdf(data);
}

/**
 * Generates dynamic filename for Proforma Invoice PDF downloads:
 * Format: PRO_FORMA_INVOICE_CONSIGNORFIRSTNAME_DD-MM-YYYY.pdf
 * Example: Consignor Name "Mr. Kumar Swamy", Date "01.11.2026" -> "PRO_FORMA_INVOICE_KUMAR_01-11-2026.pdf"
 */
export function getProformaInvoiceDownloadFilename(data: ProformaInvoicePdfData): string {
  // Extract first name only from Consignor Name, stripping any prefix titles
  const rawName = (data.consignorName || '')
    .trim()
    .replace(/^(?:mr|mrs|ms|madam|dr|prof|m\/s|shri|smt)\.?\s+/i, '')
    .trim();
  const tokens = rawName.split(/\s+/).filter(Boolean);
  const firstName = tokens[0] ? tokens[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : 'CONSIGNOR';

  // Format date as DD-MM-YYYY using the invoice date selected in the workspace
  let dateStr = '';
  const rawDate = (data.invoiceDate || '').trim();
  const dmyMatch = rawDate.match(/^(\d{1,2})[./\s-](\d{1,2})[./\s-](\d{4})/);
  const ymdMatch = rawDate.match(/^(\d{4})[./\s-](\d{1,2})[./\s-](\d{1,2})/);

  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    dateStr = `${day}-${month}-${year}`;
  } else if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    dateStr = `${day}-${month}-${year}`;
  } else {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    dateStr = `${day}-${month}-${year}`;
  }

  return `PRO_FORMA_INVOICE_${firstName || 'CONSIGNOR'}_${dateStr}.pdf`;
}

/**
 * Trigger immediate client-side download of the Proforma Invoice PDF
 * Defaults to dynamic PRO_FORMA_INVOICE_CONSIGNORFIRSTNAME_DD-MM-YYYY.pdf naming convention
 */
export async function downloadProformaInvoicePdf(
  data: ProformaInvoicePdfData,
  fileName?: string
): Promise<void> {
  const doc = await generateProformaInvoicePdf(data);
  const name = fileName || getProformaInvoiceDownloadFilename(data);
  doc.save(name);
}

/**
 * Print the Proforma Invoice document cleanly using an in-DOM isolated iframe
 * with @page { margin: 0; } to strictly suppress browser-generated headers/footers
 * ('about:blank', date/time, document title, page numbers) while enforcing exact 10mm
 * margins on all 4 sides and 100% border alignment.
 */
export async function printProformaInvoiceDocument(data: ProformaInvoicePdfData): Promise<void> {
  if (typeof window === 'undefined') return;

  const htmlContent = generateProformaInvoicePrintHtml(data);

  // Clean up any existing print iframe
  const iframeId = 'proforma-invoice-print-frame';
  const existingIframe = document.getElementById(iframeId);
  if (existingIframe && existingIframe.parentNode) {
    existingIframe.parentNode.removeChild(existingIframe);
  }

  // Create isolated in-DOM iframe (avoids window.open, which triggers 'about:blank' URL footer)
  const iframe = document.createElement('iframe');
  iframe.id = iframeId;
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.opacity = '0.01';
  iframe.style.pointerEvents = 'none';
  iframe.style.border = 'none';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const printDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!printDoc) {
    window.print();
    return;
  }

  printDoc.open();
  printDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title></title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page {
            size: A4 portrait;
            margin: 0mm !important; /* Zero margin suppresses browser headers (date/time, title) and footers (about:blank, page numbers) */
          }
          *, *:before, *:after {
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            background: #FFFFFF !important;
            font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-page-wrapper {
            width: 210mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            padding: 10mm !important; /* Exactly 1 cm (10mm) empty margin on all four sides */
            margin: 0 auto !important;
            box-sizing: border-box !important;
            background: #FFFFFF !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-invoice-frame {
            width: 190mm !important;
            max-width: 190mm !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
          }
        </style>
      </head>
      <body>
        <div class="print-page-wrapper">
          <div class="print-invoice-frame">
            ${htmlContent}
          </div>
        </div>
      </body>
    </html>
  `);
  printDoc.close();

  const printWindow = iframe.contentWindow;
  if (!printWindow) return;

  const triggerPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch (e) {
      console.warn('Direct iframe print error, fallback to window.print:', e);
      window.print();
    } finally {
      setTimeout(() => {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 2500);
    }
  };

  // Wait for all embedded images (signature, etc.) to settle before printing
  const images = printDoc.images;
  if (images.length > 0) {
    let loadedCount = 0;
    const totalCount = images.length;
    let finished = false;

    const onImageSettled = () => {
      loadedCount++;
      if (loadedCount >= totalCount && !finished) {
        finished = true;
        setTimeout(triggerPrint, 200);
      }
    };

    for (let i = 0; i < totalCount; i++) {
      if (images[i].complete) {
        onImageSettled();
      } else {
        images[i].onload = onImageSettled;
        images[i].onerror = onImageSettled;
      }
    }

    // Safety timeout in case an image takes too long or fails
    setTimeout(() => {
      if (!finished) {
        finished = true;
        triggerPrint();
      }
    }, 1200);
  } else {
    setTimeout(triggerPrint, 150);
  }
}

/**
 * Controlled PDF-printing workflow: opens the exact generated A4 vector/raster PDF
 * in a dedicated browser tab for controlled printing without browser headers.
 */
export async function openProformaInvoicePdfForPrint(data: ProformaInvoicePdfData): Promise<void> {
  if (typeof window === 'undefined') return;
  const doc = await generateProformaInvoicePdf(data);
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}
