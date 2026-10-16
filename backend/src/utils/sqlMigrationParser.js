export function splitMigration(sql) {
  const statements = [];
  let delimiter = ";";
  let buffer = "";
  let quote = null;
  let blockComment = false;

  for (const sourceLine of String(sql).split(/\r?\n/)) {
    const directive = !quote && !blockComment && !buffer.trim()
      ? sourceLine.match(/^\s*DELIMITER\s+(\S+)\s*$/i)
      : null;
    if (directive) {
      delimiter = directive[1];
      continue;
    }

    const line = `${sourceLine}\n`;
    let lineComment = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];
      buffer += char;

      if (lineComment) continue;
      if (blockComment) {
        if (char === "*" && next === "/") {
          buffer += next;
          index += 1;
          blockComment = false;
        }
        continue;
      }
      if (quote) {
        if (char === "\\") {
          if (next !== undefined) {
            buffer += next;
            index += 1;
          }
        } else if (char === quote) {
          if (next === quote) {
            buffer += next;
            index += 1;
          } else {
            quote = null;
          }
        }
        continue;
      }

      if (char === "-" && next === "-" && /\s/.test(line[index + 2] || "")) {
        lineComment = true;
        continue;
      }
      if (char === "#") {
        lineComment = true;
        continue;
      }
      if (char === "/" && next === "*") {
        buffer += next;
        index += 1;
        blockComment = true;
        continue;
      }
      if (["'", '"', "`"].includes(char)) {
        quote = char;
        continue;
      }
      if (buffer.endsWith(delimiter)) {
        const statement = buffer.slice(0, -delimiter.length).trim();
        if (statement) statements.push(statement);
        buffer = "";
      }
    }
  }

  if (quote || blockComment) throw new Error("Unterminated quote or block comment in migration");
  if (buffer.trim()) statements.push(buffer.trim());
  return statements;
}
