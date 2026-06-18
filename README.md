# FabMo Accessories

A FabMo dashboard app for setting up and using shop accessories — rotary
indexers, spindles / VFDs, pendants and gamepads, and more. It appears as a
tile on the **Apps** page of the FabMo dashboard.

The app applies the matching axis assignments and settings for a selected
accessory through the standard FabMo config API (`fabmo.setConfig()`), so no
engine modifications are required.

## Status

Early scaffold. The rotary-indexer flow is wired end to end (with placeholder
model presets); the spindle/VFD and pendant/gamepad sections are stubs to be
filled in.

## Install

Build the `.fma` bundle and upload it from the dashboard's **Apps** page:

```sh
./scripts/build.sh        # produces dist/accessories.fma
```

Then in the FabMo dashboard go to **Apps → upload** and select
`dist/accessories.fma`. The engine unpacks it under
`/opt/fabmo/approot/approot/accessories/`.

## Layout

| Path             | Purpose                                            |
| ---------------- | -------------------------------------------------- |
| `index.html`     | App shell: home tile grid + per-accessory views    |
| `js/accessories.js` | View navigation and accessory setup logic       |
| `css/style.css`  | App styles                                          |
| `package.json`   | App manifest (`id`, `name`, `icon`, …)             |
| `scripts/build.sh` | Packages the app into `dist/accessories.fma`     |

## License

MIT
