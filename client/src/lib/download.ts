/**
 * Download a file from a backend export endpoint without opening a popup.
 *
 * Fetches the file with the session cookie, converts it to a blob, and
 * triggers a hidden <a download> click. Avoids window.open entirely so it
 * works even when the browser blocks popups.
 */
export async function downloadFile(
  url: string,
  fallbackFilename: string
): Promise<void> {
  const res = await fetch(url, { credentials: "include" });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "You are not authorized to export this report. Please log in again."
    );
  }
  if (!res.ok) {
    throw new Error(`Export failed with status ${res.status}.`);
  }

  // Prefer the filename sent by the server (Content-Disposition).
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  const filename = match?.[1] ? match[1].trim() : fallbackFilename;

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}

