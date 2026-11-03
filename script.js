const STORAGE_KEY = "bonafide-demo-requests";

function readRequests() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  const requests = JSON.parse(saved);
  if (!Array.isArray(requests)) throw new Error("Saved request data is invalid.");
  return requests.map((request) => ({
    ...request,
    email: typeof request.email === "string" ? request.email : "",
    college_review: request.college_review || "Pending",
    fee_dues: typeof request.fee_dues === "number" ? request.fee_dues : null,
    office_manager: request.office_manager || "Pending",
    principal: request.principal || "Pending"
  }));
}

function saveRequests(requests) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

function updateRequest(id, update) {
  const requests = readRequests();
  const request = requests.find((item) => item.id === id);
  if (!request) throw new Error("Application not found.");
  update(request);
  saveRequests(requests);
}

function isFullyApproved(request) {
  return request.college_review === "Reviewed"
    && request.fee_dues === 0
    && request.office_manager === "Approved"
    && request.principal === "Approved";
}

function getOverallStatus(request) {
  if (request.college_review === "Under Review") return "College review in progress";
  if (request.college_review !== "Reviewed") return "College review pending";
  if (request.fee_dues === null) return "Fee dues check pending";
  if (request.fee_dues > 0) return `Fee dues pending: ₹${request.fee_dues}`;
  if (request.office_manager !== "Approved") return "Office Manager approval pending";
  if (request.principal !== "Approved") return "Principal approval pending";
  return "Approved - certificate ready";
}

function showNotice(target, message, category) {
  if (!target) return;
  target.replaceChildren();
  const notice = document.createElement("div");
  notice.className = `alert ${category}`;
  notice.textContent = message;
  target.append(notice);
}

function addTextCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value == null ? "" : String(value);
  row.append(cell);
  return cell;
}

function createButton(text, onClick, className = "btn small", disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  return button;
}

function setNoticeAndRender(message, category) {
  showNotice(document.getElementById("dashboard-notice"), message, category);
  renderDashboard();
}

function renderDashboard() {
  const table = document.getElementById("requests-table");
  if (!table) return;

  table.replaceChildren();
  try {
    const requests = readRequests().sort((a, b) => b.id - a.id);
    if (requests.length === 0) {
      const row = table.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 7;
      cell.className = "empty";
      cell.textContent = "No requests received yet.";
      return;
    }

    requests.forEach((request) => {
      const row = table.insertRow();
      const applicationCell = row.insertCell();
      applicationCell.append(
        document.createTextNode(`ID: ${request.id}`),
        document.createElement("br"),
        document.createTextNode(request.student_name),
        document.createElement("br"),
        document.createTextNode(`Reg: ${request.register_number}`),
        document.createElement("br"),
        document.createTextNode(request.email),
        document.createElement("br"),
        document.createTextNode(`Submitted: ${request.request_date}`)
      );

      const courseCell = row.insertCell();
      courseCell.append(
        document.createTextNode(request.department),
        document.createElement("br"),
        document.createTextNode(request.year),
        document.createElement("br"),
        document.createTextNode(`Academic year: ${request.academic_year}`),
        document.createElement("br"),
        document.createTextNode(`Purpose: ${request.purpose}`)
      );

      const reviewCell = row.insertCell();
      const reviewSelect = document.createElement("select");
      reviewSelect.setAttribute("aria-label", `College review for application ${request.id}`);
      [["Pending", "Pending"], ["Under Review", "Under Review"], ["Reviewed", "Reviewed"]].forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        option.selected = request.college_review === value;
        reviewSelect.append(option);
      });
      reviewCell.append(
        reviewSelect,
        createButton("Save review", () => {
          try {
            updateRequest(request.id, (current) => {
              current.college_review = reviewSelect.value;
              if (reviewSelect.value !== "Reviewed") {
                current.office_manager = "Pending";
                current.principal = "Pending";
              }
            });
            setNoticeAndRender(`College review updated for application #${request.id}.`, "success");
          } catch (error) {
            showNotice(document.getElementById("dashboard-notice"), error.message, "error");
          }
        })
      );

      const feeCell = row.insertCell();
      const feeInput = document.createElement("input");
      feeInput.type = "number";
      feeInput.min = "0";
      feeInput.step = "0.01";
      feeInput.placeholder = "Amount (0 = Nil)";
      feeInput.value = request.fee_dues === null ? "" : String(request.fee_dues);
      feeInput.setAttribute("aria-label", `Fee dues for application ${request.id}`);
      feeInput.disabled = request.college_review !== "Reviewed";
      feeCell.append(feeInput, document.createElement("br"));
      feeCell.append(
        document.createTextNode(request.fee_dues === null
          ? "Not checked"
          : request.fee_dues === 0 ? "Nil / Cleared" : `Due: ₹${request.fee_dues}`),
        document.createElement("br"),
        createButton("Save dues", () => {
          const amount = Number(feeInput.value);
          if (feeInput.value === "" || !Number.isFinite(amount) || amount < 0) {
            showNotice(document.getElementById("dashboard-notice"), "Enter the fee dues amount. Use 0 for Nil / cleared.", "error");
            return;
          }
          try {
            updateRequest(request.id, (current) => {
              current.fee_dues = amount;
              if (amount !== 0) {
                current.office_manager = "Pending";
                current.principal = "Pending";
              }
            });
            setNoticeAndRender(`Fee dues saved for application #${request.id}.`, "success");
          } catch (error) {
            showNotice(document.getElementById("dashboard-notice"), error.message, "error");
          }
        }, "btn small", request.college_review !== "Reviewed")
      );

      const officeCell = row.insertCell();
      officeCell.append(
        document.createTextNode(request.office_manager),
        document.createElement("br"),
        createButton("Approve", () => {
          try {
            updateRequest(request.id, (current) => {
              if (current.college_review !== "Reviewed" || current.fee_dues !== 0) {
                throw new Error("Complete college review and clear fee dues before Office Manager approval.");
              }
              current.office_manager = "Approved";
            });
            setNoticeAndRender(`Office Manager approved application #${request.id}.`, "success");
          } catch (error) {
            showNotice(document.getElementById("dashboard-notice"), error.message, "error");
          }
        }, "btn small", request.college_review !== "Reviewed" || request.fee_dues !== 0 || request.office_manager === "Approved")
      );

      const principalCell = row.insertCell();
      principalCell.append(
        document.createTextNode(request.principal),
        document.createElement("br"),
        createButton("Approve", () => {
          try {
            updateRequest(request.id, (current) => {
              if (current.office_manager !== "Approved" || current.fee_dues !== 0) {
                throw new Error("Office Manager approval and fee clearance are required first.");
              }
              current.principal = "Approved";
            });
            setNoticeAndRender(`Principal approved application #${request.id}.`, "success");
            showInlineCertificate(request.id);
          } catch (error) {
            showNotice(document.getElementById("dashboard-notice"), error.message, "error");
          }
        }, "btn small", request.office_manager !== "Approved" || request.fee_dues !== 0 || request.principal === "Approved")
      );

      const certificateCell = row.insertCell();
      if (isFullyApproved(request)) {
        if (document.getElementById("inline-certificate-panel")) {
          certificateCell.append(createButton("View certificate", () => showInlineCertificate(request.id)));
        } else {
        const link = document.createElement("a");
        link.className = "btn small";
        link.href = `certificate.html?id=${encodeURIComponent(request.id)}`;
        link.textContent = "Open certificate";
        certificateCell.append(link);
        }
      } else {
        certificateCell.textContent = getOverallStatus(request);
      }
    });
  } catch (error) {
    showNotice(document.getElementById("dashboard-notice"), `Could not load requests: ${error.message}`, "error");
  }
}

function showInlineCertificate(requestId) {
  const panel = document.getElementById("inline-certificate-panel");
  const certificate = document.getElementById("inline-certificate");
  if (!panel || !certificate) return;

  const request = readRequests().find((item) => item.id === requestId && isFullyApproved(item));
  if (!request) {
    showNotice(document.getElementById("dashboard-notice"), "The certificate is available only after all approvals and fee clearance.", "error");
    return;
  }
  certificate.querySelectorAll("[data-field]").forEach((element) => {
    element.textContent = request[element.dataset.field] || "";
  });
  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function appendDetail(container, label, value) {
  const paragraph = document.createElement("p");
  const bold = document.createElement("b");
  bold.textContent = `${label}: `;
  paragraph.append(bold, document.createTextNode(value == null ? "" : String(value)));
  container.append(paragraph);
}

function renderTrackingResult(result, request) {
  const card = document.createElement("div");
  card.className = "result-card";
  const heading = document.createElement("h2");
  heading.textContent = `Application #${request.id}`;
  card.append(heading);
  appendDetail(card, "Student", request.student_name);
  appendDetail(card, "Register Number", request.register_number);
  appendDetail(card, "Department", request.department);
  appendDetail(card, "Year of Study", request.year);
  appendDetail(card, "Purpose", request.purpose);
  appendDetail(card, "Overall Status", getOverallStatus(request));

  const steps = [
    ["College review", request.college_review === "Reviewed", request.college_review],
    ["Fee dues", request.fee_dues === 0, request.fee_dues === null ? "Not checked" : request.fee_dues === 0 ? "Nil / Cleared" : `₹${request.fee_dues} due`],
    ["Office Manager approval", request.office_manager === "Approved", request.office_manager],
    ["Principal approval", request.principal === "Approved", request.principal]
  ];
  const list = document.createElement("ol");
  list.className = "workflow-list";
  steps.forEach(([label, complete, status]) => {
    const item = document.createElement("li");
    item.className = complete ? "done" : "pending-step";
    item.append(document.createTextNode(`${label}: `));
    const strong = document.createElement("b");
    strong.textContent = status;
    item.append(strong);
    list.append(item);
  });
  card.append(list);

  if (isFullyApproved(request) && document.getElementById("inline-certificate-panel")) {
    card.append(createButton("View / Print Certificate", () => showInlineCertificate(request.id), "btn"));
  } else if (isFullyApproved(request)) {
    const link = document.createElement("a");
    link.className = "btn";
    link.href = `certificate.html?id=${encodeURIComponent(request.id)}`;
    link.textContent = "Download / Print Certificate";
    card.append(link);
  }
  result.append(card);
}

function initializeLegacyApplication() {
  const requestForm = document.getElementById("request-form");
  if (requestForm) {
    requestForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!requestForm.reportValidity()) return;

      try {
        const formData = new FormData(requestForm);
        const requests = readRequests();
        const request = Object.fromEntries(formData.entries());
        request.id = Date.now();
        request.status = "Pending";
        request.college_review = "Pending";
        request.fee_dues = null;
        request.office_manager = "Pending";
        request.principal = "Pending";
        request.request_date = new Date().toISOString().slice(0, 10);
        requests.push(request);
        saveRequests(requests);
        renderDashboard();
        const trackPanel = document.getElementById("track-panel");
        const trackForm = document.getElementById("track-form");
        if (trackPanel && trackForm) {
          trackForm.elements.request_id.value = String(request.id);
          trackForm.elements.email.value = request.email;
          trackPanel.hidden = false;
          trackForm.requestSubmit();
          trackPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          const nextStep = new URLSearchParams({
            id: String(request.id),
            email: request.email
          });
          window.location.href = `track.html?${nextStep.toString()}`;
        }
      } catch (error) {
        showNotice(document.getElementById("notice"), `Could not save request: ${error.message}`, "error");
      }
    });
  }

  const trackForm = document.getElementById("track-form");
  if (trackForm) {
    trackForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!trackForm.reportValidity()) return;

      const result = document.getElementById("track-result");
      result.replaceChildren();
      try {
        const formData = new FormData(trackForm);
        const requestId = Number(formData.get("request_id"));
        const email = String(formData.get("email")).trim().toLowerCase();
        const request = readRequests().find((item) =>
          item.id === requestId && item.email.trim().toLowerCase() === email
        );
        if (!request) {
          showNotice(result, "No matching application found. Check the application ID and email address.", "error");
          return;
        }
        renderTrackingResult(result, request);
        const approvalPanel = document.getElementById("approval-panel");
        if (approvalPanel) {
          approvalPanel.hidden = false;
        }
        const approvalNextStep = document.getElementById("approval-next-step");
        if (approvalNextStep) approvalNextStep.hidden = false;
      } catch (error) {
        showNotice(result, `Unable to check status: ${error.message}`, "error");
      }
    });

    const query = new URLSearchParams(window.location.search);
    const requestId = query.get("id");
    const email = query.get("email");
    if (requestId && email) {
      trackForm.elements.request_id.value = requestId;
      trackForm.elements.email.value = email;
      trackForm.requestSubmit();
    }
  }

  const certificate = document.getElementById("certificate");
  if (certificate) {
    try {
      const requestId = Number(new URLSearchParams(window.location.search).get("id"));
      const request = readRequests().find((item) => item.id === requestId && isFullyApproved(item));
      if (!request) {
        showNotice(document.getElementById("certificate-message"), "Certificate is available only after all approvals and fee clearance.", "error");
        certificate.hidden = true;
      } else {
        certificate.querySelectorAll("[data-field]").forEach((element) => {
          const field = element.dataset.field;
          element.textContent = request[field] || "";
        });
      }
    } catch (error) {
      showNotice(document.getElementById("certificate-message"), `Unable to load certificate: ${error.message}`, "error");
      certificate.hidden = true;
    }
  }

  renderDashboard();
  if (requestForm) {
    try {
      const latestRequest = readRequests().sort((a, b) => b.id - a.id)[0];
      if (latestRequest) {
        const trackPanel = document.getElementById("track-panel");
        const approvalPanel = document.getElementById("approval-panel");
        const trackForm = document.getElementById("track-form");
        if (trackPanel && approvalPanel && trackForm) {
          trackPanel.hidden = false;
          approvalPanel.hidden = false;
          trackForm.elements.request_id.value = String(latestRequest.id);
          trackForm.elements.email.value = latestRequest.email;
          renderTrackingResult(document.getElementById("track-result"), latestRequest);
        }
      }
    } catch (error) {
      showNotice(document.getElementById("notice"), `Could not restore the saved request: ${error.message}`, "error");
    }
  }
}

const CURRENT_REQUEST_KEY = "bonafide-current-request";
let activeWizardRequestId = null;

function showWizardSlide(step) {
  document.querySelectorAll(".wizard-slide").forEach((slide) => {
    slide.hidden = Number(slide.id.replace("step-", "")) !== step;
  });
  document.querySelectorAll("[data-progress]").forEach((item) => {
    const itemStep = Number(item.dataset.progress);
    item.classList.toggle("active", itemStep === step);
    item.classList.toggle("complete", itemStep < step);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getActiveWizardRequest() {
  return readRequests().find((request) => request.id === activeWizardRequestId) || null;
}

function showCertificateForRequest(request) {
  const certificate = document.getElementById("inline-certificate");
  if (!certificate || !request || !isFullyApproved(request)) return;
  certificate.querySelectorAll("[data-field]").forEach((element) => {
    element.textContent = request[element.dataset.field] || "";
  });
}

function initializeWizardApplication() {
  const requestForm = document.getElementById("request-form");
  const trackForm = document.getElementById("track-form");
  if (!requestForm || !trackForm) return false;

  const feeInput = document.getElementById("wizard-fee-dues");
  const reviewButton = document.getElementById("review-complete");
  const feeNextButton = document.getElementById("to-office-manager");
  const officeButton = document.getElementById("approve-office-manager");
  const principalButton = document.getElementById("approve-principal");

  const refreshWizard = (request) => {
    if (!request) return;
    renderTrackingResult(document.getElementById("track-result"), request);
    reviewButton.disabled = request.college_review === "Reviewed";
    feeInput.value = request.fee_dues === null ? "" : String(request.fee_dues);
    feeNextButton.disabled = request.fee_dues !== 0;
    officeButton.disabled = request.college_review !== "Reviewed" || request.fee_dues !== 0
      || request.office_manager === "Approved";
    principalButton.disabled = request.office_manager !== "Approved" || request.principal === "Approved";
    document.getElementById("office-manager-status").textContent = request.office_manager;
    document.getElementById("principal-status").textContent = request.principal;
    showCertificateForRequest(request);
  };

  const stepForRequest = (request) => {
    if (isFullyApproved(request)) return 6;
    if (request.office_manager === "Approved") return 5;
    if (request.fee_dues === 0) return 4;
    if (request.college_review === "Reviewed") return 3;
    return 2;
  };

  const loadRequest = (request, step) => {
    activeWizardRequestId = request.id;
    localStorage.setItem(CURRENT_REQUEST_KEY, String(request.id));
    trackForm.elements.request_id.value = String(request.id);
    trackForm.elements.email.value = request.email;
    refreshWizard(request);
    showWizardSlide(step);
  };

  requestForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requestForm.reportValidity()) return;
    try {
      const request = Object.fromEntries(new FormData(requestForm).entries());
      request.id = Date.now();
      request.status = "Pending";
      request.college_review = "Pending";
      request.fee_dues = null;
      request.office_manager = "Pending";
      request.principal = "Pending";
      request.request_date = new Date().toISOString().slice(0, 10);
      const requests = readRequests();
      requests.push(request);
      saveRequests(requests);
      loadRequest(request, 2);
      showNotice(document.getElementById("notice"), `Request submitted. Application ID: ${request.id}`, "success");
    } catch (error) {
      showNotice(document.getElementById("notice"), `Could not save request: ${error.message}`, "error");
    }
  });

  trackForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!trackForm.reportValidity()) return;
    try {
      const requestId = Number(trackForm.elements.request_id.value);
      const email = trackForm.elements.email.value.trim().toLowerCase();
      const request = readRequests().find((item) =>
        item.id === requestId && item.email.trim().toLowerCase() === email
      );
      if (!request) {
        showNotice(document.getElementById("track-result"), "Application ID and email do not match.", "error");
        return;
      }
      loadRequest(request, stepForRequest(request));
    } catch (error) {
      showNotice(document.getElementById("track-result"), `Could not load request: ${error.message}`, "error");
    }
  });

  reviewButton.addEventListener("click", () => {
    try {
      updateRequest(activeWizardRequestId, (request) => {
        request.college_review = "Reviewed";
      });
      refreshWizard(getActiveWizardRequest());
      showWizardSlide(3);
    } catch (error) {
      showNotice(document.getElementById("track-result"), error.message, "error");
    }
  });

  document.getElementById("save-fees").addEventListener("click", () => {
    const amount = Number(feeInput.value);
    if (feeInput.value === "" || !Number.isFinite(amount) || amount < 0) {
      showNotice(document.getElementById("fee-status"), "Enter a valid fee amount. Enter 0 for Nil / cleared.", "error");
      return;
    }
    try {
      updateRequest(activeWizardRequestId, (request) => {
        request.fee_dues = amount;
        if (amount > 0) {
          request.office_manager = "Pending";
          request.principal = "Pending";
        }
      });
      const request = getActiveWizardRequest();
      refreshWizard(request);
      showNotice(
        document.getElementById("fee-status"),
        amount === 0 ? "Fee dues recorded as Nil / cleared." : `₹${amount} dues recorded. Clear them and enter 0 to continue.`,
        amount === 0 ? "success" : "error"
      );
    } catch (error) {
      showNotice(document.getElementById("fee-status"), error.message, "error");
    }
  });

  feeNextButton.addEventListener("click", () => showWizardSlide(4));

  officeButton.addEventListener("click", () => {
    try {
      updateRequest(activeWizardRequestId, (request) => {
        if (request.college_review !== "Reviewed" || request.fee_dues !== 0) {
          throw new Error("Complete the college review and clear fee dues first.");
        }
        request.office_manager = "Approved";
      });
      const request = getActiveWizardRequest();
      refreshWizard(request);
      showWizardSlide(5);
    } catch (error) {
      showNotice(document.getElementById("notice"), error.message, "error");
    }
  });

  principalButton.addEventListener("click", () => {
    try {
      updateRequest(activeWizardRequestId, (request) => {
        if (request.office_manager !== "Approved" || request.fee_dues !== 0) {
          throw new Error("Office Manager approval and fee clearance are required first.");
        }
        request.principal = "Approved";
      });
      const request = getActiveWizardRequest();
      refreshWizard(request);
      showWizardSlide(6);
    } catch (error) {
      showNotice(document.getElementById("notice"), error.message, "error");
    }
  });

  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => showWizardSlide(Number(button.dataset.back)));
  });

  const savedId = Number(localStorage.getItem(CURRENT_REQUEST_KEY));
  if (savedId) {
    try {
      const savedRequest = readRequests().find((request) => request.id === savedId);
      if (savedRequest) loadRequest(savedRequest, stepForRequest(savedRequest));
    } catch (error) {
      showNotice(document.getElementById("notice"), `Could not restore request: ${error.message}`, "error");
    }
  }
  return true;
}

function initializeApplication() {
  if (!initializeWizardApplication()) initializeLegacyApplication();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApplication, { once: true });
} else {
  initializeApplication();
}
