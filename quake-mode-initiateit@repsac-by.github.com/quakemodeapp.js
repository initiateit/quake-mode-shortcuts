import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import Shell from "gi://Shell";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { on, once } from "./util.js";

export var state = {
  INITIAL: Symbol("INITIAL"),
  READY: Symbol("READY"),
  STARTING: Symbol("STARTING"),
  RUNNING: Symbol("RUNNING"),
  DEAD: Symbol("DEAD"),
};

export var QuakeModeApp = class {
  /**
   * @param {string} app_id
   * @param {number} app_index - The app slot number (1-5)
   */
  constructor(app_id, app_index) {
    this.isTransition = false;
    this.state = state.INITIAL;
    this.app_index = app_index;

    /** @type {import('@girs/meta-13').Meta.Window?} */
    this.win = null;

    /** @type {import('@girs/shell-13').Shell.App?} */
    this.app = Shell.AppSystem.get_default().lookup_app(app_id);

    if (!this.app) {
      this.state = state.DEAD;
      throw new Error(`application '${app_id}' not found`);
    }

    const place = () => this.place();
    const setupAlwaysOnTop = () => this.setupAlwaysOnTop(this.alwaysOnTop);

    const extensionObject =
      /** @type import('@girs/gnome-shell/extensions/extension').Extension */ (
        Extension.lookupByURL(import.meta.url)
      );
    const settings = (this.settings = extensionObject.getSettings());
    this.appSettings = settings.get_child("apps");

    // Store signal IDs for proper cleanup
    this.signalIds = [];

    this.signalIds.push(settings.connect("changed::quake-mode-width", place));
    this.signalIds.push(settings.connect("changed::quake-mode-height", place));
    this.signalIds.push(settings.connect("changed::quake-mode-gap", place));
    this.signalIds.push(settings.connect("changed::quake-mode-halign", place));
    this.signalIds.push(settings.connect("changed::quake-mode-valign", place));
    this.signalIds.push(settings.connect("changed::quake-mode-monitor", place));
    this.signalIds.push(settings.connect("changed::quake-mode-always-on-top", setupAlwaysOnTop));

    // Listen for per-app alignment and size changes
    this.appSignalIds = [];
    this.appSignalIds.push(this.appSettings.connect(`changed::app-${app_index}-valign`, place));
    this.appSignalIds.push(this.appSettings.connect(`changed::app-${app_index}-halign`, place));
    this.appSignalIds.push(this.appSettings.connect(`changed::app-${app_index}-width`, place));
    this.appSignalIds.push(this.appSettings.connect(`changed::app-${app_index}-height`, place));

    this.state = state.READY;
  }

  destroy() {
    this.state = state.DEAD;

    // Disconnect all signal handlers before disposing settings
    if (this.settings && this.signalIds) {
      for (const id of this.signalIds) {
        this.settings.disconnect(id);
      }
      this.signalIds = [];
    }

    if (this.appSettings && this.appSignalIds) {
      for (const id of this.appSignalIds) {
        this.appSettings.disconnect(id);
      }
      this.appSignalIds = [];
    }

    if (this.settings) {
      this.settings.run_dispose();
      this.settings = null;
    }

    if (this.appSettings) {
      this.appSettings = null;
    }

    this.win = null;
    this.app = null;
  }

  get child() {
    if (!this.win) return null;

    /** @type {import('@girs/meta-13').Meta.WindowChild} */
    //@ts-expect-error Incorrect return type? TODO: investigate
    const child = this.win.get_compositor_private();

    if (!child) return null;

    return "clip_y" in child
      ? child
      : Object.defineProperty(child, "clip_y", {
          get() {
            return this.clip_rect.origin.y;
          },
          set(y) {
            const rect = this.clip_rect;
            this.set_clip(rect.origin.x, y, rect.size.width, rect.size.height);
          },
        });
  }

  get width() {
    // Check for per-app width setting first
    const appWidth = this.appSettings.get_int(`app-${this.app_index}-width`);
    if (appWidth > 0) {
      return appWidth;
    }
    // Fall back to global setting
    return this.settings.get_int("quake-mode-width");
  }

  get height() {
    // Check for per-app height setting first
    const appHeight = this.appSettings.get_int(`app-${this.app_index}-height`);
    if (appHeight > 0) {
      return appHeight;
    }
    // Fall back to global setting
    return this.settings.get_int("quake-mode-height");
  }

  get gap() {
    return this.settings.get_int("quake-mode-gap");
  }

  get focusout() {
    return this.settings.get_boolean("quake-mode-focusout");
  }

  get ainmation_time() {
    return this.settings.get_double("quake-mode-animation-time") * 1000;
  }

  get alwaysOnTop() {
    return this.settings.get_boolean("quake-mode-always-on-top");
  }

  get halign() {
    // Check for per-app halign setting first
    const appHalign = this.appSettings.get_string(`app-${this.app_index}-halign`);
    if (appHalign) {
      return /** @type {"left" | "center" | "right"} */ (appHalign);
    }
    // Fall back to global setting
    return /** @type {"left" | "center" | "right"} */ (
      this.settings.get_string("quake-mode-halign")
    );
  }

  get valign() {
    // Check for per-app valign setting first
    const appValign = this.appSettings.get_string(`app-${this.app_index}-valign`);
    if (appValign) {
      return /** @type {"top" | "bottom" | "center"} */ (appValign);
    }
    // Fall back to global setting
    return /** @type {"top" | "bottom" | "center"} */ (
      this.settings.get_string("quake-mode-valign")
    );
  }

  get monitor() {
    const { win, settings } = this;

    const monitor = settings.get_int("quake-mode-monitor");

    if (!win) return monitor;

    if (monitor < 0) return 0;

    const max = global.display.get_n_monitors() - 1;
    if (monitor > max) return max;

    return monitor;
  }

  toggle() {
    const { win, app } = this;

    if (this.state === state.READY) {
      // Check if app already has windows before trying to launch
      if (app && app.get_n_windows() > 0) {
        // App is already running, attach to existing window
        this.win = app.get_windows()[0];
        this.state = state.RUNNING;
        this.setupAlwaysOnTop(this.alwaysOnTop);
        once(this.win, "unmanaged", () => this.destroy());

        // Make sure window is on all workspaces and positioned correctly
        this.win.stick();
        this.place();

        // Unminimize if needed and show
        if (this.win.minimized || this.win.is_hidden()) {
          this.win.unminimize();
          this.win.activate(global.get_current_time());
        }

        // Toggle the already-running window
        if (this.win.has_focus()) {
          return this.hide();
        } else {
          Main.activateWindow(this.win);
        }
      } else {
        // No existing windows, launch normally
        return this.launch()
          .then(() => this.first_place())
          .catch((e) => {
            this.destroy();
            throw e;
          });
      }
    }

    if (this.state !== state.RUNNING || !win) return;

    if (win.has_focus()) return this.hide();

    if (win.is_hidden()) return this.show();

    Main.activateWindow(win);
  }

  launch() {
    const { app } = this;
    this.state = state.STARTING;

    if (!app) return Promise.reject(new Error("no app"));

    app.open_new_window(-1);

    return new Promise((resolve, reject) => {
      const timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
        sig.off();
        reject(new Error(`launch '${app.id}' timeout`));
        return true;
      });

      const sig = once(app, "windows-changed", () => {
        GLib.source_remove(timer);

        if (app.get_n_windows() < 1)
          return reject(`app '${app.id}' is launched but no windows`);

        this.win = app.get_windows()[0];

        this.setupAlwaysOnTop(this.alwaysOnTop);

        once(this.win, "unmanaged", () => this.destroy());

        resolve(true);
      });
    });
  }

  first_place() {
    const { win, child } = this;

    if (!win || !child) return;

    child.set_clip(0, 0, child.width, 0);
    win.stick();

    on(global.window_manager, "map", (sig, wm, metaWindowChild) => {
      if (metaWindowChild !== child) return;

      sig.off();
      wm.emit("kill-window-effects", child);

      once(win, "size-changed", () => {
        this.state = state.RUNNING;
        child.remove_clip();
        this.show();
      });

      this.place();
    });
  }

  show() {
    const { child, focusout, valign } = this;

    if (this.state !== state.RUNNING) return;

    if (this.isTransition) return;

    if (!child) return;

    const parent = child.get_parent();
    if (!parent) return;

    this.isTransition = true;

    parent.set_child_above_sibling(child, null);
    (child.translation_y = child.height * (valign === "top" ? -1 : valign === "center" ? 0 : 2)),
      //@ts-expect-error Missing type. TODO: contribute to @girs
      Main.wm.skipNextEffect(child);
    Main.activateWindow(child.meta_window);

    //@ts-expect-error Missing type? TODO: investigate
    child.ease({
      translation_y: 0,
      duration: this.ainmation_time,
      mode: Clutter.AnimationMode.EASE_OUT_QUART,
      onComplete: () => {
        this.isTransition = false;
        if (focusout)
          once(global.display, "notify::focus-window", () => this.hide());
      },
    });

    this.place();
  }

  hide() {
    const { child, valign } = this;

    if (!child) return;

    if (this.state !== state.RUNNING) return;

    if (this.isTransition) return;

    this.isTransition = true;

    //@ts-expect-error
    child.ease({
      translation_y: child.height * (valign === "top" ? -1 : valign === "center" ? 0 : 2),
      duration: this.ainmation_time,
      mode: Clutter.AnimationMode.EASE_IN_QUART,
      onComplete: () => {
        //@ts-expect-error
        Main.wm.skipNextEffect(child);
        child.meta_window.minimize();
        child.translation_y = 0;
        this.isTransition = false;
      },
    });
  }

  place() {
    const { win, width, height, gap, halign, valign, monitor } = this;

    if (!win) return;

    const area = win.get_work_area_for_monitor(monitor),
      w = Math.round((width * area.width) / 100),
      h = Math.round((height * area.height) / 100),
      x =
        area.x +
        Math.round(
          (area.width - w) * { left: 0, center: 0.5, right: 1 }[halign] +
            { left: gap, center: 0, right: -gap }[halign],
        ),
      y = area.y + (valign === "top" ? gap : valign === "center" ? Math.round((area.height - h) / 2) : area.height - h - gap);

    win.move_to_monitor(monitor);
    win.move_resize_frame(false, x, y, w, h);
  }

  /**
   * @param {boolean} [above]
   */
  setupAlwaysOnTop(above) {
    const { win } = this;

    if (!win) return;

    if (above) win.make_above();
    else win.unmake_above();
  }
};
