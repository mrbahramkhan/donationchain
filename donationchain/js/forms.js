/**
 * Case applications + donor profiles with validation.
 * Storage: localStorage (demo).
 */
const DCForms = (() => {
  const CASES_KEY = "dc_case_applications";
  const DONORS_KEY = "dc_donor_profiles";
  const MAX_FILE_BYTES = 1.5 * 1024 * 1024;
  const MAX_FILES = 5;
  const ALLOWED_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];
  const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

  /* ── validators ───────────────────────────────────────── */

  const Validators = {
    required(v, label) {
      if (v == null || String(v).trim() === "") return label + " is required";
      return null;
    },
    minLen(v, n, label) {
      if (String(v || "").trim().length < n) return label + " must be at least " + n + " characters";
      return null;
    },
    maxLen(v, n, label) {
      if (String(v || "").length > n) return label + " must be under " + n + " characters";
      return null;
    },
    /** Pakistan mobile: 03XXXXXXXXX or +923XXXXXXXXX */
    phonePK(v) {
      const s = String(v || "").replace(/[\s\-]/g, "");
      if (!s) return "Mobile number is required";
      if (/^(\+92|92)3\d{9}$/.test(s)) return null;
      if (/^03\d{9}$/.test(s)) return null;
      return "Enter a valid PK mobile (03XX XXXXXXX)";
    },
    /** International or PK — for donors (diaspora-friendly) */
    phoneIntl(v) {
      const s = String(v || "").replace(/[\s\-\(\)]/g, "");
      if (!s) return "Mobile number is required";
      if (/^(\+92|92)3\d{9}$/.test(s) || /^03\d{9}$/.test(s)) return null;
      // E.164-ish: + and 8–15 digits
      if (/^\+[1-9]\d{7,14}$/.test(s)) return null;
      if (/^\d{10,15}$/.test(s)) return null;
      return "Enter a valid mobile with country code (e.g. +92… or +1…)";
    },
    /** CNIC: 13 digits with optional dashes XXXXX-XXXXXXX-X */
    cnic(v, required) {
      const s = String(v || "").trim();
      if (!s) return required ? "CNIC is required" : null;
      const digits = s.replace(/\D/g, "");
      if (digits.length !== 13) return "CNIC must be 13 digits";
      if (!/^\d{5}-?\d{7}-?\d$/.test(s.replace(/\s/g, ""))) {
        return "CNIC format: 12345-1234567-1";
      }
      return null;
    },
    email(v, required) {
      const s = String(v || "").trim();
      if (!s) return required ? "Email is required" : null;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "Enter a valid email address";
      return null;
    },
    amount(v, min, max) {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) return "Enter a valid amount";
      if (min != null && n < min) return "Minimum amount is PKR " + min.toLocaleString();
      if (max != null && n > max) return "Maximum amount is PKR " + max.toLocaleString();
      return null;
    },
    name(v) {
      const s = String(v || "").trim();
      if (!s) return "Full name is required";
      if (s.length < 3) return "Name is too short";
      if (s.length > 80) return "Name is too long";
      if (!/^[a-zA-Z\u0600-\u06FF\s.'.-]+$/.test(s)) return "Name contains invalid characters";
      return null;
    },
  };

  function firstError(errors) {
    return errors.find(Boolean) || null;
  }

  function validateCaseForm(data, files) {
    const errors = {};
    const e = (key, msg) => {
      if (msg) errors[key] = msg;
    };

    e("fullName", Validators.name(data.fullName));
    e("phone", Validators.phonePK(data.phone));
    e("cnic", Validators.cnic(data.cnic, false));
    e("city", Validators.required(data.city, "City") || Validators.minLen(data.city, 2, "City"));
    e("title", Validators.required(data.title, "Case title") || Validators.minLen(data.title, 8, "Case title"));
    e(
      "description",
      Validators.required(data.description, "Description") ||
        Validators.minLen(data.description, 20, "Description") ||
        Validators.maxLen(data.description, 2000, "Description")
    );
    e("amountNeeded", Validators.amount(data.amountNeeded, 1000, 5000000));
    e("category", Validators.required(data.category, "Category"));

    if (data.vendorAccount) {
      const acc = String(data.vendorAccount).replace(/\s/g, "");
      if (acc.length < 8) errors.vendorAccount = "Account / IBAN looks too short";
    }

    if (!data.consent) errors.consent = "Please accept the declaration";

    // Files optional but if present must be valid
    if (files && files.length > MAX_FILES) {
      errors.proofs = "Maximum " + MAX_FILES + " files allowed";
    }

    return { ok: Object.keys(errors).length === 0, errors };
  }

  function validateDonorForm(data) {
    const errors = {};
    const e = (key, msg) => {
      if (msg) errors[key] = msg;
    };
    e("fullName", Validators.name(data.fullName));
    e("phone", Validators.phoneIntl(data.phone));
    e("email", Validators.email(data.email, false));
    // Optional ID: validate as CNIC only if 13 digits; passport/other free text OK
    const idDigits = String(data.cnic || "").replace(/\D/g, "");
    if (idDigits.length === 13) e("cnic", Validators.cnic(data.cnic, false));
    if (data.city) e("city", Validators.minLen(data.city, 2, "City"));
    if (!data.consent) errors.consent = "Please accept privacy consent";
    return { ok: Object.keys(errors).length === 0, errors };
  }

  function validateFiles(fileList) {
    const files = Array.from(fileList || []);
    const errors = [];
    if (files.length > MAX_FILES) errors.push("Maximum " + MAX_FILES + " files");
    files.forEach((f) => {
      const ext = "." + (f.name.split(".").pop() || "").toLowerCase();
      const typeOk = ALLOWED_TYPES.includes(f.type) || ALLOWED_EXT.includes(ext);
      if (!typeOk) errors.push(f.name + ": only PDF, JPG, PNG, WEBP");
      if (f.size > MAX_FILE_BYTES) errors.push(f.name + ": max 1.5 MB");
      if (f.size === 0) errors.push(f.name + ": empty file");
    });
    return { ok: errors.length === 0, errors, files: files.slice(0, MAX_FILES) };
  }

  /* ── UI helpers ───────────────────────────────────────── */

  function clearFieldErrors(form) {
    form.querySelectorAll("[data-error-for]").forEach((el) => {
      el.textContent = "";
      el.classList.add("hidden");
    });
    form.querySelectorAll(".field-invalid").forEach((el) => el.classList.remove("field-invalid", "border-red-400"));
  }

  function showFieldErrors(form, errors) {
    clearFieldErrors(form);
    Object.keys(errors).forEach((key) => {
      const input =
        form.querySelector('[name="' + key + '"]') ||
        form.querySelector("#" + key) ||
        form.querySelector('[name="' + key + '"]');
      if (input) {
        input.classList.add("border-red-400");
        input.setAttribute("aria-invalid", "true");
      }
      let box = form.querySelector('[data-error-for="' + key + '"]');
      if (!box && input && input.parentElement) {
        box = document.createElement("p");
        box.dataset.errorFor = key;
        box.className = "text-xs text-red-600 mt-1";
        input.parentElement.appendChild(box);
      }
      if (box) {
        box.textContent = errors[key];
        box.classList.remove("hidden");
      }
    });
    const firstKey = Object.keys(errors)[0];
    const first =
      form.querySelector('[name="' + firstKey + '"]') || form.querySelector("#" + firstKey);
    if (first && first.focus) first.focus();
  }

  /** Live format CNIC as user types */
  function bindCnicMask(input) {
    if (!input) return;
    input.addEventListener("input", () => {
      let d = input.value.replace(/\D/g, "").slice(0, 13);
      if (d.length > 12) d = d.slice(0, 5) + "-" + d.slice(5, 12) + "-" + d.slice(12);
      else if (d.length > 5) d = d.slice(0, 5) + "-" + d.slice(5);
      input.value = d;
    });
  }

  function bindPhoneHint(input) {
    if (!input) return;
    input.addEventListener("blur", () => {
      let s = input.value.replace(/[\s\-]/g, "");
      if (/^3\d{9}$/.test(s)) input.value = "0" + s;
    });
  }

  /* ── storage ──────────────────────────────────────────── */

  function load(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  }

  function save(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
  }

  function uid(prefix) {
    return (
      prefix +
      "-" +
      Date.now().toString(36).toUpperCase() +
      "-" +
      Math.random().toString(36).slice(2, 6).toUpperCase()
    );
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          dataUrl: reader.result,
        });
      reader.onerror = () => reject(new Error("Could not read " + file.name));
      reader.readAsDataURL(file);
    });
  }

  async function submitCaseApplication(formEl) {
    const fd = new FormData(formEl);
    const data = {
      fullName: String(fd.get("fullName") || "").trim(),
      cnic: String(fd.get("cnic") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      city: String(fd.get("city") || "").trim(),
      address: String(fd.get("address") || "").trim(),
      category: String(fd.get("category") || "medical"),
      title: String(fd.get("title") || "").trim(),
      description: String(fd.get("description") || "").trim(),
      amountNeeded: Number(fd.get("amountNeeded") || 0),
      urgency: String(fd.get("urgency") || "medium"),
      vendorName: String(fd.get("vendorName") || "").trim(),
      vendorAccount: String(fd.get("vendorAccount") || "").trim(),
      consent: fd.get("consent") === "on",
    };

    const proofsInput = formEl.querySelector("#proof-files");
    const fileCheck = validateFiles(proofsInput?.files);
    const fieldCheck = validateCaseForm(data, fileCheck.files);

    if (!fileCheck.ok) {
      fieldCheck.errors.proofs = fileCheck.errors[0];
      fieldCheck.ok = false;
    }

    if (!fieldCheck.ok) {
      showFieldErrors(formEl, fieldCheck.errors);
      const err = new Error(Object.values(fieldCheck.errors)[0] || "Validation failed");
      err.validation = fieldCheck.errors;
      throw err;
    }

    clearFieldErrors(formEl);

    const proofs = [];
    for (const f of fileCheck.files) {
      proofs.push(await readFileAsDataURL(f));
    }

    const record = {
      id: uid("APP"),
      type: "case_application",
      status: "pending_review",
      createdAt: new Date().toISOString(),
      applicant: {
        fullName: data.fullName,
        cnic: data.cnic,
        phone: data.phone,
        city: data.city,
        address: data.address,
      },
      case: {
        category: data.category,
        title: data.title,
        description: data.description,
        amountNeeded: data.amountNeeded,
        urgency: data.urgency,
        vendorName: data.vendorName,
        vendorAccount: data.vendorAccount,
      },
      consent: true,
      proofs,
    };

    const all = load(CASES_KEY);
    all.unshift(record);
    save(CASES_KEY, all);
    return record;
  }

  function submitDonorProfile(formEl) {
    const fd = new FormData(formEl);
    const data = {
      fullName: String(fd.get("fullName") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      country: String(fd.get("country") || "PK").trim(),
      city: String(fd.get("city") || "").trim(),
      cnic: String(fd.get("cnic") || "").trim(),
      preferredCategories: Array.from(formEl.querySelectorAll('input[name="cat"]:checked')).map(
        (el) => el.value
      ),
      zakatPayer: fd.get("zakatPayer") === "on",
      newsletter: fd.get("newsletter") === "on",
      consent: fd.get("consent") === "on",
    };

    const fieldCheck = validateDonorForm(data);
    if (!fieldCheck.ok) {
      showFieldErrors(formEl, fieldCheck.errors);
      const err = new Error(Object.values(fieldCheck.errors)[0] || "Validation failed");
      err.validation = fieldCheck.errors;
      throw err;
    }
    clearFieldErrors(formEl);

    const record = {
      id: uid("DNR"),
      type: "donor_profile",
      createdAt: new Date().toISOString(),
      ...data,
    };

    const all = load(DONORS_KEY);
    const idx = all.findIndex((d) => d.phone === record.phone);
    if (idx >= 0) {
      record.id = all[idx].id;
      all[idx] = { ...all[idx], ...record, updatedAt: record.createdAt };
    } else {
      all.unshift(record);
    }
    save(DONORS_KEY, all);
    localStorage.setItem("dc_donor_profile_id", record.id);
    return record;
  }

  function listApplications() {
    return load(CASES_KEY);
  }

  function listDonors() {
    return load(DONORS_KEY);
  }

  function updateApplicationStatus(id, status) {
    const all = load(CASES_KEY);
    const i = all.findIndex((x) => x.id === id);
    if (i < 0) return null;
    all[i].status = status;
    all[i].reviewedAt = new Date().toISOString();
    save(CASES_KEY, all);
    return all[i];
  }

  function setFieldError(form, name, message) {
    const input =
      form.querySelector('[name="' + name + '"]') || form.querySelector("#" + name);
    let box = form.querySelector('[data-error-for="' + name + '"]');
    if (!box && input && input.parentElement) {
      box = document.createElement("p");
      box.dataset.errorFor = name;
      box.className = "text-xs text-red-600 mt-1";
      box.setAttribute("role", "alert");
      input.parentElement.appendChild(box);
    }
    if (message) {
      if (input) {
        input.classList.add("border-red-400");
        input.setAttribute("aria-invalid", "true");
      }
      if (box) {
        box.textContent = message;
        box.classList.remove("hidden");
      }
    } else {
      if (input) {
        input.classList.remove("border-red-400");
        input.removeAttribute("aria-invalid");
        if (String(input.value || "").trim()) {
          input.classList.add("border-emerald-400");
        } else {
          input.classList.remove("border-emerald-400");
        }
      }
      if (box) {
        box.textContent = "";
        box.classList.add("hidden");
      }
    }
  }

  function validateFieldLive(form, name, mode) {
    // mode: "case" | "donor"
    const el = form.querySelector('[name="' + name + '"]');
    if (!el) return true;
    const v = el.type === "checkbox" ? el.checked : el.value;
    let msg = null;

    if (mode === "case") {
      switch (name) {
        case "fullName":
          msg = Validators.name(v);
          break;
        case "phone":
          if (String(v).trim()) msg = Validators.phonePK(v);
          break;
        case "cnic":
          msg = Validators.cnic(v, false);
          break;
        case "city":
          if (String(v).trim()) msg = Validators.required(v, "City") || Validators.minLen(v, 2, "City");
          break;
        case "title":
          if (String(v).trim())
            msg = Validators.required(v, "Case title") || Validators.minLen(v, 8, "Case title");
          break;
        case "description":
          if (String(v).trim())
            msg =
              Validators.required(v, "Description") ||
              Validators.minLen(v, 20, "Description") ||
              Validators.maxLen(v, 2000, "Description");
          break;
        case "amountNeeded":
          if (String(v).trim()) msg = Validators.amount(v, 1000, 5000000);
          break;
        case "vendorAccount":
          if (String(v).trim() && String(v).replace(/\s/g, "").length < 8)
            msg = "Account / IBAN looks too short";
          break;
        case "consent":
          // only on change to checked=false after touch
          break;
        default:
          break;
      }
    } else if (mode === "donor") {
      switch (name) {
        case "fullName":
          msg = Validators.name(v);
          break;
        case "phone":
          if (String(v).trim()) msg = Validators.phoneIntl(v);
          break;
        case "email":
          msg = Validators.email(v, false);
          break;
        case "cnic": {
          const digits = String(v || "").replace(/\D/g, "");
          if (digits.length === 13) msg = Validators.cnic(v, false);
          break;
        }
        case "city":
          if (String(v).trim()) msg = Validators.minLen(v, 2, "City");
          break;
        default:
          break;
      }
    }

    // Empty optional fields: no error while typing
    const optionalEmpty =
      ["cnic", "email", "vendorAccount", "address", "vendorName"].includes(name) &&
      !String(el.type === "checkbox" ? "" : el.value || "").trim();
    if (optionalEmpty) msg = null;

    // Required fields empty on input: don't scream until blur
    setFieldError(form, name, msg);
    return !msg;
  }

  function enhanceForm(form, mode) {
    if (!form) return;
    mode = mode || (form.id === "donor-form" ? "donor" : "case");
    bindCnicMask(form.querySelector('[name="cnic"]'));
    bindPhoneHint(form.querySelector('[name="phone"]'));

    const debounce = (fn, ms) => {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
      };
    };

    form.querySelectorAll("input, textarea, select").forEach((el) => {
      const name = el.name;
      if (!name) return;

      const run = () => validateFieldLive(form, name, mode);
      const runDebounced = debounce(run, 280);

      el.addEventListener("input", () => {
        el.classList.remove("border-emerald-400");
        if (el.type === "checkbox") run();
        else runDebounced();
      });
      el.addEventListener("change", run);
      el.addEventListener("blur", () => {
        // On blur, validate required empties too
        if (!String(el.value || "").trim() && ["fullName", "phone", "city", "title", "description", "amountNeeded"].includes(name) && mode === "case") {
          const map = {
            fullName: () => Validators.name(""),
            phone: () => Validators.phonePK(""),
            city: () => Validators.required("", "City"),
            title: () => Validators.required("", "Case title"),
            description: () => Validators.required("", "Description"),
            amountNeeded: () => Validators.amount("", 1000, 5000000),
          };
          setFieldError(form, name, map[name] ? map[name]() : "Required");
        } else if (!String(el.value || "").trim() && ["fullName", "phone"].includes(name) && mode === "donor") {
          setFieldError(form, name, name === "fullName" ? Validators.name("") : Validators.phonePK(""));
        } else {
          run();
        }
      });
    });

    // Character counter for description
    const desc = form.querySelector('[name="description"]');
    if (desc && !form.querySelector("[data-desc-count]")) {
      const counter = document.createElement("p");
      counter.dataset.descCount = "1";
      counter.className = "text-[11px] text-slate-400 mt-1 text-right";
      desc.parentElement.appendChild(counter);
      const upd = () => {
        const n = (desc.value || "").length;
        counter.textContent = n + " / 2000";
        counter.className =
          "text-[11px] mt-1 text-right " + (n > 0 && n < 20 ? "text-amber-600" : n >= 2000 ? "text-red-600" : "text-slate-400");
      };
      desc.addEventListener("input", upd);
      upd();
    }
  }

  return {
    Validators,
    validateCaseForm,
    validateDonorForm,
    validateFiles,
    submitCaseApplication,
    submitDonorProfile,
    listApplications,
    listDonors,
    updateApplicationStatus,
    showFieldErrors,
    clearFieldErrors,
    setFieldError,
    validateFieldLive,
    enhanceForm,
    MAX_FILE_BYTES,
    MAX_FILES,
  };
})();

window.DCForms = DCForms;
