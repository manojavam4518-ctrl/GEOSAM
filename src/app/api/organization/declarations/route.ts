import { NextRequest, NextResponse } from 'next/server';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { createDeclaration, getDeclarationsByOrg } from '@/lib/declarationDb';
import { isValidDeclarationSignature, SIGNATURE_REQUIRED_ERROR_MESSAGE } from '@/utils/declarationPdfExport';
import {
  isValidPersonalDeclarationSignature,
  PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE,
} from '@/utils/personalDeclarationPdfExport';

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context not found.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const preset = searchParams.get('preset') || 'all';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    const result = await getDeclarationsByOrg(organizationId, {
      search,
      preset,
      startDate,
      endDate,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error fetching declarations:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch declarations.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context not found.' }, { status: 400 });
    }

    const body = await req.json();

    // =========================================================================
    // TEMPLATE 2: PERSONAL GOODS DECLARATION NOTE
    // =========================================================================
    if (body.templateType === 'PERSONAL_GOODS') {
      const {
        consignorName,
        consignorAddressLine1,
        consignorPincode,
        consignorContact,
        consigneeName,
        consigneeAddressLine1,
        consigneePincode,
        consigneeContact,
        customerName,
        residentialAddress,
        identificationNumber,
        destinationAddress,
        docketNumber,
        declarationDate,
        items,
        signatureBase64,
      } = body;

      if (!consignorName?.trim()) {
        return NextResponse.json({ error: 'Consignor Name is required.' }, { status: 400 });
      }
      if (!consignorAddressLine1?.trim()) {
        return NextResponse.json({ error: 'Consignor Address Line 1 is required.' }, { status: 400 });
      }
      if (!consignorPincode?.trim()) {
        return NextResponse.json({ error: 'Consignor PIN Code is required.' }, { status: 400 });
      }
      if (!consignorContact?.trim()) {
        return NextResponse.json({ error: 'Consignor Contact Number is required.' }, { status: 400 });
      }
      if (!consigneeName?.trim()) {
        return NextResponse.json({ error: 'Consignee Name is required.' }, { status: 400 });
      }
      if (!consigneeAddressLine1?.trim()) {
        return NextResponse.json({ error: 'Consignee Address Line 1 is required.' }, { status: 400 });
      }
      if (!consigneePincode?.trim()) {
        return NextResponse.json({ error: 'Consignee PIN Code is required.' }, { status: 400 });
      }
      if (!consigneeContact?.trim()) {
        return NextResponse.json({ error: 'Consignee Contact Number is required.' }, { status: 400 });
      }
      if (!customerName?.trim()) {
        return NextResponse.json({ error: 'Customer Name in declaration statement is required.' }, { status: 400 });
      }
      if (!residentialAddress?.trim()) {
        return NextResponse.json({ error: 'Residential Address is required.' }, { status: 400 });
      }
      if (!identificationNumber?.trim()) {
        return NextResponse.json({ error: 'Identification Number (Aadhaar / PAN / Passport) is required.' }, { status: 400 });
      }
      if (!destinationAddress?.trim()) {
        return NextResponse.json({ error: 'Destination Address is required.' }, { status: 400 });
      }
      if (!docketNumber?.trim()) {
        return NextResponse.json({ error: 'Docket Number is required.' }, { status: 400 });
      }
      if (!isValidPersonalDeclarationSignature(signatureBase64)) {
        return NextResponse.json(
          { error: PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE },
          { status: 400 }
        );
      }

      const userName = access.user.name || access.user.email || 'Consignor Staff';

      const validItems = Array.isArray(items) ? items : [];
      const totalVal = validItems.reduce((acc: number, it: any) => {
        const val = parseFloat(String(it.amount || 0).replace(/[^0-9.]/g, ''));
        return acc + (isNaN(val) ? 0 : val);
      }, 0);

      const itemDescSummary =
        validItems
          .filter((it: any) => it.description?.trim())
          .map((it: any) => it.description.trim())
          .join(', ') || 'Personal Household Goods & Luggage';

      const created = await createDeclaration(organizationId, access.user.id, userName, {
        templateType: 'PERSONAL_GOODS',
        consignmentNumber: docketNumber.trim(),
        consignorName: consignorName.trim(),
        consignorAddress: [consignorAddressLine1, body.consignorAddressLine2, consignorPincode].filter(Boolean).join(', '),
        consigneeName: consigneeName.trim(),
        receiverAddress: [consigneeAddressLine1, body.consigneeAddressLine2, consigneePincode].filter(Boolean).join(', '),
        pinCode: consigneePincode.trim(),
        contactNumber: consigneeContact.trim(),
        content: itemDescSummary,
        reasonForTransportation: 'Personal Use / Household Goods',
        isCommercial: false,
        isGstRegistered: false,
        hasInvoice: false,
        hasChallan: false,
        valueInr: totalVal,
        amountInWords: '',
        signatureBase64: signatureBase64 || '',
        declarationDate: declarationDate || '',
        selfAttested: true,
        mobileVerified: false,
        ...body,
      });

      return NextResponse.json({
        success: true,
        message: 'Personal Goods Declaration Note created and recorded successfully.',
        declaration: created,
      });
    }

    // =========================================================================
    // TEMPLATE 1: GOODS DECLARATION NOTE (ORIGINAL COMPLIANCE FORM)
    // =========================================================================
    // Validation
    const {
      consignmentNumber,
      consigneeName,
      receiverAddress,
      pinCode,
      contactNumber,
      consignorName,
      consignorAddress,
      isGstRegistered,
      gstNumber,
      content,
      reasonForTransportation,
      valueInr,
      amountInWords,
      signatureBase64,
      selfAttested,
      declarationDate,
      mobileVerified,
    } = body;

    if (!consignmentNumber?.trim()) {
      return NextResponse.json({ error: 'Consignment Number is required.' }, { status: 400 });
    }
    if (!consigneeName?.trim()) {
      return NextResponse.json({ error: "Consignee's Name is required." }, { status: 400 });
    }
    if (!receiverAddress?.trim()) {
      return NextResponse.json({ error: 'Receiver Address is required.' }, { status: 400 });
    }
    if (!pinCode?.trim()) {
      return NextResponse.json({ error: 'PIN Code is required.' }, { status: 400 });
    }
    if (!contactNumber?.trim()) {
      return NextResponse.json({ error: 'Contact Number is required.' }, { status: 400 });
    }
    if (!consignorName?.trim()) {
      return NextResponse.json({ error: 'Consignor Name is required.' }, { status: 400 });
    }
    if (!consignorAddress?.trim()) {
      return NextResponse.json({ error: 'Consignor Address is required.' }, { status: 400 });
    }
    if (isGstRegistered && !gstNumber?.trim()) {
      return NextResponse.json(
        { error: 'GST Number is required when GST Registered is Yes.' },
        { status: 400 }
      );
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Shipment Content description is required.' }, { status: 400 });
    }
    if (!reasonForTransportation?.trim()) {
      return NextResponse.json({ error: 'Reason for Transportation is required.' }, { status: 400 });
    }
    if (valueInr === undefined || valueInr === null || isNaN(Number(valueInr)) || Number(valueInr) < 0) {
      return NextResponse.json({ error: 'Valid Consignment Value in INR is required.' }, { status: 400 });
    }
    if (!isValidDeclarationSignature(signatureBase64)) {
      return NextResponse.json(
        { error: SIGNATURE_REQUIRED_ERROR_MESSAGE },
        { status: 400 }
      );
    }
    if (!selfAttested) {
      return NextResponse.json(
        { error: 'Mandatory self-attestation checkbox must be accepted.' },
        { status: 400 }
      );
    }
    if (!declarationDate) {
      return NextResponse.json({ error: 'Date of Declaration is required.' }, { status: 400 });
    }

    const userName = access.user.name || access.user.email || 'Consignor Staff';

    const created = await createDeclaration(organizationId, access.user.id, userName, {
      consignmentNumber: consignmentNumber.trim(),
      consigneeName: consigneeName.trim(),
      receiverAddress: receiverAddress.trim(),
      pinCode: pinCode.trim(),
      contactNumber: contactNumber.trim(),
      consignorName: consignorName.trim(),
      consignorAddress: consignorAddress.trim(),
      isGstRegistered: Boolean(isGstRegistered),
      gstNumber: gstNumber?.trim() || '',
      content: content.trim(),
      hsnCode: body.hsnCode?.trim() || '',
      reasonForTransportation: reasonForTransportation.trim(),
      isCommercial: Boolean(body.isCommercial),
      valueInr: Number(valueInr),
      amountInWords: amountInWords?.trim() || '',
      hasInvoice: Boolean(body.hasInvoice),
      invoiceNumber: body.invoiceNumber?.trim() || '',
      hasChallan: Boolean(body.hasChallan),
      challanNumber: body.challanNumber?.trim() || '',
      signatureBase64,
      declarationDate,
      selfAttested: Boolean(selfAttested),
      attestationStatement:
        'The above is true to the best of my knowledge and if found false, I/we will only be responsible for all cost and consequences arising out of this declaration.',
      mobileVerified: Boolean(mobileVerified),
      verifiedMobileNumber: body.verifiedMobileNumber || '',
      otpVerifiedAt: body.otpVerifiedAt || '',
      consigneeNameHtml: body.consigneeNameHtml || '',
      receiverAddressHtml: body.receiverAddressHtml || '',
      consignorNameHtml: body.consignorNameHtml || '',
      consignorAddressHtml: body.consignorAddressHtml || '',
      contentHtml: body.contentHtml || '',
      reasonForTransportationHtml: body.reasonForTransportationHtml || '',
    });

    return NextResponse.json({
      success: true,
      message: 'Declaration Note created and recorded successfully.',
      declaration: created,
    });
  } catch (err: any) {
    console.error('Error creating declaration:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save declaration.' },
      { status: 500 }
    );
  }
}

