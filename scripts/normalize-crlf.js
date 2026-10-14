import fs from "fs";
import path from "path";

const files = process.argv.slice(2);
for (const file of files) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf8");
    if (content.includes("\r\n")) {
      fs.writeFileSync(fullPath, content.replace(/\r\n/g, "\n"), "utf8");
      console.log(`Normalized ${file} to LF`);
    } else {
      console.log(`${file} already LF`);
    }
  }
}
