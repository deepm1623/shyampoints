import { bootProtected, $, applyTheme, confirmLogout, toast, currentProfile } from "./app-core.js";
import {
  updateUserProfile,
  uploadProfilePhoto,
  removeProfilePhoto,
  validateProfilePhoto,
} from "./firestore-service.js";

const ACCEPTED = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

let pageReady = false;
let pendingPhoto = null;

bootProtected("settings", (user, profile) => {
  const nameInput = $("#settings-name");
  const phoneInput = $("#settings-phone");
  const cityInput = $("#settings-city");
  const photoInput = $("#settings-photo-input");
  const photoPreview = $("#settings-photo-preview");
  const photoUploadBtn = $("#settings-photo-upload");
  const photoRemoveBtn = $("#settings-photo-remove");
  const saveBtn = $("#save-settings");
  const photoStatus = $("#settings-photo-status");

  function setPhotoPreview(url) {
    if (!photoPreview) return;
    if (url) {
      photoPreview.src = url;
      photoPreview.classList.remove("avatar-placeholder");
    } else {
      photoPreview.removeAttribute("src");
      photoPreview.classList.add("avatar-placeholder");
    }
  }

  function setPhotoLoading(on) {
    $("#settings-photo-wrap")?.classList.toggle("is-uploading", on);
    if (photoUploadBtn) photoUploadBtn.disabled = on;
    if (photoRemoveBtn) photoRemoveBtn.disabled = on;
    if (saveBtn) saveBtn.disabled = on;
    if (photoStatus) photoStatus.textContent = on ? "Uploading photo…" : "";
  }

  function fillForm(p) {
    if (nameInput) nameInput.value = p?.fullName || p?.name || "";
    if (phoneInput) phoneInput.value = p?.mobile || p?.phone || "";
    if (cityInput) cityInput.value = p?.city || "";
    if (!pendingPhoto) {
      setPhotoPreview(p?.photoURL || p?.avatarUrl || user.photoURL || "");
    }
    if (photoRemoveBtn) {
      photoRemoveBtn.hidden = !(p?.photoURL || p?.avatarUrl || user.photoURL || pendingPhoto);
    }
  }

  fillForm(profile);

  if (pageReady) return;
  pageReady = true;

  const themeBtn = $("#theme-toggle");
  if (themeBtn && (localStorage.getItem("sp-theme") || "") === "dark") themeBtn.classList.add("on");

  themeBtn?.addEventListener("click", () => {
    themeBtn.classList.toggle("on");
    localStorage.setItem("sp-theme", themeBtn.classList.contains("on") ? "dark" : "light");
    applyTheme();
    toast("Theme updated", "success");
  });

  photoUploadBtn?.addEventListener("click", () => photoInput?.click());

  photoInput?.addEventListener("change", () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    try {
      validateProfilePhoto(file);
      pendingPhoto = file;
      setPhotoPreview(URL.createObjectURL(file));
      if (photoRemoveBtn) photoRemoveBtn.hidden = false;
      toast("Photo selected — tap Save changes to upload", "success");
    } catch (err) {
      pendingPhoto = null;
      photoInput.value = "";
      toast(err.message || "Invalid image", "error");
    }
  });

  photoRemoveBtn?.addEventListener("click", async () => {
    pendingPhoto = null;
    if (photoInput) photoInput.value = "";

    const p = currentProfile || profile;
    const hasStored = p?.photoURL || p?.avatarUrl || user.photoURL;
    if (!hasStored) {
      setPhotoPreview("");
      if (photoRemoveBtn) photoRemoveBtn.hidden = true;
      return;
    }

    setPhotoLoading(true);
    try {
      await removeProfilePhoto(user.uid);
      setPhotoPreview("");
      if (photoRemoveBtn) photoRemoveBtn.hidden = true;
      toast("Profile photo removed", "success");
    } catch (err) {
      console.error(err);
      toast("Could not remove photo", "error");
    } finally {
      setPhotoLoading(false);
    }
  });

  saveBtn?.addEventListener("click", async () => {
    const fullName = nameInput?.value.trim() || "";
    const mobile = phoneInput?.value.trim() || "";
    const city = cityInput?.value.trim() || "";

    setPhotoLoading(true);
    try {
      if (pendingPhoto) {
        await uploadProfilePhoto(user.uid, pendingPhoto);
        pendingPhoto = null;
        if (photoInput) photoInput.value = "";
      }

      await updateUserProfile(user.uid, {
        ...(fullName ? { fullName } : {}),
        mobile,
        city,
      });

      toast("Settings saved", "success");
    } catch (err) {
      console.error(err);
      toast(err.message || "Could not save settings", "error");
    } finally {
      setPhotoLoading(false);
    }
  });

  $("#settings-logout")?.addEventListener("click", confirmLogout);
});
