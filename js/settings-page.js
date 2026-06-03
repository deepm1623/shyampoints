import { bootProtected, $, applyTheme, confirmLogout, toast, currentProfile, applyAvatar } from "./app-core.js";
import {
  updateUserProfile,
  uploadProfilePhoto,
  removeProfilePhoto,
  validateProfilePhoto,
  storageErrorMessage,
} from "./firestore-service.js";

let pageReady = false;
let pendingPhoto = null;
let savedSnapshot = null;

bootProtected("settings", (user, profile) => {
  const nameInput = $("#settings-name");
  const phoneInput = $("#settings-phone");
  const cityInput = $("#settings-city");
  const roleInput = $("#settings-role");
  const photoInput = $("#settings-photo-input");
  const photoPreview = $("#settings-photo-preview");
  const photoUploadBtn = $("#settings-photo-upload");
  const photoRemoveBtn = $("#settings-photo-remove");
  const saveBtn = $("#settings-save");
  const cancelBtn = $("#settings-cancel");
  const photoStatus = $("#settings-photo-status");
  const progressWrap = $("#upload-progress");
  const progressBar = $("#upload-progress-bar");
  const progressText = $("#upload-progress-text");

  function setProgress(pct) {
    if (progressWrap) {
      progressWrap.hidden = false;
      progressWrap.removeAttribute("hidden");
    }
    if (progressBar) {
      progressBar.style.width = `${Math.max(pct, pct > 0 ? 4 : 0)}%`;
      progressBar.setAttribute("aria-valuenow", String(pct));
    }
    if (progressText) progressText.textContent = `${pct}%`;
    if (pct >= 100) {
      setTimeout(() => {
        if (progressWrap) progressWrap.hidden = true;
        if (progressBar) progressBar.style.width = "0%";
      }, 600);
    }
  }

  function setBusy(on) {
    $("#settings-photo-wrap")?.classList.toggle("is-uploading", on);
    if (photoUploadBtn) photoUploadBtn.disabled = on;
    if (photoRemoveBtn) photoRemoveBtn.disabled = on;
    if (saveBtn) saveBtn.disabled = on;
    if (cancelBtn) cancelBtn.disabled = on;
  }

  function snapshot(p) {
    return {
      fullName: p?.fullName || p?.name || "",
      mobile: p?.mobile || p?.phone || "",
      city: p?.city || "",
      profileImage: p?.profileImage || p?.photoURL || p?.avatarUrl || user.photoURL || "",
    };
  }

  function fillForm(p) {
    const data = snapshot(p || {});
    if (nameInput) nameInput.value = data.fullName;
    if (phoneInput) phoneInput.value = data.mobile;
    if (cityInput) cityInput.value = data.city;
    if (roleInput) roleInput.value = p?.role || "";
    if (!pendingPhoto && photoPreview) {
      applyAvatar(photoPreview, data.profileImage, data.fullName || user.email);
    }
    if (photoRemoveBtn) {
      photoRemoveBtn.hidden = !(data.profileImage || pendingPhoto);
    }
    savedSnapshot = data;
  }

  fillForm(profile);

  if (pageReady) return;
  pageReady = true;

  const themeBtn = $("#theme-toggle");
  if (themeBtn && (localStorage.getItem("sp-theme") || "") === "dark") themeBtn.classList.add("on");

  const themeBtnMobile = $("#theme-toggle-mobile");
  if (themeBtnMobile && themeBtn && themeBtn.classList.contains("on")) {
    themeBtnMobile.classList.add("on");
  }

  function syncThemeToggles() {
    const on = themeBtn?.classList.contains("on");
    themeBtnMobile?.classList.toggle("on", !!on);
  }

  themeBtn?.addEventListener("click", () => {
    themeBtn.classList.toggle("on");
    localStorage.setItem("sp-theme", themeBtn.classList.contains("on") ? "dark" : "light");
    syncThemeToggles();
    applyTheme();
    toast("Theme updated", "success");
  });

  themeBtnMobile?.addEventListener("click", () => {
    themeBtnMobile.classList.toggle("on");
    if (themeBtn) themeBtn.classList.toggle("on", themeBtnMobile.classList.contains("on"));
    localStorage.setItem("sp-theme", themeBtnMobile.classList.contains("on") ? "dark" : "light");
    applyTheme();
    toast("Theme updated", "success");
  });

  photoUploadBtn?.addEventListener("click", () => photoInput?.click());

  photoInput?.addEventListener("change", async () => {
    const file = photoInput.files?.[0];
    if (!file) return;

    try {
      validateProfilePhoto(file);
    } catch (err) {
      photoInput.value = "";
      toast(err.message || "Invalid image", "error");
      return;
    }

    pendingPhoto = file;
    applyAvatar(photoPreview, URL.createObjectURL(file), nameInput?.value || user.displayName);
    if (photoRemoveBtn) photoRemoveBtn.hidden = false;

    setBusy(true);
    setProgress(0);
    toast("Uploading photo…", "success");
    if (photoStatus) photoStatus.textContent = "Uploading…";

    try {
      await uploadProfilePhoto(user.uid, file, {
        onProgress: setProgress,
        onSuccess: (profileImage) => {
          pendingPhoto = null;
          applyAvatar(photoPreview, profileImage, nameInput?.value || user.displayName || user.email);
          if (photoRemoveBtn) photoRemoveBtn.hidden = false;
        },
      });
      photoInput.value = "";
      if (photoStatus) photoStatus.textContent = "";
      toast("Profile photo uploaded successfully", "success");
    } catch (err) {
      console.error("[Settings] Profile photo upload failed", err);
      pendingPhoto = null;
      photoInput.value = "";
      fillForm(currentProfile || profile);
      toast(storageErrorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  });

  photoRemoveBtn?.addEventListener("click", async () => {
    pendingPhoto = null;
    if (photoInput) photoInput.value = "";

    const p = currentProfile || profile;
    const hasStored = p?.profileImage || p?.photoURL || p?.avatarUrl || user.photoURL;
    if (!hasStored) {
      applyAvatar(photoPreview, "", nameInput?.value || user.email);
      if (photoRemoveBtn) photoRemoveBtn.hidden = true;
      return;
    }

    setBusy(true);
    try {
      await removeProfilePhoto(user.uid);
      applyAvatar(photoPreview, "", nameInput?.value || user.email);
      if (photoRemoveBtn) photoRemoveBtn.hidden = true;
      toast("Profile photo removed", "success");
    } catch (err) {
      console.error(err);
      toast("Could not remove photo", "error");
    } finally {
      setBusy(false);
    }
  });

  cancelBtn?.addEventListener("click", () => {
    pendingPhoto = null;
    if (photoInput) photoInput.value = "";
    fillForm(currentProfile || profile);
    toast("Changes discarded", "success");
  });

  saveBtn?.addEventListener("click", async () => {
    const fullName = nameInput?.value.trim() || "";
    const mobile = phoneInput?.value.trim() || "";
    const city = cityInput?.value.trim() || "";

    if (fullName.length < 2) {
      toast("Enter a valid full name", "error");
      return;
    }

    setBusy(true);
    try {
      await updateUserProfile(user.uid, { fullName, mobile, city });
      toast("Settings saved", "success");
      savedSnapshot = { fullName, mobile, city, profileImage: savedSnapshot?.profileImage || "" };
    } catch (err) {
      console.error(err);
      toast(err.message || "Could not save settings", "error");
    } finally {
      setBusy(false);
    }
  });

  $("#settings-logout")?.addEventListener("click", confirmLogout);
});
