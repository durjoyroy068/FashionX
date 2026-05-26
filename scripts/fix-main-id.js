const fs = require("fs");
const path = require("path");

const dirs = ["pages", "bid"].map((d) => path.join(__dirname, "..", d));

dirs.forEach((dir) => {
  fs.readdirSync(dir).forEach((file) => {
    if (!file.endsWith(".html")) return;
    const filePath = path.join(dir, file);
    const text = fs.readFileSync(filePath, "utf8");
    const next = text.replace(/id="page-content"/g, 'id="main-content"');
    if (next !== text) {
      fs.writeFileSync(filePath, next);
      console.log("Updated", filePath);
    }
  });
});
