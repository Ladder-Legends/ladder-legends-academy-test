import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isOwner } from '@/lib/permissions';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Check for owner permission
    if (!isOwner(session)) {
      return NextResponse.json(
        { error: 'Unauthorized - owner access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { communityFunding, sponsors } = body;

    if (!communityFunding || !Array.isArray(sponsors)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Construct the sponsorship data
    const sponsorshipData = {
      communityFunding,
      sponsors: sponsors.map((sponsor, index) => ({
        id: sponsor.id,
        name: sponsor.name,
        description: sponsor.description,
        url: sponsor.url,
        logoUrl: sponsor.logoUrl,
        displayOrder: sponsor.displayOrder || index + 1,
      })),
    };

    // Write to sponsorships.json
    const filePath = join(process.cwd(), 'src/data/sponsorships.json');
    await writeFile(filePath, JSON.stringify(sponsorshipData, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Sponsorships updated successfully',
    });
  } catch (error) {
    console.error('Error updating sponsorships:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    // Check for owner permission
    if (!isOwner(session)) {
      return NextResponse.json(
        { error: 'Unauthorized - owner access required' },
        { status: 403 }
      );
    }

    // Read current sponsorships
    const filePath = join(process.cwd(), 'src/data/sponsorships.json');
    const fileContent = await readFile(filePath, 'utf-8');
    const sponsorshipData = JSON.parse(fileContent);

    return NextResponse.json(sponsorshipData);
  } catch (error) {
    console.error('Error reading sponsorships:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
