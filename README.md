# TopHat+

> **Personal fork — not intended for general use.**
> This is a private customization built specifically for my HP OMEN laptop
> (AMD Ryzen 9 8945HX + NVIDIA RTX 5060 Laptop, GNOME 50 on Wayland).
> The hardware assumptions, sensor paths, fan handling, and feature set are all
> tailored to that exact machine. It is not designed, tested, or packaged for
> any other setup. If you are looking for a general-purpose GPU/battery
> extension for TopHat, look at the upstream
> [TopHat](https://github.com/fflewddur/tophat) project and
> [Vitals](https://github.com/corecoding/Vitals) instead.

**TopHat+** is a personal fork of [TopHat](https://github.com/fflewddur/tophat)
by [Todd Kulesza (fflewddur)](https://github.com/fflewddur), extended with GPU
utilization, VRAM, power draw, fan speed, battery monitoring, and a dedicated
temperature panel — tuned to my specific hardware and workflow.

> **Credit:** The core architecture, UI design, TypeScript framework, and all
> CPU/memory/disk/network logic are the original work of
> [Todd Kulesza](https://github.com/fflewddur). This fork adds GPU, battery,
> temperature, and fan monitoring on top of that foundation. Vitals by
> corecoding provided the reference implementation for reading NVIDIA/AMD GPU
> sysfs paths and battery uevent parsing.

## What's been added over upstream TopHat

### Phase 1 — GPU + Battery monitors

- **GPU monitor** (`gpu.ts`) — animated utilization bar (1-bar meter), usage
  label, optional second row with live power draw (`gpu-multirow` toggle).
  Pop-up shows: model name, usage%, VRAM used/total, temperature, power draw,
  fan speed, and a 50-point usage history chart.
  - NVIDIA: polls via persistent `nvidia-smi` subprocess.
  - AMD: reads `gpu_busy_percent`, `power1_average`, `temp1_input` from sysfs/hwmon.
  - MUX graceful degradation: if no GPU is detected (iGPU-only MUX mode), the
    monitor shows `n/a` without crashing and updates automatically if a dGPU
    appears later.
- **Battery monitor** (`battery.ts`) — stacked two-row panel label (charge% on
  top, power rate below). `battery-show-percent` toggle switches between
  power-only and percent+power views. Pop-up shows: percentage, state
  (Charging/Discharging/Full), power rate in W, estimated time remaining.
  Reads from `/sys/class/power_supply/BAT{0,1}/uevent`.
- New icons: `gpu-icon-symbolic.svg`, `battery-icon-symbolic.svg` (original
  SVGs for this fork).
- New GSettings keys: `show-gpu`, `show-battery`.
- New Vitals GObject properties: `gpu-usage`, `gpu-mem-used`, `gpu-mem-total`,
  `gpu-temp`, `gpu-power`, `gpu-fan`, `gpu-name`, `gpu-history`,
  `battery-percent`, `battery-state`, `battery-power-rate`, `battery-time-left`.

### Phase 2 — CPU fan, frequency session extremes, GPU fan fix, temp panel

- **CPU fan RPM in popup** — `vitals.ts` discovers fan paths at startup by
  scanning `/sys/class/hwmon/*/name`, preferring the `hp` driver (which
  exposes both fans on HP OMEN). Falls back to `acpi_fan`. Reports fan1 and
  fan2 RPM separately in the CPU popup menu.
- **CPU session min/max frequency** — `vitals.ts` tracks the lowest and
  highest per-core frequency seen since the extension loaded and exposes them
  as `cpu-freq-min` / `cpu-freq-max` Vitals properties. The CPU popup shows
  current / session-min / session-max frequencies.
- **GPU fan via hwmon** — `nvidia-smi fan.speed` returns `[N/A]` on the RTX
  5060 Laptop because the fans are EC-managed. When smi reports N/A, the
  extension falls back to reading `fan2_input` (or `fan1_input`) from the `hp`
  hwmon driver and reports the value as RPM in the GPU popup (e.g., "2400 RPM").
  Values ≤100 from smi are shown as %, values >100 from hwmon fallback as RPM.
- **Temperature monitor** (`temp.ts`) — new always-visible panel element
  styled identically to the battery/network stacked display: CPU temp on top
  row, GPU temp on bottom row (hidden when GPU is unavailable). Updates on the
  summary interval. Click opens a simple popup with labeled values. Controlled
  by `show-temp` toggle. Icon: `temp-icon-symbolic.svg`.
- **GPU multirow panel display** — `gpu-multirow` GSettings toggle. When on,
  the GPU panel item shows usage% on top and power draw (W) below in a vertical
  stack, matching the battery and network visual style.
- **Battery show-percent toggle** — `battery-show-percent` GSettings toggle.
  When off, only the power rate is shown in the panel (saves space). When on,
  both charge% and power rate are shown stacked.
- **CPU fan show toggle** — `show-cpu-fan` GSettings key (wires to the CPU
  popup fan rows visibility).
- **New Vitals properties**: `cpu-freq-min`, `cpu-freq-max`, `cpu-fan`.
- **New GSettings keys**: `gpu-multirow`, `battery-show-percent`, `show-temp`,
  `show-cpu-fan`.
- **Preferences** (`prefs.ts`) — GPU page expanded with multirow toggle;
  Battery page expanded with show-percent toggle; new Temperature page with
  show-temp toggle.
- **subprocess.ts** — thin `SubProcess` wrapper over `Gio.Subprocess` for
  driving the persistent `nvidia-smi` process without blocking the main loop.

### Phase 4 — Bug fixes and UX polish

- **GPU n/a startup race fixed** — `extension.ts` fires `notify('gpu-name')`
  before the async nvidia-smi probe completes. Added `gpuKnown` flag in
  `GpuMonitor`: the "GPU not available" state (n/a display) is only set after
  the GPU has been seen at least once. Until the first successful read, the
  panel shows `MeterNoVal` and waits quietly.
- **GPU multirow now vertical** — `usage` and `powerRow` were direct children
  of the horizontal panel layout, rendering them side-by-side. Both are now
  inside a `St.BoxLayout({ vertical: true })` so they stack properly.
- **Single-row centering** — when one of the two stacked rows is hidden
  (battery with `battery-show-percent=false`; GPU with `gpu-multirow=false`),
  the remaining label now sets `y_align = CENTER` so it renders in the middle
  of the panel rather than stuck to the top or bottom.
- **Icon gap reduced** — temp, battery, and GPU monitors now add the
  `tophat-panel-icon-net` CSS class to their icons (`margin: 0`) instead of
  the default `tophat-panel-icon` class (`margin: 0 6px 0 0`), eliminating
  the excessive gap between the icon and the stacked text rows.
- **Temp GPU row visibility** — the GPU temperature row in the temp monitor
  starts hidden and only appears when GPU temp > 0 (i.e., a GPU is present
  and reporting). CPU temp label aligns to CENTER when alone, to END when
  GPU row is also visible.
- **GPU fan RPM fallback** — when `nvidia-smi fan.speed` is `[N/A]`, the
  extension reads from hwmon fan paths (EC-managed fans) and reports RPM in
  the GPU popup. Display logic: `fan >= 0 && fan <= 100` → shows %;
  `fan > 100` → shows RPM; `fan === -1` → shows "n/a".

## Hardware this was built and tested on

| Component      | Detail                                                                   |
| -------------- | ------------------------------------------------------------------------ |
| Machine        | HP OMEN Laptop                                                           |
| CPU            | AMD Ryzen 9 8945HX (iGPU: Radeon 780M, 16 cores)                         |
| dGPU           | NVIDIA GeForce RTX 5060 Laptop GPU                                       |
| MUX switch     | Yes — iGPU-only or hybrid modes                                          |
| Fans           | 2 fans, exposed via `/sys/class/hwmon/hwmon4/fan{1,2}_input` (hp driver) |
| nvidia-smi fan | Returns `[N/A]` — EC-managed, not SMI-accessible                         |
| GNOME Shell    | 50.1, Wayland session                                                    |
| Kernel         | Linux (≥ 5.0)                                                            |

## My setup / install

```bash
# In the tophat- directory:
node_modules/.bin/tsc && ./resources/dist.sh

# Extension is installed as a symlink (done once):
# ln -sf "$(pwd)/dist" ~/.local/share/gnome-shell/extensions/tophat-@zakaria-kabir.github.io
```

Log out and back in on Wayland for extension changes to take effect.

## Settings

```bash
# View all
gsettings --schemadir ~/.local/share/gnome-shell/extensions/tophat-@zakaria-kabir.github.io/schemas \
  list-recursively org.gnome.shell.extensions.tophat-plus

# Examples
gsettings ... set org.gnome.shell.extensions.tophat-plus gpu-multirow true
gsettings ... set org.gnome.shell.extensions.tophat-plus battery-show-percent true
gsettings ... set org.gnome.shell.extensions.tophat-plus show-temp true
```

## Network upload/download indicators

The net monitor shows two stacked rows (upload on top, download below) using
`bytesToHumanString()` text only — no arrow prefix symbols. To add directional
arrows, edit `src/net.ts` in `bindVitals()` and prefix the values:

```typescript
// In notify::net-recv handler:
this.valueNetDown.text = '↓ ' + s;
// In notify::net-send handler:
this.valueNetUp.text = '↑ ' + s;
```

To replace the WiFi icon entirely, swap out
`resources/icons/net-icon-symbolic.svg` with any 1204×1204 SVG.

## Development

```bash
node_modules/.bin/tsc && ./resources/dist.sh   # build
node_modules/.bin/tsc --noEmit                  # type-check only
journalctl -f /usr/bin/gnome-shell             # extension logs
journalctl -f /usr/bin/gjs                     # prefs logs
```

## Credits and License

**TopHat+** is built on top of [TopHat](https://github.com/fflewddur/tophat),
copyright © Todd Kulesza, GPL-3.0 or later.

GPU and battery sensor logic is adapted from
[Vitals](https://github.com/corecoding/Vitals) by corecoding, also GPL-3.0.

All additions and modifications in this fork are by
[Zakaria Kabir](https://github.com/zakaria-kabir) and are released under the
same GPL-3.0 license.

### Icons

Original extension icons are from [thenounproject.com](https://thenounproject.com)
under the [Creative Commons Attribution license](https://creativecommons.org/licenses/by/3.0/),
as credited in the original TopHat README:

- `cpu.svg`: [jai](https://thenounproject.com/jairam.182/)
- `disk.svg`: [guntur cahya](https://thenounproject.com/gunturcahya05/)
- `logo.svg`: [Sergey Krivoy](https://thenounproject.com/krivoydesigner/)
- `mem.svg`: [Loudoun Design Co.](https://thenounproject.com/LoudounDesignCo/)
- `net.svg`: [Pixel Bazaar](https://thenounproject.com/pixelbazaar/)

GPU, battery, and temperature icons are original SVGs created for this fork.
