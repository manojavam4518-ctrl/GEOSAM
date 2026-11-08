import { NextRequest, NextResponse } from 'next/server';
import { suggestHsnCodes } from '@/lib/hsnDatabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || searchParams.get('description') || '';
    const limit = parseInt(searchParams.get('limit') || '8', 10);

    const suggestions = suggestHsnCodes(query, limit);

    return NextResponse.json({
      success: true,
      query,
      count: suggestions.length,
      suggestions,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.description || body.content || body.query || '';
    const limit = typeof body.limit === 'number' ? body.limit : 8;

    const suggestions = suggestHsnCodes(query, limit);

    return NextResponse.json({
      success: true,
      query,
      count: suggestions.length,
      suggestions,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}

