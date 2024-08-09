import { Database } from "jsr:@db/sqlite@0.11";
import { coerce } from "https://deno.land/x/semver@v1.4.1/mod.ts";

export const layout = "layouts/packages.vto";
const db = new Database("winget-pkg-app.db");

export default function* () {
  const applications = db
    .prepare(
      `
	SELECT Identifier FROM Applications
	GROUP BY Identifier
	`
    )
    .all()!;

  for (const app of applications) {
    const identifier = app["Identifier"];
    const index = identifier.indexOf(".");

    const identifier_pub_name = identifier.slice(0, index);
    const identifier_app_name = identifier.slice(index + 1);
    const app_info_statement = db.prepare(
      `
SELECT Name, Identifier, Version, Publisher, Licence, ShortDescription, group_concat(Architecture) AS AVAILABLE_ARCHS FROM Applications
WHERE Identifier = ?
GROUP BY Version
ORDER BY Version;
	`
    );
    const app_info = app_info_statement.all(identifier);

    for (const app of app_info) {
      const ver = app["Version"];
      const parse_ver = coerce(ver);
      app["SemVer"] = parse_ver;
    }

    const sorted = app_info.sort((a, b) => {
      if (a["SemVer"] === null || b["SemVer"] === null) {
        return 0;
      }
      return -a["SemVer"].compare(b["SemVer"]);
    });

    yield {
      url: `/pkg/${identifier_pub_name}/${identifier_app_name}`,
      content: sorted,
    };
  }
}
