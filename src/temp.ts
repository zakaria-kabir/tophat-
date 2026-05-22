// TopHat+: Temperature monitor widget
// Shows CPU and GPU temperatures as a 2-row stacked panel element.

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

export const TempMonitor = GObject.registerClass(
  class TempMonitor extends TopHatMonitor {
    private cpuTempLabel: St.Label;
    private gpuTempLabel: St.Label;
    private menuCpuTemp: St.Label;
    private menuGpuTemp: St.Label;

    constructor(metadata: ExtensionMetadata, gsettings: Gio.Settings) {
      super('Temp Monitor', metadata, gsettings);

      const gicon = Gio.icon_new_for_string(
        `${this.metadata.path}/icons/hicolor/scalable/actions/temp-icon-symbolic.svg`
      );
      this.icon.set_gicon(gicon);
      this.icon.add_style_class_name('tophat-panel-icon-narrow');

      const vbox = new St.BoxLayout({ vertical: true });
      vbox.connect('notify::vertical', (obj) => {
        obj.vertical = true;
      });
      this.add_child(vbox);

      this.cpuTempLabel = new St.Label({
        text: MeterNoVal,
        style_class: 'tophat-panel-usage tophat-panel-usage-wider',
        y_expand: true,
        y_align: Clutter.ActorAlign.CENTER,
      });
      vbox.add_child(this.cpuTempLabel);

      this.gpuTempLabel = new St.Label({
        text: '',
        style_class: 'tophat-panel-usage-stacked',
        y_expand: true,
        y_align: Clutter.ActorAlign.START,
      });
      this.gpuTempLabel.visible = false;
      vbox.add_child(this.gpuTempLabel);

      this.menuCpuTemp = new St.Label();
      this.menuGpuTemp = new St.Label();

      this.visible = gsettings.get_boolean('show-temp');
      const id = this.gsettings.connect(
        'changed::show-temp',
        (settings: Gio.Settings) => {
          this.visible = settings.get_boolean('show-temp');
        }
      );
      this.settingsSignals.push(id);

      this.buildMenu();
      this.addMenuButtons();
      this.updateColor();
    }

    private buildMenu() {
      let label = new St.Label({
        text: _('Temperatures'),
        style_class: 'tophat-menu-header',
      });
      this.addMenuRow(label, 0, 2, 1);

      label = new St.Label({
        text: _('CPU temperature:'),
        style_class: 'tophat-menu-label tophat-menu-details',
      });
      this.addMenuRow(label, 0, 1, 1);
      this.menuCpuTemp.text = MeterNoVal;
      this.menuCpuTemp.add_style_class_name(
        'tophat-menu-value tophat-menu-details'
      );
      this.addMenuRow(this.menuCpuTemp, 1, 1, 1);

      label = new St.Label({
        text: _('GPU temperature:'),
        style_class:
          'tophat-menu-label tophat-menu-details tophat-menu-section-end',
      });
      this.addMenuRow(label, 0, 1, 1);
      this.menuGpuTemp.text = MeterNoVal;
      this.menuGpuTemp.add_style_class_name(
        'tophat-menu-value tophat-menu-details tophat-menu-section-end'
      );
      this.addMenuRow(this.menuGpuTemp, 1, 1, 1);
    }

    public override bindVitals(vitals: Vitals): void {
      super.bindVitals(vitals);

      let id = vitals.connect('notify::cpu-temp', () => {
        const t = vitals.cpu_temp;
        const s = t > 0 ? t.toFixed(0) + ' °C' : MeterNoVal;
        this.cpuTempLabel.text = s;
        this.menuCpuTemp.text = s;
      });
      this.vitalsSignals.push(id);

      id = vitals.connect('notify::gpu-temp', () => {
        const t = vitals.gpu_temp;
        if (t > 0) {
          const s = t.toFixed(0) + ' °C';
          this.gpuTempLabel.text = s;
          this.menuGpuTemp.text = s;
          if (!this.gpuTempLabel.visible) {
            this.gpuTempLabel.visible = true;
            this.cpuTempLabel.style_class = 'tophat-panel-usage-stacked';
            this.cpuTempLabel.y_align = Clutter.ActorAlign.END;
          }
        } else {
          if (this.gpuTempLabel.visible) {
            this.gpuTempLabel.visible = false;
            this.cpuTempLabel.style_class = 'tophat-panel-usage tophat-panel-usage-wider';
            this.cpuTempLabel.y_align = Clutter.ActorAlign.CENTER;
          }
          this.menuGpuTemp.text = MeterNoVal;
        }
      });
      this.vitalsSignals.push(id);
    }
  }
);

export type TempMonitor = InstanceType<typeof TempMonitor>;
