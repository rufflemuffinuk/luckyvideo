/* ---------------------------------------------------------------
   Puppy video submissions — client logic
   1. Scrolls from the hero to the form on button click.
   2. Validates the form (name, email, consent) before allowing a
      file to be attached/dropped.
   3. On a valid file: logs the consent record to Netlify Forms,
      then uploads the video straight to a Dropbox app folder,
      using a short-lived access token fetched from a tiny Netlify
      Function (netlify/functions/get-token.js) so no long-lived
      secret ever sits in this public file. See README.md.
   4. Once the upload finishes, reveals a "Submit" button as one
      final confirm click, then swaps the form section for the
      thank-you section.
------------------------------------------------------------------ */

const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB per chunk

const heroBtn = document.getElementById("scroll-to-form");
const submissionSection = document.getElementById("submission-section");
const thanksSection = document.getElementById("thanks-section");

const consentForm = document.getElementById("consent-form");
const nameInput = document.getElementById("name");

const attachLabel = document.getElementById("attach-label");
const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const dropZoneText = document.getElementById("drop-zone-text");

const progressWrap = document.getElementById("progress-wrap");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");
const formStatus = document.getElementById("form-status");
const finalSubmitBtn = document.getElementById("final-submit-btn");

let isUploading = false;

/* ---------------- hero -> form scroll ---------------- */

heroBtn.addEventListener("click", () => {
  submissionSection.scrollIntoView({ behavior: "smooth" });
});

/* ---------------- shared validation ---------------- */

function formIsValid() {
  if (!consentForm.checkValidity()) {
    consentForm.reportValidity();
    return false;
  }
  return true;
}

/* ---------------- picking / dropping a file ---------------- */

// Clicking "Attach puppy video" only opens the file dialog once the
// form (name, email, consent) is actually valid.
attachLabel.addEventListener("click", (e) => {
  if (isUploading) { e.preventDefault(); return; }
  if (!formIsValid()) { e.preventDefault(); }
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) beginSubmission(file);
});

["dragenter", "dragover"].forEach((evt) =>
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  })
);
["dragleave"].forEach((evt) =>
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
  })
);
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  if (isUploading) return;
  if (!formIsValid()) {
    formStatus.textContent = "Please fill in the form and check the consent box before adding a video.";
    return;
  }
  const file = e.dataTransfer.files[0];
  if (file) beginSubmission(file);
});

/* ---------------- run the whole submission ---------------- */

async function beginSubmission(file) {
  if (!file.type.startsWith("video/")) {
    formStatus.textContent = "Please choose a video file.";
    return;
  }

  isUploading = true;
  formStatus.textContent = "";
  formStatus.style.color = "";
  dropZoneText.textContent = file.name;
  attachLabel.classList.add("disabled");
  progressWrap.hidden = false;

  try {
    await submitConsentRecord();
    const accessToken = await getAccessToken();
    await uploadToDropbox(file, accessToken);
    formStatus.style.color = "var(--muted)";
    formStatus.textContent = "Video uploaded! Click Submit to finish.";
    finalSubmitBtn.hidden = false;
    finalSubmitBtn.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (err) {
    console.error(err);
    formStatus.textContent = err.message || "Something went wrong. Please try again.";
    isUploading = false;
    attachLabel.classList.remove("disabled");
  }
}

// Final confirm click, shown only after a successful Dropbox upload.
finalSubmitBtn.addEventListener("click", () => {
  showThanks();
});

function submitConsentRecord() {
  const data = new FormData(consentForm);
  return fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(data).toString(),
  });
}

async function getAccessToken() {
  const res = await fetch("/.netlify/functions/get-token");
  if (!res.ok) throw new Error("Could not get an upload token. Please try again shortly.");
  const data = await res.json();
  return data.access_token;
}

/* ---------------- Dropbox chunked upload ---------------- */

function sanitize(str) {
  return (str || "")
    .normalize("NFKD")
    .replace(/[^\w\- ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "anonymous";
}

function xhrRequest(url, headers, body, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve({});
        }
      } else {
        reject(new Error(`Dropbox upload failed (${xhr.status}): ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(body);
  });
}

function setProgress(loaded, total) {
  const pct = Math.min(100, Math.round((loaded / total) * 100));
  progressFill.style.width = pct + "%";
  progressText.textContent = pct + "%";
}

async function uploadToDropbox(file, accessToken) {
  const ext = (file.name.match(/\.[^/.]+$/) || [""])[0];
  const base = sanitize(file.name.replace(/\.[^/.]+$/, ""));
  const path = `/${sanitize(nameInput.value)}_${Date.now()}_${base}${ext}`;

  const contentHeaders = (arg) => ({
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/octet-stream",
    "Dropbox-API-Arg": JSON.stringify(arg),
  });

  const total = file.size;

  // Small files: single request.
  if (file.size <= CHUNK_SIZE) {
    await xhrRequest(
      "https://content.dropboxapi.com/2/files/upload",
      contentHeaders({ path, mode: "add", autorename: true, mute: false }),
      file,
      (loaded) => setProgress(loaded, total)
    );
    setProgress(total, total);
    return;
  }

  // Large files: chunked upload session.
  const firstChunk = file.slice(0, CHUNK_SIZE);
  const startRes = await xhrRequest(
    "https://content.dropboxapi.com/2/files/upload_session/start",
    contentHeaders({ close: false }),
    firstChunk,
    (loaded) => setProgress(loaded, total)
  );
  let uploaded = firstChunk.size;
  setProgress(uploaded, total);
  const sessionId = startRes.session_id;

  let offset = uploaded;
  while (offset < file.size - CHUNK_SIZE) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    await xhrRequest(
      "https://content.dropboxapi.com/2/files/upload_session/append_v2",
      contentHeaders({ cursor: { session_id: sessionId, offset }, close: false }),
      chunk,
      (loaded) => setProgress(offset + loaded, total)
    );
    offset += chunk.size;
    setProgress(offset, total);
  }

  const lastChunk = file.slice(offset, file.size);
  await xhrRequest(
    "https://content.dropboxapi.com/2/files/upload_session/finish",
    contentHeaders({
      cursor: { session_id: sessionId, offset },
      commit: { path, mode: "add", autorename: true, mute: false },
    }),
    lastChunk,
    (loaded) => setProgress(offset + loaded, total)
  );
  setProgress(total, total);
}

/* ---------------- done ---------------- */

function showThanks() {
  submissionSection.hidden = true;
  thanksSection.hidden = false;
  thanksSection.scrollIntoView({ behavior: "smooth" });
}
