import { describe, expect, it } from "vitest";
import { validateBackupRestoreReview } from "./backup-restore-review";
const fixture = () => ({
  manifest: {schemaVersion:1,clientStackId:"p1-land-management",createdAt:"2026-09-20T00:00:00Z",key:"db/test.json.gz",reason:"manual",appVersion:"test",gitCommitSha:null,environment:"test",railwayEnvironment:null,railwayProjectId:null,railwayServiceId:null,storageSource:"env",bucketName:"test",bucketPrefix:"test",tableCount:1,totalRowCount:2,mediaAssetCount:0,restoreOrder:["example"]},
  tables:[{name:"example",rowCount:2,rows:[{id:1,value:null},{id:2,value:{nested:["data"]}}]}],
  sequences:[{tableName:"example",columnName:"id",sequenceName:"example_id_seq"}],
});
describe("archive review validation",()=>{
  it("accepts complete JSON row snapshots without changing content",()=>{
    const source=fixture();expect(validateBackupRestoreReview(source)).toEqual(source);
  });
  it("accepts qualified public sequences and bounded capture provenance",()=>{
    const source:any=fixture();source.sequences[0].sequenceName="public.example_id_seq";
    source.manifest.privateCapture={method:"readonly",helperSourceSha256:"a".repeat(64),transactionReadOnly:true,transactionIsolation:"repeatable read",excludedTables:["session"],uploaded:false,mediaBytesIncluded:false};
    expect(validateBackupRestoreReview(source)).toEqual(source);
  });
  it.each([
    (s:any)=>{s.manifest.tableCount=2;},
    (s:any)=>{s.manifest.totalRowCount=1;},
    (s:any)=>{s.tables[0].rowCount=1;},
    (s:any)=>{s.manifest.mediaAssetCount=3;},
    (s:any)=>{s.manifest.restoreOrder=[];},
    (s:any)=>{s.manifest.restoreOrder=["example","example"];},
    (s:any)=>{s.tables.push(s.tables[0]);},
    (s:any)=>{s.tables[0].rows[1]={id:2,omitted:"different columns"};},
    (s:any)=>{s.sequences[0].tableName="missing";},
    (s:any)=>{s.sequences.push(s.sequences[0]);},
    (s:any)=>{s.manifest.schemaVersion=2;},
    (s:any)=>{s.sequences[0].sequenceName="other.example_id_seq";},
    (s:any)=>{s.sequences.push({...s.sequences[0],sequenceName:"public.example_id_seq"});},
    (s:any)=>{s.tables[0].name='unsafe;table';},
  ])("rejects corrupt counts, references, columns or schema before a restore",mutate=>{
    const source=fixture();mutate(source);expect(()=>validateBackupRestoreReview(source)).toThrow(/Backup archive/);
  });
});
