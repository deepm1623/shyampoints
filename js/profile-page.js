import { bootProtected, $, confirmLogout, toast } from "./app-core.js";
import { updateUserProfile } from "./firestore-service.js";

bootProtected("profile", (user, profile) => {
  const openEdit = () => {
    $("#edit-name").value = profile?.fullName || profile?.name || "";
    $("#edit-phone").value = profile?.mobile || profile?.phone || "";
    $("#edit-city").value = profile?.city || "";
    $("#edit-profile-modal")?.classList.remove("hidden");
  };

  $("#edit-profile-btn")?.addEventListener("click", openEdit);

  $("#cancel-edit-profile")?.addEventListener("click", () => {
    $("#edit-profile-modal")?.classList.add("hidden");
  });

  $("#save-edit-profile")?.addEventListener("click", async () => {
    const fullName = $("#edit-name")?.value.trim() || "";
    const mobile = $("#edit-phone")?.value.trim() || "";
    const city = $("#edit-city")?.value.trim() || "";

    if (fullName.length < 2) {
      toast("Enter a valid name", "error");
      return;
    }

    try {
      await updateUserProfile(user.uid, { fullName, mobile, city });
      toast("Profile updated", "success");
      $("#edit-profile-modal")?.classList.add("hidden");
    } catch (err) {
      console.error(err);
      toast("Could not save profile", "error");
    }
  });

  $("#logout-btn")?.addEventListener("click", () => $("#logout-modal")?.classList.remove("hidden"));
  $("#cancel-logout")?.addEventListener("click", () => $("#logout-modal")?.classList.add("hidden"));
  $("#confirm-logout")?.addEventListener("click", confirmLogout);
});
