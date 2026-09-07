import { readFile } from "node:fs/promises";
import { validateClientMigrationIntake } from "../../shared/client-migration-intake";

const intakePath = process.argv[2];
if (!intakePath) {
  console.error("Usage: npm run migration:intake:validate -- <intake.json>");
  process.exitCode = 1;
} else {
  try {
    const input = JSON.parse(await readFile(intakePath, "utf8"));
    const result = validateClientMigrationIntake(input);
    if (!result.success) {
      console.error(JSON.stringify({ valid: false, errors: result.errors }));
      process.exitCode = 1;
    } else {
      console.log(
        JSON.stringify({
          valid: true,
          stackId: result.data.client.stackId,
          status: result.data.status,
        }),
      );
    }
  } catch {
    console.error(
      JSON.stringify({
        valid: false,
        errors: [{ path: "$", code: "unreadable", message: "Intake could not be read or parsed." }],
      }),
    );
    process.exitCode = 1;
  }
}
