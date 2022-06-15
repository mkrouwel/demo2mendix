import { MendixPlatformClient, } from "mendixplatformsdk";
import { projects, security, domainmodels, microflows } from "mendixmodelsdk";
import descriptor from "./descriptor.json";
descriptor.demomodel;
const demomodel = await import(descriptor.demomodel);
const client = new MendixPlatformClient();
const appname = descriptor.appname + Date.now();
const app = await client.createNewApp(appname);
const workingCopy = await app.createTemporaryWorkingCopy("trunk");
const model = await workingCopy.openModel();
const modelProject = model.allProjects()[0];
const module = projects.Module.createIn(modelProject);
module.name = descriptor.defaultmodule;
const moduleSecurity = security.ModuleSecurity.createIn(module);
const domainModel = domainmodels.DomainModel.createIn(module);
console.log(demomodel);
// transaction kinds
for (var i = 0; i < demomodel.default.transactionkinds.length; i++) {
    var transactionkind = demomodel.default.transactionkinds[i];
    if (transactionkind.type === "elementary") {
        const entity = domainmodels.Entity.createIn(domainModel);
        entity.name = transactionkind.name;
    }
}
// actor roles ...
// fact kinds
for (var i = 0; i < demomodel.default.factkinds.length; i++) {
    var factkind = demomodel.default.factkinds[i];
    // other types ...
    if (factkind.type === "derived") {
        const microflow = microflows.Microflow.createIn(module);
        microflow.name = "Calculate_" + factkind.name;
        const parameter = microflows.MicroflowParameterObject.createIn(microflow.objectCollection);
        parameter.name = factkind.parameter;
    }
}
// action rules
for (var i = 0; i < demomodel.default.actionrules.length; i++) {
    var actionrule = demomodel.default.actionrules[i];
    // process event part...
    const microflow = microflows.Microflow.createIn(module);
    microflow.name = "AssessTruth_${actionrule.actorrole}_${actionrule.name}";
    // process response part...
}
// OIVs
for (var i = 0; i < demomodel.default.oivs.length; i++) {
    var oiv = demomodel.default.oivs[i];
    const entity = domainmodels.Entity.createIn(domainModel);
    entity.name = oiv.name;
}
await model.flushChanges();
await workingCopy.commitToRepository("trunk", { commitMessage: "Generated app v1" });
