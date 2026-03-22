export async function fetchWithTimeout(
  url: string | URL,
  options: RequestInit & { timeout?: number },
) {
  const { timeout = 5000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
  });

  try {
    clearTimeout(id);
  } catch (err) {
    console.log(err);
  }

  return response;
}
