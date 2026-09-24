//Copies the libraries the page loads out of node_modules into web/vendor, where both the local
//server and GitHub Pages can serve them. npm runs this automatically after installing.
const fs = require("fs");

const libraries = ["howler/dist/howler.min.js", "comfy.js/dist/comfy.min.js"];

fs.mkdirSync("web/vendor", { recursive: true });
for (const library of libraries) {
  fs.copyFileSync(`node_modules/${library}`, `web/vendor/${library.split("/").pop()}`);
}
