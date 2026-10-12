const MAX_BYTES = 3 * 1024 * 1024;

export async function POST(request: Request) {
  let url: URL;
  try {
    const body = (await request.json()) as { url?: string };
    url = new URL(String(body.url ?? '').trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error();
  } catch {
    return Response.json({ error: 'Enter a valid http or https link' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (eLab content import)', Accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return Response.json({ error: `The page returned ${response.status}` }, { status: 502 });
    }
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('text/html')) {
      return Response.json({ error: 'This link is not a web page' }, { status: 415 });
    }
    const html = (await response.text()).slice(0, MAX_BYTES);
    return Response.json({ html });
  } catch {
    return Response.json({ error: 'Could not reach this page' }, { status: 502 });
  }
}