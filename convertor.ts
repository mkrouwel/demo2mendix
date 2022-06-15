import { json } from "stream/consumers";
import { MendixPlatformClient,  } from "mendixplatformsdk";
import { IModel, projects, security, domainmodels, microflows, pages, datatypes } from "mendixmodelsdk";

import descriptor from "./descriptor.json";
descriptor.demomodel;
const demomodel = (await import(descriptor.demomodel)).default;
console.log(demomodel);

const workingCopy = await loadWorkingCopy();
const model = await workingCopy.openModel();
const [module, domainModel] = createModule();

// transaction kinds
for(var i = 0; i < demomodel.transactionkinds.length; i++) {
    var transactionkind = demomodel.transactionkinds[i];
    if(transactionkind.type === "elementary") {
        const entity = domainmodels.Entity.createIn(domainModel);
        entity.name = replaceWhiteSpace(transactionkind.name);
    }
}

// actor roles ...

// fact kinds
for(var i = 0; i < demomodel.factkinds.length; i++) {
    var factkind = demomodel.factkinds[i];
    // other types ...
    if(factkind.type === "derived") {
        const microflow = microflows.Microflow.createIn(module);
        microflow.name = "Calculate_" + replaceWhiteSpace(factkind.name);
        microflows.StartEvent.createIn(microflow.objectCollection);
        microflows.EndEvent.createIn(microflow.objectCollection);
        const parameter = microflows.MicroflowParameterObject.createIn(microflow.objectCollection);
        parameter.name = factkind.parameter;
    }
}

// action rules
for(var i = 0; i < demomodel.actionrules.length; i++) {
    var actionrule = demomodel.actionrules[i];
    // process event part...
    const microflow = microflows.Microflow.createIn(module);
    microflow.name = "AssessTruth_" + actionrule.actorrole + "_" + replaceWhiteSpace(actionrule.name);
    microflows.StartEvent.createIn(microflow.objectCollection);
    microflows.EndEvent.createIn(microflow.objectCollection);
    // process response part...
}

// OIVs
for(var i = 0; i < demomodel.oivs.length; i++) {
    var oiv = demomodel.oivs[i];
    const entity = domainmodels.Entity.createIn(domainModel);
    entity.name = replaceWhiteSpace(oiv.name);
}

await model.flushChanges();
await workingCopy.commitToRepository("trunk", { commitMessage: "Generated app v1" });

async function loadWorkingCopy() {
    const client = new MendixPlatformClient();
    const app = await client.createNewApp(descriptor.appname + Date.now());
    return app.createTemporaryWorkingCopy("trunk");
}

function createModule(): any {
    const module = projects.Module.createIn(model.allProjects()[0]);
    module.name = descriptor.defaultmodule;
    const moduleSecurity = security.ModuleSecurity.createIn(module);
    const domainModel = domainmodels.DomainModel.createIn(module);
    return [module, domainModel];
}

function replaceWhiteSpace(s : string) : string {
    return s.replace(' ', '_');
}