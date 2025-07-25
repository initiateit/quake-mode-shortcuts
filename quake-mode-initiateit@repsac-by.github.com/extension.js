import Meta from "gi://Meta";
import Shell from "gi://Shell";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as altTab from "resource:///org/gnome/shell/ui/altTab.js";
import { Workspace } from "resource:///org/gnome/shell/ui/workspace.js";
import {
  Extension,
  InjectionManager,
} from "resource:///org/gnome/shell/extensions/extension.js";
import { QuakeModeApp, state } from "./quakemodeapp.js";
import { Indicator } from "./indicator.js";

/** @type {InstanceType<typeof Indicator> | undefined} */
let indicator;

const IndicatorName = "Quake-mode";

const APPS_COUNT = 5;

/** @type Map<number, InstanceType<typeof QuakeModeApp>> */
const apps = new Map();

const injectionManager = new InjectionManager();

export default class QuakeModeExtension extends Extension {
  enable() {
    this._settings = this.getSettings();

    this._setTray(this._settings.get_boolean("quake-mode-tray"));
    this._settings.connect("changed::quake-mode-tray", (settings, key) => {
      this._setTray(settings.get_boolean(key));
    });

    this._setupOverview(
      this._settings.get_boolean("quake-mode-hide-from-overview"),
    );
    this._settings.connect(
      "changed::quake-mode-hide-from-overview",
      (settings, key) => {
        this._setupOverview(settings.get_boolean(key));
      },
    );

    if (this._settings.get_string("quake-mode-app")) {
      this._settings
        .get_child("apps")
        .set_string("app-1", this._settings.get_string("quake-mode-app"));
      this._settings.reset("quake-mode-app");
    }

    if (this._settings.get_strv("quake-mode-hotkey")[0]) {
      this._settings
        .get_child("accelerators")
        .set_strv(
          "quake-mode-accelerator-1",
          this._settings.get_strv("quake-mode-hotkey"),
        );
      this._settings.reset("quake-mode-hotkey");
    }

    // Register toggle shortcuts
    for (let i = 1; i <= APPS_COUNT; i++) {
      Main.wm.addKeybinding(
        `quake-mode-accelerator-${i}`,
        this._settings.get_child("accelerators"),
        Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
        Shell.ActionMode.NORMAL |
          Shell.ActionMode.OVERVIEW |
          Shell.ActionMode.POPUP,
        () => this._toggle(i),
      );
    }

    // Register resize shortcuts
    const resizeShortcuts = [
      { key: "resize-height-increase", action: () => this._resizeHeight(1) },
      { key: "resize-height-decrease", action: () => this._resizeHeight(-1) },
      { key: "resize-width-decrease", action: () => this._resizeWidth(-1) },
      { key: "resize-width-increase", action: () => this._resizeWidth(1) },
    ];

    for (const shortcut of resizeShortcuts) {
      Main.wm.addKeybinding(
        shortcut.key,
        this._settings.get_child("accelerators"),
        Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
        Shell.ActionMode.NORMAL,
        shortcut.action,
      );
    }
  }

  disable() {
    // Remove toggle shortcuts
    for (let i = 1; i <= APPS_COUNT; i++) {
      Main.wm.removeKeybinding(`quake-mode-accelerator-${i}`);
    }

    // Remove resize shortcuts
    const resizeKeys = [
      "resize-height-increase",
      "resize-height-decrease", 
      "resize-width-decrease",
      "resize-width-increase"
    ];

    for (const key of resizeKeys) {
      Main.wm.removeKeybinding(key);
    }

    if (indicator) {
      indicator.destroy();
      indicator = undefined;
    }

    if (Main.sessionMode.currentMode !== "unlock-dialog") {
      apps.forEach((app) => app && app.destroy());
      apps.clear();
    }

    if (this._settings) {
      this._settings.run_dispose();
      this._settings = undefined;
    }

    this._setupOverview(false);
  }

  /**
   * @param {number} i
   * @returns {string}
   */
  _app_id(i) {
    if (!this._settings) throw new Error("The settings base are not defined");
    //@ts-expect-error
    return this._settings.get_child("apps").get_string(`app-${i}`);
  }

  /**
   * @param {number} i
   */
  async _toggle(i) {
    try {
      let app = apps.get(i);
      if (!app || app.state === state.DEAD) {
        app = new QuakeModeApp(this._app_id(i));
        apps.set(i, app);
      }

      await app.toggle();
    } catch (e) {
      Main.notify("Quake-mode", e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * Resize height of active quake app
   * @param {number} direction - 1 for increase, -1 for decrease
   */
  _resizeHeight(direction) {
    try {
      const activeApp = this._getActiveQuakeApp();
      if (!activeApp) return;

      const currentHeight = this._settings.get_int("quake-mode-height");
      const step = this._settings.get_int("resize-step");
      const newHeight = Math.max(1, Math.min(100, currentHeight + (direction * step)));
      
      this._settings.set_int("quake-mode-height", newHeight);
      
      // The place() method will be called automatically due to settings change listener
    } catch (e) {
      Main.notify("Quake-mode", e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * Resize width of active quake app
   * @param {number} direction - 1 for increase, -1 for decrease
   */
  _resizeWidth(direction) {
    try {
      const activeApp = this._getActiveQuakeApp();
      if (!activeApp) return;

      const currentWidth = this._settings.get_int("quake-mode-width");
      const step = this._settings.get_int("resize-step");
      const newWidth = Math.max(1, Math.min(100, currentWidth + (direction * step)));
      
      this._settings.set_int("quake-mode-width", newWidth);
      
      // The place() method will be called automatically due to settings change listener
    } catch (e) {
      Main.notify("Quake-mode", e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * Get the currently active quake app (visible and focused)
   * @returns {InstanceType<typeof QuakeModeApp> | null}
   */
  _getActiveQuakeApp() {
    for (const app of apps.values()) {
      if (app.state === state.RUNNING && 
          app.win && 
          app.win.has_focus() && 
          !app.win.is_hidden()) {
        return app;
      }
    }
    return null;
  }

  /**
   * @param {boolean} [show]
   */
  _setTray(show) {
    if (indicator) {
      indicator.destroy();
      indicator = undefined;
    }

    if (show) {
      indicator = new Indicator({
        IndicatorName,
        toggle: () => this._toggle(1),
      });
      Main.panel.addToStatusArea(IndicatorName, indicator.panelButton);
    }
  }

  /**
   * @param {boolean} [hide]
   */
  _setupOverview(hide) {
    if (hide) {
      /** @param {import('@girs/meta-13').Meta.Window} window */
      const has = (window) =>
        [...apps.values()].some((app) => app.win === window);

      injectionManager.overrideMethod(
        Workspace.prototype,
        "_isOverviewWindow",
        (_isOverviewWindow) =>
          function (window, ...rest) {
            const show = _isOverviewWindow.call(this, window, ...rest);
            return show && !has(window);
          },
      );

      injectionManager.overrideMethod(
        altTab.WindowSwitcherPopup.prototype,
        "_getWindowList",
        (_getWindowList) =>
          function (...args) {
            const windows = _getWindowList.call(this, ...args);
            return windows.filter((window) => !has(window));
          },
      );

      injectionManager.overrideMethod(
        altTab.WindowCyclerPopup.prototype,
        "_getWindows",
        (_getWindows) =>
          function (...args) {
            const windows = _getWindows.call(this, ...args);
            return windows.filter((window) => !has(window));
          },
      );
    } else {
      injectionManager.clear();
    }
  }
}