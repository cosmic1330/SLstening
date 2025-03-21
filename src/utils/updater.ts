import { ask, message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

export async function checkForAppUpdates() {
  const update = await check();
  if (update === null) {
    await message("Failed to check for updates.\nPlease try again later.", {
      title: "Error",
      kind: "error",
      okLabel: "OK",
    });
    return;
  } else if (update?.available) {
    const yes = await ask(`Update to ${update.version} is available!`, {
      title: "Update Now!",
      kind: "info",
      okLabel: "Update",
      cancelLabel: "Cancel",
    });
    console.log(yes);
    if (yes) {
      await update.downloadAndInstall();
      await relaunch();
    }
  }
}
