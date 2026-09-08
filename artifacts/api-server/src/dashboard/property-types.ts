import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { pool, transaction } from "./database";
import { HttpError, requireRole, type Role } from "./policy";

export const propertyTypesApi = Router();

const managers: Role[] = ["owner", "manager"];
const identifier = z.string().uuid();
const name = z.string().trim().min(1).max(100);

async function audit(connection: any, userId: string, action: string, entityId: string) {
  await connection.query(
    "INSERT INTO audit_event(id,user_id,action,entity_id) VALUES($1,$2,$3,$4)",
    [randomUUID(), userId, action, entityId],
  );
}

function duplicateName(error: unknown) {
  return (error as { code?: string } | undefined)?.code === "23505";
}

propertyTypesApi.get("/property-types", async (req, res) => {
  await actor(req);
  const result = await pool.query(
    "SELECT id,name,position,created_at FROM property_type ORDER BY position,name",
  );
  res.json(result.rows);
});

propertyTypesApi.post("/property-types", async (req, res) => {
  const user = await actor(req);
  requireRole(user.role, managers);
  const input = z.object({ name }).parse(req.body);
  const id = randomUUID();
  try {
    const propertyType = await transaction(async (connection) => {
      const nextPosition = await connection.query(
        "SELECT COALESCE(MAX(position), 0) + 10 AS value FROM property_type",
      );
      const created = await connection.query(
        "INSERT INTO property_type(id,name,position) VALUES($1,$2,$3) RETURNING id,name,position,created_at",
        [id, input.name, nextPosition.rows[0].value],
      );
      await audit(connection, user.id, "property_type.created", id);
      return created.rows[0];
    });
    res.status(201).json(propertyType);
  } catch (error) {
    if (duplicateName(error)) throw new HttpError(409, "A property type with that name already exists");
    throw error;
  }
});

propertyTypesApi.post("/property-types/:id", async (req, res) => {
  const user = await actor(req);
  requireRole(user.role, managers);
  const id = identifier.parse(req.params.id);
  const input = z.object({ name }).parse(req.body);
  try {
    const propertyType = await transaction(async (connection) => {
      const updated = await connection.query(
        "UPDATE property_type SET name=$2 WHERE id=$1 RETURNING id,name,position,created_at",
        [id, input.name],
      );
      if (!updated.rowCount) throw new HttpError(404, "Property type not found");
      await audit(connection, user.id, "property_type.updated", id);
      return updated.rows[0];
    });
    res.json(propertyType);
  } catch (error) {
    if (duplicateName(error)) throw new HttpError(409, "A property type with that name already exists");
    throw error;
  }
});

propertyTypesApi.delete("/property-types/:id", async (req, res) => {
  const user = await actor(req);
  requireRole(user.role, managers);
  const id = identifier.parse(req.params.id);
  const removed = await transaction(async (connection) => {
    const inUse = await connection.query(
      "SELECT 1 FROM property WHERE property_type_id=$1 LIMIT 1",
      [id],
    );
    if (inUse.rowCount)
      throw new HttpError(409, "Reassign properties before removing this property type");
    const result = await connection.query("DELETE FROM property_type WHERE id=$1 RETURNING id", [id]);
    if (!result.rowCount) throw new HttpError(404, "Property type not found");
    await audit(connection, user.id, "property_type.removed", id);
    return result.rows[0];
  });
  res.json(removed);
});
