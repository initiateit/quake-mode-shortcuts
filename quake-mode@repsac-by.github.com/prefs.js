import GObject from "gi://GObject";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { getMonitors } from "./util.js";

export default class QuakeModePreferences extends ExtensionPreferences {
  getPreferencesWidget() {
    const widget = new Notebook();
    widget.show();

    return widget;
  }
}

const QuakeModePrefsWidget = GObject.registerClass(
  class QuakeModePrefsWidget extends Gtk.Grid {
    /**
     * @param {any} [params]
     */
    _init(params) {
      super._init(params);
      const extensionObject =
        /** @type import('@girs/gnome-shell/extensions/extension').Extension */ (
          ExtensionPreferences.lookupByURL(import.meta.url)
        );
      const settings = extensionObject.getSettings();
      this.set_margin_top(10);
      this.set_margin_bottom(10);
      this.set_margin_start(10);
      this.set_margin_end(10);
      this.set_row_spacing(10);
      this.set_column_spacing(10);
      this.set_orientation(Gtk.Orientation.VERTICAL);

      let r = -1;
      /** @param {string} label */
      const label = (label) =>
        new Gtk.Label({ label: label, halign: Gtk.Align.END });

      // Tray Icon
      const switchTray = new Gtk.Switch({ halign: Gtk.Align.START });

      settings.bind(
        "quake-mode-tray",
        switchTray,
        "state",
        Gio.SettingsBindFlags.DEFAULT,
      );

      this.attach(label(_("Icon")), 0, ++r, 1, 1);
      this.attach(switchTray, 1, r, 1, 1);

      // Minimize on Focus Out
      const switchFocusOut = new Gtk.Switch({ halign: Gtk.Align.START });

      settings.bind(
        "quake-mode-focusout",
        switchFocusOut,
        "state",
        Gio.SettingsBindFlags.DEFAULT,
      );

      this.attach(label(_("Minimize on focus out")), 0, ++r, 1, 1);
      this.attach(switchFocusOut, 1, r, 1, 1);

      // Hide from Overview
      const hideFromOverview = new Gtk.Switch({ halign: Gtk.Align.START });

      settings.bind(
        "quake-mode-hide-from-overview",
        hideFromOverview,
        "state",
        Gio.SettingsBindFlags.DEFAULT,
      );

      this.attach(label(_("Hide from Overview")), 0, ++r, 1, 1);
      this.attach(hideFromOverview, 1, r, 1, 1);

      // Always on top
      const alwaysOnTop = new Gtk.Switch({ halign: Gtk.Align.START });

      settings.bind(
        "quake-mode-always-on-top",
        alwaysOnTop,
        "state",
        Gio.SettingsBindFlags.DEFAULT,
      );

      this.attach(label(_("Always on Top")), 0, ++r, 1, 1);
      this.attach(alwaysOnTop, 1, r, 1, 1);

      // Width
      const spinWidth = new Gtk.SpinButton();
      spinWidth.set_range(0, 100);
      spinWidth.set_increments(1, 2);

      settings.bind(
        "quake-mode-width",
        spinWidth,
        "value",
        Gio.SettingsBindFlags.DEFAULT,
      );

      this.attach(label(_("Width - %")), 0, ++r, 1, 1);
      this.attach(spinWidth, 1, r, 1, 1);

      // Height
      const spinHeight = new Gtk.SpinButton();
      spinHeight.set_range(0, 100);
      spinHeight.set_increments(1, 2);

      settings.bind(
        "quake-mode-height",
        spinHeight,
        "value",
        Gio.SettingsBindFlags.DEFAULT,
      );

      this.attach(label(_("Height - %")), 0, ++r, 1, 1);
      this.attach(spinHeight, 1, r, 1, 1);

      // Gap
      const spinGap = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
          lower: 0,
          upper: 1000,
          step_increment: 1,
          page_increment: 5,
        }),
      });

      settings.bind(
        "quake-mode-gap",
        spinGap,
        "value",
        Gio.SettingsBindFlags.DEFAULT,
      );

      this.attach(label(_("Gap")), 0, ++r, 1, 1);
      this.attach(spinGap, 1, r, 1, 1);

      // Resize Step
      const spinResizeStep = new Gtk.SpinButton();
      spinResizeStep.set_range(1, 20);
      spinResizeStep.set_increments(1, 1);

      settings.bind(
        "resize-step",
        spinResizeStep,
        "value",
        Gio.SettingsBindFlags.DEFAULT,
      );

      this.attach(label(_("Resize Step - %")), 0, ++r, 1, 1);
      this.attach(spinResizeStep, 1, r, 1, 1);

      // Horizontal align
      {
        const key = "quake-mode-halign";
        const items = [
          { label: _("Left"), value: "left" },
          { label: _("Right"), value: "right" },
          { label: _("Center"), value: "center" },
        ];

        const model = new Gtk.ListStore();
        model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

        const widget = new Gtk.ComboBox({ model });
        const renderer = new Gtk.CellRendererText();

        widget.pack_start(renderer, true);
        widget.add_attribute(renderer, "text", 0);

        const current = settings.get_string(key);

        for (const { label, value } of items) {
          const iter = model.append();
          model.set(iter, [0, 1], [label, value]);
          if (current === value) widget.set_active_iter(iter);
        }

        widget.connect("changed", (widget) => {
          const [ok, iter] = widget.get_active_iter();
          if (ok) {
            const value = /** @type {string} */ (model.get_value(iter, 1));
            settings.set_string(key, value);
          }
        });

        this.attach(label(_("Horizontal align")), 0, ++r, 1, 1);
        this.attach(widget, 1, r, 1, 1);
      }

      // Vertical align
      {
        const key = "quake-mode-valign";
        const items = [
          { label: _("Top"), value: "top" },
          { label: _("Bottom"), value: "bottom" },
        ];

        const model = new Gtk.ListStore();
        model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

        const widget = new Gtk.ComboBox({ model });
        const renderer = new Gtk.CellRendererText();

        widget.pack_start(renderer, true);
        widget.add_attribute(renderer, "text", 0);

        const current = settings.get_string(key);

        for (const { label, value } of items) {
          const iter = model.append();
          model.set(iter, [0, 1], [label, value]);
          if (current === value) widget.set_active_iter(iter);
        }

        widget.connect("changed", (widget) => {
          const [ok, iter] = widget.get_active_iter();
          if (ok) {
            const value = /** @type {string} */ (model.get_value(iter, 1));
            settings.set_string(key, value);
          }
        });

        this.attach(label(_("Vertical align")), 0, ++r, 1, 1);
        this.attach(widget, 1, r, 1, 1);
      }

      // Monitor Number
      const Columns = { LABEL: 0, VALUE: 1 };
      const monitorModel = new Gtk.ListStore();
      monitorModel.set_column_types([GObject.TYPE_STRING, GObject.TYPE_INT]);
      const selectMonitor = new Gtk.ComboBox({ model: monitorModel });
      const selectMonitorRenderer = new Gtk.CellRendererText();
      selectMonitor.pack_start(selectMonitorRenderer, true);
      selectMonitor.add_attribute(selectMonitorRenderer, "text", 0);

      const monitors = getMonitors();
      let monitorCurrentlySelected;

      for (const [idx, monitor] of monitors.entries()) {
        const iter = monitorModel.append();

        monitorModel.set(
          iter,
          [Columns.LABEL, Columns.VALUE],
          [`#${idx}: ${monitor.manufacturer} ${monitor.model}`, idx],
        );

        if (idx === settings.get_int("quake-mode-monitor")) {
          monitorCurrentlySelected = iter;
        }
      }

      if (monitorCurrentlySelected !== undefined) {
        selectMonitor.set_active_iter(monitorCurrentlySelected);
      }

      selectMonitor.connect("changed", () => {
        const [success, iter] = selectMonitor.get_active_iter();

        if (!success) {
          return;
        }

        const value = /** @type {number} */ (
          monitorModel.get_value(iter, Columns.VALUE)
        );
        settings.set_int("quake-mode-monitor", value);
      });

      this.attach(label(_("Monitor")), 0, ++r, 1, 1);
      this.attach(selectMonitor, 1, r, 1, 1);

      // Time
      const spinTime = new Gtk.SpinButton({ digits: 2 });
      spinTime.set_range(0, 2);
      spinTime.set_increments(0.01, 0.02);

      settings.bind(
        "quake-mode-animation-time",
        spinTime,
        "value",
        Gio.SettingsBindFlags.DEFAULT,
      );

      this.attach(label(_("Animation time - s")), 0, ++r, 1, 1);
      this.attach(spinTime, 1, r, 1, 1);
    }
  },
);

const AcceleratorsWidget = GObject.registerClass(
  class AcceleratorsWidget extends Gtk.Box {
    /** @param {any} [params] */
    _init(params) {
      super._init({ orientation: Gtk.Orientation.VERTICAL, ...params });

      const extensionObject =
        /** @type import('@girs/gnome-shell/extensions/extension').Extension */ (
          ExtensionPreferences.lookupByURL(import.meta.url)
        );
      const settings = extensionObject.getSettings();

      // Toggle Accelerators Section
      const toggleLabel = new Gtk.Label({
        label: "<b>" + _("Application Toggle Shortcuts") + "</b>",
        use_markup: true,
        halign: Gtk.Align.START,
        margin_bottom: 10,
      });
      this.append(toggleLabel);

      const toggleTreeView = new Gtk.TreeView();
      const Columns = { action: 0, accel: 1, app_id: 2, i: 3 };

      const model = (toggleTreeView.model = Gtk.ListStore.new([
        GObject.TYPE_STRING,
        GObject.TYPE_STRING,
        GObject.TYPE_STRING,
        GObject.TYPE_INT,
      ]));

      /** @type {(row: [any, string, number]) => void}} */
      function add_row([accelerator, app_id, i]) {
        model.set(
          model.append(),
          [0, 1, 2, 3],
          [_("Toggle"), accelerator, app_id, i],
        );
      }

      for (let i = 1; i <= 5; i++) {
        add_row([
          settings
            .get_child("accelerators")
            .get_strv(`quake-mode-accelerator-${i}`)[0] || "",
          //@ts-expect-error
          settings.get_child("apps").get_string(`app-${i}`),
          i,
        ]);
      }

      const actions = {
        column: new Gtk.TreeViewColumn({ title: _("Action"), expand: true }),
        renderer: new Gtk.CellRendererText(),
      };

      const accels = {
        column: new Gtk.TreeViewColumn({
          title: _("Shortcut Key"),
          min_width: 100,
        }),
        renderer: new Gtk.CellRendererAccel({ editable: true }),
      };

      const apps = {
        column: new Gtk.TreeViewColumn({
          title: _("Application"),
          min_width: 150,
        }),
        renderer: new Gtk.CellRendererText({ editable: true }),
      };

      actions.column.pack_start(actions.renderer, true);
      accels.column.pack_start(accels.renderer, true);
      apps.column.pack_start(apps.renderer, true);

      actions.column.set_cell_data_func(
        actions.renderer,
        (column, cell, model, iter) => {
          //@ts-expect-error
          cell.text = model.get_value(iter, Columns.action);
        },
      );

      accels.column.set_cell_data_func(
        accels.renderer,
        (column, cell, model, iter) => {
          const accelerator = /** @type {string}*/ (
            model.get_value(iter, Columns.accel)
          );
          //@ts-expect-error
          [, cell.accel_key, cell.accel_mods] =
            Gtk.accelerator_parse(accelerator);
        },
      );

      apps.column.set_cell_data_func(
        apps.renderer,
        (column, cell, model, iter) => {
          const app_id = /** @type {string} */ (
            model.get_value(iter, Columns.app_id)
          );
          const app = app_id && Gio.DesktopAppInfo.new(app_id);
          //@ts-expect-error
          cell.text = app ? app.get_display_name() : "";
        },
      );

      toggleTreeView.append_column(actions.column);
      toggleTreeView.append_column(accels.column);
      toggleTreeView.append_column(apps.column);

      accels.renderer.connect(
        "accel-edited",
        (renderer, path, accel_key, accel_mod) => {
          const [ok, iter] = model.get_iter(Gtk.TreePath.new_from_string(path));
          if (ok) {
            const name = Gtk.accelerator_name(accel_key, accel_mod);
            model.set(iter, [Columns.accel], [name]);

            const i = model.get_value(iter, Columns.i);
            settings
              .get_child("accelerators")
              //@ts-expect-error
              .set_strv(`quake-mode-accelerator-${i}`, [name]);
          }
        },
      );

      accels.renderer.connect("accel-cleared", (renderer, path) => {
        const [ok, iter] = model.get_iter(Gtk.TreePath.new_from_string(path));
        if (ok) {
          model.set(iter, [Columns.accel], [""]);
          const i = model.get_value(iter, Columns.i);
          settings
            .get_child("accelerators")
            .reset(`quake-mode-accelerator-${i}`);
        }
      });

      apps.renderer.connect("editing-started", (renderer, cell, path) => {
        const dialog = new Gtk.AppChooserDialog({
          destroy_with_parent: true,
          modal: true,
          //@ts-expect-error
          transient_for: this.get_root(),
        });

        //@ts-expect-error
        dialog.get_widget().set({ show_all: false, show_other: true });

        dialog.connect("response", (dialog, response) => {
          if (response === Gtk.ResponseType.OK) {
            const [ok, iter] = model.get_iter(
              Gtk.TreePath.new_from_string(path),
            );
            if (!ok) return;

            const app_info = dialog.get_app_info();
            if (!app_info) return;

            const app_id = app_info.get_id();
            if (!app_id) return;

            model.set_value(iter, Columns.app_id, app_id);

            const i = model.get_value(iter, Columns.i);
            settings.get_child("apps").set_string(`app-${i}`, app_id);
          }
          dialog.destroy();
        });

        dialog.show();
      });

      const scrolledWindow = new Gtk.ScrolledWindow({
        hexpand: true,
        vexpand: true,
        min_content_height: 200,
      });
      scrolledWindow.set_child(toggleTreeView);
      this.append(scrolledWindow);

      // Resize Accelerators Section
      const resizeLabel = new Gtk.Label({
        label: "<b>" + _("Resize Shortcuts") + "</b>",
        use_markup: true,
        halign: Gtk.Align.START,
        margin_top: 20,
        margin_bottom: 10,
      });
      this.append(resizeLabel);

      // Create resize shortcuts grid
      const resizeGrid = new Gtk.Grid({
        row_spacing: 10,
        column_spacing: 10,
        margin_start: 20,
      });

      const resizeShortcuts = [
        { key: "resize-height-increase", label: _("Increase Height"), default: "Ctrl+Up" },
        { key: "resize-height-decrease", label: _("Decrease Height"), default: "Ctrl+Down" },
        { key: "resize-width-decrease", label: _("Decrease Width"), default: "Ctrl+Left" },
        { key: "resize-width-increase", label: _("Increase Width"), default: "Ctrl+Right" },
      ];

      for (let i = 0; i < resizeShortcuts.length; i++) {
        const shortcut = resizeShortcuts[i];
        
        const label = new Gtk.Label({
          label: shortcut.label,
          halign: Gtk.Align.END,
        });
        
        const currentAccel = settings.get_child("accelerators").get_strv(shortcut.key)[0] || "";
        const accelLabel = new Gtk.Label({
          label: currentAccel || shortcut.default,
          halign: Gtk.Align.START,
        });
        
        resizeGrid.attach(label, 0, i, 1, 1);
        resizeGrid.attach(accelLabel, 1, i, 1, 1);
      }

      this.append(resizeGrid);

      // Add info label
      const infoLabel = new Gtk.Label({
        label: _("Resize shortcuts work when a quake window is focused"),
        halign: Gtk.Align.START,
        margin_top: 10,
        wrap: true,
      });
      infoLabel.add_css_class("dim-label");
      this.append(infoLabel);
    }
  },
);

const Notebook = GObject.registerClass(
  class Notebook extends Gtk.Notebook {
    /** @param {any} [params] */
    _init(params) {
      super._init(params);
      this.append_page(
        new QuakeModePrefsWidget(),
        new Gtk.Label({ label: _("Main") }),
      );
      this.append_page(
        new AcceleratorsWidget(),
        new Gtk.Label({ label: _("Accelerators") }),
      );
    }
  },
);