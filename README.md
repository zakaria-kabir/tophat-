# TopHat+

Personal fork of [TopHat](https://github.com/fflewddur/tophat) by [Todd Kulesza](https://github.com/fflewddur), extended for my HP OMEN laptop. Not intended for general use — hardware assumptions, sensor paths and fan handling are tailored to my specific machine.

## What's been added over upstream TopHat

- **GPU monitor** — usage bar, optional power-draw second row (`gpu-multirow`). Popup: model, VRAM, temp, power, fan, history chart. NVIDIA via `nvidia-smi`; fan RPM falls back to hwmon when EC-managed (RTX 5060 Laptop).
- **Battery monitor** — charge % + power rate panel display (`battery-show-percent` toggle). Popup: state, rate, time remaining.
- **Temperature monitor** — CPU temp (top row) + GPU temp (bottom row, hidden when no GPU). Controlled by `show-temp` toggle.
- **CPU fan RPM** in CPU popup, via hwmon `hp` driver discovery.
- **CPU session min/max frequency** tracked and shown in CPU popup.
- **Preferences pages** for GPU, Battery, Temperature added to the prefs dialog.
- **Schema renamed** to `org.gnome.shell.extensions.tophat-plus`, UUID `tophat-@zakaria-kabir.github.io`.

## Hardware

HP OMEN — AMD Ryzen 9 8945HX + NVIDIA RTX 5060 Laptop, GNOME 50.1, Wayland.

## Build & install

```bash
node_modules/.bin/tsc && ./resources/dist.sh
# Extension installed as symlink (done once):
# ln -sf "$(pwd)/dist" ~/.local/share/gnome-shell/extensions/tophat-@zakaria-kabir.github.io
```

Log out and back in on Wayland for changes to take effect.

## Credits & License

Built on [TopHat](https://github.com/fflewddur/tophat) © Todd Kulesza, GPL-3.0.
Sensor logic reference: [Vitals](https://github.com/corecoding/Vitals) by corecoding, GPL-3.0.
Additions by [Zakaria Kabir](https://github.com/zakaria-kabir), GPL-3.0.
