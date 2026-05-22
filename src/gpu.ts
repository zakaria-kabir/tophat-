// TopHat+: GPU monitor widget
// Modeled after cpu.ts by Todd Kulesza

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
import { Orientation } from './meter.js';
import { HistoryChart } from './history.js';
import { CapacityBar } from './capacity.js';

export const GpuMonitor = GObject.registerClass(
  class GpuMonitor extends TopHatMonitor {
    private usage: St.Label;
    private powerRow: St.Label;
    private vbox: St.BoxLayout;
    private menuGpuUsage: St.Label;
    private menuGpuCap: InstanceType<typeof CapacityBar>;
    private menuGpuModel: St.Label;
    private menuGpuTemp: St.Label;
    private menuGpuPower: St.Label;
    private menuGpuFan: St.Label;
    private menuGpuMem: St.Label;
    private multirow: boolean;
    private gpuKnown = false;

    constructor(metadata: ExtensionMetadata, gsettings: Gio.Settings) {
      super('GPU Monitor', metadata, gsettings);

      const gicon = Gio.icon_new_for_string(
        `${this.metadata.path}/icons/hicolor/scalable/actions/gpu-icon-symbolic.svg`
      );
      this.icon.set_gicon(gicon);
      this.icon.add_style_class_name('tophat-panel-icon-narrow');

      this.vbox = new St.BoxLayout({ vertical: true, style: 'margin-right: 3px' });
      this.vbox.connect('notify::vertical', (obj) => {
        obj.vertical = true;
      });
      this.add_child(this.vbox);

      this.usage = new St.Label({
        text: MeterNoVal,
        style_class: 'tophat-panel-usage-stacked',
        y_expand: true,
        y_align: Clutter.ActorAlign.CENTER,
      });
      this.vbox.add_child(this.usage);

      this.powerRow = new St.Label({
        text: '',
        style_class: 'tophat-panel-usage-stacked',
        y_expand: true,
        y_align: Clutter.ActorAlign.START,
      });
      this.vbox.add_child(this.powerRow);

      this.meter.setNumBars(1);
      this.meter.setOrientation(Orientation.Vertical);
      this.add_child(this.meter);

      this.menuGpuUsage = new St.Label();
      this.menuGpuCap = new CapacityBar();
      this.menuGpuModel = new St.Label();
      this.menuGpuTemp = new St.Label();
      this.menuGpuPower = new St.Label();
      this.menuGpuFan = new St.Label();
      this.menuGpuMem = new St.Label();
      this.historyChart = new HistoryChart();

      this.multirow = gsettings.get_boolean('gpu-multirow');
      this.powerRow.visible = this.multirow;
      this._updateGpuRowAlign();
      let id = this.gsettings.connect('changed::gpu-multirow', (settings: Gio.Settings) => {
        this.multirow = settings.get_boolean('gpu-multirow');
        this.powerRow.visible = this.multirow;
        this._updateGpuRowAlign();
      });
      this.settingsSignals.push(id);

      this.visible = gsettings.get_boolean('show-gpu');
      id = this.gsettings.connect(
        'changed::show-gpu',
        (settings: Gio.Settings) => {
          this.visible = settings.get_boolean('show-gpu');
        }
      );
      this.settingsSignals.push(id);

      this.buildMenu();
      this.addMenuButtons();
      this.updateColor();
    }

    private _updateGpuRowAlign(): void {
      if (this.multirow) {
        this.usage.style_class = 'tophat-panel-usage-stacked';
        this.usage.y_align = Clutter.ActorAlign.END;
        this.powerRow.y_align = Clutter.ActorAlign.START;
      } else {
        this.usage.style_class = 'tophat-panel-usage tophat-panel-usage-wider';
        this.usage.y_align = Clutter.ActorAlign.CENTER;
      }
    }

    private buildMenu() {
      let label = new St.Label({
        text: _('GPU usage'),
        style_class: 'tophat-menu-header',
      });
      this.addMenuRow(label, 0, 2, 1);

      label = new St.Label({
        text: _('GPU utilization:'),
        style_class: 'tophat-menu-label',
      });
      this.addMenuRow(label, 0, 1, 1);
      this.menuGpuUsage.text = MeterNoVal;
      this.menuGpuUsage.add_style_class_name('tophat-menu-value');
      this.addMenuRow(this.menuGpuUsage, 1, 1, 1);
      this.menuGpuCap.add_style_class_name('tophat-menu-section-end');
      this.addMenuRow(this.menuGpuCap, 0, 2, 1);

      this.menuGpuModel.text = MeterNoVal;
      this.menuGpuModel.add_style_class_name(
        'tophat-menu-label tophat-menu-details'
      );
      this.menuGpuModel.set_x_expand(true);
      this.addMenuRow(this.menuGpuModel, 0, 2, 1);

      label = new St.Label({
        text: _('Temperature:'),
        style_class: 'tophat-menu-label tophat-menu-details',
      });
      this.addMenuRow(label, 0, 1, 1);
      this.menuGpuTemp.text = MeterNoVal;
      this.menuGpuTemp.add_style_class_name(
        'tophat-menu-value tophat-menu-details'
      );
      this.addMenuRow(this.menuGpuTemp, 1, 1, 1);

      label = new St.Label({
        text: _('Power draw:'),
        style_class: 'tophat-menu-label tophat-menu-details',
      });
      this.addMenuRow(label, 0, 1, 1);
      this.menuGpuPower.text = MeterNoVal;
      this.menuGpuPower.add_style_class_name(
        'tophat-menu-value tophat-menu-details'
      );
      this.addMenuRow(this.menuGpuPower, 1, 1, 1);

      label = new St.Label({
        text: _('Fan speed:'),
        style_class: 'tophat-menu-label tophat-menu-details',
      });
      this.addMenuRow(label, 0, 1, 1);
      this.menuGpuFan.text = MeterNoVal;
      this.menuGpuFan.add_style_class_name(
        'tophat-menu-value tophat-menu-details'
      );
      this.addMenuRow(this.menuGpuFan, 1, 1, 1);

      label = new St.Label({
        text: _('VRAM:'),
        style_class:
          'tophat-menu-label tophat-menu-details tophat-menu-section-end',
      });
      this.addMenuRow(label, 0, 1, 1);
      this.menuGpuMem.text = MeterNoVal;
      this.menuGpuMem.add_style_class_name(
        'tophat-menu-value tophat-menu-details tophat-menu-section-end'
      );
      this.addMenuRow(this.menuGpuMem, 1, 1, 1);

      if (this.historyChart) {
        this.addMenuRow(this.historyChart, 0, 2, 1);
      }
    }

    public override bindVitals(vitals: Vitals): void {
      super.bindVitals(vitals);

      let id = vitals.connect('notify::gpu-usage', () => {
        const percent = vitals.gpu_usage;
        const s = percent.toFixed(0) + '%';
        this.usage.text = s;
        this.menuGpuUsage.text = s;
        this.menuGpuCap.setUsage(percent / 100);
        this.meter.setBarSizes([percent / 100]);
      });
      this.vitalsSignals.push(id);

      id = vitals.connect('notify::gpu-name', () => {
        const name = vitals.gpu_name;
        if (name === '') {
          if (this.gpuKnown) {
            // GPU went away after being known (MUX switch, driver unload)
            this.menuGpuModel.text = _('GPU not available');
            this.usage.text = 'n/a';
            this.meter.setBarSizes([0]);
          }
          // else: still discovering — don't show n/a yet
        } else {
          if (!this.gpuKnown) {
            // First time GPU name is known — clear any stale display
            this.gpuKnown = true;
            if (this.usage.text === 'n/a') {
              this.usage.text = MeterNoVal;
            }
          }
          this.menuGpuModel.text = name;
        }
      });
      this.vitalsSignals.push(id);

      id = vitals.connect('notify::gpu-temp', () => {
        this.menuGpuTemp.text = vitals.gpu_temp.toFixed(0) + ' °C';
      });
      this.vitalsSignals.push(id);

      id = vitals.connect('notify::gpu-power', () => {
        const w = vitals.gpu_power;
        this.menuGpuPower.text = w.toFixed(0) + ' W';
        if (this.multirow) {
          this.powerRow.text = w.toFixed(0) + ' W';
        }
      });
      this.vitalsSignals.push(id);

      id = vitals.connect('notify::gpu-fan', () => {
        const fan = vitals.gpu_fan;
        if (fan < 0) {
          this.menuGpuFan.text = 'n/a';
        } else if (fan <= 100) {
          this.menuGpuFan.text = fan.toFixed(0) + '%';
        } else {
          // RPM fallback from hwmon (EC-managed fan)
          this.menuGpuFan.text = fan + ' RPM';
        }
      });
      this.vitalsSignals.push(id);

      id = vitals.connect('notify::gpu-mem-used', () => {
        const used = vitals.gpu_mem_used;
        const total = vitals.gpu_mem_total;
        if (total > 0) {
          this.menuGpuMem.text = `${used} / ${total} MiB`;
        } else {
          this.menuGpuMem.text = `${used} MiB`;
        }
      });
      this.vitalsSignals.push(id);

      id = vitals.connect('notify::gpu-history', () => {
        this.historyChart?.update(vitals.getGpuHistory());
      });
      this.vitalsSignals.push(id);
    }

    protected override updateColor(): [string, boolean] {
      const [color, useAccent] = super.updateColor();
      this.menuGpuCap?.setColor(color);
      return [color, useAccent];
    }
  }
);

export type GpuMonitor = InstanceType<typeof GpuMonitor>;
