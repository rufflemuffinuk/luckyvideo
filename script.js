/* ---------------------------------------------------------------
   Puppy video submissions — client logic
   1. Scrolls from the hero to the form on button click.
   2. Validates the form (name, email, consent) before letting the
      "Attach puppy video" link open — it points straight at a
      Dropbox File Request, so the actual video upload happens on
      Dropbox's own page, not this one.
   3. On a valid click: logs the consent record to Netlify Forms and
      opens the Dropbox File Request in a new tab.
   4. Reveals a "Submit" button as the visitor's final confirm click
      once they're done on Dropbox, then swaps the form section for
      the thank-you section.
------------------------------------------------------------------ */

const heroBtn = document.getElementById("scroll-to-form");
const submissionSection = document.getElementById("submission-section");
const thanksSection = document.getElementById("thanks-section");

const consentForm = document.getElementById("consent-form");
const attachLink = document.getElementById("attach-label");
const formStatus = document.getElementById("form-status");
const finalSubmitBtn = document.getElementById("final-submit-btn");

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

/* ---------------- attach -> Dropbox File Request ---------------- */

attachLink.addEventListener("click", (e) => {
  if (!formIsValid()) {
    e.preventDefault(); // don't open Dropbox until the form's actually valid
    return;
  }

  // Let the link continue on to open Dropbox in its new tab, and log the
  // consent record in parallel — no need to wait on it either way.
  submitConsentRecord().catch((err) => console.error("Could not log consent record:", err));

  formStatus.style.color = "";
  formStatus.textContent =
    "We've opened the Dropbox upload page in a new tab. Once you've added your video there, come back and click Submit below.";
  finalSubmitBtn.hidden = false;
  finalSubmitBtn.scrollIntoView({ behavior: "smooth", block: "center" });
});

function submitConsentRecord() {
  const data = new FormData(consentForm);
  return fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(data).toString(),
  });
}

/* ---------------- final confirm -> done ---------------- */

finalSubmitBtn.addEventListener("click", () => {
  showThanks();
});

function showThanks() {
  submissionSection.hidden = true;
  thanksSection.hidden = false;
  thanksSection.scrollIntoView({ behavior: "smooth" });
}
