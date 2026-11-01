import {expect,it} from "vitest";
import {driveProgress} from "@/domain/quantities";
import {describeBottleneck} from "@/domain/guidance";
import {RECIPE,commitment,collected} from "./factories";
it("explains additional kits unlocked by the missing item, excluding already packable kits",()=>{
 const c=commitment(20);
 const p=driveProgress({requestType:"kit",components:RECIPE,commitment:c,pledges:[],collections:[collected(c.id,"backpack",20),collected(c.id,"notebook",30),collected(c.id,"pencils",20)],movements:[],deliveries:[]});
 expect(p.packableNow).toBe(15);
 expect(describeBottleneck(p,"kit").headline).toBe("10 more notebooks would let you pack 5 more kits.");
});
