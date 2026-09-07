import { beforeEach, describe, expect, it, vi } from "vitest";
const { forms } = vi.hoisted(() => ({ forms: { getBySlug: vi.fn(), create: vi.fn(), update: vi.fn() } }));
vi.mock("../storage", () => ({storage:{forms}}));
import { ensureSystemForms } from "../services/system-forms.service";
describe("P1 managed estimate form", () => {
 beforeEach(() => vi.clearAllMocks());
 it("seeds only the P1 inquiry form with durable CRM and notification work", async () => {
  forms.getBySlug.mockResolvedValue(undefined); await ensureSystemForms();
  expect(forms.create).toHaveBeenCalledOnce(); expect(forms.create).toHaveBeenCalledWith(expect.objectContaining({slug:"p1-estimate",settings:expect.objectContaining({createCrmLead:true,notifyAdmins:true,mailchimpEnabled:false})}));
 });
 it("preserves editor fields and settings on subsequent boot", async () => {
  const existing={id:"p1",slug:"p1-estimate",name:"Estimate",fields:[{key:"name"}],settings:{submitButtonText:"Send inquiry"}};
  forms.getBySlug.mockResolvedValue(existing); await ensureSystemForms();
  expect(forms.create).not.toHaveBeenCalled();expect(forms.update).toHaveBeenCalledWith("p1",expect.objectContaining({fields:existing.fields,settings:expect.objectContaining({submitButtonText:"Send inquiry"})}));
 });
});
