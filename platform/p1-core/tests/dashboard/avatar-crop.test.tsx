import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { AvatarCropper } from "../../../../artifacts/p1-dashboard/src/AvatarCropper";
import { avatarCrop } from "../../../../artifacts/p1-dashboard/src/avatar-crop";
let root: Root, host: HTMLDivElement;
const save = vi.fn(), cancel = vi.fn(), draw = vi.fn(), revoke = vi.fn();
beforeEach(() => {
  vi.clearAllMocks(); save.mockResolvedValue(undefined);
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal("Image", class { naturalWidth=1200; naturalHeight=800; onload=()=>{}; onerror=()=>{}; set src(value:string) { this.source=value; queueMicrotask(()=>this.onload()); } get src(){return this.source;} source=""; });
  vi.stubGlobal("URL", { createObjectURL:()=>"blob:photo", revokeObjectURL:revoke });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({drawImage:draw} as any);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(cb=>cb(new Blob(["crop"],{type:"image/webp"})));
  host=document.createElement("div");document.body.append(host);root=createRoot(host);
});
afterEach(()=>{act(()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});
const render=()=>act(async()=>{root.render(<AvatarCropper file={new File(["photo"],"photo.jpg",{type:"image/jpeg"})} onCancel={cancel} onSave={save}/>);});
const button=(text:string)=>[...host.querySelectorAll("button")].find(e=>e.textContent===text)!;
it("keeps portrait, landscape and zoomed crops within the source",()=>{
 expect(avatarCrop(1200,800,1,50,50)).toEqual({size:800,left:200,top:0});
 expect(avatarCrop(800,1200,2,0,100)).toEqual({size:400,left:0,top:800});
 expect(avatarCrop(800,800,4,100,100)).toEqual({size:200,left:600,top:600});
});
it("does not upload before confirmation; cancellation preserves the current avatar",async()=>{
 await render();expect(save).not.toHaveBeenCalled();
 expect(host.querySelectorAll('input[type="range"]')).toHaveLength(3);
 await act(async()=>button("Cancel").click());expect(cancel).toHaveBeenCalledOnce();expect(save).not.toHaveBeenCalled();
});
it("exports the selected source square as a compact WebP only after Save",async()=>{
 await render();await act(async()=>button("Save photo").click());
 expect(draw).toHaveBeenCalledWith(expect.anything(),200,0,800,800,0,0,512,512);
 expect(save.mock.calls[0][0].type).toBe("image/webp");
});
it("keeps crop controls available after a failed upload",async()=>{
 save.mockRejectedValueOnce(new Error("Upload failed"));await render();await act(async()=>button("Save photo").click());
 expect(host.querySelector('[role="alert"]')?.textContent).toBe("Upload failed");expect(button("Save photo").disabled).toBe(false);expect(cancel).not.toHaveBeenCalled();
});
