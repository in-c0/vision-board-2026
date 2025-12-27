// app/api/unfurl/route.ts
import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; VisionBoard/1.0)',
        'Accept': 'text/html,application/xhtml+xml' 
      }
    });
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // 1. Check for Video
    const video = doc.querySelector('meta[property="og:video"]')?.getAttribute('content') ||
                  doc.querySelector('meta[property="og:video:secure_url"]')?.getAttribute('content') ||
                  doc.querySelector('meta[property="og:video:url"]')?.getAttribute('content');

    // 2. Check for Image
    const image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
    
    // 3. Fallback for Pinterest specifically (they sometimes hide mp4 in scripts, but meta is safest for MVP)
    
    if (!image && !video) {
      return NextResponse.json({ error: 'No media found' }, { status: 404 });
    }

    return NextResponse.json({ 
        url: image, 
        videoUrl: video, // Send back video if found
        isVideo: !!video 
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to unfurl' }, { status: 500 });
  }
}