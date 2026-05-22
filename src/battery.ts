// TopHat+: Battery monitor widget
// Modeled after net.ts by Todd Kulesza

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {
  ExtensionMetadata,
  gettext as _,
} from 'resource:///org/gnome/shell/extensions/extension.js';

import { Vitals } from './vitals.js';
import { TopHatMonitor, MeterNoVal } from './monitor.js';

export const BatteryMonitor = GObject.registerClass(
  class BatteryMonitor extends TopHatMonitor {
    private valuePercent: St.Label;
    private valuePower: St.Label;
    private menuBatteryPercent: St.Label;
    private menuBatteryState: St.Label;
    private menuBatteryPower: St.Label;
    private menuBatteryTime: St.Label;
    private showPercent: boolean;

    constructor(metadata: ExtensionMetadata, gsettings: Gio.Settings) {
      super('Battery Monitor', metadata, gsettings);

      const gicon = Gio.icon_new_for_string(
        `${this.metadata.path}/icons/hicolor/scalable/actions/battery-icon-symbolic.svg`
      );
      this.icon.set_gicon(gicon);
      this.icon.add_style_class_name('tophat-panel-icon-net');

      const vbox = new St.BoxLayout({ vertical: true });
      vbox.connect('notify::vertical', (obj) => {
        obj.vertical = true;
      });
      this.add_child(vbox);

      this.valuePercent = new St.Label({
        text: MeterNoVal,
        style_class: 'tophat-panel-usage-stacked',
        y_expand: true,
        y_align: Clutter.ActorAlign.END,
      });
      vbox.add_child(this.valuePercent);

      this.valuePower = new St.Label({
        text: '',
        style_class: 'tophat-panel-usage-stacked',
        y_expand: true,
        y_align: Clutter.ActorAlign.START,
      });
      vbox.add_child(this.valuePower);

      this.menuBatteryPercent = new St.Label();
      this.menuBatteryState = new St.Label();
      this.menuBatteryPower = new St.Label();
      this.menuBatteryTime = new St.Label();

      this.showPercent = gsettings.get_boolean('battery-show-percent');
      this.valuePercent.visible = this.showPercent;
      this._updateBatteryRowAlign();
      let id = this.gsettings.connect('changed::battery-show-percent', (settings: Gio.Settings) => {
        this.showPercent = settings.get_boolean('battery-show-percent');
        this.valuePercent.visible = this.showPercent;
        this._updateBatteryRowAlign();
      });
      this.settingsSignals.push(id);

      this.visible = gsettings.get_boolean('show-battery');
      id = this.gsettings.connect(
        'changed::show-battery',
        (settings: Gio.Settings) => {
          this.visible = settings.get_boolean('show-battery');
        }
      );
      this.settingsSignals.push(id);

      this.buildMenu();
      this.addMenuButtons();
      this.updateColor();
    }

    private _updateBatteryRowAlign(): void {
      if (this.showPercent) {
        this.valuePercent.style_class = 'tophat-panel-usage-stacked';
        this.valuePower.style_class = 'tophat-panel-usage-stacked';
        this.valuePercent.y_align = Clutter.ActorAlign.END;
        this.valuePower.y_align = Clutter.ActorAlign.START;
      } else {
        this.valuePower.style_class = 'tophat-panel-usage tophat-panel-usage-wider';
        this.valuePower.y_align = Clutter.ActorAlign.CENTER;
      }
    }

    private buildMenu() {
      let label = new St.Label({
        text: _('Battery'),
        style_class: 'tophat-menu-header',
      });
      this.addMenuRow(label, 0, 2, 1);

      label = new St.Label({
        text: _('Charge:'),
        style_class: 'tophat-menu-label',
      });
      this.addMenuRow(label, 0, 1, 1);
      this.menuBatteryPercent.text = MeterNoVal;
      this.menuBatteryPercent.add_style_class_name('tophat-menu-value');
      this.addMenuRow(this.menuBatteryPercent, 1, 1, 1);

      label = new St.Label({
        text: _('Status:'),
        style_class: 'tophat-menu-label tophat-menu-details',
      });
      this.addMenuRow(label, 0, 1, 1);
      this.menuBatteryState.text = MeterNoVal;
      this.menuBatteryState.add_style_class_name(
        'tophat-menu-value tophat-menu-details'
      );
      this.addMenuRow(this.menuBatteryState, 1, 1, 1);

      label = new St.Label({
        text: _('Power rate:'),
        style_class: 'tophat-menu-label tophat-menu-details',
      });
      this.addMenuRow(label, 0, 1, 1);
      this.menuBatteryPower.text = MeterNoVal;
      this.menuBatteryPower.add_style_class_name(
        'tophat-menu-value tophat-menu-details'
      );
      this.addMenuRow(this.menuBatteryPower, 1, 1, 1);

      label = new St.Label({
        text: _('Time remaining:'),
        style_class:
          'tophat-menu-label tophat-menu-details tophat-menu-section-end',
      });
      this.addMenuRow(label, 0, 1, 1);
      this.menuBatteryTime.text = MeterNoVal;
      this.menuBatteryTime.add_style_class_name(
        'tophat-menu-value tophat-menu-details tophat-menu-section-end'
      );
      this.addMenuRow(this.menuBatteryTime, 1, 1, 1);
    }

    public override bindVitals(vitals: Vitals): void {
      super.bindVitals(vitals);

      let id = vitals.connect('notify::battery-percent', () => {
        const pct = vitals.battery_percent;
        this.valuePercent.text = pct.toFixed(0) + '%';
        this.menuBatteryPercent.text = pct.toFixed(0) + '%';
      });
      this.vitalsSignals.push(id);

      id = vitals.connect('notify::battery-state', () => {
        this.menuBatteryState.text = vitals.battery_state || MeterNoVal;
      });
      this.vitalsSignals.push(id);

      id = vitals.connect('notify::battery-power-rate', () => {
        const rateMw = vitals.battery_power_rate;
        const rateW = Math.abs(rateMw) / 1000;
        const sign = rateMw >= 0 ? '+' : '-';
        const s = rateW > 0.1 ? `${sign}${rateW.toFixed(1)} W` : '';
        this.valuePower.text = s;
        this.menuBatteryPower.text =
          rateW > 0.1 ? `${sign}${rateW.toFixed(1)} W` : MeterNoVal;
      });
      this.vitalsSignals.push(id);

      id = vitals.connect('notify::battery-time-left', () => {
        const mins = vitals.battery_time_left;
        if (mins > 0) {
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          const s =
            h > 0
              ? `${h}h ${m.toString().padStart(2, '0')}m`
              : `${m}m`;
          this.menuBatteryTime.text = s;
        } else {
          this.menuBatteryTime.text = MeterNoVal;
        }
      });
      this.vitalsSignals.push(id);
    }
  }
);

export type BatteryMonitor = InstanceType<typeof BatteryMonitor>;
