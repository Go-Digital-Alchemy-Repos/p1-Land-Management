import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";

const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw new Error("Client workspace tests require an isolated local server");

after(() => pool.end());

function sessionHeaders(userId: string, token: string) {
  const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
    .update(token)
    .digest("base64");
  return {
    cookie:
      "p1-dashboard.session_token=" +
      encodeURIComponent(`${token}.${signature}`),
    origin: base!,
    "content-type": "application/json",
  };
}

test(
  "client workspace keeps office notes and contact details private while retaining role-appropriate property data",
  { skip: !base },
  async () => {
    const ids = {
      manager: randomUUID(),
      clientUser: randomUUID(),
      crew: randomUUID(),
      outsider: randomUUID(),
      client: randomUUID(),
      otherClient: randomUUID(),
      property: randomUUID(),
      otherProperty: randomUUID(),
      contact: randomUUID(),
      scheduledWork: randomUUID(),
      draftWork: randomUUID(),
      privateInspection: randomUUID(),
      publishedInspection: randomUUID(),
      privateFile: randomUUID(),
      publishedFile: randomUUID(),
    };
    const people = [
      [ids.manager, "manager"],
      [ids.clientUser, "client"],
      [ids.crew, "crew"],
      [ids.outsider, "client"],
    ] as const;
    const headers = new Map<string, Record<string, string>>();

    for (const [id, role] of people) {
      const token = randomUUID();
      headers.set(id, sessionHeaders(id, token));
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [id, role, `${id}@example.test`],
      );
      await pool.query("INSERT INTO staff_profile(user_id,role) VALUES($1,$2)", [
        id,
        role,
      ]);
      await pool.query(
        'INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',
        [randomUUID(), token, id],
      );
    }

    await pool.query("INSERT INTO client(id,name) VALUES($1,$2),($3,$4)", [
      ids.client,
      "Workspace client",
      ids.otherClient,
      "Other client",
    ]);
    await pool.query(
      "INSERT INTO property(id,client_id,name,address,access_instructions) VALUES($1,$2,$3,$4,$5),($6,$7,$8,$9,$10)",
      [
        ids.property,
        ids.client,
        "Workspace property",
        "100 Private Lane",
        "Private access instructions",
        ids.otherProperty,
        ids.otherClient,
        "Other property",
        "200 Other Lane",
        "Other private instructions",
      ],
    );
    await pool.query("INSERT INTO client_access(user_id,client_id) VALUES($1,$2)", [
      ids.clientUser,
      ids.client,
    ]);
    await pool.query(
      "INSERT INTO contact(id,client_id,name,email,phone,kind) VALUES($1,$2,$3,$4,$5,'primary')",
      [
        ids.contact,
        ids.client,
        "Private contact",
        "private-contact@example.test",
        "704-555-0111",
      ],
    );
    await pool.query(
      "INSERT INTO work_order(id,property_id,title,status,assigned_to,published) VALUES($1,$2,$3,'scheduled',$4,true),($5,$2,$6,'draft',NULL,false)",
      [
        ids.scheduledWork,
        ids.property,
        "Assigned work",
        ids.crew,
        ids.draftWork,
        "Unpublished draft work",
      ],
    );
    await pool.query(
      "INSERT INTO inspection(id,property_id,user_id,title,findings,published) VALUES($1,$2,$3,$4,'[]',false),($5,$2,$3,$6,'[]',true)",
      [
        ids.privateInspection,
        ids.property,
        ids.manager,
        "Private inspection",
        ids.publishedInspection,
        "Published inspection",
      ],
    );
    await pool.query(
      "INSERT INTO file_record(id,property_id,user_id,object_key,name,mime,bytes,status,published) VALUES($1,$2,$3,$4,$5,'image/webp',1,'ready',false),($6,$2,$3,$7,$8,'image/webp',1,'ready',true)",
      [
        ids.privateFile,
        ids.property,
        ids.manager,
        `private/${ids.privateFile}`,
        "Private file",
        ids.publishedFile,
        `published/${ids.publishedFile}`,
        "Published file",
      ],
    );

    const managerHeaders = headers.get(ids.manager)!;
    const managerWorkspace = await fetch(
      `${base}/api/v1/clients/${ids.client}/workspace`,
      { headers: managerHeaders },
    );
    assert.equal(managerWorkspace.status, 200);
    const managerData = (await managerWorkspace.json()) as {
      contacts: { email: string }[];
    };
    assert.equal(managerData.contacts[0]?.email, "private-contact@example.test");

    const note = await fetch(`${base}/api/v1/clients/${ids.client}/notes`, {
      method: "POST",
      headers: managerHeaders,
      body: JSON.stringify({ body: "Internal property handoff" }),
    });
    assert.equal(note.status, 201);
    const noteId = ((await note.json()) as { id: string }).id;
    await assert.rejects(
      () => pool.query("UPDATE client_note SET body='Changed' WHERE id=$1", [noteId]),
      /append-only/,
    );

    for (const userId of [ids.clientUser, ids.crew]) {
      const response = await fetch(
        `${base}/api/v1/clients/${ids.client}/workspace`,
        { headers: headers.get(userId)! },
      );
      assert.equal(response.status, 403);
      const post = await fetch(`${base}/api/v1/clients/${ids.client}/notes`, {
        method: "POST",
        headers: headers.get(userId)!,
        body: JSON.stringify({ body: "Attempted private note" }),
      });
      assert.equal(post.status, 403);
    }

    const officeProperty = await fetch(
      `${base}/api/v1/properties/${ids.property}/workspace`,
      { headers: managerHeaders },
    );
    assert.equal(officeProperty.status, 200);
    const officeData = (await officeProperty.json()) as {
      property: { access_instructions: string };
      contacts: { email: string }[];
      notes: { id: string }[];
    };
    assert.equal(officeData.property.access_instructions, "Private access instructions");
    assert.equal(officeData.contacts[0]?.email, "private-contact@example.test");
    assert.equal(officeData.notes[0]?.id, noteId);

    const clientProperty = await fetch(
      `${base}/api/v1/properties/${ids.property}/workspace`,
      { headers: headers.get(ids.clientUser)! },
    );
    assert.equal(clientProperty.status, 200);
    const clientData = (await clientProperty.json()) as {
      property: Record<string, unknown>;
      contacts: unknown[];
      notes: unknown[];
      schedule: { id: string }[];
      inspections: { id: string }[];
      files: { id: string }[];
    };
    assert.equal("access_instructions" in clientData.property, false);
    assert.equal("client_id" in clientData.property, false);
    assert.deepEqual(clientData.contacts, []);
    assert.deepEqual(clientData.notes, []);
    assert.deepEqual(clientData.schedule.map((item) => item.id), [ids.scheduledWork]);
    assert.deepEqual(clientData.inspections.map((item) => item.id), [ids.publishedInspection]);
    assert.deepEqual(clientData.files.map((item) => item.id), [ids.publishedFile]);

    const crewProperty = await fetch(
      `${base}/api/v1/properties/${ids.property}/workspace`,
      { headers: headers.get(ids.crew)! },
    );
    assert.equal(crewProperty.status, 200);
    const crewData = (await crewProperty.json()) as {
      property: Record<string, unknown>;
      contacts: unknown[];
      notes: unknown[];
      schedule: { id: string }[];
      agreements: unknown[];
      requests: unknown[];
      projects: unknown[];
      inspections: unknown[];
      files: unknown[];
    };
    assert.equal("access_instructions" in crewData.property, false);
    assert.equal("client_id" in crewData.property, false);
    assert.deepEqual(crewData.contacts, []);
    assert.deepEqual(crewData.notes, []);
    assert.deepEqual(crewData.schedule.map((item) => item.id), [ids.scheduledWork]);
    assert.deepEqual(crewData.agreements, []);
    assert.deepEqual(crewData.requests, []);
    assert.deepEqual(crewData.projects, []);
    assert.deepEqual(crewData.inspections, []);
    assert.deepEqual(crewData.files, []);

    const otherProperty = await fetch(
      `${base}/api/v1/properties/${ids.otherProperty}/workspace`,
      { headers: headers.get(ids.outsider)! },
    );
    assert.equal(otherProperty.status, 404);

    const propertyUpdate = await fetch(
      `${base}/api/v1/properties/${ids.property}`,
      {
        method: "POST",
        headers: managerHeaders,
        body: JSON.stringify({
          name: "Updated workspace property",
          address: "101 Verified Lane",
          acreage: 12.5,
          accessInstructions: "Call before arrival",
          version: 1,
        }),
      },
    );
    assert.equal(propertyUpdate.status, 200);
    assert.deepEqual(await propertyUpdate.json(), {
      id: ids.property,
      client_id: ids.client,
      name: "Updated workspace property",
      address: "101 Verified Lane",
      acreage: "12.5",
      access_instructions: "Call before arrival",
      version: 2,
    });
    const stalePropertyUpdate = await fetch(
      `${base}/api/v1/properties/${ids.property}`,
      {
        method: "POST",
        headers: managerHeaders,
        body: JSON.stringify({
          name: "Stale update",
          address: "101 Verified Lane",
          acreage: null,
          version: 1,
        }),
      },
    );
    assert.equal(stalePropertyUpdate.status, 409);
    const clientPropertyUpdate = await fetch(
      `${base}/api/v1/properties/${ids.property}`,
      {
        method: "POST",
        headers: headers.get(ids.clientUser)!,
        body: JSON.stringify({
          name: "Unauthorized update",
          address: "101 Verified Lane",
          acreage: null,
          version: 2,
        }),
      },
    );
    assert.equal(clientPropertyUpdate.status, 403);

    const projectId = randomUUID();
    await pool.query(
      "INSERT INTO project(id,property_id,name,scope) VALUES($1,$2,'Workspace project','Original scope')",
      [projectId, ids.property],
    );
    const projectUpdate = await fetch(`${base}/api/v1/projects/${projectId}`, {
      method: "POST",
      headers: managerHeaders,
      body: JSON.stringify({
        name: "Updated workspace project",
        scope: "Reviewed operational scope",
        expectedVersion: 1,
      }),
    });
    assert.equal(projectUpdate.status, 200);
    assert.deepEqual(await projectUpdate.json(), {
      id: projectId,
      property_id: ids.property,
      name: "Updated workspace project",
      scope: "Reviewed operational scope",
      status: "planned",
      version: 2,
    });
    const staleProjectUpdate = await fetch(`${base}/api/v1/projects/${projectId}`, {
      method: "POST",
      headers: managerHeaders,
      body: JSON.stringify({
        name: "Stale project update",
        scope: "Should not persist",
        expectedVersion: 1,
      }),
    });
    assert.equal(staleProjectUpdate.status, 409);
    const storedProject = await pool.query(
      "SELECT name,scope,version FROM project WHERE id=$1",
      [projectId],
    );
    assert.deepEqual(storedProject.rows[0], {
      name: "Updated workspace project",
      scope: "Reviewed operational scope",
      version: 2,
    });
  },
);
