const fs = require("node:fs");

const patchThinkLoader = () => {
  const target = "/app/node_modules/think-loader/loader/common.js";
  const source = fs.readFileSync(target, "utf8");

  const patched = source.replace(
    /^(\s*)([A-Za-z_$][\w$]*(?:(?:\.[A-Za-z_$][\w$]*)|(?:\[[^\]\n]+\]))*)\.__filename\s*=\s*([^;\n]+);/gm,
    (_match, indent, receiver, value) => [
      `${indent}if (${receiver} !== undefined && ${receiver} !== null) {`,
      `${indent}  ${receiver}.__filename = ${value};`,
      `${indent}}`,
    ].join("\n")
  );

  if (patched === source) {
    throw new Error(`No __filename assignment was patched in ${target}`);
  }

  fs.writeFileSync(target, patched);
  console.log(`Patched think-loader __filename guard in ${target}`);
};

const patchWalineMathjax = () => {
  const target = "/app/node_modules/@waline/vercel/src/service/markdown/mathjax.js";
  const source = fs.readFileSync(target, "utf8");

  if (source.includes("RegisterHTMLHandler(adaptor);")) {
    console.log(`Waline MathJax handler already patched in ${target}`);
    return;
  }

  const patched = source
    .replace(
      "const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');",
      [
        "const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');",
        "const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');",
      ].join("\n")
    )
    .replace(
      "  const adaptor = liteAdaptor();",
      [
        "  const adaptor = liteAdaptor();",
        "  RegisterHTMLHandler(adaptor);",
      ].join("\n")
    );

  if (patched === source || !patched.includes("RegisterHTMLHandler(adaptor);")) {
    throw new Error(`No MathJax handler registration was patched in ${target}`);
  }

  fs.writeFileSync(target, patched);
  console.log(`Patched Waline MathJax handler registration in ${target}`);
};

const patchWalineDashboardModuleScript = () => {
  const target = "/app/node_modules/@waline/vercel/src/middleware/dashboard.js";
  const source = fs.readFileSync(target, "utf8");

  if (source.includes('<script type="module" src="${')) {
    console.log(`Waline dashboard module script already patched in ${target}`);
    return;
  }

  const patched = source.replace('<script src="${', '<script type="module" src="${');

  if (patched === source || !patched.includes('<script type="module" src="${')) {
    throw new Error(`No dashboard admin script tag was patched in ${target}`);
  }

  fs.writeFileSync(target, patched);
  console.log(`Patched Waline dashboard admin script as module in ${target}`);
};

patchThinkLoader();
patchWalineMathjax();
patchWalineDashboardModuleScript();
