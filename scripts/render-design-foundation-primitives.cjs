const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, fileName) => {
    const source = fs.readFileSync(fileName, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020
      },
      fileName
    }).outputText;
    module._compile(output, fileName);
  };
}

const root = path.resolve(__dirname, "..");
const { Button } = require(path.join(root, "components/design-system/button.tsx"));
const { SegmentSwitch } = require(path.join(root, "components/design-system/segment-switch.tsx"));
const { StatusChip } = require(path.join(root, "components/design-system/status-chip.tsx"));
const { ValidationCaveat } = require(path.join(root, "components/design-system/validation-caveat.tsx"));
const { AccessStatusBadgeVisual } = require(path.join(root, "components/auth/access-status-badge-visual.tsx"));

const h = React.createElement;
const output = {};
const harness = (content, width = 360) => renderToStaticMarkup(h(
  "main",
  { "data-primitive-harness": true, style: { alignItems: "center", background: "#ffffff", display: "inline-flex", justifyContent: "center", minHeight: 96, padding: 16, width } },
  h("div", { "data-evidence-id": true }, content)
));

for (const variant of ["primary", "secondary", "quiet"]) {
  for (const size of ["desktop", "touch"]) {
    for (const state of ["default", "hover", "focus", "disabled", "loading"]) {
      const props = {
        disabled: state === "disabled",
        isLoading: state === "loading",
        loadingLabel: "Analyzing",
        size,
        variant
      };
      const label = variant === "primary" ? "Run analysis" : variant === "secondary" ? "View evidence" : "Back";
      output[`button-${variant}-${size}-${state}`] = harness(h(Button, props, label));
    }
  }
}

for (const tone of ["neutral", "spatial", "validation", "critical"]) {
  for (const size of ["compact", "default"]) output[`status-chip-${tone}-${size}`] = harness(h(StatusChip, { size, tone }, tone.toUpperCase()));
}

const segmentOptions = [{ label: "B2B", value: "b2b" }, { label: "B2C", value: "b2c" }];
for (const size of ["desktop", "touch"]) {
  for (const active of ["left", "right"]) {
    for (const state of ["default", "focus", "disabled"]) {
      output[`segment-switch-${size}-${active}-${state}`] = harness(h(SegmentSwitch, {
        ariaLabel: "Audience",
        disabled: state === "disabled",
        onChange: () => undefined,
        options: segmentOptions,
        size,
        value: active === "left" ? "b2b" : "b2c"
      }));
    }
  }
}

for (const tone of ["validation", "critical"]) {
  for (const mode of ["compact", "full"]) {
    const width = mode === "compact" ? 1000 : 680;
    const className = mode === "compact" ? "w-[960px]" : "w-[640px]";
    output[`validation-caveat-${tone}-${mode}`] = harness(h(ValidationCaveat, { className, mode, tone }), width);
  }
}

const profile = h(AccessStatusBadgeVisual, { fullName: "GeoAI Demo", href: "/profile", isAuthenticated: true, label: "Open demo profile" });
output["authenticated-profile-badge-default"] = harness(profile);
output["authenticated-profile-badge-focus"] = output["authenticated-profile-badge-default"];

process.stdout.write(JSON.stringify(output));
