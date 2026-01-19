import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) return NextResponse.json({ error: "No URL" }, { status: 400 });

    console.log("Fetching URL:", url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      next: { revalidate: 3600 } 
    });

    if (!response.ok) {
      console.error("Fetch failed:", response.status, response.statusText);
      return NextResponse.json({ error: "Failed to load page" }, { status: 404 });
    }

    const html = await response.text();
    console.log("HTML Length received:", html.length); // Debug check

    // IMPROVED REGEX PATTERNS
    // Catches <meta content="..." property="og:image"> AND <meta property="og:image" content="...">
    const imagePatterns = [
        /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
        /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
        /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
        /<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i,
        /"contentUrl":"([^"]+)"/i // Common in JSON-LD (Pinterest sometimes uses this)
    ];

    let imageUrl = null;
    for (const pattern of imagePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
            imageUrl = match[1];
            break;
        }
    }

    // Video Pattern
    const videoMatch = html.match(/<meta[^>]*property=["']og:video["'][^>]*content=["']([^"']+)["']/i);
    let videoUrl = videoMatch ? videoMatch[1] : null;

    // Clean up entities
    if (imageUrl) imageUrl = imageUrl.replace(/&amp;/g, '&');
    if (videoUrl) videoUrl = videoUrl.replace(/&amp;/g, '&');

    console.log("Found Media:", { imageUrl, videoUrl });

    if (!imageUrl) {
        return NextResponse.json({ error: "No media tags found" }, { status: 404 });
    }

    return NextResponse.json({
      url: imageUrl,
      videoUrl: videoUrl
    });

  } catch (error) {
    console.error("Unfurl Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}